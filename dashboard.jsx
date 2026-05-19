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
  const todayIso = `${_todayD.getFullYear()}-${String(_todayD.getMonth()+1).padStart(2,'0')}-${String(_todayD.getDate()).padStart(2,'0')}`;
  const [calDay, setCalDay] = React.useState(todayIso);

  // eventsByDate keyed by ISO date — works for ALL months, no hardcoding
  const eventsByDate = {};
  D.EVENTS.forEach(e => {
    if (e.event_date) eventsByDate[e.event_date] = (eventsByDate[e.event_date] || 0) + 1;
  });

  // Build cal tag lookup from custom tags
  const CAL_TAGS = D.CAL_TAGS || [];
  const tagById = {};
  CAL_TAGS.forEach(t => { tagById[t.id] = t; });

  const evKindLabel = (kind) => {
    if (kind === 'deal')     return 'Сделка';
    if (kind === 'work')     return 'Работа';
    if (kind === 'personal') return 'Личное';
    if (kind === 'contact')  return 'Контакт';
    if (kind === 'meeting')  return 'Встреча';
    return tagById[kind]?.name || kind;
  };
  const evKindColor = (kind) => {
    if (kind === 'deal')     return 'var(--violet)';
    if (kind === 'work')     return 'var(--accent)';
    if (kind === 'personal') return 'var(--blue)';
    if (kind === 'contact')  return '#5ee5a0';
    if (kind === 'meeting')  return 'var(--orange)';
    return tagById[kind]?.color || 'var(--text-faint)';
  };

  // Day label for the event list header
  const MONTHS_SHORT_D = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const _calDayDate = calDay ? new Date(calDay + 'T00:00:00') : null;
  const calDayLabel = !_calDayDate ? '—'
    : calDay === todayIso ? 'Сегодня'
    : `${_calDayDate.getDate()} ${MONTHS_SHORT_D[_calDayDate.getMonth()]}`;

  // Tasks "due on selected day" — match by day number
  const calDayNum = calDay ? parseInt(calDay.slice(8)) : 0;
  const allTasks = D.PERSONAL_TASKS.concat(D.WORK_TASKS).concat(D.STUDY_TASKS || []);
  const dayTasks = allTasks.filter(t => {
    if (!t.due) return false;
    const m = t.due.match(/(\d+)/);
    return m && m[1] === String(calDayNum);
  });
  // Events for selected ISO date
  const calDayEvents = D.EVENTS
    .filter(e => e.event_date === calDay)
    .sort((a, b) => a.start - b.start);

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
          <MiniCal today={todayIso}
            eventsByDate={eventsByDate}
            selectedDay={calDay}
            onDayClick={setCalDay} />
          <div style={{ marginTop: 16 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>{calDayLabel}</div>
            {calDayEvents.map((e, i) => (
              <div key={e.id}
                style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'baseline', borderBottom: i < calDayEvents.length - 1 || dayTasks.length > 0 ? '1px solid var(--border)' : 0, cursor: 'pointer' }}
                onClick={() => window.SEVEN_NAV && window.SEVEN_NAV('calendar', { kind: 'event', id: e.id })}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 50, flexShrink: 0 }}>{formatTime(e.start)}</span>
                <span style={{ fontSize: 12.5, flex: 1 }}>{e.title}</span>
                {(() => {
                  const color = evKindColor(e.kind);
                  const hex = color.startsWith('#') ? color : null;
                  const bg = hex ? `${hex}26` : `rgba(0,0,0,0)`;
                  const border = hex ? `1px solid ${hex}44` : undefined;
                  const style = hex ? { background: bg, color: hex, border } : {};
                  const cls = `tag ${e.kind === 'deal' ? 'deal' : e.kind === 'work' ? 'work' : e.kind === 'personal' ? 'cold' : e.kind === 'contact' ? 'hot' : 'warm'}`;
                  return <span className={cls} style={style}>{evKindLabel(e.kind)}</span>;
                })()}
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
  if (t === -1) return 'весь день';
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

window.Dashboard = Dashboard;
window.formatTime = formatTime;
