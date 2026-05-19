// 7on OS — Contacts page
const ContactsPage = ({ D, refresh, navTarget, onNavConsumed }) => {
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(D.CONTACTS[0]?.id || null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showSchedule, setShowSchedule] = React.useState(false);
  const [scheduleForm, setScheduleForm] = React.useState({ date: '', time: '10:00', reminder: '0', description: '' });
  const [scheduleSaving, setScheduleSaving] = React.useState(false);

  const emptyForm = { name:'', phone:'', addr:'', params:'', last_contact:'', days_since:'0', status:'work', next:'', next_when:'', next_when_time:'', notes:'' };
  const [form, setForm] = React.useState(emptyForm);

  const filtered = filter === 'all' ? D.CONTACTS : D.CONTACTS.filter(c => c.status === filter);
  const cur = D.CONTACTS.find(c => c.id === selected);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openContact = (id) => { setSelected(id); setMobileOpen(true); };

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
      await refresh();
      setEditing(false);
    } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const nw = [form.next_when, form.next_when_time].filter(Boolean).join(' ');
      await createContact({
        name: form.name, phone: form.phone, addr: form.addr, params: form.params,
        last_contact: form.last_contact, days_since: parseInt(form.days_since) || 0,
        status: form.status, next: form.next, next_when: nw, notes: form.notes,
      });
      await refresh();
      setShowAdd(false);
      setForm(emptyForm);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить контакт?')) return;
    await deleteContact(id);
    setSelected(D.CONTACTS.find(c => c.id !== id)?.id || null);
    setMobileOpen(false);
    await refresh();
  };

  const handleSchedule = async () => {
    if (!cur || !scheduleForm.date || !scheduleForm.time) return;
    setScheduleSaving(true);
    try {
      const d = new Date(scheduleForm.date + 'T00:00:00');
      const dow = d.getDay();
      const dayNum = dow === 0 ? 7 : dow;
      const [h, m] = scheduleForm.time.split(':').map(Number);
      const startFloat = h + m / 60;
      const endFloat = Math.min(startFloat + 1, 19);
      await createEvent({
        day: dayNum, start: startFloat, end: endFloat,
        title: `Контакт: ${cur.name}`, kind: 'contact',
        description: scheduleForm.description,
        reminder: parseInt(scheduleForm.reminder),
        event_date: scheduleForm.date,
      });
      await updateContact(cur.id, { next_when: scheduleForm.date });
      await refresh();
      setShowSchedule(false);
      setScheduleForm({ date: '', time: '10:00', reminder: '0', description: '' });
    } finally { setScheduleSaving(false); }
  };

  const MONTHS_RU_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const fmtRuDate = (iso) => {
    if (!iso) return '';
    const [, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS_RU_SHORT[m - 1]}`;
  };

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
        <Field label="Последний контакт"><FInput type="date" value={form.last_contact} onChange={e => set('last_contact',e.target.value)} /></Field>
        <Field label="Дней назад"><FInput type="number" min="0" value={form.days_since} onChange={e => set('days_since',e.target.value)} /></Field>
      </div>
      <Field label="Следующий шаг"><FInput placeholder="Подписать договор" value={form.next} onChange={e => set('next',e.target.value)} /></Field>
      <div className="form-row">
        <Field label="Когда (дата)"><FInput type="date" value={form.next_when} onChange={e => set('next_when',e.target.value)} /></Field>
        <Field label="Время"><FInput type="time" value={form.next_when_time} onChange={e => set('next_when_time',e.target.value)} /></Field>
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
      {showSchedule && cur && (
        <Modal title={`Запланировать контакт: ${cur.name}`}
          onClose={() => setShowSchedule(false)}
          onConfirm={handleSchedule}
          confirmLabel={scheduleSaving ? 'Сохранение…' : 'Запланировать'}
          confirmDisabled={scheduleSaving || !scheduleForm.date || !scheduleForm.time}>
          <div className="form-row">
            <Field label="Дата">
              <FInput type="date" value={scheduleForm.date}
                onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Время">
              <FInput type="time" value={scheduleForm.time}
                onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))} />
            </Field>
          </div>
          <Field label="Напоминание">
            <FSelect value={scheduleForm.reminder}
              onChange={e => setScheduleForm(f => ({ ...f, reminder: e.target.value }))}>
              {(window.REMINDER_OPTIONS || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FSelect>
          </Field>
          <Field label="Описание">
            <FTextarea placeholder="Что обсудить, подготовить…" value={scheduleForm.description}
              onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
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
            {filtered.map(c => (
              <div key={c.id} className="contact-row" onClick={() => openContact(c.id)}
                style={{ background: c.id === selected ? 'var(--surface-2)' : 'transparent' }}>
                <div>
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-phone">{c.phone}</div>
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
            ))}
            {filtered.length === 0 && <div className="placeholder" style={{ margin:20 }}>Нет контактов</div>}
          </div>
        </div>

        {cur && (
          <div className={`card contact-detail-panel${mobileOpen ? ' mobile-open' : ''}`}
            style={{ position:'sticky', top:0, alignSelf:'start', display:'flex', flexDirection:'column' }}>
            <div className="card-header">
              <div className="card-title">Карточка собственника</div>
              <div style={{ display:'flex', gap:4 }}>
                <button className="icon-btn" onClick={startEdit} title="Редактировать"><Icon name="edit" size={14} /></button>
                <button className="icon-btn" onClick={() => handleDelete(cur.id)} title="Удалить"><Icon name="trash" size={14} /></button>
              </div>
            </div>

            {mobileOpen && (
              <button className="btn ghost" style={{ marginBottom:12, alignSelf:'flex-start' }} onClick={() => setMobileOpen(false)}>
                <Icon name="arrow-left" size={14} /> Назад
              </button>
            )}

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:16, fontWeight:500, letterSpacing:'-0.01em' }}>{cur.name}</div>
              <div className="mono" style={{ fontSize:12, color:'var(--text-dim)', marginTop:4 }}>{cur.phone}</div>
              <div style={{ marginTop:10 }}><StatusTag status={cur.status} /></div>
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
              <div className="stat-label">Объект</div>
              <div style={{ fontSize:13.5, marginTop:4 }}>{cur.addr}</div>
              <div className="mono" style={{ fontSize:11.5, color:'var(--text-dim)', marginTop:6, lineHeight:1.6 }}>
                {(cur.params || '').split('·').map((p, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px dashed var(--border)', padding:'3px 0' }}>
                    <span style={{ color:'var(--text-faint)' }}>{['Площадь','Комнат','Этаж','Цена'][i] || ''}</span>
                    <span>{p.trim()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div className="stat-label">Последний контакт</div>
                <div className="mono" style={{ fontSize:11, color:'var(--text-dim)' }}>{fmtDate(cur.lastContact)}</div>
              </div>
              <div className="mono" style={{ fontSize:10.5, color: cur.daysSince >= 14 ? 'var(--orange)' : 'var(--text-faint)', marginTop:2 }}>
                {cur.daysSince} {cur.daysSince === 1 ? 'день' : 'дн.'} назад
              </div>
            </div>

            {cur.notes && (
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginTop:14 }}>
                <div className="stat-label">Заметки</div>
                <div style={{ fontSize:12.5, color:'var(--text-dim)', marginTop:6, lineHeight:1.55 }}>{cur.notes}</div>
              </div>
            )}

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14, marginTop:14 }}>
              <div className="stat-label">Следующий шаг</div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, padding:10, background:'var(--surface-2)', borderRadius:8 }}>
                <div style={{ width:3, height:28, borderRadius:2, background:'var(--accent)', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12.5 }}>{cur.next}</div>
                  <div className="mono" style={{ fontSize:10.5, color:'var(--accent)' }}>{fmtDate(cur.nextWhen)}</div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:6, marginTop:14 }}>
              <a href={`tel:${cur.phone}`} className="btn primary" style={{ flex:1, justifyContent:'center', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:7 }}>
                <Icon name="phone" size={12} /> Позвонить
              </a>
              <button className="btn" title="Запланировать" onClick={() => setShowSchedule(true)}>
                <Icon name="calendar" size={12} />
              </button>
              <button className="btn" onClick={startEdit}><Icon name="edit" size={12} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

window.ContactsPage = ContactsPage;
