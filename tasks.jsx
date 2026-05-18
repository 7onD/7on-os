// 7on OS — Tasks page
const TasksPage = ({ D, refresh }) => {
  const [filter, setFilter] = React.useState('all');
  const [sort, setSort]     = React.useState('date');
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', due: 'Сегодня', priority: 'med', type: 'personal', tag: '', description: '', reminder: '-1' });
  const [saving, setSaving] = React.useState(false);
  const [detailTask, setDetailTask] = React.useState(null);
  const [detailForm, setDetailForm] = React.useState({});
  const [detailSaving, setDetailSaving] = React.useState(false);

  const PRIO_ORDER = { high: 0, med: 1, low: 2 };
  const sortTasks = (list) => {
    const copy = [...list];
    if (sort === 'priority') return copy.sort((a, b) => (PRIO_ORDER[a.priority] ?? 1) - (PRIO_ORDER[b.priority] ?? 1));
    if (sort === 'alpha')    return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    // 'date': done tasks at bottom, then by due string (empty last)
    return copy.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  };

  const filterTasks = (list) => {
    let res = list;
    if (filter === 'open') res = res.filter(t => !t.done);
    else if (filter === 'done') res = res.filter(t => t.done);
    else if (filter === 'high') res = res.filter(t => t.priority === 'high');
    return sortTasks(res);
  };

  const personal = filterTasks(D.PERSONAL_TASKS);
  const work = filterTasks(D.WORK_TASKS);
  const study = filterTasks(D.STUDY_TASKS || []);
  const allTasks = D.PERSONAL_TASKS.concat(D.WORK_TASKS).concat(D.STUDY_TASKS || []);

  const handleToggle = async (id, done) => { await toggleTask(id, done); await refresh(); };
  const handleDelete = async (id) => { await deleteTask(id); await refresh(); };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createTask({ title: form.title.trim(), due: form.due, priority: form.priority, type: form.type, tag: form.type === 'work' ? form.tag : null, description: form.description, reminder: parseInt(form.reminder) });
      await refresh();
      setShowAdd(false);
      setForm({ title: '', due: 'Сегодня', priority: 'med', type: 'personal', tag: '', description: '', reminder: '-1' });

    } finally { setSaving(false); }
  };

  const openDetail = (task) => {
    setDetailTask(task);
    setDetailForm({
      title: task.title || '',
      due: task.due || '',
      priority: task.priority || 'med',
      description: task.description || '',
      tag: task.tag || '',
      done: task.done || false,
      reminder: String(task.reminder ?? '-1'),
    });
  };

  const handleDetailSave = async () => {
    if (!detailTask) return;
    setDetailSaving(true);
    try {
      await updateTask(detailTask.id, {
        title: detailForm.title,
        due: detailForm.due,
        priority: detailForm.priority,
        description: detailForm.description,
        tag: detailForm.tag || null,
        done: detailForm.done,
        reminder: parseInt(detailForm.reminder),
      });
      await refresh();
      setDetailTask(null);
    } finally { setDetailSaving(false); }
  };

  const handleDetailDelete = async () => {
    if (!detailTask || !confirm('Удалить задачу?')) return;
    setDetailSaving(true);
    try { await deleteTask(detailTask.id); await refresh(); setDetailTask(null); }
    finally { setDetailSaving(false); }
  };

  const handleDetailToggle = async () => {
    if (!detailTask) return;
    const newDone = !detailForm.done;
    setDetailForm(f => ({ ...f, done: newDone }));
    await toggleTask(detailTask.id, newDone);
    await refresh();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setD = (k, v) => setDetailForm(f => ({ ...f, [k]: v }));

  const PRIORITY_LABELS = { high: 'Высокий', med: 'Средний', low: 'Низкий' };
  const PRIORITY_COLORS = { high: 'var(--red)', med: 'var(--accent)', low: 'var(--blue)' };

  const TaskBlock = ({ title, tasks, type }) => (
    <div className="card">
      <div className="card-header">
        <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
          {title} <span className="count">{tasks.length}</span>
          {type === 'work' && <span className="tag work">Риэлтор</span>}
          {type === 'study' && <span className="tag" style={{ background:'rgba(122,167,255,0.12)', color:'var(--blue)' }}>Учёба</span>}
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
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onOpen={openDetail} />
            )}
          </div>
        </>
      )}

      {tasks.filter(t => !t.due || !t.due.startsWith('Сегодня')).length > 0 && (
        <>
          <div className="stat-label" style={{ marginTop:16 }}>Позже</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {tasks.filter(t => !t.due || !t.due.startsWith('Сегодня')).map(t =>
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onOpen={openDetail} />
            )}
          </div>
        </>
      )}

      {tasks.length === 0 && <div className="placeholder" style={{ marginTop:8 }}>Нет задач</div>}
    </div>
  );

  return (
    <div>
      {/* Add task modal */}
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
                <option value="study">Учебная</option>
              </FSelect>
            </Field>
            {form.type === 'work' && (
              <Field label="Метка"><FInput placeholder="Показ, Звонки…" value={form.tag} onChange={e => set('tag', e.target.value)} /></Field>
            )}
          </div>
          <Field label="Напоминание">
            <FSelect value={form.reminder} onChange={e => set('reminder', e.target.value)}>
              {(window.REMINDER_OPTIONS || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FSelect>
          </Field>
          <Field label="Заметки">
            <DescriptionWithLinks placeholder="Дополнительная информация… (/ для ссылки на файл или заметку)" value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </Modal>
      )}

      {/* Task detail panel */}
      {detailTask && (
        <div className="modal-backdrop" onClick={() => setDetailTask(null)}>
          <div className="task-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="task-detail-header">
              <button className="task-detail-check" data-done={detailForm.done ? '1' : '0'} onClick={handleDetailToggle} title="Выполнено">
                {detailForm.done ? <Icon name="check" size={14} /> : null}
              </button>
              <input className="task-detail-title" value={detailForm.title}
                onChange={e => setD('title', e.target.value)}
                placeholder="Название задачи" />
              <button className="icon-btn" onClick={() => setDetailTask(null)}><Icon name="x" size={14} /></button>
            </div>

            <div className="task-detail-body">
              <div className="task-detail-meta">
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Срок</span>
                  <FInput value={detailForm.due} onChange={e => setD('due', e.target.value)}
                    placeholder="Сегодня, 20 мая…" style={{ fontSize:13, flex:1 }} />
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Приоритет</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {['high','med','low'].map(p => (
                      <button key={p} onClick={() => setD('priority', p)}
                        style={{ padding:'4px 10px', borderRadius:6, fontSize:11.5, border:'1px solid', cursor:'pointer',
                          borderColor: detailForm.priority === p ? PRIORITY_COLORS[p] : 'var(--border)',
                          background: detailForm.priority === p ? `${PRIORITY_COLORS[p]}22` : 'transparent',
                          color: detailForm.priority === p ? PRIORITY_COLORS[p] : 'var(--text-dim)' }}>
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                {detailTask.type === 'work' && (
                  <div className="task-detail-row">
                    <span className="stat-label" style={{ minWidth:80 }}>Метка</span>
                    <FInput value={detailForm.tag} onChange={e => setD('tag', e.target.value)}
                      placeholder="Показ, Звонки…" style={{ fontSize:13, flex:1 }} />
                  </div>
                )}
              </div>

              <div className="task-detail-row" style={{ marginTop:12 }}>
                <span className="stat-label" style={{ minWidth:80 }}>Напоминание</span>
                <FSelect value={detailForm.reminder} onChange={e => setD('reminder', e.target.value)} style={{ fontSize:13, flex:1 }}>
                  {(window.REMINDER_OPTIONS || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FSelect>
              </div>
              <div style={{ marginTop:18 }}>
                <div className="stat-label" style={{ marginBottom:8 }}>Заметки</div>
                <DescriptionWithLinks
                  value={detailForm.description}
                  onChange={e => setD('description', e.target.value)}
                  placeholder="Дополнительная информация… (/ для ссылки на файл или заметку)"
                  style={{ fontSize:13, lineHeight:1.6 }}
                  minHeight={120}
                />
              </div>
            </div>

            <div className="task-detail-footer">
              <button className="btn" style={{ color:'var(--red)', borderColor:'rgba(255,107,122,0.2)' }} onClick={handleDetailDelete} disabled={detailSaving}>
                <Icon name="trash" size={12} /> Удалить
              </button>
              <div style={{ flex:1 }} />
              <button className="btn ghost" onClick={() => setDetailTask(null)}>Отмена</button>
              <button className="btn primary" onClick={handleDetailSave} disabled={detailSaving || !detailForm.title.trim()}>
                {detailSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
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
        <button className="filter" data-on="1" onClick={() => setSort(s => s === 'date' ? 'priority' : s === 'priority' ? 'alpha' : 'date')}>
          <Icon name="filter" size={12} />
          {sort === 'date' ? 'Дата' : sort === 'priority' ? 'Приоритет' : 'А→Я'}
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
        <TaskBlock title="Личное" tasks={personal} type="personal" />
        <TaskBlock title="Работа" tasks={work} type="work" />
        <TaskBlock title="Учёба" tasks={study} type="study" />
      </div>
    </div>
  );
};

window.TasksPage = TasksPage;
