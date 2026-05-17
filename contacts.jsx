// 7on OS — Contacts page (owners)
const ContactsPage = () => {
  const D = window.SEVEN_DATA;
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(D.CONTACTS[0].id);

  const filtered = filter === 'all' ? D.CONTACTS : D.CONTACTS.filter(c => c.status === filter);

  const cur = D.CONTACTS.find(c => c.id === selected);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
      <div>
        <div className="filters">
          <button className="filter" data-on={filter === 'all' ? '1' : '0'} onClick={() => setFilter('all')}>
            Все <span className="num">{D.CONTACTS.length}</span>
          </button>
          <button className="filter" data-on={filter === 'hot' ? '1' : '0'} onClick={() => setFilter('hot')}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--red)' }} />
            Горячие <span className="num">{D.CONTACTS.filter(c => c.status === 'hot').length}</span>
          </button>
          <button className="filter" data-on={filter === 'work' ? '1' : '0'} onClick={() => setFilter('work')}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--accent)' }} />
            В работе <span className="num">{D.CONTACTS.filter(c => c.status === 'work').length}</span>
          </button>
          <button className="filter" data-on={filter === 'warm' ? '1' : '0'} onClick={() => setFilter('warm')}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--orange)' }} />
            Тёплые <span className="num">{D.CONTACTS.filter(c => c.status === 'warm').length}</span>
          </button>
          <button className="filter" data-on={filter === 'cold' ? '1' : '0'} onClick={() => setFilter('cold')}>
            <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--blue)' }} />
            Холодные <span className="num">{D.CONTACTS.filter(c => c.status === 'cold').length}</span>
          </button>
          <div style={{ flex: 1 }} />
          <button className="filter"><Icon name="filter" size={12} /> Сортировка: по дате</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="contact-row head">
            <div>Собственник</div>
            <div>Объект</div>
            <div>Последний контакт</div>
            <div>Статус</div>
            <div>Следующий шаг</div>
            <div></div>
          </div>
          {filtered.map(c => (
            <div
              key={c.id}
              className="contact-row"
              onClick={() => setSelected(c.id)}
              style={{ background: c.id === selected ? 'var(--surface-2)' : 'transparent' }}
            >
              <div>
                <div className="contact-name">{c.name}</div>
                <div className="contact-phone">{c.phone}</div>
              </div>
              <div>
                <div className="contact-addr">{c.addr}</div>
                <div className="contact-addr params">{c.params}</div>
              </div>
              <div>
                <div className="contact-date">{c.lastContact}</div>
                <div className="mono" style={{ fontSize: 10.5, color: c.daysSince >= 14 ? 'var(--orange)' : 'var(--text-faint)' }}>
                  {c.daysSince === 0 ? 'сегодня' : c.daysSince === 1 ? '1 день назад' : `${c.daysSince} дн. назад`}
                </div>
              </div>
              <div>
                <StatusTag status={c.status} />
              </div>
              <div className="contact-next">
                {c.next}
                <span className="when">{c.nextWhen}</span>
              </div>
              <div style={{ color: 'var(--text-faint)' }}><Icon name="more" size={14} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {cur && (
        <div className="card" style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
          <div className="card-header">
            <div className="card-title">Карточка собственника</div>
            <button className="card-link"><Icon name="more" size={14} /></button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{cur.name}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{cur.phone}</div>
            <div style={{ marginTop: 10 }}><StatusTag status={cur.status} /></div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div className="stat-label">Объект</div>
            <div style={{ fontSize: 13.5, marginTop: 4 }}>{cur.addr}</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.6 }}>
              {cur.params.split('·').map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', padding: '3px 0' }}>
                  <span style={{ color: 'var(--text-faint)' }}>{['Площадь', 'Комнат', 'Этаж', 'Цена'][i]}</span>
                  <span>{p.trim()}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="stat-label">Последний контакт</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cur.lastContact}</div>
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>
              {cur.daysSince} {cur.daysSince === 1 ? 'день' : 'дн.'} назад
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <div className="stat-label">Заметки</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.55 }}>{cur.notes}</div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
            <div className="stat-label">Следующий шаг</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
              <div style={{ width: 3, height: 28, borderRadius: 2, background: 'var(--accent)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5 }}>{cur.next}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--accent)' }}>{cur.nextWhen}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="phone" size={12} /> Позвонить
            </button>
            <button className="btn"><Icon name="mail" size={12} /></button>
            <button className="btn"><Icon name="calendar" size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

window.ContactsPage = ContactsPage;
