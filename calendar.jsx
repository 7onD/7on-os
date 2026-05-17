// 7on OS — Calendar page (week view)
const CalendarPage = () => {
  const D = window.SEVEN_DATA;
  const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i); // 09 - 19
  const DAYS = [
    { num: 18, dow: 'Пн', today: true },
    { num: 19, dow: 'Вт' },
    { num: 20, dow: 'Ср' },
    { num: 21, dow: 'Чт' },
    { num: 22, dow: 'Пт' },
    { num: 23, dow: 'Сб' },
    { num: 24, dow: 'Вс' },
  ];

  const cellH = 64;

  const renderEvent = (e) => {
    const top = (e.start - 9) * cellH + 4;
    const height = (e.end - e.start) * cellH - 8;
    return (
      <div key={e.title + e.start} className={`fcal-event ${e.kind}`}
        style={{ top, height }}
      >
        <div style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--text)' }}>{e.title}</div>
        <div className="when">{formatTime(e.start)} – {formatTime(e.end)}</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <button className="btn">
          <Icon name="chevron-left" size={12} />
        </button>
        <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>18 – 24 мая, 2026</div>
        <button className="btn">
          <Icon name="chevron-right" size={12} />
        </button>
        <button className="btn ghost">Сегодня</button>
        <div style={{ flex: 1 }} />
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className="filter" data-on="1">Неделя</button>
          <button className="filter">День</button>
          <button className="filter">Месяц</button>
        </div>
        <button className="btn primary"><Icon name="plus" size={13} /> Событие</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="fcal" style={{ gridTemplateRows: `auto repeat(${HOURS.length}, ${cellH}px)` }}>
          <div className="fcal-corner" />
          {DAYS.map(d => (
            <div key={d.num} className="fcal-dow" data-today={d.today ? '1' : '0'}>
              <span>{d.dow}</span>
              <span className="num">{d.num}</span>
            </div>
          ))}
          {HOURS.map((h, hi) => (
            <React.Fragment key={h}>
              <div className="fcal-hour">{String(h).padStart(2, '0')}:00</div>
              {DAYS.map((d, di) => (
                <div key={di} className="fcal-cell" style={{ position: 'relative' }}>
                  {hi === 0 && D.EVENTS.filter(e => e.day === di + 1).map(renderEvent)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Связано с задачами</div>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
              События автоматически создаются из задач со временем
            </div>
            {D.WORK_TASKS.filter(t => t.due.includes(':')).slice(0, 4).map(t => (
              <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: 'var(--accent)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{t.title}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{t.due}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Легенда</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Сделка', 'deal', 'var(--violet)'],
                ['Работа', 'work', 'var(--accent)'],
                ['Встреча', 'meeting', 'var(--orange)'],
                ['Личное', 'personal', 'var(--blue)'],
              ].map(([label, key, color]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
                  <span>{label}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}>
                    {D.EVENTS.filter(e => e.kind === key).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.CalendarPage = CalendarPage;
