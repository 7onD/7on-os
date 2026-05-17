// 7on OS — shared small components
const { useState, useMemo } = React;

const TaskRow = ({ task, onToggle }) => (
  <div className="task" data-done={task.done ? '1' : '0'} onClick={() => onToggle && onToggle(task.id)}>
    <div className={`task-priority ${task.priority}`} />
    <div className="task-check" />
    <div className="task-body">
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        <span>{task.due}</span>
        {task.tag && <><span className="dot" /><span className="tag work" style={{ textTransform: 'none', padding: '0 6px' }}>{task.tag}</span></>}
      </div>
    </div>
  </div>
);

// Mini calendar showing current month with event dots
const MiniCal = ({ year = 2026, month = 4 /* 0=jan */, today = 18, eventDays = [] }) => {
  // Build grid: Mon-first
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = lastDay.getDate();
  const cells = [];
  // prev month tail
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) cells.push({ d: prevMonthLast - i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, out: false });
  while (cells.length < 42) cells.push({ d: cells.length - daysInMonth - startWeekday + 1, out: true });
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dows = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return (
    <div className="minical">
      <div className="minical-head">
        <span>{monthNames[month]} {year}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" style={{ width: 24, height: 24, borderRadius: 6 }}><Icon name="chevron-left" size={12} /></button>
          <button className="icon-btn" style={{ width: 24, height: 24, borderRadius: 6 }}><Icon name="chevron-right" size={12} /></button>
        </span>
      </div>
      <div className="minical-grid">
        {dows.map(d => <div key={d} className="minical-dow">{d}</div>)}
        {cells.map((c, i) => (
          <div
            key={i}
            className="minical-day"
            data-out={c.out ? '1' : '0'}
            data-today={!c.out && c.d === today ? '1' : '0'}
            data-has={!c.out && eventDays.includes(c.d) ? '1' : '0'}
          >
            {c.d}
          </div>
        ))}
      </div>
    </div>
  );
};

// Bar chart for monthly history
const BarChart = ({ data, max }) => {
  const maxVal = max || Math.max(...data.map(d => d.income));
  return (
    <>
      <div className="barchart">
        {data.map((d, i) => (
          <div key={i} className="bar" data-current={d.current ? '1' : '0'} style={{ height: `${(d.income / maxVal) * 100}%` }} />
        ))}
      </div>
      <div className="barchart-axis">
        {data.map((d, i) => <span key={i}>{d.m}</span>)}
      </div>
    </>
  );
};

const StatusTag = ({ status }) => {
  const cls = status === 'hot' ? 'hot' : status === 'warm' ? 'warm' : status === 'cold' ? 'cold' : 'work';
  return <span className={`tag ${cls}`}>{window.SEVEN_DATA.STATUS_LABEL[status]}</span>;
};

Object.assign(window, { TaskRow, MiniCal, BarChart, StatusTag });
