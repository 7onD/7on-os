// 7on OS — Calendar page (week / day / month views)
const CalendarPage = ({ D, refresh, navTarget, onNavConsumed }) => {
  const [showAdd, setShowAdd]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [form, setForm]             = React.useState(() => { const _d = new Date(); const _t = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; return { title: '', date: _t, start: '10', end: '11', kind: 'personal', description: '', reminder: '-1' }; });
  const [detailEvent, setDetailEvent] = React.useState(null);
  const [detailForm, setDetailForm] = React.useState({});
  const [detailSaving, setDetailSaving] = React.useState(false);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [calView, setCalView]       = React.useState('week'); // 'week' | 'day' | 'month'
  const [viewDayIdx, setViewDayIdx] = React.useState(0);    // 0-6 for day view
  const [monthOffset, setMonthOffset] = React.useState(0);  // for month view navigation
  const [mobileDayIdx, setMobileDayIdx] = React.useState(0); // selected day index for mobile cal
  const [mobileView, setMobileView]     = React.useState('week'); // 'week' | 'month'
  const [newTagName, setNewTagName]     = React.useState('');
  const [newTagColor, setNewTagColor]   = React.useState('#d4ff4d');
  const [savingTag, setSavingTag]       = React.useState(false);
  const [showTagForm, setShowTagForm]   = React.useState(false);
  const [tagError, setTagError]         = React.useState('');

  const HOURS      = Array.from({ length: 12 }, (_, i) => 8 + i); // 8-19
  const BASE_MON   = new Date(2026, 4, 18);
  const MONTHS_RU  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const MONTHS_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const DOW_NAMES  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const cellH = 64;

  const TAGS = D.CAL_TAGS || [];
  const KIND_LABELS = { deal:'Сделка', work:'Работа', meeting:'Встреча', personal:'Личное', contact:'Контакт', ...Object.fromEntries(TAGS.map(t => [t.id, t.name])) };
  const KIND_COLORS = { deal:'var(--violet)', work:'var(--accent)', meeting:'var(--orange)', personal:'var(--blue)', contact:'#5ee5a0', ...Object.fromEntries(TAGS.map(t => [t.id, t.color])) };

  const TAG_PALETTE = ['#d4ff4d','#b78cff','#ffb45e','#7aa7ff','#ff6b7a','#5ee5a0','#4ad7d1','#74c0fc','#ff9a3c','#f06595'];

  const _now = new Date();
  const todayIso = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const todayWeekOffset = Math.floor((_now.setHours(0,0,0,0) - BASE_MON.getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Current week days
  const DAYS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(BASE_MON);
    d.setDate(BASE_MON.getDate() + weekOffset * 7 + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { num: d.getDate(), month: d.getMonth(), year: d.getFullYear(), dow: DOW_NAMES[i], today: iso === todayIso };
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
    setForm(f => ({ ...f, date: dayToIso(DAYS[dayIdx]), start: String(hour), end: String(hour + 1) }));
    setShowAdd(true);
  };

  const openDetail = (e, ev) => {
    e.stopPropagation();
    setDetailEvent(ev);
    setDetailForm({
      title: ev.title || '', date: ev.event_date || '', day: String(ev.day), start: String(ev.start), end: String(ev.end),
      kind: ev.kind || 'work', description: ev.description || '', reminder: String(ev.reminder ?? '-1'),
    });
  };

  // Navigate to specific event from search
  React.useEffect(() => {
    if (!navTarget || navTarget.kind !== 'event') return;
    const ev = D.EVENTS.find(e => String(e.id) === String(navTarget.id));
    if (ev) {
      // Calculate week offset for the event
      if (ev.event_date) {
        const evDate = new Date(ev.event_date + 'T00:00:00');
        const daysDiff = Math.floor((evDate - BASE_MON) / 86400000);
        const newOffset = Math.floor(daysDiff / 7);
        setWeekOffset(newOffset);
      }
      // Open detail after state update
      setTimeout(() => {
        setDetailEvent(ev);
        setDetailForm({
          title: ev.title || '', date: ev.event_date || '', day: String(ev.day), start: String(ev.start), end: String(ev.end),
          kind: ev.kind || 'personal', description: ev.description || '', reminder: String(ev.reminder ?? '-1'),
        });
      }, 50);
    }
    onNavConsumed && onNavConsumed();
  }, [navTarget]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createEvent({
        title: form.title.trim(), day: 1,
        start: parseFloat(form.start), end: parseFloat(form.end),
        kind: form.kind, description: form.description, reminder: parseInt(form.reminder),
        event_date: form.date,
      });
      await refresh();
      setShowAdd(false);
      setForm(f => ({ ...f, title: '', description: '', reminder: '-1' }));
    } finally { setSaving(false); }
  };

  const handleDetailSave = async () => {
    if (!detailEvent) return;
    setDetailSaving(true);
    try {
      const event_date = detailForm.date || detailEvent.event_date || '';
      await updateEvent(detailEvent.id, {
        title: detailForm.title, day: detailEvent.day || 1,
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

  const handleDeleteFromGrid = async (id) => {
    if (!confirm('Удалить событие?')) return;
    await deleteEvent(id); await refresh();
  };

  // Assign horizontal lanes to overlapping timed events
  const layoutDayEvents = (events) => {
    const sorted = [...events].sort((a, b) => a.start - b.start);
    const laneEnds = [];
    const result = [];
    for (const ev of sorted) {
      let lane = laneEnds.findIndex(end => end <= ev.start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(ev.end); }
      else { laneEnds[lane] = ev.end; }
      result.push({ ...ev, _lane: lane });
    }
    const total = laneEnds.length || 1;
    return result.map(ev => ({ ...ev, _totalLanes: total }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setSavingTag(true);
    setTagError('');
    try {
      await createCalTag({ name: newTagName.trim(), color: newTagColor });
      await refresh();
      setNewTagName('');
      setNewTagColor('#d4ff4d');
      setShowTagForm(false);
    } catch (e) {
      setTagError(e.message || 'Ошибка сохранения');
    } finally { setSavingTag(false); }
  };

  const handleDeleteTag = async (id) => {
    if (!confirm('Удалить тег?')) return;
    await deleteCalTag(id);
    await refresh();
  };

  const renderEventBlock = (e, opts = {}) => {
    const color      = KIND_COLORS[e.kind] || '#888888';
    const top        = (e.start - HOURS[0]) * cellH + 4;
    const height     = Math.max((e.end - e.start) * cellH - 8, 24);
    const lane       = e._lane ?? 0;
    const total      = e._totalLanes ?? 1;
    const pct        = 100 / total;
    const laneStyle  = total > 1
      ? { left:`calc(${lane * pct}% + 2px)`, width:`calc(${pct}% - 6px)`, right:'auto' }
      : { left:2, right:2, width:'auto' };
    return (
      <div key={e.id} className="fcal-event"
        style={{ top, height, cursor:'pointer', background:`${color}22`, borderLeftColor:color, color, ...laneStyle, ...(opts.style || {}) }}
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
      <div className="fcal" style={{ gridTemplateRows:`auto auto repeat(${HOURS.length}, ${cellH}px)` }}>
        <div className="fcal-corner" />
        {DAYS.map(d => (
          <div key={d.num} className="fcal-dow" data-today={d.today ? '1' : '0'}>
            <span>{d.dow}</span><span className="num">{d.num}</span>
          </div>
        ))}
        {/* All-day events row */}
        <div className="fcal-hour" style={{ fontSize:9, color:'var(--text-faint)', alignItems:'flex-start', paddingTop:4 }}>весь<br/>день</div>
        {DAYS.map((d, di) => {
          const allDay = D.EVENTS.filter(e => eventMatchesDay(e, di) && e.start === -1);
          return (
            <div key={di} className="fcal-cell" style={{ minHeight:24, padding:'2px 3px', display:'flex', flexWrap:'wrap', gap:2, alignContent:'flex-start' }}>
              {allDay.map(e => {
                const color = KIND_COLORS[e.kind] || '#888';
                return (
                  <div key={e.id} style={{ background:`${color}22`, borderLeft:`2px solid ${color}`, color, borderRadius:3, padding:'1px 5px', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%', cursor:'pointer' }}
                    onClick={ev => openDetail(ev, e)}>
                    {e.title}
                  </div>
                );
              })}
            </div>
          );
        })}
        {HOURS.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="fcal-hour">{String(h).padStart(2,'0')}:00</div>
            {DAYS.map((d, di) => {
              const timedEvs = hi === 0
                ? layoutDayEvents(D.EVENTS.filter(e => eventMatchesDay(e, di) && e.start !== -1))
                : [];
              return (
                <div key={di} className="fcal-cell"
                  style={{ position:'relative', cursor:'pointer', zIndex: hi === 0 ? 5 : 1 }}
                  onClick={() => openSlot(di, h)}>
                  {timedEvs.map(e => renderEventBlock(e))}
                </div>
              );
            })}
          </React.Fragment>
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
          <div className="card-header">
            <div className="card-title">Теги</div>
            <button className="icon-btn" style={{ width:24, height:24 }} title="Новый тег"
              onClick={() => setShowTagForm(s => !s)}>
              <Icon name="plus" size={12} />
            </button>
          </div>

          {/* Add tag form */}
          {showTagForm && (
            <div style={{ padding:'10px 0 14px', borderBottom:'1px solid var(--border)', marginBottom:10 }}>
              <input
                className="form-input" autoFocus
                placeholder="Название тега…"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                style={{ width:'100%', fontSize:12.5, marginBottom:10, boxSizing:'border-box' }}
              />
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
                {TAG_PALETTE.map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    style={{ width:22, height:22, borderRadius:'50%', background:c, border:'none', cursor:'pointer',
                      outline: newTagColor === c ? `2px solid ${c}` : '2px solid transparent',
                      outlineOffset:2, boxSizing:'border-box' }} />
                ))}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn ghost" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => { setShowTagForm(false); setNewTagName(''); setTagError(''); }}>Отмена</button>
                <button className="btn primary" style={{ flex:1, justifyContent:'center' }}
                  onClick={handleCreateTag} disabled={savingTag || !newTagName.trim()}>
                  {savingTag ? '…' : 'Создать'}
                </button>
              </div>
              {tagError && (
                <div style={{ marginTop:8, fontSize:11.5, color:'var(--red)', fontFamily:'var(--font-mono)', lineHeight:1.4 }}>
                  ⚠ {tagError}
                </div>
              )}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {TAGS.map(tag => (
              <div key={tag.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 0',
                borderRadius:6, fontSize:12.5 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:tag.color, flexShrink:0 }} />
                <span style={{ flex:1 }}>{tag.name}</span>
                <span className="mono" style={{ fontSize:10.5, color:'var(--text-faint)', marginRight:4 }}>
                  {D.EVENTS.filter(e => e.kind === tag.id).length}
                </span>
                <button className="icon-btn" style={{ width:20, height:20, opacity:0.4, flexShrink:0 }}
                  title="Удалить тег" onClick={() => handleDeleteTag(tag.id)}>
                  <Icon name="trash" size={10} />
                </button>
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
    const allDayEvs  = D.EVENTS.filter(e => eventMatchesDay(e, viewDayIdx) && e.start === -1);
    const timedEvs   = layoutDayEvents(D.EVENTS.filter(e => eventMatchesDay(e, viewDayIdx) && e.start !== -1));
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
          <button className="btn ghost" style={{ marginLeft:4 }}
            onClick={() => { setWeekOffset(todayWeekOffset); setViewDayIdx((new Date().getDay() + 6) % 7); }}
            disabled={DAYS[viewDayIdx].today}>Сегодня</button>
        </div>
        {/* All-day row for day view */}
        {allDayEvs.length > 0 && (
          <>
            <div className="fcal-hour" style={{ fontSize:9, color:'var(--text-faint)', alignItems:'flex-start', paddingTop:4 }}>весь<br/>день</div>
            <div className="fcal-cell" style={{ padding:'4px 6px', display:'flex', flexWrap:'wrap', gap:4 }}>
              {allDayEvs.map(e => {
                const color = KIND_COLORS[e.kind] || '#888';
                return (
                  <div key={e.id} style={{ background:`${color}22`, borderLeft:`2px solid ${color}`, color, borderRadius:3, padding:'2px 8px', fontSize:11, cursor:'pointer' }}
                    onClick={ev => openDetail(ev, e)}>
                    {e.title}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {HOURS.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="fcal-hour" style={{ display:'flex', alignItems:'flex-start', paddingTop:8, height:cellH, boxSizing:'border-box' }}>
              {String(h).padStart(2,'0')}:00
            </div>
            <div className="fcal-cell"
              style={{ position:'relative', height:cellH, cursor:'pointer', zIndex: hi === 0 ? 5 : 1 }}
              onClick={() => openSlot(viewDayIdx, h)}>
              {hi === 0 && timedEvs.map(e => renderEventBlock(e))}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ── Month view ─────────────────────────────────────────────────────────────
  const renderMonthView = (opts = {}) => {
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
          <div className="mono" style={{ fontSize:14, fontWeight:500, flex:1, textAlign:'center', minWidth:0 }}>
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
            const isToday = c.cur && cellDate === todayIso;
            return (
              <div key={i} style={{
                background:'var(--surface)', minHeight:90, padding:'6px 8px', cursor:c.cur ? 'pointer' : 'default',
                opacity: c.cur ? 1 : 0.3,
              }}
                onClick={() => {
                  if (!c.cur) return;
                  if (opts.onDaySel) {
                    opts.onDaySel({ year, month, day: c.d, dow });
                  } else {
                    setCalView('day');
                    setViewDayIdx(dow < 7 ? dow : 0);
                  }
                }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', display:'grid', placeItems:'center',
                  fontFamily:'var(--font-mono)', fontSize:11.5, fontWeight: isToday ? 700 : 400,
                  background: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? '#0a0a0a' : 'var(--text)', marginBottom:4,
                }}>{c.d}</div>
                {evs.slice(0, 3).map(e => (
                  <div key={e.id} style={{
                    fontSize:10.5, padding:'2px 5px', borderRadius:4, marginBottom:2,
                    background: `${KIND_COLORS[e.kind] || '#888'}22`,
                    color: KIND_COLORS[e.kind] || '#888', fontWeight:500,
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

    const mobileTodayOffset = todayWeekOffset;
    const mobileTodayIdx = (new Date().getDay() + 6) % 7;

    return (
      <div className="cal-mobile">
        {/* View toggle — sticky so always reachable while scrolling */}
        <div className="cal-mobile-view-toggle" style={{ display:'flex', gap:6 }}>
          <button className="filter" data-on={mobileView==='week'?'1':'0'} onClick={() => setMobileView('week')}>Неделя</button>
          <button className="filter" data-on={mobileView==='month'?'1':'0'} onClick={() => setMobileView('month')}>Месяц</button>
        </div>

        {mobileView === 'month' ? (
          /* Month view on mobile — clicking a day jumps to that day in week strip */
          <div>
            {renderMonthView({
              onDaySel: ({ year, month, day, dow }) => {
                const clickDate = new Date(year, month, day);
                const newOffset = Math.floor((clickDate.setHours(0,0,0,0) - BASE_MON.getTime()) / (7 * 24 * 60 * 60 * 1000));
                setWeekOffset(newOffset);
                setMobileDayIdx(dow);
                setMobileView('week');
              }
            })}
          </div>
        ) : (
          /* Week strip view */
          <>
            {/* Week navigation strip */}
            <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
              <button className="icon-btn" style={{ width:28, height:28, flexShrink:0 }}
                onClick={() => setWeekOffset(o => o - 1)}><Icon name="chevron-left" size={12} /></button>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 }}>
                {DAYS.map((d, di) => {
                  const hasEv = D.EVENTS.some(e => eventMatchesDay(e, di));
                  const isSel = di === mobileDayIdx;
                  return (
                    <button key={di} onClick={() => setMobileDayIdx(di)}
                      style={{
                        display:'flex', flexDirection:'column', alignItems:'center', gap:1,
                        padding:'5px 1px', borderRadius:10, border:'none', cursor:'pointer',
                        background: isSel ? 'var(--accent)' : d.today ? 'var(--surface-3)' : 'transparent',
                        color: isSel ? '#0a0a0a' : 'var(--text)',
                      }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:9, textTransform:'uppercase',
                        color: isSel ? '#0a0a0a' : 'var(--text-faint)' }}>{d.dow}</span>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight: isSel || d.today ? 600 : 400 }}>{d.num}</span>
                      {hasEv && <div style={{ width:4, height:4, borderRadius:'50%',
                        background: isSel ? '#0a0a0a' : 'var(--accent)', opacity: isSel ? 0.7 : 1 }} />}
                    </button>
                  );
                })}
              </div>
              <button className="icon-btn" style={{ width:28, height:28, flexShrink:0 }}
                onClick={() => setWeekOffset(o => o + 1)}><Icon name="chevron-right" size={12} /></button>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button className="btn ghost" style={{ fontSize:11, padding:'3px 10px' }}
                disabled={DAYS[mobileDayIdx].today && weekOffset === mobileTodayOffset}
                onClick={() => { setWeekOffset(mobileTodayOffset); setMobileDayIdx(mobileTodayIdx); }}>
                Сегодня
              </button>
            </div>

            {/* Selected day header */}
            <div style={{ fontFamily:'var(--font-mono)', fontSize:12.5, fontWeight:500, marginBottom:10, color:'var(--text-dim)' }}>
              {selDay.dow}, {selDay.num} {MONTHS_SHORT[selDay.month]}
              {selDay.today && <span className="tag" style={{ marginLeft:8, fontSize:10 }}>сегодня</span>}
            </div>

            {/* Events for selected day */}
            {selEvents.length === 0 ? (
              <div style={{ padding:'28px 0', textAlign:'center', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:12,
                border:'1.5px dashed var(--border)', borderRadius:14 }}>
                Нет событий
              </div>
            ) : (
              selEvents.map(e => (
                <div key={e.id} style={{ display:'flex', gap:10, padding:'12px 14px', background:'var(--surface-2)',
                  borderRadius:12, marginBottom:8, alignItems:'center', cursor:'pointer' }}
                  onClick={ev => openDetail(ev, e)}>
                  <div style={{ width:3, borderRadius:2, alignSelf:'stretch', background:KIND_COLORS[e.kind], flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:500, marginBottom:2 }}>{e.title}</div>
                    <div className="mono" style={{ fontSize:10.5, color:'var(--text-faint)' }}>
                      {e.start === -1 ? 'весь день' : `${formatTime(e.start)} – ${formatTime(e.end)}`}
                    </div>
                  </div>
                  <span style={{ fontSize:10.5, padding:'3px 8px', borderRadius:5, flexShrink:0,
                    background:`${KIND_COLORS[e.kind] || '#888'}22`,
                    color: KIND_COLORS[e.kind] || 'var(--text-faint)',
                    fontFamily:'var(--font-mono)', fontWeight:500 }}>
                    {KIND_LABELS[e.kind] || e.kind}
                  </span>
                </div>
              ))
            )}
          </>
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
              <FInput type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </Field>
            {TAGS.length > 0 && (
              <Field label="Тег">
                <FSelect value={form.kind} onChange={e => set('kind', e.target.value)}>
                  {TAGS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </FSelect>
              </Field>
            )}
          </div>
          <div className="form-row">
            <Field label="Начало (ч)"><FInput type="number" min="8" max="19" value={form.start} onChange={e => set('start', e.target.value)} /></Field>
            <Field label="Конец (ч)"><FInput type="number" min="8" max="20" value={form.end} onChange={e => set('end', e.target.value)} /></Field>
          </div>
          <Field label="Заранее уведомить">
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
              <div style={{ width:12, height:12, borderRadius:'50%', background:KIND_COLORS[detailForm.kind] || '#888', flexShrink:0, marginTop:2 }} />
              <input className="task-detail-title" value={detailForm.title} onChange={e => setDE('title', e.target.value)} placeholder="Название события" />
              <button className="icon-btn" onClick={() => setDetailEvent(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="task-detail-body">
              <div className="task-detail-meta">
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>День</span>
                  <FInput type="date" value={detailForm.date || ''} onChange={e => setDE('date', e.target.value)} style={{ fontSize:13, flex:1 }} />
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
                    {TAGS.length === 0
                      ? <span style={{ fontSize:12, color:'var(--text-faint)', fontFamily:'var(--font-mono)' }}>Нет тегов — добавьте в календаре</span>
                      : TAGS.map(tag => (
                          <button key={tag.id} onClick={() => setDE('kind', tag.id)}
                            style={{ padding:'4px 10px', borderRadius:6, fontSize:11.5, border:'1px solid', cursor:'pointer',
                              borderColor: detailForm.kind === tag.id ? tag.color : 'var(--border)',
                              background: detailForm.kind === tag.id ? `${tag.color}22` : 'transparent',
                              color: detailForm.kind === tag.id ? tag.color : 'var(--text-dim)' }}>{tag.name}</button>
                        ))
                    }
                  </div>
                </div>
                <div className="task-detail-row">
                  <span className="stat-label" style={{ minWidth:80 }}>Заранее</span>
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
              {detailEvent && detailEvent.kind === 'contact' && (() => {
                const m = (detailEvent.title || '').match(/^Контакт:\s*(.+)$/);
                const name = m && m[1].trim();
                const contact = name && D.CONTACTS && D.CONTACTS.find(c => c.name === name);
                if (!contact) return null;
                return (
                  <button className="btn" style={{ color:'#5ee5a0', borderColor:'rgba(94,229,160,0.3)' }}
                    onClick={() => { setDetailEvent(null); window.SEVEN_NAV && window.SEVEN_NAV('contacts', { kind: 'contact', id: contact.id }); }}>
                    <Icon name="user" size={12} /> Контакт
                  </button>
                );
              })()}
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
          {calView === 'week' ? (
            <>
              <button className="btn" onClick={() => setWeekOffset(o => o - 1)}><Icon name="chevron-left" size={12} /></button>
              <div className="mono cal-date-label" style={{ fontSize:14, fontWeight:500, whiteSpace:'nowrap' }}>{weekLabel}</div>
              <button className="btn" onClick={() => setWeekOffset(o => o + 1)}><Icon name="chevron-right" size={12} /></button>
              <button className="btn ghost" onClick={() => setWeekOffset(todayWeekOffset)} disabled={weekOffset === todayWeekOffset}>Сегодня</button>
            </>
          ) : (
            <div style={{ width:4 }} />
          )}
        </div>
        <div style={{ flex:1 }} />
        <div className="cal-filters filters" style={{ marginBottom:0 }}>
          <button className="filter" data-on={calView==='week'?'1':'0'} onClick={() => setCalView('week')}>Неделя</button>
          <button className="filter" data-on={calView==='day'?'1':'0'} onClick={() => { setCalView('day'); if (weekOffset === todayWeekOffset) setViewDayIdx((new Date().getDay() + 6) % 7); }}>День</button>
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
