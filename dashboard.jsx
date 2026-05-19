// 7on OS — Dashboard page
const Dashboard = ({ D, setRoute, refresh }) => {
  const personalCount = D.PERSONAL_TASKS.filter(t => !t.done).length;
  const workCount = D.WORK_TASKS.filter(t => !t.done).length;
  const studyCount = (D.STUDY_TASKS || []).filter(t => !t.done).length;
  const totalCommission = D.DEALS.reduce((s, d) => s + d.commission, 0);
  const monthIncome = D.MONTHLY.length ? D.MONTHLY[D.MONTHLY.length - 1].income : 0;
  const monthExpenses = D.MONTHLY.length ? D.MONTHLY[D.MONTHLY.length - 1].expenses : 0;
  const hotLeads = D.CONTACTS.filter(c => c.status === 'hot');

  const _todayD = new Date();
  const todayNum = (_todayD.getFullYear() === 2026 && _todayD.getMonth() === 4) ? _todayD.getDate() : 18;
  const [calDay, setCalDay] = React.useState(todayNum);

  // eventsByDate: { [dateNum]: count } for May 2026 mini-cal dots
  // BASE_MON = May 18 = day 1, so date = 17 + day
  const eventsByDate = {};
  D.EVENTS.forEach(e => {
    let date = 0;
    if (e.event_date && e.event_date.startsWith('2026-05-')) {
      date = parseInt(e.event_date.slice(8));
    } else if (e.day) {
      date = 17 + e.day; // May 18 = day 1 → 18
    }
    if (date >= 1 && date <= 31) eventsByDate[date] = (eventsByDate[date] || 0) + 1;
  });

  // Tasks "due on selected day" — match by day number in due string
  const calDayStr = String(calDay);
  const allTasks = D.PERSONAL_TASKS.concat(D.WORK_TASKS).concat(D.STUDY_TASKS || []);
  const dayTasks = allTasks.filter(t => {
    if (!t.due) return false;
    const m = t.due.match(/(\d+)/);
    return m && m[1] === calDayStr;
  });
  // Events for selected day — match by event_date or by legacy day-of-week
  const calDayEvents = D.EVENTS.filter(e => {
    if (e.event_date && e.event_date.startsWith('2026-05-')) {
      return parseInt(e.event_date.slice(8)) === calDay;
    }
    return 17 + (e.day || 0) === calDay;
  });

  const handleToggle = async (id, done) => { await toggleTask(id, done); await refresh(); };
  const handleDelete = async (id) => { await deleteTask(id); await refresh(); };
  const handleOpen = (task) => { if (window.SEVEN_NAV) window.SEVEN_NAV('tasks', { kind: 'task', id: task.id }); };

  return (
    <div>
      <div className="grid cols-12">
        {/* Top KPI row */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="stat-label">Открытых задач</div>
          <div className="stat-big mono">
            {personalCount + workCount + studyCount}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }} className="mono">
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{personalCount} личных</span>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>{workCount} рабочих</span>
            <span style={{ fontSize: 11, color: 'var(--blue)' }}>{studyCount} учебных</span>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="stat-label">Контакты · требуют касания</div>
          <div className="stat-big mono">
            {D.CONTACTS.filter(c => c.daysSince >= 7).length}
          </div>
          <div style={{ marginTop: 6 }} className="mono">
            <span style={{ fontSize: 11, color: 'var(--orange)' }}>{hotLeads.length} горячих</span>
            <span className="mono" style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 8 }}>· {D.CONTACTS.length} всего</span>
          </div>
        </div>

        {/* Personal tasks */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">Личные задачи <span className="count">{personalCount}</span></div>
            <button className="card-link" onClick={() => setRoute('tasks')}>открыть →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {D.PERSONAL_TASKS.slice(0, 5).map(t => <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onOpen={handleOpen} />)}
          </div>
          {D.PERSONAL_TASKS.length === 0 && <div className="placeholder">Нет задач</div>}
        </div>

        {/* Work tasks */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Рабочие задачи <span className="count">{workCount}</span>
              <span className="tag work">Риэлтор</span>
            </div>
            <button className="card-link" onClick={() => setRoute('tasks')}>открыть →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {D.WORK_TASKS.slice(0, 5).map(t => <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onOpen={handleOpen} />)}
          </div>
          {D.WORK_TASKS.length === 0 && <div className="placeholder">Нет задач</div>}
        </div>

        {/* Study tasks */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Учебные задачи <span className="count">{studyCount}</span>
              <span className="tag" style={{ background:'rgba(122,167,255,0.12)', color:'var(--blue)', borderColor:'rgba(122,167,255,0.25)' }}>Учёба</span>
            </div>
            <button className="card-link" onClick={() => setRoute('tasks')}>открыть →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(D.STUDY_TASKS || []).slice(0, 5).map(t => <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onOpen={handleOpen} />)}
          </div>
          {(D.STUDY_TASKS || []).length === 0 && <div className="placeholder">Нет задач</div>}
        </div>

        {/* Mini calendar */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">Календарь</div>
            <button className="card-link" onClick={() => setRoute('calendar')}>открыть →</button>
          </div>
          <MiniCal year={2026} month={4} today={todayNum}
            eventsByDate={eventsByDate}
            selectedDay={calDay}
            onDayClick={setCalDay} />
          <div style={{ marginTop: 16 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>
              {calDay === todayNum ? 'Сегодня' : `${calDay} мая`}
            </div>
            {calDayEvents.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'baseline', borderBottom: i < calDayEvents.length - 1 || dayTasks.length > 0 ? '1px solid var(--border)' : 0 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 50 }}>{formatTime(e.start)}</span>
                <span style={{ fontSize: 12.5, flex: 1 }}>{e.title}</span>
                <span className={`tag ${e.kind === 'deal' ? 'deal' : e.kind === 'work' ? 'work' : e.kind === 'personal' ? 'cold' : e.kind === 'contact' ? 'hot' : 'warm'}`}
                  style={e.kind === 'contact' ? { background:'rgba(94,229,160,0.15)', color:'#5ee5a0', border:'1px solid rgba(94,229,160,0.3)' } : {}}>
                  {e.kind === 'deal' ? 'Сделка' : e.kind === 'work' ? 'Работа' : e.kind === 'personal' ? 'Личное' : e.kind === 'contact' ? 'Контакт' : 'Встреча'}
                </span>
              </div>
            ))}
            {dayTasks.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'center', borderBottom: i < dayTasks.length - 1 ? '1px solid var(--border)' : 0 }}>
                <span className={`task-priority ${t.priority}`} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text-faint)' : 'var(--text)' }}>{t.title}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{t.type === 'work' ? 'Работа' : t.type === 'study' ? 'Учёба' : 'Личное'}</span>
              </div>
            ))}
            {calDayEvents.length === 0 && dayTasks.length === 0 && (
              <div className="placeholder" style={{ padding: 0 }}>Нет событий и задач</div>
            )}
          </div>
        </div>

        {/* Finance overview */}
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-header">
            <div className="card-title">Финансы</div>
            <button className="card-link" onClick={() => setRoute('finance')}>открыть →</button>
          </div>
          <div style={{ display: 'flex', gap: 32, marginBottom: 8 }}>
            <div>
              <div className="stat-label">Доход</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: 'var(--green)' }}>+₽{monthIncome.toLocaleString('ru-RU')}k</div>
            </div>
            <div>
              <div className="stat-label">Расход</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500 }}>−₽{monthExpenses.toLocaleString('ru-RU')}k</div>
            </div>
            <div>
              <div className="stat-label">Чистая прибыль</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: 'var(--accent)' }}>₽{(monthIncome - monthExpenses).toLocaleString('ru-RU')}k</div>
            </div>
          </div>
          <BarChart data={D.MONTHLY} />
        </div>

        {/* Hot leads */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="flame" size={14} />
              Горячие лиды <span className="count">{hotLeads.length}</span>
            </div>
            <button className="card-link" onClick={() => setRoute('contacts')}>все →</button>
          </div>
          {hotLeads.map((c, i) => (
            <div key={c.id} onClick={() => window.SEVEN_NAV && window.SEVEN_NAV('contacts', { kind: 'contact', id: c.id })}
              style={{ padding: '10px 0', borderBottom: i < hotLeads.length - 1 ? '1px solid var(--border)' : 0, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="contact-name">{c.name}</div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{fmtDate(c.lastContact)}</span>
              </div>
              <div className="contact-addr" style={{ marginTop: 4 }}>{c.addr}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>{c.params}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)' }}>→ {c.next}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>· {fmtDate(c.nextWhen)}</span>
              </div>
            </div>
          ))}
          {hotLeads.length === 0 && <div className="placeholder">Нет горячих лидов</div>}
        </div>

        {/* Goals */}
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <div className="card-header">
            <div className="card-title">Цели накоплений</div>
            <button className="card-link" onClick={() => setRoute('finance')}>все →</button>
          </div>
          {D.GOALS.map(g => (
            <div key={g.id} className="goal">
              <div className="goal-head">
                <div className="goal-name">{g.name}</div>
                <div className="goal-pct">{g.pct}%</div>
              </div>
              <div className="goal-bar-wrap">
                <div className="goal-bar" style={{ width: `${g.pct}%` }} />
              </div>
              <div className="goal-meta">
                <span>₽{Number(g.current).toLocaleString('ru-RU')}k</span>
                <span>цель ₽{Number(g.target).toLocaleString('ru-RU')}k</span>
              </div>
            </div>
          ))}
          {D.GOALS.length === 0 && <div className="placeholder">Нет целей</div>}
        </div>
      </div>
    </div>
  );
};

function formatTime(t) {
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

window.Dashboard = Dashboard;
window.formatTime = formatTime;
