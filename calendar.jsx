// 7on OS — Calendar page (week view)
const CalendarPage = ({ D, refresh }) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', day: '1', start: '10', end: '11', kind: 'work', description: '' });
  const [detailEvent, setDetailEvent] = React.useState(null);
  const [detailForm, setDetailForm] = React.useState({});
  const [detailSaving, setDetailSaving] = React.useState(false);

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

  const KIND_LABELS = { work: 'Работа', deal: 'Сделка', meeting: 'Встреча', personal: 'Личное' };
  const KIND_COLORS = { deal: 'var(--violet)', work: 'var(--accent)', meeting: 'var(--orange)', personal: 'var(--blue)' };

  const cellH = 64;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDE = (k, v) => setDetailForm(f => ({ ...f, [k]: v }));

  const openDetail = (e, ev) => {
    e.stopPropagation();
    setDetailEvent(ev);
    setDetailForm({
      title: ev.title || '',
      day: String(ev.day),
      start: String(ev.start),
      end: String(ev.end),
      kind: ev.kind || 'work',
      description: ev.description || '',
    });
  };

  const handleDetailSave = async () => {
    if (!detailEvent) return;
    setDetailSaving(true);
    try {
      await updateEvent(detailEvent.id, {
        title: detailForm.title,
        day: parseInt(detailForm.day),
        start: parseFloat(detailForm.start),
        end: parseFloat(detailForm.end),
        kind: detailForm.kind,
        description: detailForm.description,
      });
      await refresh();
      setDetailEvent(null);
    } finally { setDetailSaving(false); }
  };

  const handleDetailDelete = async () => {
    if (!detailEvent) return;
    setDetailSaving(true);
    try { await deleteEvent(detailEvent.id); await refresh(); setDetailEvent(null); }
    finally { setDetailSaving(false); }
  };

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
        description: form.description,
      });
      await refresh();
      setShowAdd(false);
      setForm({ title: '', day: '1', start: '10', end: '11', kind: 'work', description: '' });
    } finally { setSaving(false); }
  };

  const handleDeleteFromGrid = async (id) => {
    await deleteEvent(id);
    await refresh();
  };

  const renderEvent = (e) => {
    const top = (e.start - 9) * cellH + 4;
    const height = Math.max((e.end - e.start) * cellH - 8, 24);
    return (
      <div key={e.id} className={`fcal-event ${e.kind}`} style={{ top, height, cursor: 'pointer' }}
        onClick={(ev) => openDetail(ev, e)}>
        <div style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{e.title}</div>
        <div className="when">{formatTime(e.start)} – {formatTime(e.end)}</div>
        <button onClick={ev => { ev.stopPropagation(); handleDeleteFromGrid(e.id); }}
          style={{ position: 'absolute', top: 3, right: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '1px 3px', opacity: 0.5, lineHeight: 1, fontSize: 13 }}>×</button>
      </div>
    );
  };

  return (
    <div>
      {/* Add event modal */}
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
          <Field label="Описание">
            <DescriptionWithLinks placeholder="Адрес, контакты, детали… (/ для ссылки на файл или заметку)" value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </Modal>
      )}

      {/* Event detail panel */}
      {detailEvent && (
        <div className="modal-backdrop" onClick={() => setDetailEvent(null)}>
          <div className="task-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="task-detail-header">
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: KIND_COLORS[detailForm.kind], flexShrink: 0, marginTop: 2 }} />
              <input className="task-detail-title" value={detailForm.title}
                onChange={e => setDE('title', e.target.value)} placeholder="Название события" />
              <button className="icon-btn" onClick={() => setDetailEvent(null)}><Icon name="x" size={14} /></button>
            </div>

            <div className="task-detail-body">
              <div className="task-detail-meta">
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>День</span>
                  <FSelect value={detailForm.day} onChange={e => setDE('day', e.target.value)} style={{ fontSize:13, flex:1 }}>
                    <option value="1">Пн 18</option><option value="2">Вт 19</option><option value="3">Ср 20</option>
                    <option value="4">Чт 21</option><option value="5">Пт 22</option><option value="6">Сб 23</option><option value="7">Вс 24</option>
                  </FSelect>
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Время</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
                    <FInput type="number" min="9" max="19" value={detailForm.start} onChange={e => setDE('start', e.target.value)} style={{ fontSize:13, width:70 }} />
                    <span style={{ color:'var(--text-faint)' }}>—</span>
                    <FInput type="number" min="9" max="20" value={detailForm.end} onChange={e => setDE('end', e.target.value)} style={{ fontSize:13, width:70 }} />
                    <span className="mono" style={{ fontSize:11, color:'var(--text-faint)' }}>час</span>
                  </div>
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Тип</span>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {Object.entries(KIND_LABELS).map(([k, label]) => (
                      <button key={k} onClick={() => setDE('kind', k)}
                        style={{ padding:'4px 10px', borderRadius:6, fontSize:11.5, border:'1px solid', cursor:'pointer',
                          borderColor: detailForm.kind === k ? KIND_COLORS[k] : 'var(--border)',
                          background: detailForm.kind === k ? `${KIND_COLORS[k]}22` : 'transparent',
                          color: detailForm.kind === k ? KIND_COLORS[k] : 'var(--text-dim)' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop:18 }}>
                <div className="stat-label" style={{ marginBottom:8 }}>Описание</div>
                <DescriptionWithLinks
                  value={detailForm.description}
                  onChange={e => setDE('description', e.target.value)}
                  placeholder="Адрес, контакты, детали встречи… (/ для ссылки на файл или заметку)"
                  style={{ fontSize:13, lineHeight:1.6 }}
                  minHeight={100}
                />
              </div>
            </div>

            <div className="task-detail-footer">
              <button className="btn" style={{ color:'var(--red)', borderColor:'rgba(255,107,122,0.2)' }} onClick={handleDetailDelete} disabled={detailSaving}>
                <Icon name="trash" size={12} /> Удалить
              </button>
              <div style={{ flex:1 }} />
              <button className="btn ghost" onClick={() => setDetailEvent(null)}>Отмена</button>
              <button className="btn primary" onClick={handleDetailSave} disabled={detailSaving || !detailForm.title.trim()}>
                {detailSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cal-header" style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="cal-nav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn"><Icon name="chevron-left" size={12} /></button>
          <div className="mono cal-date-label" style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>18–24 мая, 2026</div>
          <button className="btn"><Icon name="chevron-right" size={12} /></button>
          <button className="btn ghost">Сегодня</button>
        </div>
        <div style={{ flex: 1 }} />
        <div className="cal-filters filters" style={{ marginBottom: 0 }}>
          <button className="filter" data-on="1">Неделя</button>
          <button className="filter">День</button>
          <button className="filter">Месяц</button>
        </div>
        <button className="btn primary cal-add-btn" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Событие</button>
      </div>

      {/* Mobile list view */}
      <div className="cal-mobile">
        {D.EVENTS.length === 0 && <div className="placeholder">Нет событий на этой неделе</div>}
        {DAYS.map((d, di) => {
          const dayEvents = D.EVENTS.filter(e => e.day === di + 1).sort((a,b) => a.start - b.start);
          if (dayEvents.length === 0) return null;
          return (
            <div key={d.num} style={{ marginBottom: 16 }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>{d.dow} {d.num}</div>
              {dayEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 6, alignItems: 'center', cursor: 'pointer' }}
                  onClick={(ev) => openDetail(ev, e)}>
                  <div style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', background: KIND_COLORS[e.kind] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>{formatTime(e.start)} – {formatTime(e.end)}</div>
                    {e.description ? <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{e.description}</div> : null}
                  </div>
                  <span className={`tag ${e.kind === 'deal' ? 'deal' : e.kind === 'work' ? 'work' : e.kind === 'meeting' ? 'warm' : 'cold'}`}>{KIND_LABELS[e.kind]}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Desktop grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }} className="cal-desktop">
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
              <div className="card-title">Задачи со временем</div>
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
              {Object.entries(KIND_LABELS).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: KIND_COLORS[key] }} />
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
