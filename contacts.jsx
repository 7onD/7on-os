// 7on OS — Contacts page
const ContactsPage = ({ D, refresh, navTarget, onNavConsumed }) => {
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(D.CONTACTS[0]?.id || null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const emptyForm = { name:'', phone:'', addr:'', params:'', last_contact:'', days_since:'0', status:'work', next:'', next_when:'', next_when_time:'', notes:'' };
  const [form, setForm] = React.useState(emptyForm);

  const filtered = filter === 'all' ? D.CONTACTS : D.CONTACTS.filter(c => c.status === filter);
  const cur = D.CONTACTS.find(c => c.id === selected);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openContact = (id) => {
    setSelected(id);
    if (window.innerWidth <= 1024) setMobileOpen(true);
  };

  React.useEffect(() => {
    if (!navTarget || navTarget.kind !== 'contact') return;
    openContact(navTarget.id);
    onNavConsumed && onNavConsumed();
  }, [navTarget]);

  const startEdit = () => {
    if (!cur) return;
    const nwParts = (cur.nextWhen || '').split(' ');
    setForm({
      name: cur.name || '', phone: cur.phone || '', addr: cur.addr || '',
      params: cur.params || '', last_contact: cur.lastContact || '',
      days_since: String(cur.daysSince || 0), status: cur.status || 'work',
      next: cur.next || '', next_when: nwParts[0] || '', next_when_time: nwParts[1] || '', notes: cur.notes || '',
    });
    setEditing(true);
  };

  // Build a calendar event from contact next_when data
  const syncContactEvent = async (contactId, contactName, nextAction, nextWhen, nextWhenTime) => {
    // Delete existing contact event (if any)
    const old = D.EVENTS.find(e => e.contact_id === contactId);
    if (old) await deleteEvent(old.id);
    // Create new event if date is set
    if (nextWhen) {
      let startFloat = -1, endFloat = -1;
      if (nextWhenTime) {
        const [h, m] = nextWhenTime.split(':').map(Number);
        startFloat = h + m / 60;
        endFloat = Math.min(startFloat + 1, 23.5);
      }
      const title = nextAction ? `${contactName} — ${nextAction}` : `Контакт: ${contactName}`;
      await createEvent({ start: startFloat, end: endFloat, title, kind: 'contact',
        description: '', reminder: -1, event_date: nextWhen, contact_id: contactId });
    }
  };

  const handleSaveEdit = async () => {
    if (!cur) return;
    setSaving(true);
    try {
      const nw = [form.next_when, form.next_when_time].filter(Boolean).join(' ');
      await updateContact(cur.id, {
        name: form.name, phone: form.phone, addr: form.addr, params: form.params,
        last_contact: form.last_contact, days_since: parseInt(form.days_since) || 0,
        status: form.status, next: form.next, next_when: nw, notes: form.notes,
      });
      await syncContactEvent(cur.id, form.name, form.next, form.next_when, form.next_when_time);
      await refresh();
      setEditing(false);
    } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const nw = [form.next_when, form.next_when_time].filter(Boolean).join(' ');
      const newId = await createContact({
        name: form.name, phone: form.phone, addr: form.addr, params: form.params,
        last_contact: form.last_contact, days_since: parseInt(form.days_since) || 0,
        status: form.status, next: form.next, next_when: nw, notes: form.notes,
      });
      if (newId && form.next_when) {
        await syncContactEvent(newId, form.name, form.next, form.next_when, form.next_when_time);
      }
      await refresh();
      setShowAdd(false);
      setForm(emptyForm);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить контакт?')) return;
    // Delete linked calendar event if exists
    const ev = D.EVENTS.find(e => e.contact_id === id);
    if (ev) await deleteEvent(ev.id);
    await deleteContact(id);
    setSelected(D.CONTACTS.find(c => c.id !== id)?.id || null);
    setMobileOpen(false);
    await refresh();
  };


  const MONTHS_RU_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const fmtRuDate = (iso) => {
    if (!iso) return '';
    const [, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS_RU_SHORT[m - 1]}`;
  };

  const renderContactRow = (c) => (
    <div key={c.id} className="contact-row" onClick={() => openContact(c.id)}
      style={{ background: c.id === selected ? 'var(--surface-2)' : 'transparent' }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className="contact-name">{c.name}</div>
          <span className="contact-status-dot-mobile" style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: c.status==='hot'?'var(--red)':c.status==='work'?'var(--accent)':c.status==='warm'?'var(--orange)':'#555' }} />
        </div>
        {c.phone && <div className="contact-phone">{c.phone}</div>}
        <div className="contact-mobile-info">
          <span style={{ color: c.status==='hot'?'var(--red)':c.status==='work'?'var(--accent)':c.status==='warm'?'var(--orange)':'var(--text-faint)' }}>
            {D.STATUS_LABEL[c.status] || c.status}
          </span>
          {c.addr && <span>{c.addr}</span>}
        </div>
      </div>
      <div className="contact-col-hide">
        <div className="contact-addr">{c.addr}</div>
        <div className="contact-addr params">{c.params}</div>
      </div>
      <div className="contact-col-hide">
        <div className="contact-date">{fmtDate(c.lastContact)}</div>
        <div className="mono" style={{ fontSize:10.5, color: c.daysSince >= 14 ? 'var(--orange)' : 'var(--text-faint)' }}>
          {c.daysSince === 0 ? 'сегодня' : `${c.daysSince} дн. назад`}
        </div>
      </div>
      <div className="contact-col-hide"><StatusTag status={c.status} /></div>
      <div className="contact-col-hide contact-next">{c.next}<span className="when">{fmtDate(c.nextWhen)}</span></div>
      <div style={{ color:'var(--text-faint)' }}>
        <button className="icon-btn" style={{ width:28, height:28 }}
          onClick={e => { e.stopPropagation(); handleDelete(c.id); }}>
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );

  // NOTE: renderContactFormFields is a render-function (NOT a component — no <X />).
  // Defining it as a component inside ContactsPage would cause focus loss on each keystroke
  // because React would see a new function reference each render and remount the entire form.
  const renderContactFormFields = () => (
    <>
      <Field label="Имя"><FInput placeholder="Орлова Елена Викторовна" value={form.name} onChange={e => set('name',e.target.value)} autoFocus /></Field>
      <div className="form-row">
        <Field label="Телефон"><FInput placeholder="+7 (916) 234-12-89" value={form.phone} onChange={e => set('phone',e.target.value)} /></Field>
        <Field label="Статус">
          <FSelect value={form.status} onChange={e => set('status',e.target.value)}>
            <option value="hot">Горячий</option>
            <option value="work">В работе</option>
            <option value="warm">Тёплый</option>
            <option value="cold">Холодный</option>
          </FSelect>
        </Field>
      </div>
      <Field label="Адрес объекта"><FInput placeholder="Тверская ул., 18, кв. 47" value={form.addr} onChange={e => set('addr',e.target.value)} /></Field>
      <Field label="Параметры"><FInput placeholder="78 м² · 3к · 6/12 · 32 млн ₽" value={form.params} onChange={e => set('params',e.target.value)} /></Field>
      <div className="form-row">
        <Field label="Последний контакт">
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <FInput type="date" value={form.last_contact} onChange={e => set('last_contact',e.target.value)} style={{ flex:1, minWidth:0 }} />
            {form.last_contact && <button type="button" className="icon-btn" style={{ flexShrink:0, width:24, height:24, fontSize:14, color:'var(--text-faint)' }} onClick={() => set('last_contact','')}>×</button>}
          </div>
        </Field>
        <Field label="Дней назад"><FInput type="number" min="0" value={form.days_since} onChange={e => set('days_since',e.target.value)} /></Field>
      </div>
      <Field label="Следующий шаг"><FInput placeholder="Подписать договор" value={form.next} onChange={e => set('next',e.target.value)} /></Field>
      <div className="form-row">
        <Field label="Когда (дата)">
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <FInput type="date" value={form.next_when} onChange={e => set('next_when',e.target.value)} style={{ flex:1, minWidth:0 }} />
            {form.next_when && <button type="button" className="icon-btn" style={{ flexShrink:0, width:24, height:24, fontSize:14, color:'var(--text-faint)' }} onClick={() => set('next_when','')}>×</button>}
          </div>
        </Field>
        <Field label="Время">
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <FInput type="time" value={form.next_when_time} onChange={e => set('next_when_time',e.target.value)} style={{ flex:1, minWidth:0 }} />
            {form.next_when_time && <button type="button" className="icon-btn" style={{ flexShrink:0, width:24, height:24, fontSize:14, color:'var(--text-faint)' }} onClick={() => set('next_when_time','')}>×</button>}
          </div>
        </Field>
      </div>
      <Field label="Заметки"><FTextarea placeholder="История переговоров, договорённости…" value={form.notes} onChange={e => set('notes',e.target.value)} /></Field>
    </>
  );

  return (
    <div>
      {showAdd && (
        <Modal title="Новый контакт" onClose={() => { setShowAdd(false); setForm(emptyForm); }}
          onConfirm={handleAdd} confirmLabel={saving ? 'Сохранение…' : 'Добавить'} confirmDisabled={saving || !form.name.trim()}>
          {renderContactFormFields()}
        </Modal>
      )}
      {editing && (
        <Modal title="Редактировать контакт" onClose={() => setEditing(false)}
          onConfirm={handleSaveEdit} confirmLabel={saving ? 'Сохранение…' : 'Сохранить'} confirmDisabled={saving || !form.name.trim()}>
          {renderContactFormFields()}
        </Modal>
      )}

      <div className="page-header">
        <div>
          <h2>Контакты собственников</h2>
          <div className="subtitle">CRM · {D.CONTACTS.length} контактов</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
            <Icon name="user-plus" size={13} /> Контакт
          </button>
        </div>
      </div>

      {mobileOpen && cur && (
        <div className="contact-backdrop"
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:299 }}
          onClick={() => setMobileOpen(false)} />
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }} className="contacts-layout">
        <div>
          <div className="filters">
            {[['all','Все',D.CONTACTS.length],['hot','Горячие',D.CONTACTS.filter(c=>c.status==='hot').length],
              ['work','В работе',D.CONTACTS.filter(c=>c.status==='work').length],
              ['warm','Тёплые',D.CONTACTS.filter(c=>c.status==='warm').length],
            ].map(([id,label,num]) => (
              <button key={id} className="filter" data-on={filter===id?'1':'0'} onClick={() => setFilter(id)}>
                {id !== 'all' && <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: id==='hot'?'var(--red)':id==='work'?'var(--accent)':id==='warm'?'var(--orange)':'var(--blue)' }} />}
                {label} <span className="num">{num}</span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="contact-row head">
              <div>Собственник</div>
              <div className="contact-col-hide">Объект</div>
              <div className="contact-col-hide">Контакт</div>
              <div className="contact-col-hide">Статус</div>
              <div className="contact-col-hide">Следующий шаг</div>
              <div></div>
            </div>
            {(() => {
              if (filter !== 'all') return filtered.map(renderContactRow);
              const work  = filtered.filter(c => c.status === 'work');
              const other = filtered.filter(c => c.status !== 'work');
              return (
                <>
                  {work.length > 0 && (
                    <div style={{ padding:'6px 16px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)',
                      fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }} />
                      В работе · {work.length}
                    </div>
                  )}
                  {work.map(renderContactRow)}
                  {other.length > 0 && work.length > 0 && (
                    <div style={{ padding:'6px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)',
                      fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      Остальные · {other.length}
                    </div>
                  )}
                  {other.map(renderContactRow)}
                </>
              );
            })()}
            {filtered.length === 0 && <div className="placeholder" style={{ margin:20 }}>Нет контактов</div>}
          </div>
        </div>

        {cur && (
          <div className={`card contact-detail-panel${mobileOpen ? ' mobile-open' : ''}`}
            style={{ position:'sticky', top:0, alignSelf:'start', display:'flex', flexDirection:'column' }}>
            <div className="card-header">
              <div className="card-title">Карточка собственника</div>
              <div style={{ display:'flex', gap:4 }}>
                <button className="icon-btn" onClick={() => handleDelete(cur.id)} title="Удалить"><Icon name="trash" size={14} /></button>
                <button className="icon-btn" onClick={startEdit} title="Редактировать"><Icon name="edit" size={14} /></button>
              </div>
            </div>

            {mobileOpen && (
              <button className="btn ghost contact-back-btn" style={{ marginBottom:12, alignSelf:'flex-start' }} onClick={() => setMobileOpen(false)}>
                <Icon name="arrow-left" size={14} /> Назад
              </button>
            )}

            {/* Header: name + status + phone */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                <div style={{ fontSize:16, fontWeight:500, letterSpacing:'-0.01em', flex:1, minWidth:0 }}>{cur.name}</div>
                <StatusTag status={cur.status} />
              </div>
              <a href={`tel:${cur.phone}`} className="mono" style={{ fontSize:12.5, color:'var(--accent)', textDecoration:'none', display:'inline-block' }}>
                {cur.phone}
              </a>
              {/* Quick stats row */}
              <div className="contact-quick-stats">
                {cur.nextWhen && (
                  <span className="contact-stat-chip" style={{ color:'var(--accent)' }}>
                    📅 {fmtDate(cur.nextWhen)}
                  </span>
                )}
                {cur.lastContact && (
                  <span className="contact-stat-chip" style={{ color: cur.daysSince >= 14 ? 'var(--orange)' : 'var(--text-faint)' }}>
                    посл. {fmtDate(cur.lastContact)}{cur.daysSince > 0 ? ` · ${cur.daysSince} дн. назад` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Object block */}
            {(cur.addr || cur.params) && (
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:12 }}>
                <div className="stat-label">Объект</div>
                {cur.addr && <div style={{ fontSize:13, marginTop:4, fontWeight:500 }}>{cur.addr}</div>}
                {cur.params && (
                  <div className="mono" style={{ fontSize:11, color:'var(--text-dim)', marginTop:4, lineHeight:1.6 }}>
                    {(cur.params || '').split('·').map((p, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom:'1px dashed var(--border)' }}>
                        <span style={{ color:'var(--text-faint)' }}>{['Площадь','Комнат','Этаж','Цена'][i] || ''}</span>
                        <span>{p.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next step block */}
            {(cur.next || cur.nextWhen) && (
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:12 }}>
                <div className="stat-label">Следующий шаг</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, padding:'8px 10px', background:'var(--surface-2)', borderRadius:8 }}>
                  <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background:'var(--accent)', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:450 }}>{cur.next}</div>
                    <div className="mono" style={{ fontSize:10.5, color:'var(--accent)', marginTop:2 }}>{fmtDate(cur.nextWhen)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes block — always visible */}
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:12 }}>
              <div className="stat-label">Заметки</div>
              {cur.notes
                ? <div style={{ fontSize:12.5, color:'var(--text-dim)', marginTop:6, lineHeight:1.55 }}>{cur.notes}</div>
                : <div style={{ fontSize:11.5, color:'var(--text-faint)', marginTop:4, fontFamily:'var(--font-mono)' }}>нет заметок</div>
              }
            </div>

            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <a href={`tel:${cur.phone}`} className="btn primary" style={{ flex:1, justifyContent:'center', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:7 }}>
                <Icon name="phone" size={12} /> Позвонить
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.ContactsPage = ContactsPage;
