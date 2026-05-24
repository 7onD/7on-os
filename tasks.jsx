// 7on OS — Tasks page
// TaskDragList is defined in shared.jsx (loads before this file)

const TasksPage = ({ D, refresh, navTarget, onNavConsumed }) => {
  const [filter, setFilter] = React.useState('all');
  const [sort, setSort]     = React.useState('date');
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', due: '', time: '', priority: 'med', type: 'personal', tag: 'Личное', description: '', reminder: '-1', deadline: '' });
  const [saving, setSaving] = React.useState(false);
  const [detailTask, setDetailTask] = React.useState(null);
  const [detailForm, setDetailForm] = React.useState({});
  const [detailSaving, setDetailSaving] = React.useState(false);

  const TYPE_TAG_DEFAULT = { personal: 'Личное', study: 'Учёба', work: 'Работа' };
  const _todayStr = new Date().toISOString().slice(0, 10);
  // Tasks done before today are hidden completely; tasks done today stay in "Выполненные" until midnight
  const isArchived = (t) => t.done && (t.done_at ? t.done_at < _todayStr : true);

  const PRIO_ORDER = { high: 0, med: 1, low: 2 };
  const sortTasks = (list) => {
    const copy = [...list];
    if (sort === 'priority') return copy.sort((a, b) => (PRIO_ORDER[a.priority] ?? 1) - (PRIO_ORDER[b.priority] ?? 1));
    if (sort === 'alpha')    return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    // 'date': done at bottom; among open: today first, then overdue, then by sort_order/due
    return copy.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done) return 0;
      const aToday = !!a.due && a.due === _todayStr;
      const bToday = !!b.due && b.due === _todayStr;
      if (aToday !== bToday) return aToday ? -1 : 1;
      const aOver = !!a.due && a.due < _todayStr;
      const bOver = !!b.due && b.due < _todayStr;
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  };

  const filterTasks = (list) => {
    // Always exclude tasks that have passed their day (hidden forever)
    let res = list.filter(t => !isArchived(t));
    if (filter === 'open' || filter === 'all') res = res.filter(t => !t.done);
    else if (filter === 'done') res = res.filter(t => t.done);
    else if (filter === 'high') res = res.filter(t => t.priority === 'high' && !t.done);
    return sortTasks(res);
  };

  const personal = filterTasks(D.PERSONAL_TASKS);
  const work = filterTasks(D.WORK_TASKS);
  const study = filterTasks(D.STUDY_TASKS || []);
  const allTasks = D.PERSONAL_TASKS.concat(D.WORK_TASKS).concat(D.STUDY_TASKS || []);

  // Open task from search/dashboard navigation
  React.useEffect(() => {
    if (!navTarget || navTarget.kind !== 'task') return;
    const task = allTasks.find(t => t.id === navTarget.id);
    if (task) openDetail(task);
    onNavConsumed && onNavConsumed();
  }, [navTarget]);

  const handleToggle = async (id, done) => {
    await toggleTask(id, done);
    if (done) {
      const task = allTasks.find(t => t.id === id);
      if (task) {
        const linkedEv = D.EVENTS.find(e =>
          e.task_id === id ||
          (!e.task_id && (e.title||'').trim() === (task.title||'').trim() && (e.event_date||'') === (task.due||''))
        );
        if (linkedEv) await deleteEvent(linkedEv.id);
      }
    }
    await refresh();
  };
  const handleDelete = async (id) => { await deleteTask(id); await refresh(); };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const effectiveTag = TYPE_TAG_DEFAULT[form.type] || 'Личное';
      const taskId = await createTask({ title: form.title.trim(), due: form.due, time: form.time, priority: form.priority, type: form.type, tag: effectiveTag, description: form.description, reminder: parseInt(form.reminder), deadline: form.deadline || null });
      // Auto-add to calendar if due date is set
      if (form.due) {
        const kindMap = { personal: 'personal', work: 'work', study: 'personal' };
        let startF = -1, endF = -1;
        if (form.time) {
          const [h, m] = form.time.split(':').map(Number);
          startF = h + m / 60; endF = Math.min(startF + 1, 20);
        }
        await createEvent({ day: 1, start: startF, end: endF, title: form.title.trim(), kind: kindMap[form.type] || 'personal', description: '', reminder: -1, event_date: form.due, task_id: taskId });
      }
      await refresh();
      setShowAdd(false);
      setForm({ title: '', due: '', time: '', priority: 'med', type: 'personal', tag: 'Личное', description: '', reminder: '-1', deadline: '' });
    } finally { setSaving(false); }
  };

  const openDetail = (task) => {
    setDetailTask(task);
    setDetailForm({
      title: task.title || '',
      due: task.due || '',
      time: task.time || '',
      priority: task.priority || 'med',
      description: task.description || '',
      tag: task.tag || TYPE_TAG_DEFAULT[task.type] || 'Личное',
      done: task.done || false,
      reminder: String(task.reminder ?? '-1'),
      deadline: task.deadline || '',
    });
  };

  const handleDetailSave = async () => {
    if (!detailTask) return;
    setDetailSaving(true);
    try {
      const effectiveTag = TYPE_TAG_DEFAULT[detailTask.type] || 'Личное';
      await updateTask(detailTask.id, {
        title: detailForm.title,
        due: detailForm.due,
        time: detailForm.time,
        priority: detailForm.priority,
        description: detailForm.description,
        tag: effectiveTag,
        done: detailForm.done,
        reminder: parseInt(detailForm.reminder),
        deadline: detailForm.deadline || null,
      });

      // ── Sync linked calendar event ─────────────────────────────────────────
      const kindMap = { personal: 'personal', work: 'work', study: 'personal' };
      // Find event by task_id (new) or by matching title+date (legacy)
      const linkedEvent = D.EVENTS.find(e =>
        e.task_id === detailTask.id ||
        (!e.task_id && (e.title || '').trim() === (detailTask.title || '').trim() && (e.event_date || '') === (detailTask.due || ''))
      );
      const dueChanged  = (detailForm.due  || '') !== (detailTask.due  || '');
      const timeChanged = (detailForm.time || '') !== (detailTask.time || '');

      if (linkedEvent) {
        if (detailForm.due) {
          if (dueChanged || timeChanged) {
            let startF = -1, endF = -1;
            if (detailForm.time) { const [h, m] = detailForm.time.split(':').map(Number); startF = h + m / 60; endF = Math.min(startF + 1, 20); }
            await updateEvent(linkedEvent.id, {
              title: detailForm.title, event_date: detailForm.due,
              start: startF, end: endF,
              kind: kindMap[detailTask.type] || 'personal',
              description: linkedEvent.description || '',
              reminder: linkedEvent.reminder ?? -1,
              day: linkedEvent.day || 1,
              task_id: detailTask.id,
            });
          }
        } else {
          // Due date cleared → remove linked event
          await deleteEvent(linkedEvent.id);
        }
      } else if (detailForm.due && !detailTask.due) {
        // Due date newly added, no existing event → create
        let startF = -1, endF = -1;
        if (detailForm.time) { const [h, m] = detailForm.time.split(':').map(Number); startF = h + m / 60; endF = Math.min(startF + 1, 20); }
        await createEvent({ day: 1, start: startF, end: endF, title: detailForm.title, kind: kindMap[detailTask.type] || 'personal', description: '', reminder: -1, event_date: detailForm.due, task_id: detailTask.id });
      }

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
    if (newDone) {
      const linkedEv = D.EVENTS.find(e =>
        e.task_id === detailTask.id ||
        (!e.task_id && (e.title||'').trim() === (detailTask.title||'').trim() && (e.event_date||'') === (detailTask.due||''))
      );
      if (linkedEv) await deleteEvent(linkedEv.id);
    }
    await refresh();
  };

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'type') {
      const typeDefaults = Object.values(TYPE_TAG_DEFAULT);
      if (!f.tag.trim() || typeDefaults.includes(f.tag)) next.tag = TYPE_TAG_DEFAULT[v] || 'Личное';
    }
    return next;
  });
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
      <TaskDragList tasks={tasks} onToggle={handleToggle} onDelete={handleDelete} onOpen={openDetail}
        onReorder={async (newTasks) => {
          await Promise.all(newTasks.map((t, i) => updateTask(t.id, { sort_order: i })));
          await refresh();
        }} />
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
          <div className="form-row" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <Field label="Срок">
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <FInput type="date" value={form.due} onChange={e => set('due', e.target.value)} style={{ flex:1, minWidth:0 }} />
                {form.due && <button type="button" className="icon-btn" style={{ flexShrink:0, width:26, height:26 }} onClick={() => set('due','')}>×</button>}
              </div>
            </Field>
            <Field label="Время">
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <FInput type="time" value={form.time} onChange={e => set('time', e.target.value)} style={{ flex:1, minWidth:0 }} />
                {form.time && <button type="button" className="icon-btn" style={{ flexShrink:0, width:26, height:26 }} onClick={() => set('time','')}>×</button>}
              </div>
            </Field>
          </div>
          <Field label="Крайний срок (дедлайн)">
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <FInput type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                style={{ flex:1, ...(form.deadline ? { borderColor:'rgba(255,107,122,0.5)', color:'var(--red)' } : {}) }} />
              {form.deadline && <button type="button" className="icon-btn" style={{ width:26, height:26, flexShrink:0 }} onClick={() => set('deadline','')}>×</button>}
            </div>
          </Field>
          <div className="form-row">
            <Field label="Приоритет">
              <FSelect value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">Высокий</option>
                <option value="med">Средний</option>
                <option value="low">Низкий</option>
              </FSelect>
            </Field>
            <Field label="Тип">
              <FSelect value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="personal">Личная</option>
                <option value="work">Рабочая</option>
                <option value="study">Учебная</option>
              </FSelect>
            </Field>
          </div>
          <Field label="Заранее уведомить">
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
              <textarea className="task-detail-title" value={detailForm.title}
                onChange={e => {
                  setD('title', e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                rows={1}
                placeholder="Название задачи" />
              <button className="icon-btn" onClick={() => setDetailTask(null)}><Icon name="x" size={14} /></button>
            </div>

            <div className="task-detail-body">
              <div className="task-detail-meta">
                <div className="task-detail-row task-detail-row-datetime">
                  <span className="stat-label" style={{ minWidth:80 }}>Срок</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flex:1, minWidth:0 }}>
                    <FInput type="date" value={detailForm.due || ''} onChange={e => setD('due', e.target.value)}
                      style={{ fontSize:13, flex:1, minWidth:0 }} />
                    {detailForm.due && <button type="button" className="icon-btn" style={{ width:24, height:24, flexShrink:0 }} onClick={() => setD('due','')}>×</button>}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:8 }}>
                    <FInput type="time" value={detailForm.time || ''} onChange={e => setD('time', e.target.value)}
                      style={{ fontSize:13, width:100 }} />
                    {detailForm.time && <button type="button" className="icon-btn" style={{ width:24, height:24, flexShrink:0 }} onClick={() => setD('time','')}>×</button>}
                  </div>
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80, color:'var(--red)', opacity: detailForm.deadline ? 1 : 0.5 }}>Дедлайн</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flex:1 }}>
                    <FInput type="date" value={detailForm.deadline || ''} onChange={e => setD('deadline', e.target.value)}
                      style={{ fontSize:13, flex:1, ...(detailForm.deadline ? { borderColor:'rgba(255,107,122,0.5)', color:'var(--red)' } : {}) }} />
                    {detailForm.deadline && <button type="button" className="icon-btn" style={{ width:24, height:24, flexShrink:0 }} onClick={() => setD('deadline','')}>×</button>}
                  </div>
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
              </div>

              <div className="task-detail-row" style={{ marginTop:12 }}>
                <span className="stat-label" style={{ minWidth:80 }}>Заранее</span>
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
          <div className="subtitle">{allTasks.filter(t => !t.done && !isArchived(t)).length} открытых · {allTasks.filter(t => t.done && !isArchived(t)).length} выполнено сегодня</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Задача</button>
        </div>
      </div>

      <div className="filters">
        {[['all','Открытые',allTasks.filter(t=>!t.done&&!isArchived(t)).length],
          ['high','Приоритет',allTasks.filter(t=>t.priority==='high'&&!t.done).length],
          ['done','Выполненные',allTasks.filter(t=>t.done&&!isArchived(t)).length]].map(([id,label,num]) => (
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
