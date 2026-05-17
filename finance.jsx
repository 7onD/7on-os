// 7on OS — Finance page
const FinancePage = () => {
  const D = window.SEVEN_DATA;
  const monthIncome = D.MONTHLY[D.MONTHLY.length - 1].income;
  const monthExpenses = D.MONTHLY[D.MONTHLY.length - 1].expenses;
  const totalExpenses = D.FIN_EXPENSES.reduce((s, x) => s + x.amount, 0);
  const totalIncome = D.FIN_INCOME.reduce((s, x) => s + x.amount, 0);

  return (
    <div>
      <div className="grid cols-12">
        {/* Hero summary */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div className="stat-label">Баланс на 18 мая</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <div className="stat-big mono" style={{ fontSize: 42 }}>
              <span className="currency">₽</span>1 482<span style={{ color: 'var(--text-faint)', fontSize: 22 }}>k</span>
            </div>
            <span className="delta up mono" style={{ fontSize: 13 }}>↑ ₽218k</span>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 22 }}>
            <div style={{ flex: 1, borderLeft: '2px solid var(--green)', paddingLeft: 12 }}>
              <div className="stat-label">Доход май</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 500, marginTop: 2 }}>+₽{monthIncome.toLocaleString('ru-RU')}k</div>
            </div>
            <div style={{ flex: 1, borderLeft: '2px solid var(--red)', paddingLeft: 12 }}>
              <div className="stat-label">Расход май</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 500, marginTop: 2 }}>−₽{monthExpenses.toLocaleString('ru-RU')}k</div>
            </div>
            <div style={{ flex: 1, borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
              <div className="stat-label">Чистая</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: 'var(--accent)', marginTop: 2 }}>₽{(monthIncome - monthExpenses).toLocaleString('ru-RU')}k</div>
            </div>
          </div>
        </div>

        {/* Active deals — expected commissions */}
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div className="card-header">
            <div className="card-title">Ожидаемые комиссии</div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              сумма: ₽{(D.DEALS.reduce((s, d) => s + d.commission, 0) * 1000).toFixed(0)}k
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {D.DEALS.map(d => (
              <div key={d.id} className="deal" style={{ marginBottom: 0 }}>
                <div className="deal-head">
                  <div className="deal-name">{d.client}</div>
                  <span className="tag deal">{d.stage}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{d.object}</div>
                <div className="deal-amount" style={{ marginTop: 10 }}>
                  <span className="currency">₽</span>{(d.commission * 1000).toFixed(0)}<span className="currency">k</span>
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>
                  из ₽{d.amount} млн · {(d.commission / d.amount * 100).toFixed(1)}%
                </div>
                <div className="steps">
                  {Array.from({ length: d.total }, (_, i) => (
                    <div key={i} className="step" data-done={i < d.step ? '1' : '0'} />
                  ))}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', marginTop: 6 }}>к {d.expected}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly bar chart */}
        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div className="card-header">
            <div className="card-title">Динамика по месяцам</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span className="mono" style={{ color: 'var(--text-dim)' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent)', borderRadius: 2, verticalAlign: 'middle', marginRight: 5 }} />текущий месяц</span>
              <span className="mono" style={{ color: 'var(--text-dim)' }}><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--surface-3)', borderRadius: 2, verticalAlign: 'middle', marginRight: 5 }} />доход</span>
            </div>
          </div>
          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 14, padding: '14px 0' }}>
            {D.MONTHLY.map((d, i) => {
              const max = Math.max(...D.MONTHLY.map(x => x.income));
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="mono" style={{ fontSize: 10.5, color: d.current ? 'var(--accent)' : 'var(--text-faint)' }}>
                    {d.income}k
                  </div>
                  <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: 150 }}>
                    <div style={{ width: '100%', height: `${(d.income / max) * 100}%`, background: d.current ? 'var(--accent)' : 'var(--surface-3)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(d.expenses / d.income) * 100}%`, background: d.current ? 'rgba(255,107,122,0.5)' : 'rgba(255,107,122,0.3)', borderRadius: 0 }} />
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d.m}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <div className="card-header">
            <div className="card-title">Цели накоплений</div>
            <button className="btn ghost" style={{ padding: '4px 8px' }}><Icon name="plus" size={12} /></button>
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

        {/* Income breakdown */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <div className="card-header">
            <div className="card-title">Структура дохода <span className="count">май</span></div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>₽{totalIncome.toLocaleString('ru-RU')}k</span>
          </div>
          {D.FIN_INCOME.map(c => (
            <div key={c.name} className="fin-row">
              <div className="fin-name">{c.name}</div>
              <div className="fin-bar-wrap">
                <div className="fin-bar" style={{ width: `${c.pct}%`, background: 'var(--green)' }} />
              </div>
              <div className="fin-amt">₽{c.amount}k</div>
              <div className="fin-pct">{c.pct}%</div>
            </div>
          ))}
        </div>

        {/* Expenses breakdown */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <div className="card-header">
            <div className="card-title">Категории расходов <span className="count">май</span></div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>₽{totalExpenses.toLocaleString('ru-RU')}k</span>
          </div>
          {D.FIN_EXPENSES.map(c => (
            <div key={c.name} className="fin-row">
              <div className="fin-name">{c.name}</div>
              <div className="fin-bar-wrap">
                <div className="fin-bar" style={{ width: `${c.pct}%` }} />
              </div>
              <div className="fin-amt">₽{c.amount}k</div>
              <div className="fin-pct">{Math.round(c.amount / totalExpenses * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.FinancePage = FinancePage;
