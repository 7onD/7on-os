// 7on OS — Dashboard page
const Dashboard = ({ setRoute }) => {
  const D = window.SEVEN_DATA;
  const personalCount = D.PERSONAL_TASKS.filter(t => !t.done).length;
  const workCount = D.WORK_TASKS.filter(t => !t.done).length;
  const totalCommission = D.DEALS.reduce((s, d) => s + d.commission, 0);
  const monthIncome = D.MONTHLY[D.MONTHLY.length - 1].income;
  const monthExpenses = D.MONTHLY[D.MONTHLY.length - 1].expenses;
  const hotLeads = D.CONTACTS.filter(c => c.status === 'hot');

  const todayEvents = D.EVENTS.filter(e => e.day === 1).slice(0, 4);

  return (
    <div>
      <div className="grid cols-12">
        {/* Top KPI row */}
        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="stat-label">Доход · май</div>
          <div className="stat-big mono">
            <span className="currency">₽</span>{monthIncome.toLocaleString('ru-RU')}<span style={{ color: 'var(--text-faint)', fontSize: 16 }}>k</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="delta up mono">↑ 26.6%</span>
            <span className="mono" style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: 6 }}>vs апрель</span>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="stat-label">Ожидается · комиссии</div>
          <div className="stat-big mono">
            <span className="currency">₽</span>{(totalCommission * 1000).toLocaleString('ru-RU')}<span style={{ color: 'var(--text-faint)', fontSize: 16 }}>k</span>
          </div>
          <div style={{ marginTop: 6 }} className="mono" >
            <span style={{ color: 'var(--violet)', fontSize: 11 }}>{D.DEALS.length} активные сделки</span>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
          <div className="stat-label">Открытых задач</div>
          <div className="stat-big mono">
            {personalCount + workCount}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 12 }} className="mono">
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{personalCount} личных</span>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>{workCount} рабочих</span>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 3' }}>
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
            {D.PERSONAL_TASKS.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
          </div>
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
            {D.WORK_TASKS.slice(0, 5).map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>

        {/* Mini calendar */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">Календарь</div>
            <button className="card-link" onClick={() => setRoute('calendar')}>открыть →</button>
          </div>
          <MiniCal year={2026} month={4} today={18} eventDays={[18, 19, 20, 21, 22, 24, 27, 28, 31]} />
          <div style={{ marginTop: 16 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>Сегодня</div>
            {todayEvents.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', alignItems: 'baseline', borderBottom: i < todayEvents.length - 1 ? '1px solid var(--border)' : 0 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 50 }}>{formatTime(e.start)}</span>
                <span style={{ fontSize: 12.5, flex: 1 }}>{e.title}</span>
                <span className={`tag ${e.kind === 'deal' ? 'deal' : e.kind === 'work' ? 'work' : e.kind === 'personal' ? 'cold' : 'warm'}`}>
                  {e.kind === 'deal' ? 'Сделка' : e.kind === 'work' ? 'Работа' : e.kind === 'personal' ? 'Личное' : 'Встреча'}
                </span>
              </div>
            ))}
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
            <div key={c.id} style={{ padding: '10px 0', borderBottom: i < hotLeads.length - 1 ? '1px solid var(--border)' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="contact-name">{c.name}</div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.lastContact}</span>
              </div>
              <div className="contact-addr" style={{ marginTop: 4 }}>{c.addr}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>{c.params}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--accent)' }}>→ {c.next}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>· {c.nextWhen}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Active deals */}
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-header">
            <div className="card-title">Активные сделки <span className="count">{D.DEALS.length}</span></div>
            <button className="card-link">детали →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {D.DEALS.map(d => (
              <div key={d.id} className="deal" style={{ marginBottom: 0 }}>
                <div className="deal-head">
                  <div className="deal-name">{d.client}</div>
                  <div className="deal-stage">{d.stage}</div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{d.object}</div>
                <div className="deal-amount"><span className="currency">₽</span>{d.amount.toLocaleString('ru-RU')}<span className="currency"> млн</span></div>
                <div className="steps">
                  {Array.from({ length: d.total }, (_, i) => (
                    <div key={i} className="step" data-done={i < d.step ? '1' : '0'} />
                  ))}
                </div>
                <div className="deal-meta">
                  <span>комиссия ₽{(d.commission * 1000).toFixed(0)}k</span>
                  <span>· к {d.expected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="card-header">
            <div className="card-title">Цели накоплений</div>
            <button className="card-link" onClick={() => setRoute('finance')}>все →</button>
          </div>
          {D.GOALS.map(g => (
            <div key={g.name} className="goal">
              <div className="goal-head">
                <div className="goal-name">{g.name}</div>
                <div className="goal-pct">{g.pct}%</div>
              </div>
              <div className="goal-bar-wrap">
                <div className="goal-bar" style={{ width: `${g.pct}%` }} />
              </div>
              <div className="goal-meta">
                <span>₽{g.current.toLocaleString('ru-RU')}k</span>
                <span>цель ₽{g.target.toLocaleString('ru-RU')}k</span>
              </div>
            </div>
          ))}
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
