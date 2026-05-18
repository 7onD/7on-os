// 7on OS — shared components
const { useState, useEffect, useMemo } = React;

function fmtDate(s) {
  if (!s) return s;
  const months = {
    'января':'01','февраля':'02','марта':'03','апреля':'04',
    'мая':'05','июня':'06','июля':'07','августа':'08',
    'сентября':'09','октября':'10','ноября':'11','декабря':'12',
  };
  const m = s.trim().match(/^(\d{1,2})\s+([а-яёА-ЯЁ]+)$/);
  if (m && months[m[2].toLowerCase()]) {
    return `${m[1].padStart(2,'0')}.${months[m[2].toLowerCase()]}`;
  }
  return s;
}
window.fmtDate = fmtDate;

// ── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, onConfirm, confirmLabel = 'Сохранить', confirmDisabled = false, children }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button className="btn ghost" onClick={onClose}>Отмена</button>
            <button className="btn primary" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Form primitives ───────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="form-field">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const FInput = (props) => <input className="form-input" {...props} />;
const FSelect = ({ children, ...props }) => (
  <select className="form-select" {...props}>{children}</select>
);
const FTextarea = (props) => <textarea className="form-textarea" {...props} />;

// ── TaskRow ───────────────────────────────────────────────────────────────────
const TaskRow = ({ task, onToggle, onDelete, onOpen }) => {
  const [busy, setBusy] = useState(false);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (busy || !onToggle) return;
    setBusy(true);
    try { await onToggle(task.id, !task.done); } finally { setBusy(false); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (busy || !onDelete) return;
    setBusy(true);
    try { await onDelete(task.id); } finally { setBusy(false); }
  };

  return (
    <div className="task" data-done={task.done ? '1' : '0'} onClick={() => onOpen && onOpen(task)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      <div className={`task-priority ${task.priority}`} />
      <div className="task-check" onClick={handleToggle} style={{ cursor: 'pointer', opacity: busy ? 0.5 : 1 }} />
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span>{fmtDate(task.due)}</span>
          {task.tag && <><span className="dot" /><span className="tag work" style={{ textTransform: 'none', padding: '0 6px' }}>{task.tag}</span></>}
          {task.description && <><span className="dot" /><span style={{ color: 'var(--text-faint)', fontSize: 10.5 }}>заметка</span></>}
        </div>
      </div>
      {onDelete && (
        <button className="task-delete" onClick={handleDelete} title="Удалить">
          <Icon name="trash" size={12} />
        </button>
      )}
    </div>
  );
};

// ── MiniCal ──────────────────────────────────────────────────────────────────
const MiniCal = ({ year = 2026, month = 4, today = 18, eventDays = [] }) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells = [];
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) cells.push({ d: prevMonthLast - i, out: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, out: false });
  while (cells.length < 42) cells.push({ d: cells.length - daysInMonth - startWeekday + 1, out: true });
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const dows = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
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
          <div key={i} className="minical-day"
            data-out={c.out ? '1' : '0'}
            data-today={!c.out && c.d === today ? '1' : '0'}
            data-has={!c.out && eventDays.includes(c.d) ? '1' : '0'}
          >{c.d}</div>
        ))}
      </div>
    </div>
  );
};

// ── BarChart ─────────────────────────────────────────────────────────────────
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

// ── StatusTag ────────────────────────────────────────────────────────────────
const StatusTag = ({ status }) => {
  const cls = status === 'hot' ? 'hot' : status === 'warm' ? 'warm' : status === 'cold' ? 'cold' : 'work';
  return <span className={`tag ${cls}`}>{(window.STATUS_LABEL || {})[status] || status}</span>;
};

Object.assign(window, { TaskRow, MiniCal, BarChart, StatusTag, Modal, Field, FInput, FSelect, FTextarea });
