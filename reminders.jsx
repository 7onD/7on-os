// 7on OS — Reminders & Notifications
// "В момент" убрано — теперь уведомление приходит автоматически если указаны дата+время.
// Это поле — только дополнительное, заблаговременное.
const REMINDER_OPTIONS = [
  { value: '-1',   label: 'Нет' },
  { value: '5',    label: 'За 5 минут' },
  { value: '15',   label: 'За 15 минут' },
  { value: '30',   label: 'За 30 минут' },
  { value: '60',   label: 'За 1 час' },
  { value: '120',  label: 'За 2 часа' },
  { value: '1440', label: 'За 1 день' },
];

// Storage helpers
function wasNotified(key) {
  return localStorage.getItem('7on_notif_' + key) === '1';
}
function markNotified(key) {
  localStorage.setItem('7on_notif_' + key, '1');
}

function fireNotification(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag, silent: false }); } catch(e) {}
}

// Event object → Date. Prefers event_date (ISO), falls back to legacy day 1-7.
const CAL_BASE = new Date(2026, 4, 18);
function eventToDate(ev) {
  if (ev.event_date) {
    const [y, mo, d] = ev.event_date.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    const h = (ev.start !== undefined && ev.start !== -1) ? ev.start : 9;
    dt.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    return dt;
  }
  // Legacy: day 1-7 from BASE_MON
  const dt = new Date(CAL_BASE);
  dt.setDate(CAL_BASE.getDate() + ((ev.day || 1) - 1));
  const h = ev.start !== undefined ? ev.start : 9;
  dt.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
  return dt;
}

// Best-effort task due date → Date. Uses explicit timeStr if provided, otherwise 9:00.
function parseDueDate(due, timeStr) {
  if (!due) return null;
  const s = due.toLowerCase().trim();
  const now = new Date();
  let d = null;
  // ISO date YYYY-MM-DD (highest priority — used by date picker)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), 9, 0, 0);
  } else if (s.startsWith('сегодня') || s === 'today') {
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  } else if (s.startsWith('завтра') || s === 'tomorrow') {
    const tmp = new Date(now); tmp.setDate(tmp.getDate() + 1);
    d = new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate(), 9, 0, 0);
  } else {
    const MONTH_MAP = {
      'янв':0,'феврал':1,'март':2,'апрел':3,'май':4,'мая':4,'июн':5,'июл':6,'авг':7,'сентябр':8,'сен':8,'октябр':9,'окт':9,'ноябр':10,'ноя':10,'декабр':11,'дек':11
    };
    for (const [key, mi] of Object.entries(MONTH_MAP)) {
      if (s.includes(key)) {
        const m = s.match(/(\d+)/);
        if (m) { d = new Date(now.getFullYear(), mi, parseInt(m[1]), 9, 0, 0); break; }
      }
    }
    if (!d) {
      const dot = s.match(/(\d{1,2})\.(\d{1,2})/);
      if (dot) d = new Date(now.getFullYear(), parseInt(dot[2]) - 1, parseInt(dot[1]), 9, 0, 0);
    }
  }
  if (d && timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

// ── RemindersManager component ────────────────────────────────────────────────
const RemindersManager = ({ tasks, events }) => {
  const [perm, setPerm]   = React.useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [show, setShow]   = React.useState(false);

  // Show banner if permission not granted
  React.useEffect(() => {
    if (perm === 'default') setShow(true);
    if (perm === 'denied')  setShow(true);
  }, [perm]);

  const request = async () => {
    if (typeof Notification === 'undefined') return;
    const res = await Notification.requestPermission();
    setPerm(res);
    if (res === 'granted') setShow(false);
  };

  // Re-check permission every 10s in case user enables it in browser settings
  React.useEffect(() => {
    const t = setInterval(() => {
      if (typeof Notification !== 'undefined') {
        const cur = Notification.permission;
        setPerm(p => { if (p !== cur) { if (cur === 'granted') setShow(false); return cur; } return p; });
      }
    }, 10000);
    return () => clearInterval(t);
  }, []);

  // Polling check
  React.useEffect(() => {
    if (typeof Notification === 'undefined') return;

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();

      // Events — auto-fire at start time + optional advance reminder
      (events || []).forEach(ev => {
        if (ev.start === -1) return; // skip all-day
        const evDate = eventToDate(ev);
        const mins = parseInt(ev.reminder ?? '-1');

        // Auto: fire at event start time
        const diffAt = now - evDate;
        if (diffAt >= 0 && diffAt < 60000) {
          const key = `ev_${ev.id}_at`;
          if (!wasNotified(key)) {
            fireNotification(`📅 ${ev.title}`, 'начинается сейчас', key);
            markNotified(key);
          }
        }

        // Additional advance reminder (if set)
        if (mins > 0) {
          const fireAt = new Date(evDate.getTime() - mins * 60000);
          const diff = now - fireAt;
          if (diff >= 0 && diff < 60000) {
            const key = `ev_${ev.id}_adv_${mins}`;
            if (!wasNotified(key)) {
              const when = mins < 60 ? `через ${mins} мин` : mins === 60 ? 'через 1 час' : mins >= 1440 ? 'завтра' : `через ${mins / 60} ч`;
              fireNotification(`📅 ${ev.title}`, when, key);
              markNotified(key);
            }
          }
        }
      });

      // Tasks — auto-fire at due time if time is set; advance reminder always optional
      (tasks || []).forEach(t => {
        if (t.done) return;
        const mins = parseInt(t.reminder ?? '-1');
        const dueDate = parseDueDate(t.due, t.time);
        if (!dueDate) return;

        if (t.time) {
          // Auto: fire at exact due time
          const diffAt = now - dueDate;
          if (diffAt >= 0 && diffAt < 60000) {
            const key = `task_${t.id}_at`;
            if (!wasNotified(key)) {
              fireNotification(`✅ ${t.title}`, 'Время пришло', key);
              markNotified(key);
            }
          }
          // Additional advance reminder
          if (mins > 0) {
            const fireAt = new Date(dueDate.getTime() - mins * 60000);
            const diff2 = now - fireAt;
            if (diff2 >= 0 && diff2 < 60000) {
              const key = `task_${t.id}_adv_${mins}`;
              if (!wasNotified(key)) {
                const when = mins < 60 ? `через ${mins} мин` : `через ${mins / 60} ч`;
                fireNotification(`✅ ${t.title}`, `Срок ${when}`, key);
                markNotified(key);
              }
            }
          }
        } else if (mins > 0) {
          // No time — only fire if advance reminder explicitly set
          const fireAt = new Date(dueDate.getTime() - mins * 60000);
          const diff = now - fireAt;
          if (diff >= 0 && diff < 60000) {
            const key = `task_${t.id}_adv_${mins}`;
            if (!wasNotified(key)) {
              const when = mins < 60 ? `срок через ${mins} мин` : mins >= 1440 ? 'срок завтра' : `срок через ${mins / 60} ч`;
              fireNotification(`✅ ${t.title}`, when, key);
              markNotified(key);
            }
          }
        }
      });
    };

    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [tasks, events]);

  if (perm === 'unsupported' || !show) return null;

  return (
    <div style={{
      position:'fixed', bottom:76, right:16, zIndex:400, maxWidth:300,
      background:'var(--surface-2)', border:'1px solid var(--border-strong)',
      borderRadius:14, padding:'14px 16px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      animation:'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:12 }}>
        <span style={{ fontSize:22, lineHeight:1 }}>🔔</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:4, color:'var(--text)' }}>
            {perm === 'denied' ? 'Уведомления заблокированы' : 'Разрешите уведомления'}
          </div>
          <div style={{ fontSize:11.5, color:'var(--text-dim)', lineHeight:1.55 }}>
            {perm === 'denied'
              ? 'Откройте настройки браузера → Уведомления, разрешите для этого сайта.'
              : 'Чтобы получать напоминания о задачах и событиях вовремя.'}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn ghost" style={{ fontSize:12, padding:'5px 10px' }} onClick={() => setShow(false)}>Позже</button>
        {perm !== 'denied' && (
          <button className="btn primary" style={{ fontSize:12, padding:'5px 14px' }} onClick={request}>
            Разрешить
          </button>
        )}
      </div>
    </div>
  );
};

window.REMINDER_OPTIONS = REMINDER_OPTIONS;
window.RemindersManager = RemindersManager;
