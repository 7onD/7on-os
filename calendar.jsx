// 7on OS — Calendar page (week / day / month views)
const CalendarPage = ({ D, refresh }) => {
  const [showAdd, setShowAdd]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [form, setForm]             = React.useState({ title: '', day: '1', start: '10', end: '11', kind: 'work', description: '', reminder: '-1' });
  const [detailEvent, setDetailEvent] = React.useState(null);
  const [detailForm, setDetailForm] = React.useState({});
  const [detailSaving, setDetailSaving] = React.useState(false);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [calView, setCalView]       = React.useState('week'); // 'week' | 'day' | 'month'
  const [viewDayIdx, setViewDayIdx] = React.useState(0);    // 0-6 for day view
  const [monthOffset, setMonthOffset] = React.useState(0);  // for month view navigation
  const [mobileDayIdx, setMobileDayIdx] = React.useState(0); // selected day index for mobile cal

  const HOURS      = Array.from({ length: 12 }, (_, i) => 8 + i); // 8-19
  const BASE_MON   = new Date(2026, 4, 18);
  const MONTHS_RU  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const MONTHS_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const DOW_NAMES  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const KIND_LABELS = { work: 'Работа', deal: 'Сделка', meeting: 'Встреча', personal: 'Личное' };
  const KIND_COLORS = { deal: 'var(--violet)', work: 'var(--accent)', meeting: 'var(--orange)', personal: 'var(--blue)' };
  const cellH = 64;

  // Current week days
  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(BASE_MON);
    d.setDate(BASE_MON.getDate() + weekOffset * 7 + i);
    return { num: d.getDate(), month: d.getMonth(), year: d.getFullYear(), dow: DOW_NAMES[i], today: weekOffset === 0 && i === 0 };
  });

  // Convert DAYS[i] to ISO date string YYYY-MM-DD
  const dayToIso = (d) => `${d.year}-${String(d.month + 1).padStart(2,'0')}-${String(d.num).padStart(2,'0')}`;

  // Match event to a day in the current week (supports new event_date or legacy day field)
  const eventMatchesDay = (ev, dayIdx) => {
    if (ev.event_date) return ev.event_date === dayToIso(DAYS[dayIdx]);
    return ev.day === dayIdx + 1; // legacy: day of week 1-7
  };

  const firstD = DAYS[0], lastD = DAYS[6];
  const weekLabel = firstD.month === lastD.month
    ? `${firstD.num}–${lastD.num} ${MONTHS_SHORT[firstD.month]}, ${firstD.year}`
    : `${firstD.num} ${MONTHS_SHORT[firstD.month]} – ${lastD.num} ${MONTHS_SHORT[lastD.month]}, ${firstD.year}`;

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDE = (k, v) => setDetailForm(f => ({ ...f, [k]: v }));

  const openSlot = (dayIdx, hour) => {
    setForm(f => ({ ...f, day: String(dayIdx + 1), start: String(hour), end: String(hour + 1), _dateStr: dayToIso(DAYS[dayIdx]) }));
    setShowAdd(true);
  };

  const openDetail = (e, ev) => {
    e.stopPropagation();
    setDetailEvent(ev);
    setDetailForm({
      title: ev.title || '', day: String(ev.day), start: String(ev.start), end: String(ev.end),
      kind: ev.kind || 'work', description: ev.description || '', reminder: String(ev.reminder ?? '-1'),
    });
  };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const dayIdx = parseInt(form.day) - 1;
      const event_date = form._dateStr || dayToIso(DAYS[dayIdx]);
      await createEvent({
        title: form.title.trim(), day: parseInt(form.day),
        start: parseFloat(form.start), end: parseFloat(form.end),
        kind: form.kind, description: form.description, reminder: parseInt(form.reminder),
        event_date,
      });
      await refresh();
      setShowAdd(false);
      setForm({ title: '', day: '1', start: '10', end: '11', kind: 'work', description: '', reminder: '-1' });
    } finally { setSaving(false); }
  };

  const handleDetailSave = async () => {
    if (!detailEvent) return;
    setDetailSaving(true);
    try {
      const dayIdx = parseInt(detailForm.day) - 1;
      const event_date = dayToIso(DAYS[dayIdx]);
      await updateEvent(detailEvent.id, {
        title: detailForm.title, day: parseInt(detailForm.day),
        start: parseFloat(detailForm.start), end: parseFloat(detailForm.end),
        kind: detailForm.kind, description: detailForm.description, reminder: parseInt(detailForm.reminder),
        event_date,
      });
      await refresh(); setDetailEvent(null);
    } finally { setDetailSaving(false); }
  };

  const handleDetailDelete = async () => {
    if (!detailEvent) return;
    setDetailSaving(true);
    try { await deleteEvent(detailEvent.id); await refresh(); setDetailEvent(null); }
    finally { setDetailSaving(false); }
  };

  const handleDeleteFromGrid = async (id) => { await deleteEvent(id); await refresh(); };

  const renderEventBlock = (e, opts = {}) => {
    const top    = (e.start - HOURS[0]) * cellH + 4;
    const height = Math.max((e.end - e.start) * cellH - 8, 24);
    return (
      <div key={e.id} className={`fcal-event ${e.kind}`}
        style={{ top, height, cursor:'pointer', ...(opts.style || {}) }}
        onClick={ev => openDetail(ev, e)}>
        <div style={{ fontWeight:500, fontSize:11.5, flex:1, minWidth:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{e.title}</div>
        <div className="when">{formatTime(e.start)} – {formatTime(e.end)}</div>
        <button onClick={ev => { ev.stopPropagation(); handleDeleteFromGrid(e.id); }}
          style={{ position:'absolute', top:3, right:3, background:'none', border:'none', cursor:'pointer', color:'inherit', padding:'1px 3px', opacity:0.5, fontSize:13 }}>×</button>
      </div>
    );
  };

  const daySelect = () => DAYS.map((d, i) => <option key={i} value={String(i+1)}>{d.dow} {d.num}</option>);

  // ── Week view ──────────────────────────────────────────────────────────────
  const renderWeekView = () => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }} className="cal-desktop">
      <div className="fcal" style={{ gridTemplateRows:`auto repeat(${HOURS.length}, ${cellH}px)` }}>
        <div className="fcal-corner" />
        {DAYS.map(d => (
          <div key={d.num} className="fcal-dow" data-today={d.today ? '1' : '0'}>
            <span>{d.dow}</span><span className="num">{d.num}</span>
          </div>
        ))}
        {HOURS.map((h) => (
          <React.Fragment key={h}>
            <div className="fcal-hour">{String(h).padStart(2,'0')}:00</div>
            {DAYS.map((d, di) => (
              <div key={di} className="fcal-cell" style={{ cursor:'pointer' }}
                onClick={() => openSlot(di, h)} />
            ))}
          </React.Fragment>
        ))}
        {/* Event overlays — one per day column, span all hour rows, sit above cells */}
        {DAYS.map((d, di) => (
          <div key={`ov-${di}`} style={{
            gridColumn: `${di + 2}`,
            gridRow: `2 / ${HOURS.length + 2}`,
            position: 'relative',
            pointerEvents: 'none',
            zIndex: 5,
          }}>
            {D.EVENTS.filter(e => eventMatchesDay(e, di)).map(e =>
              renderEventBlock(e, { style: { left: 4, right: 4, width: 'auto', pointerEvents: 'auto' } })
            )}
          </div>
        ))}
      </div>
      <div>
        <div className="card">
          <div className="card-header"><div className="card-title">Задачи со временем</div></div>
          {D.WORK_TASKS.filter(t => t.due && t.due.includes(':')).slice(0, 4).map(t => (
            <div key={t.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:3, height:28, borderRadius:2, background:'var(--accent)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5 }}>{t.title}</div>
                <div className="mono" style={{ fontSize:10.5, color:'var(--text-faint)' }}>{t.due}</div>
              </div>
            </div>
          ))}
          {D.WORK_TASKS.filter(t => t.due && t.due.includes(':')).length === 0 && <div className="placeholder">Нет задач со временем</div>}
        </div>
        <div className="card" style={{ marginTop:16 }}>
          <div className="card-header"><div className="card-title">Легенда</div></div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(KIND_LABELS).map(([key, label]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:10, fontSize:12.5 }}>
                <div style={{ width:3, height:14, borderRadius:2, background:KIND_COLORS[key] }} />
                <span>{label}</span>
                <span className="mono" style={{ marginLeft:'auto', fontSize:10.5, color:'var(--text-faint)' }}>
                  {D.EVENTS.filter(e => e.kind === key).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Day view ───────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const day = DAYS[viewDayIdx];
    const dayEvents = D.EVENTS.filter(e => eventMatchesDay(e, viewDayIdx));
    return (
      <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:0 }} className="cal-desktop">
        <div />
        <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
          <button className="icon-btn" style={{ width:28, height:28 }}
            onClick={() => setViewDayIdx(i => Math.max(0, i - 1))} disabled={viewDayIdx === 0}>
            <Icon name="chevron-left" size={13} />
          </button>
          <div className="mono" style={{ fontSize:14, fontWeight:500 }}>
            {day.dow}, {day.num} {MONTHS_SHORT[day.month]}
            {day.today && <span className="tag" style={{ marginLeft:8, fontSize:10 }}>сегодня</span>}
          </div>
          <button className="icon-btn" style={{ width:28, height:28 }}
            onClick={() => setViewDayIdx(i => Math.min(6, i + 1))} disabled={viewDayIdx === 6}>
            <Icon name="chevron-right" size={13} />
          </button>
        </div>
        {HOURS.map((h) => (
          <React.Fragment key={h}>
            <div className="fcal-hour" style={{ display:'flex', alignItems:'flex-start', paddingTop:8, height:cellH, boxSizing:'border-box' }}>
              {String(h).padStart(2,'0')}:00
            </div>
            <div className="fcal-cell" style={{ height:cellH, cursor:'pointer' }}
              onClick={() => openSlot(viewDayIdx, h)} />
          </React.Fragment>
        ))}
        {/* Day event overlay */}
        <div style={{ gridColumn:'2', gridRow:`2 / ${HOURS.length + 2}`, position:'relative', pointerEvents:'none', zIndex:5 }}>
          {dayEvents.map(e => renderEventBlock(e, { style: { left:4, right:4, width:'auto', pointerEvents:'auto' } }))}
        </div>
      </div>
    );
  };

  // ── Month view ─────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    // Compute month based on weekOffset + monthOffset
    const baseDate = new Date(BASE_MON);
    baseDate.setDate(BASE_MON.getDate() + weekOffset * 7);
    const year  = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + monthOffset) / 12);
    const month = ((baseDate.getMonth() + monthOffset) % 12 + 12) % 12;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = (firstDay.getDay() + 6) % 7; // 0=Mon
    const prevLast = new Date(year, month, 0).getDate();

    // Build cells
    const cells = [];
    for (let i = startWeekday - 1; i >= 0; i--) cells.push({ d: prevLast - i, cur: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, cur: true });
    while (cells.length < 42) cells.push({ d: cells.length - daysInMonth - startWeekday + 1, cur: false });

    // Map events to actual dates for the month
    // Build evsByDate: "YYYY-MM-DD" → events[]
    const evsByDate = {};
    D.EVENTS.forEach(e => {
      if (e.event_date) {
        (evsByDate[e.event_date] = evsByDate[e.event_date] || []).push(e);
      } else {
        // legacy: day 1-7 relative to BASE_MON week
        const d = new Date(BASE_MON);
        d.setDate(BASE_MON.getDate() + (e.day - 1));
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        (evsByDate[key] = evsByDate[key] || []).push(e);
      }
    });

    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <button className="btn" onClick={() => setMonthOffset(o => o - 1)}><Icon name="chevron-left" size={12} /></button>
          <div className="mono" style={{ fontSize:14, fontWeight:500, minWidth:160, textAlign:'center' }}>
            {MONTHS_RU[month]} {year}
          </div>
          <button className="btn" onClick={() => setMonthOffset(o => o + 1)}><Icon name="chevron-right" size={12} /></button>
          <button className="btn ghost" onClick={() => setMonthOffset(0)} disabled={monthOffset === 0}>Текущий</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, background:'var(--border)' }}>
          {DOW_NAMES.map(d => (
            <div key={d} style={{ background:'var(--surface)', padding:'6px 0', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
          ))}
          {cells.map((c, i) => {
            const dow = i % 7;
            const cellDate = c.cur ? `${year}-${String(month+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}` : '';
            const evs = c.cur ? (evsByDate[cellDate] || []) : [];
            const isToday = c.cur && year === 2026 && month === 4 && c.d === 18;
            return (
              <div key={i} style={{
                background:'var(--surface)', minHeight:90, padding:'6px 8px', cursor:c.cur ? 'pointer' : 'default',
                opacity: c.cur ? 1 : 0.3,
              }}
                onClick={() => { if (!c.cur) return; setCalView('day'); setViewDayIdx(dow < 7 ? dow : 0); }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', display:'grid', placeItems:'center',
                  fontFamily:'var(--font-mono)', fontSize:11.5, fontWeight: isToday ? 700 : 400,
                  background: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? '#0a0a0a' : 'var(--text)', marginBottom:4,
                }}>{c.d}</div>
                {evs.slice(0, 3).map(e => (
                  <div key={e.id} style={{
                    fontSize:10.5, padding:'2px 5px', borderRadius:4, marginBottom:2,
                    background: `${KIND_COLORS[e.kind]}22`,
                    color: KIND_COLORS[e.kind], fontWeight:500,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }} onClick={ev => { ev.stopPropagation(); openDetail(ev, e); }}>{e.title}</div>
                ))}
                {evs.length > 3 && <div style={{ fontSize:10, color:'var(--text-faint)', fontFamily:'var(--font-mono)' }}>+{evs.length-3}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Mobile calendar — Apple-style: week strip + selected day events ──────
  const renderMobileList = () => {
    const selDay = DAYS[mobileDayIdx];
    const selEvents = D.EVENTS.filter(e => eventMatchesDay(e, mobileDayIdx)).sort((a,b) => a.start - b.start);
    return (
      <div className="cal-mobile">
        {/* Week navigation strip */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
          <button className="btn" style={{ padding:'4px 8px' }}
            onClick={() => setWeekOffset(o => o - 1)}><Icon name="chevron-left" size={12} /></button>
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4 }}>
            {DAYS.map((d, di) => {
              const hasEv = D.EVENTS.some(e => eventMatchesDay(e, di));
              const isSel = di === mobileDayIdx;
              const isTod = d.today;
              return (
                <button key={di} onClick={() => setMobileDayIdx(di)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                    padding:'6px 2px', borderRadius:10, border:'none', cursor:'pointer',
                    background: isSel ? 'var(--accent)' : isTod ? 'var(--surface-3)' : 'transparent',
                    color: isSel ? '#0a0a0a' : 'var(--text)',
                  }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, textTransform:'uppercase',
                    color: isSel ? '#0a0a0a' : 'var(--text-faint)', letterSpacing:'0.04em' }}>{d.dow}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight: isSel || isTod ? 600 : 400 }}>{d.num}</span>
                  {hasEv && <div style={{ width:4, height:4, borderRadius:'50%',
                    background: isSel ? '#0a0a0a' : 'var(--accent)', opacity: isSel ? 0.6 : 1 }} />}
                </button>
              );
            })}
          </div>
          <button className="btn" style={{ padding:'4px 8px' }}
            onClick={() => setWeekOffset(o => o + 1)}><Icon name="chevron-right" size={12} /></button>
        </div>

        {/* Selected day header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:500 }}>
            {selDay.dow}, {selDay.num} {MONTHS_SHORT[selDay.month]}
            {selDay.today && <span className="tag" style={{ marginLeft:8, fontSize:10 }}>сегодня</span>}
          </div>
          <button className="btn primary" style={{ padding:'4px 12px', fontSize:12 }}
            onClick={() => { openSlot(mobileDayIdx, 10); }}>
            <Icon name="plus" size={11} /> Событие
          </button>
        </div>

        {/* Events for selected day */}
        {selEvents.length === 0 ? (
          <div className="placeholder" style={{ padding:'32px 0', textAlign:'center' }}>
            Нет событий · нажмите «+», чтобы добавить
          </div>
        ) : (
          selEvents.map(e => (
            <div key={e.id} style={{ display:'flex', gap:10, padding:'12px', background:'var(--surface-2)',
              borderRadius:12, marginBottom:8, alignItems:'center', cursor:'pointer' }}
              onClick={ev => openDetail(ev, e)}>
              <div style={{ width:4, borderRadius:2, alignSelf:'stretch', background:KIND_COLORS[e.kind], flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:500, marginBottom:2 }}>{e.title}</div>
                <div className="mono" style={{ fontSize:10.5, color:'var(--text-faint)' }}>
                  {formatTime(e.start)} – {formatTime(e.end)}
                </div>
              </div>
              <span className={`tag ${e.kind === 'deal' ? 'deal' : e.kind === 'work' ? 'work' : e.kind === 'meeting' ? 'warm' : 'cold'}`}>
                {KIND_LABELS[e.kind]}
              </span>
            </div>
          ))
        )}
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
            <Field label="День">
              <FSelect value={form.day} onChange={e => set('day', e.target.value)}>{daySelect()}</FSelect>
            </Field>
            <Field label="Тип">
              <FSelect value={form.kind} onChange={e => set('kind', e.target.value)}>
                <option value="work">Работа</option><option value="deal">Сделка</option>
                <option value="meeting">Встреча</option><option value="personal">Личное</option>
              </FSelect>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Начало (ч)"><FInput type="number" min="8" max="19" value={form.start} onChange={e => set('start', e.target.value)} /></Field>
            <Field label="Конец (ч)"><FInput type="number" min="8" max="20" value={form.end} onChange={e => set('end', e.target.value)} /></Field>
          </div>
          <Field label="Напоминание">
            <FSelect value={form.reminder} onChange={e => set('reminder', e.target.value)}>
              {(window.REMINDER_OPTIONS || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FSelect>
          </Field>
          <Field label="Описание">
            <DescriptionWithLinks placeholder="Адрес, контакты, детали… (/ для ссылки)" value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </Modal>
      )}

      {/* Event detail panel */}
      {detailEvent && (
        <div className="modal-backdrop" onClick={() => setDetailEvent(null)}>
          <div className="task-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="task-detail-header">
              <div style={{ width:12, height:12, borderRadius:'50%', background:KIND_COLORS[detailForm.kind], flexShrink:0, marginTop:2 }} />
              <input className="task-detail-title" value={detailForm.title} onChange={e => setDE('title', e.target.value)} placeholder="Название события" />
              <button className="icon-btn" onClick={() => setDetailEvent(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="task-detail-body">
              <div className="task-detail-meta">
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>День</span>
                  <FSelect value={detailForm.day} onChange={e => setDE('day', e.target.value)} style={{ fontSize:13, flex:1 }}>{daySelect()}</FSelect>
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Время</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flex:1 }}>
                    <FInput type="number" min="8" max="19" value={detailForm.start} onChange={e => setDE('start', e.target.value)} style={{ fontSize:13, width:70 }} />
                    <span style={{ color:'var(--text-faint)' }}>—</span>
                    <FInput type="number" min="8" max="20" value={detailForm.end} onChange={e => setDE('end', e.target.value)} style={{ fontSize:13, width:70 }} />
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
                          color: detailForm.kind === k ? KIND_COLORS[k] : 'var(--text-dim)' }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Напоминание</span>
                  <FSelect value={detailForm.reminder} onChange={e => setDE('reminder', e.target.value)} style={{ fontSize:13, flex:1 }}>
                    {(window.REMINDER_OPTIONS || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </FSelect>
                </div>
              </div>
              <div style={{ marginTop:18 }}>
                <div className="stat-label" style={{ marginBottom:8 }}>Описание</div>
                <DescriptionWithLinks value={detailForm.description} onChange={e => setDE('description', e.target.value)}
                  placeholder="Адрес, контакты, детали… (/ для ссылки)" style={{ fontSize:13, lineHeight:1.6 }} minHeight={100} />
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

      {/* Header */}
      <div className="cal-header" style={{ display:'flex', gap:10, marginBottom:18, alignItems:'center', flexWrap:'wrap' }}>
        <div className="cal-nav" style={{ display:'flex', alignItems:'center', gap:6 }}>
          {calView !== 'month' ? (
            <>
              <button className="btn" onClick={() => setWeekOffset(o => o - 1)}><Icon name="chevron-left" size={12} /></button>
              <div className="mono cal-date-label" style={{ fontSize:14, fontWeight:500, whiteSpace:'nowrap' }}>{weekLabel}</div>
              <button className="btn" onClick={() => setWeekOffset(o => o + 1)}><Icon name="chevron-right" size={12} /></button>
              <button className="btn ghost" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Сегодня</button>
            </>
          ) : (
            <div style={{ width:4 }} />
          )}
        </div>
        <div style={{ flex:1 }} />
        <div className="cal-filters filters" style={{ marginBottom:0 }}>
          <button className="filter" data-on={calView==='week'?'1':'0'} onClick={() => setCalView('week')}>Неделя</button>
          <button className="filter" data-on={calView==='day'?'1':'0'} onClick={() => setCalView('day')}>День</button>
          <button className="filter" data-on={calView==='month'?'1':'0'} onClick={() => setCalView('month')}>Месяц</button>
        </div>
        <button className="btn primary cal-add-btn" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Событие</button>
      </div>

      {renderMobileList()}
      <div className="cal-desktop">
        {calView === 'week'  && renderWeekView()}
        {calView === 'day'   && renderDayView()}
        {calView === 'month' && renderMonthView()}
      </div>
    </div>
  );
};

window.CalendarPage = CalendarPage;
