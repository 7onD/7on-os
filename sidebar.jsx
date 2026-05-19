// 7on OS — Sidebar
const Sidebar = ({ route, setRoute, counts, userName }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'tasks', label: 'Задачи', icon: 'tasks', count: counts.tasks },
    { id: 'calendar', label: 'Календарь', icon: 'calendar' },
    { id: 'contacts', label: 'Контакты', icon: 'contacts', count: counts.contacts },
    { id: 'storage',  label: 'Хранилище', icon: 'storage' },
  ];
  const initials = userName.split(' ').map(s => s[0]).slice(0, 2).join('');
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-avatar">
          <img src="photo.jpg" alt={userName} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onError={e => { e.target.style.display='none'; e.target.parentNode.textContent=initials; }} />
        </div>
        <div className="logo-name">7on<span> OS</span></div>
      </div>

      <div className="nav-group-label">Workspace</div>
      {items.map(it => (
        <button
          key={it.id}
          className="nav-item"
          data-active={route === it.id ? '1' : '0'}
          onClick={() => setRoute(it.id)}
        >
          <span className="nav-icon"><Icon name={it.icon} /></span>
          <span>{it.label}</span>
          {it.count != null && <span className="nav-count">{it.count}</span>}
        </button>
      ))}

      <div className="sidebar-spacer" />

      <button className="nav-item">
        <span className="nav-icon"><Icon name="settings" /></span>
        <span>Настройки</span>
      </button>
    </aside>
  );
};

window.Sidebar = Sidebar;
