// 7on OS — shared components
const { useState, useEffect, useMemo } = React;

function fmtDate(s) {
  if (!s) return s;
  const MONTHS_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  // ISO date/datetime: YYYY-MM-DD or YYYY-MM-DD HH:MM
  const iso = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (iso) {
    const dateStr = `${parseInt(iso[3])} ${MONTHS_SHORT[parseInt(iso[2])-1]}`;
    return iso[4] ? `${dateStr} ${iso[4]}` : dateStr;
  }
  // Russian text: "17 мая" → "17.05"
  const months = {
    'января':'01','февраля':'02','марта':'03','апреля':'04',
    'мая':'05','июня':'06','июля':'07','августа':'08',
    'сентября':'09','октября':'10','ноября':'11','декабря':'12',
  };
  const m = s.trim().match(/^(\d{1,2})\s+([а-яёА-ЯЁ]+)$/);
  if (m && months[m[2].toLowerCase()]) {
    return `${m[1].padStart(2,'0')}.${months[m[2].toLowerCase()]}`;
  }
  return s;
}
window.fmtDate = fmtDate;

// ── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onConfirm, confirmLabel = 'Сохранить', confirmDisabled = false, children }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button className="btn ghost" onClick={onClose}>Отмена</button>
            <button className="btn primary" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Form primitives ───────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="form-field">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const FInput = (props) => <input className="form-input" {...props} />;
const FSelect = ({ children, ...props }) => (
  <select className="form-select" {...props}>{children}</select>
);
const FTextarea = (props) => <textarea className="form-textarea" {...props} />;

// ── TaskRow ───────────────────────────────────────────────────────────────────
const TaskRow = ({ task, onToggle, onDelete, onOpen, dragHandleProps }) => {
  const [busy, setBusy] = useState(false);

  const _todayStr = new Date().toISOString().slice(0, 10);
  const _nowTime  = new Date().toTimeString().slice(0, 5); // "HH:MM"

  // Due-date status: overdue or today
  const dueStatus = (() => {
    if (!task.due || task.done) return null;
    if (task.due < _todayStr) return 'overdue';
    if (task.due === _todayStr) {
      if (!task.time) return 'today';
      return task.time <= _nowTime ? 'overdue' : 'today';
    }
    return null;
  })();

  const deadlineStatus = (() => {
    if (!task.deadline) return null;
    if (task.deadline < _todayStr) return 'overdue';
    if (task.deadline === _todayStr) return 'today';
    const d = new Date(task.deadline + 'T00:00:00');
    const diff = (d - new Date()) / 86400000;
    if (diff <= 2) return 'warn';
    return 'ok';
  })();

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (busy || !onToggle) return;
    setBusy(true);
    try { await onToggle(task.id, !task.done); } finally { setBusy(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (busy || !onDelete) return;
    setBusy(true);
    try { await onDelete(task.id); } finally { setBusy(false); }
  };

  return (
    <div className="task"
      data-done={task.done ? '1' : '0'}
      data-has-deadline={task.deadline ? '1' : '0'}
      data-due-status={dueStatus || ''}
      onClick={() => onOpen && onOpen(task)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      {dragHandleProps && (
        <div className="drag-handle" {...dragHandleProps} onClick={e => e.stopPropagation()}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="2.5" r="1.5"/><circle cx="7" cy="2.5" r="1.5"/>
            <circle cx="3" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/>
            <circle cx="3" cy="11.5" r="1.5"/><circle cx="7" cy="11.5" r="1.5"/>
          </svg>
        </div>
      )}
      <div className={`task-priority ${task.priority}`} />
      <div className="task-check" onClick={handleToggle} style={{ cursor: 'pointer', opacity: busy ? 0.5 : 1 }} />
      <div className="task-body">
        <div className="task-title"
          style={(dueStatus === 'overdue' || deadlineStatus === 'overdue' || deadlineStatus === 'today') ? { color:'var(--red)' } : undefined}>
          {task.title}
        </div>
        <div className="task-meta">
          <span style={dueStatus === 'overdue' ? { color:'var(--red)' } : dueStatus === 'today' ? { color:'var(--accent)' } : undefined}>
            {fmtDate(task.due)}{task.time && <span className="mono" style={{ marginLeft:4, opacity:0.7 }}>{task.time}</span>}
            {dueStatus === 'overdue' && !task.done && <span style={{ marginLeft:4 }}>⚡</span>}
          </span>
          {task.description && <><span className="dot" /><span style={{ color: 'var(--text-faint)', fontSize: 10.5 }}>заметка</span></>}
          {task.deadline && !task.done && (deadlineStatus === 'overdue' || deadlineStatus === 'today' || deadlineStatus === 'warn') && (
            <><span className="dot" />
            <span className={`deadline-badge${deadlineStatus === 'warn' ? ' warn' : ''}`}>
              ⏰ {deadlineStatus === 'overdue' ? 'просрочен' : deadlineStatus === 'today' ? 'сегодня' : `до ${fmtDate(task.deadline)}`}
            </span></>
          )}
        </div>
      </div>
      {onDelete && (
        <button className="task-delete" onClick={handleDelete} title="Удалить">
          <Icon name="trash" size={12} />
        </button>
      )}
    </div>
  );
};

// ── MiniCal ──────────────────────────────────────────────────────────────────
// eventsByDate keyed by ISO "YYYY-MM-DD", today/selectedDay are ISO strings
const MiniCal = ({ today = null, eventsByDate = {}, selectedDay = null, onDayClick }) => {
  const _now = new Date();
  const [calYear,  setCalYear]  = React.useState(_now.getFullYear());
  const [calMonth, setCalMonth] = React.useState(_now.getMonth());

  const _todayIso = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const _go = (ny, nm) => { setCalYear(ny); setCalMonth(nm); };
  const prevMonthFn = () => calMonth === 0 ? _go(calYear-1, 11) : _go(calYear, calMonth-1);
  const nextMonthFn = () => calMonth === 11 ? _go(calYear+1, 0) : _go(calYear, calMonth+1);
  const goToday     = () => _go(_now.getFullYear(), _now.getMonth());

  const firstDay = new Date(calYear, calMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [];
  const prevMonthLast = new Date(calYear, calMonth, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) cells.push({ d: prevMonthLast - i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, out: false });
  while (cells.length < 42) cells.push({ d: cells.length - daysInMonth - startWeekday + 1, out: true });
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const dows = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const isCurrentMonthView = calYear === _now.getFullYear() && calMonth === _now.getMonth();
  return (
    <div className="minical">
      <div className="minical-head">
        <span style={{ cursor:'pointer', userSelect:'none' }} onClick={goToday} title="Вернуться к сегодня">
          {monthNames[calMonth]} {calYear}
          {!isCurrentMonthView && <span style={{ fontSize:10, color:'var(--accent)', marginLeft:6, fontFamily:'var(--font-mono)' }}>← сегодня</span>}
        </span>
        <span style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn" style={{ width:24, height:24, borderRadius:6 }} onClick={prevMonthFn} title="Предыдущий месяц"><Icon name="chevron-left" size={12} /></button>
          <button className="icon-btn" style={{ width:24, height:24, borderRadius:6 }} onClick={nextMonthFn} title="Следующий месяц"><Icon name="chevron-right" size={12} /></button>
        </span>
      </div>
      <div className="minical-grid">
        {dows.map(d => <div key={d} className="minical-dow">{d}</div>)}
        {cells.map((c, i) => {
          const cellIso = c.out ? null : `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`;
          const evCount = cellIso ? (eventsByDate[cellIso] || 0) : 0;
          const isToday = cellIso === (today || _todayIso);
          return (
            <div key={i} className="minical-day"
              data-out={c.out ? '1' : '0'}
              data-today={isToday ? '1' : '0'}
              data-has={evCount > 0 ? '1' : '0'}
              data-selected={cellIso === selectedDay ? '1' : '0'}
              style={!c.out && onDayClick ? { cursor:'pointer' } : undefined}
              onClick={() => !c.out && onDayClick && onDayClick(cellIso)}>
              <span>{c.d}</span>
              {evCount > 0 && (
                <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:1, height:5, alignItems:'center' }}>
                  {evCount <= 3
                    ? Array.from({ length: evCount }).map((_, di) => (
                        <div key={di} style={{ width:4, height:4, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />
                      ))
                    : <div style={{ fontSize:9, color:'var(--orange)', fontFamily:'var(--font-mono)', lineHeight:1, fontWeight:600 }}>{evCount}</div>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── BarChart ─────────────────────────────────────────────────────────────────
const BarChart = ({ data, max }) => {
  const maxVal = max || Math.max(...data.map(d => d.income));
  return (
    <>
      <div className="barchart">
        {data.map((d, i) => (
          <div key={i} className="bar" data-current={d.current ? '1' : '0'} style={{ height: `${(d.income / maxVal) * 100}%` }} />
        ))}
      </div>
      <div className="barchart-axis">
        {data.map((d, i) => <span key={i}>{d.m}</span>)}
      </div>
    </>
  );
};

// ── StatusTag ────────────────────────────────────────────────────────────────
const StatusTag = ({ status }) => {
  const cls = status === 'hot' ? 'hot' : status === 'warm' ? 'warm' : status === 'cold' ? 'cold' : 'work';
  return <span className={`tag ${cls}`}>{(window.STATUS_LABEL || {})[status] || status}</span>;
};

// ── Link helpers ──────────────────────────────────────────────────────────────
function extractLinks(text) {
  if (!text) return [];
  const re = /\[\[(file|note):([^:]+):([^\]]+)\]\]/g;
  const links = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    links.push({ type: m[1], id: m[2], name: m[3] });
  }
  return links;
}

function stripLinks(text) {
  return (text || '').replace(/\[\[(file|note):[^\]]+\]\]/g, '').trim();
}

// ── SlashLinkMenu (for tasks + events descriptions) ──────────────────────────
const SlashLinkMenu = ({ query, position, onPick, onClose }) => {
  const files = (window.SEVEN_DATA && window.SEVEN_DATA.FILES) || [];
  const notes = (window.SEVEN_DATA && window.SEVEN_DATA.NOTES) || [];
  const q = (query || '').toLowerCase();

  const filteredFiles = useMemo(() => {
    return (q ? files.filter(f => f.name.toLowerCase().includes(q)) : files).slice(0, 4);
  }, [q]);
  const filteredNotes = useMemo(() => {
    return (q ? notes.filter(n => n.title.toLowerCase().includes(q)) : notes).slice(0, 3);
  }, [q]);

  const allItems = [
    ...filteredFiles.map(f => ({ type: 'file', item: f })),
    ...filteredNotes.map(n => ({ type: 'note', item: n })),
  ];

  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(allItems.length - 1, a + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (allItems[active]) onPick(allItems[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allItems, active]);

  if (allItems.length === 0) return null;

  const fmtD = (t) => typeof fmtDate !== 'undefined' ? fmtDate(t) : t;
  let gi = 0;

  return (
    <div className="slash-menu" style={{ ...position, position:'absolute', zIndex:300, minWidth:280 }}>
      {filteredFiles.length > 0 && <div className="slash-section">Файлы</div>}
      {filteredFiles.map(f => {
        const idx = gi++;
        return (
          <button key={f.id} className="slash-item" data-active={idx===active?'1':'0'}
            onClick={() => onPick({ type:'file', item:f })} onMouseEnter={() => setActive(idx)}>
            <span className={`ic ${f.type}`} style={{ width:28, height:28, display:'grid', placeItems:'center', borderRadius:6, background:'var(--surface-3)', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            </span>
            <span className="label">
              <span className="name">{f.name}</span>
              <span className="desc" style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-faint)' }}>{f.size} · {fmtD(f.modified)}</span>
            </span>
            {idx===active && <span className="kbd">↵</span>}
          </button>
        );
      })}
      {filteredNotes.length > 0 && <div className="slash-section">Заметки</div>}
      {filteredNotes.map(n => {
        const idx = gi++;
        return (
          <button key={n.id} className="slash-item" data-active={idx===active?'1':'0'}
            onClick={() => onPick({ type:'note', item:n })} onMouseEnter={() => setActive(idx)}>
            <span className="ic" style={{ width:28, height:28, display:'grid', placeItems:'center', borderRadius:6, background:'rgba(212,255,77,0.1)', color:'var(--accent)', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
            </span>
            <span className="label">
              <span className="name">{n.title}</span>
              {n.preview && <span className="desc" style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-faint)' }}>{n.preview.slice(0,50)}</span>}
            </span>
            {idx===active && <span className="kbd">↵</span>}
          </button>
        );
      })}
      <div style={{ borderTop:'1px solid var(--border)', padding:'5px 10px', fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--text-faint)', display:'flex', justifyContent:'space-between' }}>
        <span>↑↓</span><span>↵ вставить · Esc отмена</span>
      </div>
    </div>
  );
};

// ── DescriptionWithLinks (textarea + slash menu + link chips) ────────────────
const DescriptionWithLinks = ({ value, onChange, placeholder, style, minHeight = 100 }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [slashStart, setSlashStart] = useState(-1);
  const taRef = React.useRef(null);

  const handleChange = e => {
    onChange(e);
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const m = before.match(/\/(\S*)$/);
    if (m) {
      setMenuQuery(m[1]);
      setSlashStart(cursor - m[0].length);
      setShowMenu(true);
    } else {
      setShowMenu(false);
      setSlashStart(-1);
    }
  };

  const handlePick = ({ type, item }) => {
    const cursor = taRef.current ? taRef.current.selectionStart : (slashStart + 1 + menuQuery.length);
    const before = value.slice(0, slashStart);
    const after = value.slice(cursor);
    const link = type === 'file'
      ? `[[file:${item.id}:${item.name}]]`
      : `[[note:${item.id}:${item.title}]]`;
    onChange({ target: { value: before + link + ' ' + after } });
    setShowMenu(false);
    setSlashStart(-1);
    setTimeout(() => taRef.current?.focus(), 10);
  };

  const links = extractLinks(value);

  const openLink = ({ type, id }) => {
    if (window.SEVEN_NAV) window.SEVEN_NAV('storage', { kind: type, id });
  };

  return (
    <div style={{ position:'relative' }}>
      <textarea ref={taRef} className="form-textarea"
        value={value} onChange={handleChange} placeholder={placeholder}
        style={{ ...style, minHeight }}
        onKeyDown={e => { if (e.key === 'Escape') setShowMenu(false); }}
      />
      {showMenu && (
        <SlashLinkMenu query={menuQuery} position={{ bottom:'100%', left:0, marginBottom:4 }}
          onPick={handlePick} onClose={() => setShowMenu(false)} />
      )}
      {links.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
          {links.map((l, i) => (
            <button key={i} className="desc-link-chip" onClick={() => openLink(l)} title={`Открыть в хранилище: ${l.name}`}>
              <span style={{ opacity:0.7 }}>{l.type === 'file' ? '📎' : '📝'}</span>
              {l.name.length > 30 ? l.name.slice(0, 30) + '…' : l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── TaskDragList ──────────────────────────────────────────────────────────────
// Module-level component (stable reference). Handles PC drag and mobile touch drag.
const TaskDragList = ({ tasks, onToggle, onDelete, onOpen, onReorder }) => {
  const [localTasks, setLocalTasks] = React.useState(tasks);
  const [draggingIdx, setDraggingIdx] = React.useState(null);
  const [dragOverIdx, setDragOverIdx] = React.useState(null);
  const S = React.useRef({ from: null, over: null, tasks });
  const onReorderRef = React.useRef(onReorder);
  const listRef = React.useRef(null);

  React.useEffect(() => { S.current.tasks = tasks; setLocalTasks(tasks); }, [tasks]);
  React.useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

  const _todayStr = new Date().toISOString().slice(0, 10);
  const isDueToday = (due) => !!due && (due === _todayStr || (typeof due === 'string' && due.toLowerCase().startsWith('сегодня')));

  // PC drag
  const pcDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    S.current.from = idx;
    setDraggingIdx(idx);
  };
  const pcDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (S.current.from !== idx) { S.current.over = idx; setDragOverIdx(idx); }
  };
  const pcDrop = (e, idx) => {
    e.preventDefault();
    const from = S.current.from;
    S.current.from = null; S.current.over = null;
    setDraggingIdx(null); setDragOverIdx(null);
    if (from == null || from === idx) return;
    const next = [...S.current.tasks];
    const [item] = next.splice(from, 1);
    next.splice(idx, 0, item);
    S.current.tasks = next;
    setLocalTasks(next);
    onReorderRef.current && onReorderRef.current(next);
  };
  const pcDragEnd = () => { S.current.from = null; S.current.over = null; setDraggingIdx(null); setDragOverIdx(null); };

  // Touch drag — imperative non-passive listeners so preventDefault works
  const touchRef = React.useRef({ from: null, startY: 0, moved: false });
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const getIdx = (y) => {
      for (const item of el.querySelectorAll('[data-drag-idx]')) {
        const r = item.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom) return parseInt(item.dataset.dragIdx);
      }
      return null;
    };
    const onStart = (e) => {
      if (!e.target.closest('.drag-handle')) return;
      const item = e.target.closest('[data-drag-idx]');
      if (!item) return;
      const idx = parseInt(item.dataset.dragIdx);
      touchRef.current = { from: idx, startY: e.touches[0].clientY, moved: false };
      S.current.from = idx; S.current.over = null;
      setDraggingIdx(idx);
    };
    const onMove = (e) => {
      if (touchRef.current.from == null) return;
      const dy = Math.abs(e.touches[0].clientY - touchRef.current.startY);
      if (dy > 5) { touchRef.current.moved = true; e.preventDefault(); }
      if (!touchRef.current.moved) return;
      const over = getIdx(e.touches[0].clientY);
      if (over !== null && over !== touchRef.current.from) { S.current.over = over; setDragOverIdx(over); }
    };
    const onEnd = () => {
      const { from, moved } = touchRef.current;
      const over = S.current.over;
      touchRef.current = { from: null, startY: 0, moved: false };
      S.current.from = null; S.current.over = null;
      setDraggingIdx(null); setDragOverIdx(null);
      if (moved && from != null && over != null && from !== over) {
        const next = [...S.current.tasks];
        const [item] = next.splice(from, 1);
        next.splice(over, 0, item);
        S.current.tasks = next;
        setLocalTasks(next);
        onReorderRef.current && onReorderRef.current(next);
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []);

  // Build sections preserving flat indices
  const sections = [];
  let curG = null;
  localTasks.forEach((t, idx) => {
    const g = t.done ? 'done' : isDueToday(t.due) ? 'today' : 'later';
    if (g !== curG) { sections.push({ g, items: [] }); curG = g; }
    sections[sections.length - 1].items.push({ t, idx });
  });
  const LABELS = { today: 'Сегодня', later: 'Позже', done: 'Выполнено' };
  const multiSection = sections.length > 1 || (sections[0] && sections[0].g !== 'later');

  return (
    <div ref={listRef}>
      {sections.map(({ g, items }) => (
        <div key={g}>
          {multiSection && <div style={{ fontSize:10.5, opacity:0.4, padding:'6px 4px 2px', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{LABELS[g]}</div>}
          {items.map(({ t, idx }) => (
            <div key={t.id} data-drag-idx={idx}
              draggable
              onDragStart={e => pcDragStart(e, idx)}
              onDragOver={e => pcDragOver(e, idx)}
              onDrop={e => pcDrop(e, idx)}
              onDragEnd={pcDragEnd}
              data-dragging={draggingIdx === idx ? '1' : '0'}
              data-dragover={dragOverIdx === idx && draggingIdx !== idx ? '1' : '0'}
              style={{ transition:'opacity 0.12s' }}>
              <TaskRow task={t} onToggle={onToggle} onDelete={onDelete} onOpen={onOpen}
                dragHandleProps={{ title:'Перетащить' }} />
            </div>
          ))}
        </div>
      ))}
      {localTasks.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-dim)', fontSize:13 }}>Нет задач</div>
      )}
    </div>
  );
};

// ── TaskGroupedList ───────────────────────────────────────────────────────────
// Shows tasks grouped by time period: Сегодня / Завтра / На этой неделе / Без срока
const TaskGroupedList = ({ tasks, onToggle, onDelete, onOpen }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
  // end of this week = nearest Sunday (or +6 days if today is Sunday)
  const weekEndDate = new Date();
  const dow = weekEndDate.getDay(); // 0=Sun
  const daysToSun = dow === 0 ? 6 : 7 - dow;
  weekEndDate.setDate(weekEndDate.getDate() + daysToSun);
  const weekEndStr = weekEndDate.toISOString().slice(0, 10);

  const groups = [
    { key: 'today',    label: 'Сегодня',           pred: t => !!t.due && t.due <= todayStr },
    { key: 'tomorrow', label: 'Завтра',             pred: t => t.due === tomorrowStr },
    { key: 'week',     label: 'На этой неделе',     pred: t => !!t.due && t.due > tomorrowStr && t.due <= weekEndStr },
    { key: 'nodue',    label: 'Без срока',          pred: t => !t.due || t.due > weekEndStr },
  ];

  const grouped = groups.map(g => ({ ...g, tasks: tasks.filter(g.pred) })).filter(g => g.tasks.length > 0);

  if (grouped.length === 0) return (
    <div className="placeholder">Нет задач</div>
  );

  return (
    <div>
      {grouped.map(g => (
        <div key={g.key}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 0 4px', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
            {g.label}
          </div>
          {g.tasks.map(task => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onOpen={onOpen} />
          ))}
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { TaskRow, TaskDragList, TaskGroupedList, MiniCal, BarChart, StatusTag, Modal, Field, FInput, FSelect, FTextarea,
  SlashLinkMenu, DescriptionWithLinks, extractLinks, stripLinks });
