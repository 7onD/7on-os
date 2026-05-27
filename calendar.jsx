// 7on OS — Calendar page (week / day / month views)
const CalendarPage = ({ D, refresh, navTarget, onNavConsumed }) => {
  const [showAdd, setShowAdd]       = React.useState(false);
  const [saving, setSaving]         = React.useState(false);
  const [form, setForm]             = React.useState(() => { const _d = new Date(); const _t = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; return { title: '', date: _t, start: '10', end: '11', kind: 'personal', description: '', reminder: '-1', allDay: false }; });
  const [detailEvent, setDetailEvent] = React.useState(null);
  const [detailForm, setDetailForm] = React.useState({});
  const [detailSaving, setDetailSaving] = React.useState(false);
  const [weekOffset, setWeekOffset] = React.useState(() => {
    const base = new Date(2026, 4, 18);
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.floor((today.getTime() - base.getTime()) / (7*24*60*60*1000));
  });
  const [calView, setCalView]       = React.useState('week'); // 'week' | 'day' | 'month'
  const [viewDayIdx, setViewDayIdx] = React.useState(() => (new Date().getDay() + 6) % 7); // 0=Mon
  const [monthOffset, setMonthOffset] = React.useState(0);  // for month view navigation
  const [mobileSelDate, setMobileSelDate] = React.useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }); // ISO date of selected mobile day
  const [monthSelDate, setMonthSelDate] = React.useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; });
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

  // All tasks (for deadline markers)
  const allTasksList = [...(D.PERSONAL_TASKS||[]), ...(D.WORK_TASKS||[]), ...(D.STUDY_TASKS||[])];
  const deadlinesByDate = {};
  allTasksList.filter(t => !t.done && t.deadline).forEach(t => {
    (deadlinesByDate[t.deadline] = deadlinesByDate[t.deadline] || []).push(t);
  });

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
    setForm(f => ({ ...f, date: dayToIso(DAYS[dayIdx]), start: String(hour), end: String(hour + 1), allDay: false }));
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
        start: form.allDay ? -1 : parseFloat(form.start),
        end:   form.allDay ? -1 : parseFloat(form.end),
        kind: form.kind, description: form.description, reminder: parseInt(form.reminder),
        event_date: form.date,
      });
      await refresh();
      setShowAdd(false);
      setForm(f => ({ ...f, title: '', description: '', reminder: '-1', allDay: false }));
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

  // Group overlapping events into stacks (connected-component approach)
  const groupOverlappingEvents = (events) => {
    const sorted = [...events].sort((a, b) => a.start - b.start);
    const groups = [];
    for (const ev of sorted) {
      let placed = false;
      for (const g of groups) {
        const maxEnd = Math.max(...g.map(x => x.end));
        const minStart = Math.min(...g.map(x => x.start));
        if (ev.start < maxEnd && ev.end > minStart) { g.push(ev); placed = true; break; }
      }
      if (!placed) groups.push([ev]);
    }
    return groups;
  };

  const [expandedStack, setExpandedStack] = React.useState(null);
  // Bubble-phase listener so stopPropagation inside the dropdown works correctly
  React.useEffect(() => {
    if (!expandedStack) return;
    const close = (e) => setExpandedStack(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [expandedStack]);

  const renderEventStack = (group, stackKey) => {
    const minStart = Math.min(...group.map(e => e.start));
    const maxEnd   = Math.max(...group.map(e => e.end));
    const top    = (minStart - HOURS[0]) * cellH + 4;
    const height = Math.max((maxEnd - minStart) * cellH - 8, 28);
    const first  = group[0];
    const color  = KIND_COLORS[first.kind] || '#888';
    const c2     = group.length > 1 ? (KIND_COLORS[group[1].kind] || color) : color;
    const c3     = group.length > 2 ? (KIND_COLORS[group[2].kind] || color) : c2;
    const isExpanded = expandedStack === stackKey;
    const hasMany = group.length > 1;

    // Box-shadow simulates stacked paper cards behind the face card
    const stackShadow = hasMany
      ? `3px 3px 0 0 ${c2}70, ${group.length > 2 ? `6px 6px 0 0 ${c3}45` : `3px 3px 0 1px ${c2}30`}`
      : undefined;

    return (
      <div key={stackKey} style={{ position:'absolute', top, left:2, right:2, zIndex: isExpanded ? 20 : 2 }}>
        {/* Face card — box-shadow gives depth without extra DOM elements */}
        <div className="fcal-event"
          style={{ position:'relative', height, background:`${color}22`, borderLeftColor:color, color,
            cursor:'pointer', left:0, right:'auto', width:'100%', boxSizing:'border-box',
            boxShadow: stackShadow }}
          onClick={e => { e.stopPropagation(); hasMany ? setExpandedStack(isExpanded ? null : stackKey) : openDetail(e, first); }}>
          <div style={{ fontWeight:500, fontSize:11.5, flex:1, minWidth:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', paddingRight: hasMany ? 22 : 14 }}>{first.title}</div>
          <div className="when">{formatTime(first.start)} – {formatTime(first.end)}</div>
          {hasMany && (
            <div style={{ position:'absolute', top:4, right:18, background:color, color:'#111', borderRadius:8, fontSize:9, fontWeight:700, padding:'1px 5px', lineHeight:'14px', opacity:0.9 }}>
              +{group.length - 1}
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); handleDeleteFromGrid(first.id); }}
            style={{ position:'absolute', top:3, right:3, background:'none', border:'none', cursor:'pointer', color:'inherit', padding:'1px 3px', opacity:0.5, fontSize:13 }}>×</button>
        </div>

        {/* Expanded list — stopPropagation prevents bubble-phase document listener from closing it */}
        {isExpanded && (
          <div style={{ position:'absolute', top:height + 4, left:0, right:0, minWidth:180, zIndex:40,
            background:'var(--surface-2)', border:'1px solid var(--border-strong)', borderRadius:8,
            boxShadow:'0 8px 32px rgba(0,0,0,0.55)', overflow:'hidden',
            animation:'scaleIn 0.14s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>
            {group.map((ev, i) => {
              const c = KIND_COLORS[ev.kind] || '#888';
              return (
                <div key={ev.id}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer',
                    borderLeft:`3px solid ${c}`, background:`${c}12`,
                    borderBottom: i < group.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onClick={e => { e.stopPropagation(); setExpandedStack(null); openDetail(e, ev); }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:c, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{ev.title}</div>
                    <div style={{ fontSize:10.5, color:'var(--text-dim)', fontFamily:'var(--font-mono)', marginTop:2 }}>{formatTime(ev.start)} – {formatTime(ev.end)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setExpandedStack(null); handleDeleteFromGrid(ev.id); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', fontSize:14, padding:'0 2px', flexShrink:0 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
        <div className="fcal-hour" style={{ minHeight:54, boxSizing:'border-box', fontSize:9, color:'var(--text-faint)', alignItems:'flex-start', paddingTop:4 }}>весь<br/>день</div>
        {DAYS.map((d, di) => {
          const allDay = D.EVENTS.filter(e => eventMatchesDay(e, di) && e.start === -1);
          const dayIso = dayToIso(DAYS[di]);
          const dayDeadlines = allTasksList.filter(t => !t.done && t.deadline === dayIso);
          return (
            <div key={di} className="fcal-cell" style={{ minHeight:54, padding:'2px 3px', display:'flex', flexDirection:'column', gap:2, alignContent:'flex-start' }}>
              {allDay.map(e => {
                const color = KIND_COLORS[e.kind] || '#888';
                return (
                  <div key={e.id} style={{ background:`${color}22`, borderLeft:`2px solid ${color}`, color, borderRadius:3, padding:'1px 5px', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', boxSizing:'border-box', flexShrink:0, cursor:'pointer' }}
                    onClick={ev => openDetail(ev, e)}>
                    {e.title}
                  </div>
                );
              })}
              {dayDeadlines.map(t => (
                <div key={`dl-${t.id}`} style={{ background:'rgba(255,107,122,0.15)', borderLeft:'2px solid var(--red)', color:'var(--red)', borderRadius:3, padding:'1px 5px', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', boxSizing:'border-box', flexShrink:0, cursor:'pointer', fontWeight:600 }}
                  onClick={() => window.SEVEN_NAV && window.SEVEN_NAV('tasks', { kind:'task', id: t.id })}>
                  ⚑ {t.title}
                </div>
              ))}
            </div>
          );
        })}
        {HOURS.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="fcal-hour">{String(h).padStart(2,'0')}:00</div>
            {DAYS.map((d, di) => {
              const groups = hi === 0
                ? groupOverlappingEvents(D.EVENTS.filter(e => eventMatchesDay(e, di) && e.start !== -1))
                : [];
              return (
                <div key={di} className="fcal-cell"
                  style={{ position:'relative', cursor:'pointer', zIndex: hi === 0 ? 5 : 1 }}
                  onClick={() => openSlot(di, h)}>
                  {groups.map((g, gi) => renderEventStack(g, `${di}-${gi}`))}
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
    const timedGroups = groupOverlappingEvents(D.EVENTS.filter(e => eventMatchesDay(e, viewDayIdx) && e.start !== -1));
    const dayViewIso = dayToIso(DAYS[viewDayIdx]);
    const dayViewDeadlines = allTasksList.filter(t => !t.done && t.deadline === dayViewIso);
    return (
      <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:0 }} className="cal-desktop">
        <div />
        <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
          <button className="icon-btn" style={{ width:28, height:28 }}
            onClick={() => {
              if (viewDayIdx === 0) { setWeekOffset(o => o - 1); setViewDayIdx(6); }
              else setViewDayIdx(i => i - 1);
            }}>
            <Icon name="chevron-left" size={13} />
          </button>
          <div className="mono" style={{ fontSize:14, fontWeight:500 }}>
            {day.dow}, {day.num} {MONTHS_SHORT[day.month]}
            {day.today && <span className="tag" style={{ marginLeft:8, fontSize:10 }}>сегодня</span>}
          </div>
          <button className="icon-btn" style={{ width:28, height:28 }}
            onClick={() => {
              if (viewDayIdx === 6) { setWeekOffset(o => o + 1); setViewDayIdx(0); }
              else setViewDayIdx(i => i + 1);
            }}>
            <Icon name="chevron-right" size={13} />
          </button>
          <button className="btn ghost"
            style={{ marginLeft:4, opacity: DAYS[viewDayIdx].today ? 0.4 : 1 }}
            onClick={() => { setWeekOffset(todayWeekOffset); setViewDayIdx((new Date().getDay() + 6) % 7); }}>Сегодня</button>
        </div>
        {/* All-day row for day view */}
        {(allDayEvs.length > 0 || dayViewDeadlines.length > 0) && (
          <>
            <div className="fcal-hour" style={{ height:54, boxSizing:'border-box', fontSize:9, color:'var(--text-faint)', alignItems:'flex-start', paddingTop:4 }}>весь<br/>день</div>
            <div className="fcal-cell" style={{ height:54, overflow:'hidden', padding:'4px 6px', display:'flex', flexDirection:'column', gap:3 }}>
              {allDayEvs.map(e => {
                const color = KIND_COLORS[e.kind] || '#888';
                return (
                  <div key={e.id} style={{ background:`${color}22`, borderLeft:`2px solid ${color}`, color, borderRadius:3, padding:'2px 8px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flexShrink:0 }}
                    onClick={ev => openDetail(ev, e)}>
                    {e.title}
                  </div>
                );
              })}
              {dayViewDeadlines.map(t => (
                <div key={`dl-${t.id}`} style={{ background:'rgba(255,107,122,0.15)', borderLeft:'2px solid var(--red)', color:'var(--red)', borderRadius:3, padding:'2px 8px', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flexShrink:0 }}
                  onClick={() => window.SEVEN_NAV && window.SEVEN_NAV('tasks', { kind:'task', id: t.id })}>
                  ⚑ {t.title}
                </div>
              ))}
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
              {hi === 0 && timedGroups.map((g, gi) => renderEventStack(g, `dv-${gi}`))}
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
          {opts.onToday
            ? <button className="btn ghost" onClick={opts.onToday}>Сегодня</button>
            : <button className="btn ghost" onClick={() => setMonthOffset(0)} disabled={monthOffset === 0}>Текущий</button>
          }
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, background: opts.compact ? 'transparent' : 'var(--border)' }}
          className={opts.compact ? 'cal-month-compact-grid' : ''}>
          {DOW_NAMES.map(d => (
            <div key={d} style={{ background:'var(--surface)', padding:'6px 0', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
          ))}
          {cells.map((c, i) => {
            const dow = i % 7;
            const cellDate = c.cur ? `${year}-${String(month+1).padStart(2,'0')}-${String(c.d).padStart(2,'0')}` : '';
            const evs = c.cur ? (evsByDate[cellDate] || []) : [];
            const isToday = c.cur && cellDate === todayIso;
            const isSel = opts.compact && c.cur && cellDate === opts.selDate;

            if (opts.compact) {
              // ── Apple Calendar style: date circle + colored dots ──────────
              return (
                <div key={i} onClick={() => c.cur && opts.onDaySel && opts.onDaySel({ year, month, day: c.d, dow, iso: cellDate })}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'4px 0 6px',
                    cursor: c.cur ? 'pointer' : 'default', opacity: c.cur ? 1 : 0.25, minHeight:52, background: isSel ? 'var(--surface-2)' : 'transparent', borderRadius:8 }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%', display:'grid', placeItems:'center',
                    fontFamily:'var(--font-mono)', fontSize:13, fontWeight: isToday || isSel ? 700 : 400,
                    background: isToday ? 'var(--accent)' : isSel ? 'var(--surface-3)' : 'transparent',
                    color: isToday ? '#0a0a0a' : 'var(--text)', marginBottom:4,
                  }}>{c.d}</div>
                  {/* Colored dots */}
                  {(() => {
                    const compactDls = c.cur ? (deadlinesByDate[cellDate] || []) : [];
                    const totalDots = evs.length + compactDls.length;
                    return (
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap', justifyContent:'center', minHeight:8 }}>
                        {evs.slice(0, 3).map((e, ei) => (
                          <div key={ei} style={{ width:6, height:6, borderRadius:'50%', background: KIND_COLORS[e.kind] || '#888', flexShrink:0 }} />
                        ))}
                        {compactDls.length > 0 && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)', flexShrink:0 }} />}
                        {totalDots > 4 && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-faint)', flexShrink:0 }} />}
                      </div>
                    );
                  })()}
                </div>
              );
            }

            // ── Desktop full cell ──────────────────────────────────────────
            const maxVisible = 3;
            const cellDeadlines = c.cur ? (deadlinesByDate[cellDate] || []) : [];
            const visibleEvs = evs.slice(0, maxVisible);
            const visibleDls = cellDeadlines.slice(0, Math.max(0, maxVisible - visibleEvs.length));
            const totalHidden = (evs.length - visibleEvs.length) + (cellDeadlines.length - visibleDls.length);
            return (
              <div key={i} className="cal-month-cell"
                style={{ opacity: c.cur ? 1 : 0.3 }}
                onClick={() => {
                  if (!c.cur) return;
                  if (opts.onDaySel) opts.onDaySel({ year, month, day: c.d, dow, iso: cellDate });
                  else { setCalView('day'); setViewDayIdx(dow < 7 ? dow : 0); }
                }}>
                <div className="month-date-num" style={{
                  width:22, height:22, borderRadius:'50%', display:'grid', placeItems:'center',
                  fontFamily:'var(--font-mono)', fontSize:11.5, fontWeight: isToday ? 700 : 400,
                  background: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? '#0a0a0a' : 'var(--text)', marginBottom:4, flexShrink:0,
                }}>{c.d}</div>
                {visibleEvs.map(e => (
                  <div key={e.id} className="month-ev-item" style={{
                    fontSize:10.5, padding:'2px 5px', borderRadius:4, marginBottom:2,
                    background: `${KIND_COLORS[e.kind] || '#888'}22`,
                    color: KIND_COLORS[e.kind] || '#888', fontWeight:500,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }} onClick={ev => { ev.stopPropagation(); openDetail(ev, e); }}>{e.title}</div>
                ))}
                {visibleDls.map(t => (
                  <div key={`dl-${t.id}`} className="month-ev-item" style={{
                    fontSize:10.5, padding:'2px 5px', borderRadius:4, marginBottom:2,
                    background:'rgba(255,107,122,0.15)', color:'var(--red)', fontWeight:600,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }} onClick={ev => { ev.stopPropagation(); window.SEVEN_NAV && window.SEVEN_NAV('tasks', { kind:'task', id: t.id }); }}>⚑ {t.title}</div>
                ))}
                {totalHidden > 0 && <div style={{ fontSize:10, color:'var(--text-faint)', fontFamily:'var(--font-mono)' }}>+{totalHidden}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Shift an ISO date by N days
  const shiftIso = (iso, days) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  // ── Mobile calendar — Apple-style: week strip + selected day events ──────
  const renderMobileList = () => {
    // Find which DAYS index matches the selected ISO date (may be -1 if selected date not in current week)
    const mobileSelIdx = DAYS.findIndex(d => dayToIso(d) === mobileSelDate);
    const selDay = mobileSelIdx >= 0 ? DAYS[mobileSelIdx] : null;
    const selEvents = D.EVENTS.filter(e => e.event_date === mobileSelDate).sort((a,b) => (a.start??99)-(b.start??99));

    return (
      <div className="cal-mobile">
        {/* View toggle — sticky so always reachable while scrolling */}
        <div className="cal-mobile-view-toggle" style={{ display:'flex', gap:6 }}>
          <button className="filter" data-on={calView==='week'?'1':'0'} onClick={() => setCalView('week')}>Неделя</button>
          <button className="filter" data-on={calView==='month'?'1':'0'} onClick={() => setCalView('month')}>Месяц</button>
        </div>

        {calView === 'month' ? (
          /* Month view on mobile — Apple-style: compact grid + day list below */
          <div>
            {renderMonthView({
              compact: true,
              selDate: monthSelDate,
              onDaySel: ({ iso }) => setMonthSelDate(iso),
              onToday: () => { setMonthOffset(0); setWeekOffset(todayWeekOffset); setMonthSelDate(todayIso); },
            })}
            {/* Day event list — updates when you tap a cell */}
            {(() => {
              if (!monthSelDate) return null;
              const [sy, sm, sd] = monthSelDate.split('-').map(Number);
              const selDateObj = new Date(sy, sm - 1, sd);
              const selDow = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][selDateObj.getDay()];
              const selDowRu = ['вс','пн','вт','ср','чт','пт','сб'][selDateObj.getDay()];
              // Events for selected date
              const dayEvs = D.EVENTS.filter(e => e.event_date === monthSelDate)
                .sort((a, b) => (a.start === -1 ? -1 : b.start === -1 ? 1 : a.start - b.start));
              // Tasks due on selected date
              const dayTasks = [...(D.PERSONAL_TASKS || []), ...(D.WORK_TASKS || []), ...(D.STUDY_TASKS || [])]
                .filter(t => t.due === monthSelDate && !t.done)
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
              // Tasks whose deadline falls on selected date (but due is different day)
              const dayDeadlineItems = [...(D.PERSONAL_TASKS || []), ...(D.WORK_TASKS || []), ...(D.STUDY_TASKS || [])]
                .filter(t => t.deadline === monthSelDate && t.due !== monthSelDate && !t.done)
                .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
              const MONTHS_FULL_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
              const isSelToday = monthSelDate === todayIso;
              return (
                <div style={{ marginTop:14, borderTop:'1px solid var(--border)', paddingTop:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, color:'var(--text)' }}>
                      {selDow}, {sd} {MONTHS_FULL_RU[sm - 1]}
                    </div>
                    {isSelToday && <span className="tag" style={{ fontSize:10 }}>сегодня</span>}
                  </div>
                  {dayEvs.length === 0 && dayTasks.length === 0 && dayDeadlineItems.length === 0 ? (
                    <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text-faint)', fontFamily:'var(--font-mono)', fontSize:12,
                      border:'1.5px dashed var(--border)', borderRadius:14 }}>
                      Нет событий
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {dayEvs.map(e => (
                        <div key={e.id} style={{ display:'flex', gap:10, padding:'12px 14px', background:'var(--surface-2)',
                          borderRadius:12, alignItems:'center', cursor:'pointer' }}
                          onClick={ev => openDetail(ev, e)}>
                          <div style={{ width:3, borderRadius:2, alignSelf:'stretch', background:KIND_COLORS[e.kind] || '#888', flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13.5, fontWeight:500, marginBottom:2 }}>{e.title}</div>
                            <div className="mono" style={{ fontSize:10.5, color:'var(--text-faint)' }}>
                              {e.start === -1 ? 'весь день' : `${formatTime(e.start)} – ${formatTime(e.end)}`}
                            </div>
                          </div>
                          <span style={{ fontSize:10.5, padding:'3px 8px', borderRadius:5, flexShrink:0,
                            background:`${KIND_COLORS[e.kind] || '#888'}22`, color: KIND_COLORS[e.kind] || 'var(--text-faint)',
                            fontFamily:'var(--font-mono)', fontWeight:500 }}>
                            {KIND_LABELS[e.kind] || e.kind}
                          </span>
                        </div>
                      ))}
                      {dayTasks.map(t => (
                        <div key={t.id} style={{ display:'flex', gap:10, padding:'12px 14px', background:'var(--surface-2)',
                          borderRadius:12, alignItems:'center' }}>
                          <div style={{ width:3, borderRadius:2, alignSelf:'stretch', background:'var(--accent)', flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13.5, fontWeight:500, marginBottom:2 }}>{t.title}</div>
                            <div className="mono" style={{ fontSize:10.5, color:'var(--text-faint)' }}>
                              {t.time ? t.time : 'задача'}
                              {t.priority === 'high' && <span style={{ color:'var(--red)', marginLeft:6 }}>● высокий</span>}
                            </div>
                          </div>
                          <span style={{ fontSize:10.5, padding:'3px 8px', borderRadius:5, flexShrink:0,
                            background:'rgba(212,255,77,0.08)', color:'var(--accent)', fontFamily:'var(--font-mono)', fontWeight:500 }}>
                            задача
                          </span>
                        </div>
                      ))}
                      {dayDeadlineItems.map(t => (
                        <div key={`dl-${t.id}`} style={{ display:'flex', gap:10, padding:'12px 14px', background:'rgba(255,107,122,0.06)',
                          borderRadius:12, alignItems:'center', cursor:'pointer', border:'1px solid rgba(255,107,122,0.2)' }}
                          onClick={() => window.SEVEN_NAV && window.SEVEN_NAV('tasks', { kind:'task', id: t.id })}>
                          <div style={{ width:3, borderRadius:2, alignSelf:'stretch', background:'var(--red)', flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13.5, fontWeight:500, marginBottom:2, color:'var(--red)' }}>⚑ {t.title}</div>
                            <div className="mono" style={{ fontSize:10.5, color:'var(--text-faint)' }}>
                              дедлайн
                              {t.due && <span style={{ marginLeft:6 }}>· срок {t.due}</span>}
                            </div>
                          </div>
                          <span style={{ fontSize:10.5, padding:'3px 8px', borderRadius:5, flexShrink:0,
                            background:'rgba(255,107,122,0.12)', color:'var(--red)', fontFamily:'var(--font-mono)', fontWeight:500 }}>
                            дедлайн
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          /* Week strip view */
          <>
            {/* Week navigation strip */}
            <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
              <button className="icon-btn" style={{ width:28, height:28, flexShrink:0 }}
                onClick={() => { setWeekOffset(o => o - 1); setMobileSelDate(s => shiftIso(s, -7)); }}>
                <Icon name="chevron-left" size={12} /></button>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 }}>
                {DAYS.map((d, di) => {
                  const iso = dayToIso(d);
                  const hasEv = D.EVENTS.some(e => e.event_date === iso);
                  const isSel = iso === mobileSelDate;
                  return (
                    <button key={di} onClick={() => setMobileSelDate(iso)}
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
                onClick={() => { setWeekOffset(o => o + 1); setMobileSelDate(s => shiftIso(s, 7)); }}>
                <Icon name="chevron-right" size={12} /></button>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button className="btn ghost" style={{ fontSize:11, padding:'3px 10px' }}
                onClick={() => {
                  const n = new Date();
                  const iso = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
                  n.setHours(0,0,0,0);
                  const off = Math.floor((n.getTime() - BASE_MON.getTime()) / (7*24*60*60*1000));
                  setWeekOffset(off);
                  setMobileSelDate(iso);
                }}>
                Сегодня
              </button>
            </div>

            {/* Selected day header */}
            <div style={{ fontFamily:'var(--font-mono)', fontSize:12.5, fontWeight:500, marginBottom:10, color:'var(--text-dim)' }}>
              {selDay ? `${selDay.dow}, ${selDay.num} ${MONTHS_SHORT[selDay.month]}` : mobileSelDate}
              {selDay?.today && <span className="tag" style={{ marginLeft:8, fontSize:10 }}>сегодня</span>}
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
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <FInput type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ flex:1, minWidth:0 }} />
                <label style={{ display:'flex', gap:5, alignItems:'center', cursor:'pointer', whiteSpace:'nowrap', fontSize:12, color:'var(--text-dim)', flexShrink:0 }}>
                  <input type="checkbox" checked={form.allDay} onChange={e => set('allDay', e.target.checked)} style={{ accentColor:'var(--accent)', width:14, height:14 }} />
                  Весь день
                </label>
              </div>
            </Field>
            {TAGS.length > 0 && (
              <Field label="Тег">
                <FSelect value={form.kind} onChange={e => set('kind', e.target.value)}>
                  {TAGS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </FSelect>
              </Field>
            )}
          </div>
          {!form.allDay && (
            <div className="form-row">
              <Field label="Начало (ч)"><FInput type="number" min="8" max="19" value={form.start} onChange={e => set('start', e.target.value)} /></Field>
              <Field label="Конец (ч)"><FInput type="number" min="8" max="20" value={form.end} onChange={e => set('end', e.target.value)} /></Field>
            </div>
          )}
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
                  <div style={{ display:'flex', gap:8, alignItems:'center', flex:1, flexWrap:'wrap' }}>
                    <label style={{ display:'flex', gap:6, alignItems:'center', cursor:'pointer', fontSize:12.5, color:'var(--text-dim)', flexShrink:0 }}>
                      <input type="checkbox"
                        checked={parseFloat(detailForm.start) === -1}
                        onChange={e => { if (e.target.checked) { setDE('start', '-1'); setDE('end', '-1'); } else { setDE('start', '10'); setDE('end', '11'); } }}
                        style={{ accentColor:'var(--accent)', width:14, height:14 }} />
                      Весь день
                    </label>
                    {parseFloat(detailForm.start) !== -1 && <>
                      <FInput type="number" min="8" max="19" value={detailForm.start} onChange={e => setDE('start', e.target.value)} style={{ fontSize:13, width:70 }} />
                      <span style={{ color:'var(--text-faint)' }}>—</span>
                      <FInput type="number" min="8" max="20" value={detailForm.end} onChange={e => setDE('end', e.target.value)} style={{ fontSize:13, width:70 }} />
                      <span className="mono" style={{ fontSize:11, color:'var(--text-faint)' }}>час</span>
                    </>}
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
              <button className="btn ghost" onClick={() => { setWeekOffset(todayWeekOffset); setViewDayIdx((new Date().getDay()+6)%7); }}>Сегодня</button>
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
