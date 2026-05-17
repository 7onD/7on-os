// 7on OS — Tasks page
const TasksPage = ({ D, refresh }) => {
  const [filter, setFilter] = React.useState('all');
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', due: 'Сегодня', priority: 'med', type: 'personal', tag: '' });
  const [saving, setSaving] = React.useState(false);

  const filterTasks = (list) => {
    if (filter === 'open') return list.filter(t => !t.done);
    if (filter === 'done') return list.filter(t => t.done);
    if (filter === 'high') return list.filter(t => t.priority === 'high');
    return list;
  };

  const personal = filterTasks(D.PERSONAL_TASKS);
  const work = filterTasks(D.WORK_TASKS);
  const allTasks = D.PERSONAL_TASKS.concat(D.WORK_TASKS);

  const handleToggle = async (id, done) => { await toggleTask(id, done); await refresh(); };
  const handleDelete = async (id) => { await deleteTask(id); await refresh(); };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createTask({ title: form.title.trim(), due: form.due, priority: form.priority, type: form.type, tag: form.type === 'work' ? form.tag : null });
      await refresh();
      setShowAdd(false);
      setForm({ title: '', due: 'Сегодня', priority: 'med', type: 'personal', tag: '' });
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TaskBlock = ({ title, badge, tasks, type }) => (
    <div className="card">
      <div className="card-header">
        <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
          {title} <span className="count">{tasks.length}</span>
          {type === 'work' && <span className="tag work">Риэлтор</span>}
        </div>
        <button className="btn ghost" style={{ padding:'4px 8px' }} onClick={() => { set('type', type); setShowAdd(true); }}>
          <Icon name="plus" size={13} /> Задача
        </button>
      </div>

      {tasks.filter(t => t.due && t.due.startsWith('Сегодня')).length > 0 && (
        <>
          <div className="stat-label" style={{ marginTop:4 }}>Сегодня</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {tasks.filter(t => t.due && t.due.startsWith('Сегодня')).map(t =>
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
            )}
          </div>
        </>
      )}

      {tasks.filter(t => !t.due || !t.due.startsWith('Сегодня')).length > 0 && (
        <>
          <div className="stat-label" style={{ marginTop:16 }}>Позже</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {tasks.filter(t => !t.due || !t.due.startsWith('Сегодня')).map(t =>
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
            )}
          </div>
        </>
      )}

      {tasks.length === 0 && (
        <div className="placeholder" style={{ marginTop:8 }}>Нет задач</div>
      )}
    </div>
  );

  return (
    <div>
      {showAdd && (
        <Modal title="Новая задача" onClose={() => setShowAdd(false)}
          onConfirm={handleAdd} confirmLabel={saving ? 'Сохранение…' : 'Добавить'}
          confirmDisabled={saving || !form.title.trim()}>
          <Field label="Название">
            <FInput placeholder="Что нужно сделать?" value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          </Field>
          <div className="form-row">
            <Field label="Срок"><FInput placeholder="Сегодня, 20 мая…" value={form.due} onChange={e => set('due', e.target.value)} /></Field>
            <Field label="Приоритет">
              <FSelect value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">Высокий</option>
                <option value="med">Средний</option>
                <option value="low">Низкий</option>
              </FSelect>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Тип">
              <FSelect value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="personal">Личная</option>
                <option value="work">Рабочая</option>
              </FSelect>
            </Field>
            {form.type === 'work' && (
              <Field label="Метка"><FInput placeholder="Показ, Звонки…" value={form.tag} onChange={e => set('tag', e.target.value)} /></Field>
            )}
          </div>
        </Modal>
      )}

      <div className="page-header">
        <div>
          <h2>Задачи</h2>
          <div className="subtitle">{allTasks.filter(t => !t.done).length} открытых · {allTasks.filter(t => t.done).length} выполнено</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Задача</button>
        </div>
      </div>

      <div className="filters">
        {[['all','Все',allTasks.length],['open','Открытые',allTasks.filter(t=>!t.done).length],
          ['high','Приоритет',allTasks.filter(t=>t.priority==='high').length],
          ['done','Выполнено',allTasks.filter(t=>t.done).length]].map(([id,label,num]) => (
          <button key={id} className="filter" data-on={filter===id?'1':'0'} onClick={() => setFilter(id)}>
            {label} <span className="num">{num}</span>
          </button>
        ))}
        <div style={{ flex:1 }} />
        <button className="filter"><Icon name="filter" size={12} /> Сортировка: дата</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <TaskBlock title="Личное" tasks={personal} type="personal" />
        <TaskBlock title="Работа" tasks={work} type="work" />
      </div>
    </div>
  );
};

window.TasksPage = TasksPage;
