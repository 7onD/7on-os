// 7on OS — main app
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#d4ff4d",
  "darkTone": "#0f0f11",
  "density": "comfort",
  "font": "Inter"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  "#d4ff4d",
  "#7c5cff",
  "#ff6b3d",
  "#4ad7d1",
  "#e8e8e8",
];

const DARK_OPTIONS = [
  "#000000",
  "#0f0f11",
  "#141416",
  "#181b22",
];

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Geist', label: 'Geist' },
  { value: 'IBM Plex Sans', label: 'IBM Plex' },
  { value: 'JetBrains Mono', label: 'Mono' },
];

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState('dashboard');
  const userName = 'Семён Дементьев';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    // soft accent recalculated as 12% alpha
    root.style.setProperty('--accent-soft', hexToRgba(t.accent, 0.12));
    root.style.setProperty('--bg', t.darkTone);
    // derive surfaces from bg
    const s1 = mixWithWhite(t.darkTone, 0.04);
    const s2 = mixWithWhite(t.darkTone, 0.07);
    const s3 = mixWithWhite(t.darkTone, 0.10);
    root.style.setProperty('--surface', s1);
    root.style.setProperty('--surface-2', s2);
    root.style.setProperty('--surface-3', s3);
    root.dataset.density = t.density;
    root.style.setProperty('--font-ui', `'${t.font}', ui-sans-serif, system-ui, sans-serif`);
  }, [t]);

  const D = window.SEVEN_DATA;
  const counts = {
    tasks: D.PERSONAL_TASKS.concat(D.WORK_TASKS).filter(x => !x.done).length,
    contacts: D.CONTACTS.length,
  };

  const PAGE_LABEL = {
    dashboard: 'Dashboard',
    tasks: 'Задачи',
    calendar: 'Календарь',
    finance: 'Финансы',
    contacts: 'Контакты собственников',
  };
  const PAGE_SUBTITLE = {
    dashboard: 'Добрый день, Семён · понедельник, 18 мая 2026',
    tasks: 'Личные и рабочие — рядом',
    calendar: 'Неделя 21 · события из задач со временем',
    finance: 'Доход, расходы, сделки и цели',
    contacts: 'Собственники объектов · CRM',
  };

  return (
    <div className="app" data-screen-label={`07 ${PAGE_LABEL[route]}`}>
      <Sidebar route={route} setRoute={setRoute} counts={counts} userName={userName} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-greeting">
            <h1>{PAGE_LABEL[route]}</h1>
            <div className="meta">
              <span><span className="dot" />онлайн</span>
              <span className="sep">·</span>
              <span>{PAGE_SUBTITLE[route]}</span>
            </div>
          </div>
          <div className="topbar-spacer" />
          <div className="search">
            <Icon name="search" size={14} />
            <input placeholder="Поиск задач, контактов, событий…" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="topbar-stats">
            <div className="topbar-stat">
              <div className="lbl">Сегодня</div>
              <div className="val tnum">7 событий</div>
            </div>
            <div className="topbar-stat">
              <div className="lbl">Сделки</div>
              <div className="val accent tnum">3</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn"><Icon name="bell" size={15} /></button>
            <button className="icon-btn"><Icon name="plus" size={15} /></button>
          </div>
        </div>

        <div className="content">
          {route === 'dashboard' && <Dashboard setRoute={setRoute} />}
          {route === 'tasks' && <TasksPage />}
          {route === 'calendar' && <CalendarPage />}
          {route === 'finance' && <FinancePage />}
          {route === 'contacts' && <ContactsPage />}
        </div>
      </div>

      <TweaksPanel title="7on OS — настройка">
        <TweakSection label="Цвет" />
        <TweakColor label="Акцент" value={t.accent} options={ACCENT_OPTIONS}
          onChange={(v) => setTweak('accent', v)} />
        <TweakColor label="Тёмный фон" value={t.darkTone} options={DARK_OPTIONS}
          onChange={(v) => setTweak('darkTone', v)} />
        <TweakSection label="Интерфейс" />
        <TweakRadio label="Плотность" value={t.density}
          options={[{ value: 'compact', label: 'компакт' }, { value: 'comfort', label: 'комфорт' }]}
          onChange={(v) => setTweak('density', v)} />
        <TweakSelect label="Шрифт" value={t.font} options={FONT_OPTIONS}
          onChange={(v) => setTweak('font', v)} />
      </TweaksPanel>
    </div>
  );
};

// helpers
function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
function mixWithWhite(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * amt);
  const out = (mix(r) << 16) | (mix(g) << 8) | mix(b);
  return '#' + out.toString(16).padStart(6, '0');
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
