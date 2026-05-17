// 7on OS — Tasks page (personal + work side by side)
const TasksPage = () => {
  const D = window.SEVEN_DATA;
  const [filter, setFilter] = React.useState('all');

  const filterTasks = (list) => {
    if (filter === 'all') return list;
    if (filter === 'open') return list.filter(t => !t.done);
    if (filter === 'done') return list.filter(t => t.done);
    if (filter === 'high') return list.filter(t => t.priority === 'high');
    return list;
  };

  const personal = filterTasks(D.PERSONAL_TASKS);
  const work = filterTasks(D.WORK_TASKS);

  return (
    <div>
      <div className="filters">
        <button className="filter" data-on={filter === 'all' ? '1' : '0'} onClick={() => setFilter('all')}>
          Все <span className="num">{D.PERSONAL_TASKS.length + D.WORK_TASKS.length}</span>
        </button>
        <button className="filter" data-on={filter === 'open' ? '1' : '0'} onClick={() => setFilter('open')}>
          Открытые <span className="num">{D.PERSONAL_TASKS.concat(D.WORK_TASKS).filter(t => !t.done).length}</span>
        </button>
        <button className="filter" data-on={filter === 'high' ? '1' : '0'} onClick={() => setFilter('high')}>
          Высокий приоритет <span className="num">{D.PERSONAL_TASKS.concat(D.WORK_TASKS).filter(t => t.priority === 'high').length}</span>
        </button>
        <button className="filter" data-on={filter === 'done' ? '1' : '0'} onClick={() => setFilter('done')}>
          Выполнено <span className="num">{D.PERSONAL_TASKS.concat(D.WORK_TASKS).filter(t => t.done).length}</span>
        </button>
        <div style={{ flex: 1 }} />
        <button className="filter"><Icon name="filter" size={12} /> Сортировка: дата</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Personal */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Личное <span className="count">{personal.length}</span>
            </div>
            <button className="btn ghost" style={{ padding: '4px 8px' }}>
              <Icon name="plus" size={13} /> Задача
            </button>
          </div>

          <div className="stat-label" style={{ marginTop: 4 }}>Сегодня</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {personal.filter(t => t.due.startsWith('Сегодня')).map(t => <TaskRow key={t.id} task={t} />)}
          </div>

          <div className="stat-label" style={{ marginTop: 16 }}>Позже</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {personal.filter(t => !t.due.startsWith('Сегодня')).map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>

        {/* Work */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Работа <span className="count">{work.length}</span>
              <span className="tag work">Риэлтор</span>
            </div>
            <button className="btn ghost" style={{ padding: '4px 8px' }}>
              <Icon name="plus" size={13} /> Задача
            </button>
          </div>

          <div className="stat-label" style={{ marginTop: 4 }}>Сегодня</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {work.filter(t => t.due.startsWith('Сегодня')).map(t => <TaskRow key={t.id} task={t} />)}
          </div>

          <div className="stat-label" style={{ marginTop: 16 }}>Позже</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {work.filter(t => !t.due.startsWith('Сегодня')).map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

window.TasksPage = TasksPage;
