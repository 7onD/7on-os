// 7on OS — Finance page
const FinancePage = ({ D, refresh }) => {
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showAddExpense, setShowAddExpense] = React.useState(false);
  const [showAddGoal, setShowAddGoal] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState(null);
  const [goalInput, setGoalInput] = React.useState('');
  const [incForm, setIncForm] = React.useState({ name:'', amount:'' });
  const [expForm, setExpForm] = React.useState({ name:'', amount:'' });
  const [goalForm, setGoalForm] = React.useState({ name:'', target:'', current:'0' });
  const [saving, setSaving] = React.useState(false);

  const monthIncome   = D.MONTHLY.length ? D.MONTHLY[D.MONTHLY.length-1].income   : 0;
  const monthExpenses = D.MONTHLY.length ? D.MONTHLY[D.MONTHLY.length-1].expenses : 0;
  const totalIncome   = D.FIN_INCOME.reduce((s,x)=>s+Number(x.amount),0);
  const totalExpenses = D.FIN_EXPENSES.reduce((s,x)=>s+Number(x.amount),0);

  const handleAddIncome = async () => {
    if (!incForm.name || !incForm.amount) return;
    setSaving(true);
    try {
      await createFinIncome({ name: incForm.name, amount: Number(incForm.amount), pct: 0 });
      await refresh();
      setShowAddIncome(false);
      setIncForm({ name:'', amount:'' });
    } finally { setSaving(false); }
  };

  const handleAddExpense = async () => {
    if (!expForm.name || !expForm.amount) return;
    setSaving(true);
    try {
      await createFinExpense({ name: expForm.name, amount: Number(expForm.amount), pct: 0 });
      await refresh();
      setShowAddExpense(false);
      setExpForm({ name:'', amount:'' });
    } finally { setSaving(false); }
  };

  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.target) return;
    setSaving(true);
    try {
      await createGoal({ name: goalForm.name, target: Number(goalForm.target), current: Number(goalForm.current)||0 });
      await refresh();
      setShowAddGoal(false);
      setGoalForm({ name:'', target:'', current:'0' });
    } finally { setSaving(false); }
  };

  const handleGoalUpdate = async (goal) => {
    const newVal = parseFloat(goalInput);
    if (isNaN(newVal) || newVal < 0) return;
    setSaving(true);
    try { await updateGoal(goal.id, newVal, goal.target); await refresh(); setEditingGoal(null); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {showAddIncome && (
        <Modal title="Добавить доход" onClose={() => setShowAddIncome(false)}
          onConfirm={handleAddIncome} confirmLabel={saving?'Сохранение…':'Добавить'} confirmDisabled={saving||!incForm.name||!incForm.amount}>
          <Field label="Категория"><FInput placeholder="Комиссии, Консультации…" value={incForm.name} onChange={e=>setIncForm(f=>({...f,name:e.target.value}))} autoFocus /></Field>
          <Field label="Сумма, тыс. ₽"><FInput type="number" placeholder="0" value={incForm.amount} onChange={e=>setIncForm(f=>({...f,amount:e.target.value}))} /></Field>
        </Modal>
      )}
      {showAddExpense && (
        <Modal title="Добавить расход" onClose={() => setShowAddExpense(false)}
          onConfirm={handleAddExpense} confirmLabel={saving?'Сохранение…':'Добавить'} confirmDisabled={saving||!expForm.name||!expForm.amount}>
          <Field label="Категория"><FInput placeholder="Транспорт, Кафе…" value={expForm.name} onChange={e=>setExpForm(f=>({...f,name:e.target.value}))} autoFocus /></Field>
          <Field label="Сумма, тыс. ₽"><FInput type="number" placeholder="0" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))} /></Field>
        </Modal>
      )}
      {showAddGoal && (
        <Modal title="Новая цель накоплений" onClose={() => setShowAddGoal(false)}
          onConfirm={handleAddGoal} confirmLabel={saving?'Сохранение…':'Добавить'} confirmDisabled={saving||!goalForm.name||!goalForm.target}>
          <Field label="Название"><FInput placeholder="Поездка в Японию" value={goalForm.name} onChange={e=>setGoalForm(f=>({...f,name:e.target.value}))} autoFocus /></Field>
          <div className="form-row">
            <Field label="Цель, тыс. ₽"><FInput type="number" placeholder="600" value={goalForm.target} onChange={e=>setGoalForm(f=>({...f,target:e.target.value}))} /></Field>
            <Field label="Накоплено, тыс. ₽"><FInput type="number" placeholder="0" value={goalForm.current} onChange={e=>setGoalForm(f=>({...f,current:e.target.value}))} /></Field>
          </div>
        </Modal>
      )}

      <div className="grid cols-12">
        {/* Hero balance */}
        <div className="card" style={{ gridColumn:'span 5' }}>
          <div className="stat-label">Баланс · май 2026</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginTop:4 }}>
            <div className="stat-big mono" style={{ fontSize:42 }}>
              <span className="currency">₽</span>1 482<span style={{ color:'var(--text-faint)', fontSize:22 }}>k</span>
            </div>
            <span className="delta up mono" style={{ fontSize:13 }}>↑ ₽218k</span>
          </div>
          <div style={{ display:'flex', gap:24, marginTop:22 }}>
            <div style={{ flex:1, borderLeft:'2px solid var(--green)', paddingLeft:12 }}>
              <div className="stat-label">Доход май</div>
              <div className="mono" style={{ fontSize:20, fontWeight:500, marginTop:2 }}>+₽{monthIncome}k</div>
            </div>
            <div style={{ flex:1, borderLeft:'2px solid var(--red)', paddingLeft:12 }}>
              <div className="stat-label">Расход май</div>
              <div className="mono" style={{ fontSize:20, fontWeight:500, marginTop:2 }}>−₽{monthExpenses}k</div>
            </div>
            <div style={{ flex:1, borderLeft:'2px solid var(--accent)', paddingLeft:12 }}>
              <div className="stat-label">Чистая</div>
              <div className="mono" style={{ fontSize:20, fontWeight:500, color:'var(--accent)', marginTop:2 }}>₽{monthIncome-monthExpenses}k</div>
            </div>
          </div>
        </div>

        {/* Expected commissions */}
        <div className="card" style={{ gridColumn:'span 7' }}>
          <div className="card-header">
            <div className="card-title">Ожидаемые комиссии</div>
            <span className="mono" style={{ fontSize:11, color:'var(--text-faint)' }}>₽{(D.DEALS.reduce((s,d)=>s+Number(d.commission),0)*1000).toFixed(0)}k</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
            {D.DEALS.map(d => (
              <div key={d.id} className="deal" style={{ marginBottom:0 }}>
                <div className="deal-head">
                  <div className="deal-name">{d.client}</div>
                  <span className="tag deal">{d.stage}</span>
                </div>
                <div className="mono" style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{d.object}</div>
                <div className="deal-amount" style={{ marginTop:10 }}>
                  <span className="currency">₽</span>{(d.commission*1000).toFixed(0)}<span className="currency">k</span>
                </div>
                <div className="steps">
                  {Array.from({length:d.total},(_,i)=><div key={i} className="step" data-done={i<d.step?'1':'0'}/>)}
                </div>
                <div className="mono" style={{ fontSize:10.5, color:'var(--accent)', marginTop:6 }}>к {d.expected}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly chart */}
        <div className="card" style={{ gridColumn:'span 8' }}>
          <div className="card-header">
            <div className="card-title">Динамика по месяцам</div>
            <div style={{ display:'flex', gap:12, fontSize:11 }}>
              <span className="mono" style={{ color:'var(--text-dim)' }}><span style={{ display:'inline-block', width:10, height:10, background:'var(--accent)', borderRadius:2, verticalAlign:'middle', marginRight:5 }}/>текущий</span>
              <span className="mono" style={{ color:'var(--text-dim)' }}><span style={{ display:'inline-block', width:10, height:10, background:'rgba(255,107,122,0.4)', borderRadius:2, verticalAlign:'middle', marginRight:5 }}/>расход</span>
            </div>
          </div>
          <div style={{ height:200, display:'flex', alignItems:'flex-end', gap:14, padding:'14px 0' }}>
            {D.MONTHLY.map((d,i) => {
              const max = Math.max(...D.MONTHLY.map(x=>x.income));
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div className="mono" style={{ fontSize:10.5, color:d.current?'var(--accent)':'var(--text-faint)' }}>{d.income}k</div>
                  <div style={{ width:'100%', display:'flex', alignItems:'flex-end', height:150 }}>
                    <div style={{ width:'100%', height:`${(d.income/max)*100}%`, background:d.current?'var(--accent)':'var(--surface-3)', borderRadius:'4px 4px 0 0', position:'relative' }}>
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${(d.expenses/d.income)*100}%`, background:d.current?'rgba(255,107,122,0.5)':'rgba(255,107,122,0.3)' }} />
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize:11, color:'var(--text-dim)' }}>{d.m}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div className="card" style={{ gridColumn:'span 4' }}>
          <div className="card-header">
            <div className="card-title">Цели накоплений</div>
            <button className="btn ghost" style={{ padding:'4px 8px' }} onClick={() => setShowAddGoal(true)}><Icon name="plus" size={12} /></button>
          </div>
          {D.GOALS.length === 0 && <div className="placeholder">Нет целей</div>}
          {D.GOALS.map(g => (
            <div key={g.id} className="goal">
              <div className="goal-head">
                <div className="goal-name">{g.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div className="goal-pct">{g.pct}%</div>
                  <button className="icon-btn" style={{ width:20, height:20 }} onClick={() => { setEditingGoal(g.id); setGoalInput(String(g.current)); }}><Icon name="edit" size={10}/></button>
                  <button className="icon-btn" style={{ width:20, height:20 }} onClick={async()=>{ if(confirm('Удалить цель?')){await deleteGoal(g.id);await refresh();}}}><Icon name="trash" size={10}/></button>
                </div>
              </div>
              {editingGoal === g.id && (
                <div style={{ display:'flex', gap:6, margin:'6px 0' }}>
                  <FInput type="number" value={goalInput} onChange={e=>setGoalInput(e.target.value)}
                    placeholder="Накоплено, тыс. ₽" style={{ fontSize:12 }}
                    onKeyDown={e=>e.key==='Enter'&&handleGoalUpdate(g)} autoFocus />
                  <button className="btn primary" style={{ padding:'6px 10px' }} onClick={()=>handleGoalUpdate(g)} disabled={saving}>✓</button>
                  <button className="btn" style={{ padding:'6px 10px' }} onClick={()=>setEditingGoal(null)}>✕</button>
                </div>
              )}
              <div className="goal-bar-wrap"><div className="goal-bar" style={{ width:`${g.pct}%` }}/></div>
              <div className="goal-meta">
                <span>₽{Number(g.current).toLocaleString('ru-RU')}k</span>
                <span>цель ₽{Number(g.target).toLocaleString('ru-RU')}k</span>
              </div>
            </div>
          ))}
        </div>

        {/* Income breakdown */}
        <div className="card" style={{ gridColumn:'span 6' }}>
          <div className="card-header">
            <div className="card-title">Структура дохода <span className="count">май</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="mono" style={{ fontSize:11, color:'var(--text-faint)' }}>₽{totalIncome}k</span>
              <button className="btn ghost" style={{ padding:'4px 8px' }} onClick={()=>setShowAddIncome(true)}><Icon name="plus" size={12}/></button>
            </div>
          </div>
          {D.FIN_INCOME.length === 0 && <div className="placeholder">Нет данных</div>}
          {D.FIN_INCOME.map(c => (
            <div key={c.id} className="fin-row">
              <div className="fin-name">{c.name}</div>
              <div className="fin-bar-wrap"><div className="fin-bar" style={{ width:`${totalIncome>0?Math.round(c.amount/totalIncome*100):0}%`, background:'var(--green)' }}/></div>
              <div className="fin-amt">₽{c.amount}k</div>
              <div className="fin-pct">{totalIncome>0?Math.round(c.amount/totalIncome*100):0}%</div>
              <button className="icon-btn" style={{ width:20, height:20, flexShrink:0 }}
                onClick={async()=>{if(confirm('Удалить?')){await deleteFinIncome(c.id);await refresh();}}}>
                <Icon name="x" size={10}/>
              </button>
            </div>
          ))}
        </div>

        {/* Expense breakdown */}
        <div className="card" style={{ gridColumn:'span 6' }}>
          <div className="card-header">
            <div className="card-title">Категории расходов <span className="count">май</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="mono" style={{ fontSize:11, color:'var(--text-faint)' }}>₽{totalExpenses}k</span>
              <button className="btn ghost" style={{ padding:'4px 8px' }} onClick={()=>setShowAddExpense(true)}><Icon name="plus" size={12}/></button>
            </div>
          </div>
          {D.FIN_EXPENSES.length === 0 && <div className="placeholder">Нет данных</div>}
          {D.FIN_EXPENSES.map(c => (
            <div key={c.id} className="fin-row">
              <div className="fin-name">{c.name}</div>
              <div className="fin-bar-wrap"><div className="fin-bar" style={{ width:`${totalExpenses>0?Math.round(c.amount/totalExpenses*100):0}%` }}/></div>
              <div className="fin-amt">₽{c.amount}k</div>
              <div className="fin-pct">{totalExpenses>0?Math.round(c.amount/totalExpenses*100):0}%</div>
              <button className="icon-btn" style={{ width:20, height:20, flexShrink:0 }}
                onClick={async()=>{if(confirm('Удалить?')){await deleteFinExpense(c.id);await refresh();}}}>
                <Icon name="x" size={10}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.FinancePage = FinancePage;
