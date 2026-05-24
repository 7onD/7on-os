// 7on OS — Dashboard page
const Dashboard = ({ D, setRoute, refresh }) => {
  const personalCount = D.PERSONAL_TASKS.filter(t => !t.done).length;
  const workCount = D.WORK_TASKS.filter(t => !t.done).length;
  const studyCount = (D.STUDY_TASKS || []).filter(t => !t.done).length;
  const hotLeads = D.CONTACTS.filter(c => c.status === 'hot');

  const _todayD = new Date();
  const todayIso = `${_todayD.getFullYear()}-${String(_todayD.getMonth()+1).padStart(2,'0')}-${String(_todayD.getDate()).padStart(2,'0')}`;
  // Задача в архиве — выполнена до сегодня (логика та же, что в tasks.jsx)
  const isArchivedDash = (t) => t.done && (t.done_at ? t.done_at < todayIso : true);
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

  const allTasks = D.PERSONAL_TASKS.concat(D.WORK_TASKS).concat(D.STUDY_TASKS || []);
  // Tasks "due on selected day" — match by full ISO date
  const dayTasks = allTasks.filter(t => t.due === calDay && !t.done);

  // Sort tasks: today on top, overdue second
  const sortForDash = (tasks) => [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return 0;
    const aToday = !!a.due && a.due === todayIso;
    const bToday = !!b.due && b.due === todayIso;
    if (aToday !== bToday) return aToday ? -1 : 1;
    const aOver = !!a.due && a.due < todayIso;
    const bOver = !!b.due && b.due < todayIso;
    if (aOver !== bOver) return aOver ? -1 : 1;
    return (a.sort_order ?? 999) - (b.sort_order ?? 999);
  });
  // Events for selected ISO date — exclude auto-created task events (by task_id or title match)
  const dayTaskTitles = new Set(dayTasks.map(t => (t.title || '').trim().toLowerCase()));
  const calDayEvents = D.EVENTS
    .filter(e => e.event_date === calDay &&
      !e.task_id &&
      !dayTaskTitles.has((e.title || '').trim().toLowerCase())
    )
    .sort((a, b) => a.start - b.start);

  const handleToggle = async (id, done) => { await toggleTask(id, done); await refresh(); };
  const handleDelete = async (id) => { await deleteTask(id); await refresh(); };
  const handleOpen = (task) => { if (window.SEVEN_NAV) window.SEVEN_NAV('tasks', { kind: 'task', id: task.id }); };

  const makeDashReorder = (fullList) => async (newTasks) => {
    await Promise.all(newTasks.map((t, i) => updateTask(t.id, { sort_order: i })));
    await refresh();
  };

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
          <div className="stat-label">Контакты</div>
          <div className="stat-big mono">{D.CONTACTS.length}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }} className="mono">
            <span style={{ fontSize: 11, color: 'var(--orange)' }}>{D.CONTACTS.filter(c=>c.status==='hot').length} горячих</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{D.CONTACTS.filter(c=>c.status==='warm').length} тёплых</span>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>{D.CONTACTS.filter(c=>c.status==='work').length} в работе</span>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{D.CONTACTS.filter(c=>c.status==='cold').length} холодных</span>
          </div>
        </div>

        {/* Personal tasks */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">Личные задачи <span className="count">{personalCount}</span></div>
            <button className="card-link" onClick={() => setRoute('tasks')}>открыть →</button>
          </div>
          <TaskDragList tasks={sortForDash(D.PERSONAL_TASKS.filter(t => !isArchivedDash(t))).slice(0, 5)} onToggle={handleToggle} onDelete={handleDelete} onOpen={handleOpen} onReorder={makeDashReorder(D.PERSONAL_TASKS)} />
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
          <TaskDragList tasks={sortForDash(D.WORK_TASKS.filter(t => !isArchivedDash(t))).slice(0, 5)} onToggle={handleToggle} onDelete={handleDelete} onOpen={handleOpen} onReorder={makeDashReorder(D.WORK_TASKS)} />
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
          <TaskDragList tasks={sortForDash((D.STUDY_TASKS || []).filter(t => !isArchivedDash(t))).slice(0, 5)} onToggle={handleToggle} onDelete={handleDelete} onOpen={handleOpen} onReorder={makeDashReorder(D.STUDY_TASKS || [])} />
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

        {/* Hot leads */}
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="flame" size={14} />
              Горячие лиды <span className="count">{hotLeads.length}</span>
            </div>
            <button className="card-link" onClick={() => setRoute('contacts')}>все →</button>
          </div>
          {hotLeads.length === 0 && <div className="placeholder">Нет горячих лидов</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: hotLeads.length ? 4 : 0 }}>
            {hotLeads.map(c => (
              <div key={c.id} onClick={() => window.SEVEN_NAV && window.SEVEN_NAV('contacts', { kind: 'contact', id: c.id })}
                style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div className="contact-name">{c.name}</div>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{fmtDate(c.lastContact)}</span>
                </div>
                <div className="contact-addr">{c.addr}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>{c.params}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)' }}>→ {c.next}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>· {fmtDate(c.nextWhen)}</span>
                </div>
              </div>
            ))}
          </div>
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
