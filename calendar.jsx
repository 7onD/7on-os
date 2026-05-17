// 7on OS — Calendar page (week view)
const CalendarPage = ({ D, refresh }) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', day: '1', start: '10', end: '11', kind: 'work' });

  const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i);
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
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createEvent({
        title: form.title.trim(),
        day: parseInt(form.day),
        start: parseFloat(form.start),
        end: parseFloat(form.end),
        kind: form.kind,
      });
      await refresh();
      setShowAdd(false);
      setForm({ title: '', day: '1', start: '10', end: '11', kind: 'work' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteEvent(id);
    await refresh();
  };

  const renderEvent = (e) => {
    const top = (e.start - 9) * cellH + 4;
    const height = (e.end - e.start) * cellH - 8;
    return (
      <div key={e.id} className={`fcal-event ${e.kind}`} style={{ top, height }}>
        <div style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden' }}>{e.title}</div>
        <div className="when">{formatTime(e.start)} – {formatTime(e.end)}</div>
        <button onClick={() => handleDelete(e.id)}
          style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 2, lineHeight: 1, opacity: 0.6 }}
          title="Удалить">×</button>
      </div>
    );
  };

  return (
    <div>
      {showAdd && (
        <Modal title="Новое событие" onClose={() => setShowAdd(false)}
          onConfirm={handleAdd} confirmLabel={saving ? 'Сохранение…' : 'Добавить'}
          confirmDisabled={saving || !form.title.trim()}>
          <Field label="Название"><FInput placeholder="Показ квартиры" value={form.title} onChange={e => set('title', e.target.value)} autoFocus /></Field>
          <div className="form-row">
            <Field label="День недели">
              <FSelect value={form.day} onChange={e => set('day', e.target.value)}>
                <option value="1">Пн 18</option>
                <option value="2">Вт 19</option>
                <option value="3">Ср 20</option>
                <option value="4">Чт 21</option>
                <option value="5">Пт 22</option>
                <option value="6">Сб 23</option>
                <option value="7">Вс 24</option>
              </FSelect>
            </Field>
            <Field label="Тип">
              <FSelect value={form.kind} onChange={e => set('kind', e.target.value)}>
                <option value="work">Работа</option>
                <option value="deal">Сделка</option>
                <option value="meeting">Встреча</option>
                <option value="personal">Личное</option>
              </FSelect>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Начало (час)"><FInput type="number" min="9" max="19" value={form.start} onChange={e => set('start', e.target.value)} /></Field>
            <Field label="Конец (час)"><FInput type="number" min="9" max="20" value={form.end} onChange={e => set('end', e.target.value)} /></Field>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <button className="btn"><Icon name="chevron-left" size={12} /></button>
        <div className="mono" style={{ fontSize: 14, fontWeight: 500 }}>18 – 24 мая, 2026</div>
        <button className="btn"><Icon name="chevron-right" size={12} /></button>
        <button className="btn ghost">Сегодня</button>
        <div style={{ flex: 1 }} />
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className="filter" data-on="1">Неделя</button>
          <button className="filter">День</button>
          <button className="filter">Месяц</button>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Событие</button>
      </div>

      {/* Mobile list view */}
      <div className="cal-mobile">
        {DAYS.map((d, di) => {
          const dayEvents = D.EVENTS.filter(e => e.day === di + 1);
          if (dayEvents.length === 0) return null;
          return (
            <div key={d.num} style={{ marginBottom: 16 }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>{d.dow} {d.num}</div>
              {dayEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', background: e.kind === 'deal' ? 'var(--violet)' : e.kind === 'work' ? 'var(--accent)' : e.kind === 'meeting' ? 'var(--orange)' : 'var(--blue)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{e.title}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{formatTime(e.start)} – {formatTime(e.end)}</div>
                  </div>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => handleDelete(e.id)}><Icon name="trash" size={12} /></button>
                </div>
              ))}
            </div>
          );
        })}
        {D.EVENTS.length === 0 && <div className="placeholder">Нет событий на этой неделе</div>}
      </div>

      {/* Desktop grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }} className="cal-desktop">
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
              Задачи со временем в дедлайне
            </div>
            {D.WORK_TASKS.filter(t => t.due && t.due.includes(':')).slice(0, 4).map(t => (
              <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: 'var(--accent)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{t.title}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{t.due}</div>
                </div>
              </div>
            ))}
            {D.WORK_TASKS.filter(t => t.due && t.due.includes(':')).length === 0 && (
              <div className="placeholder">Нет задач со временем</div>
            )}
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
