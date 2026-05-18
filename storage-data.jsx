// 7on OS — Storage static data (folders + files; notes come from API)
const STORAGE_FOLDERS = [
  { id: 'f-deals',    name: 'Сделки',     icon: 'briefcase', color: '#b78cff' },
  { id: 'f-objects',  name: 'Объекты',    icon: 'home',      color: '#d4ff4d' },
  { id: 'f-docs',     name: 'Документы',  icon: 'file',      color: '#7aa7ff' },
  { id: 'f-personal', name: 'Личное',     icon: 'star',      color: '#ffb45e' },
];

const STORAGE_FILES = [
  { id: 'file-1',  name: 'Договор Орлова — Тверская 18.pdf',   type: 'pdf',   size: '2.4 МБ',  folder: 'f-deals',    modified: '17 мая' },
  { id: 'file-2',  name: 'Тверская 18 — фото.zip',             type: 'zip',   size: '48.6 МБ', folder: 'f-objects',  modified: '14 мая' },
  { id: 'file-3',  name: 'Маросейка 6 — план БТИ.pdf',         type: 'pdf',   size: '0.9 МБ',  folder: 'f-objects',  modified: '12 мая' },
  { id: 'file-4',  name: 'Выписка ЕГРН — Беляева.pdf',         type: 'pdf',   size: '0.4 МБ',  folder: 'f-docs',     modified: '10 мая' },
  { id: 'file-5',  name: 'Презентация Маросейка.pdf',           type: 'pdf',   size: '5.1 МБ',  folder: 'f-deals',    modified: '9 мая'  },
  { id: 'file-6',  name: 'Тверская 18 — фасад.jpg',            type: 'image', size: '3.2 МБ',  folder: 'f-objects',  modified: '14 мая' },
  { id: 'file-7',  name: 'Шаблон договора аренды.docx',        type: 'doc',   size: '64 КБ',   folder: 'f-docs',     modified: '2 мая'  },
  { id: 'file-8',  name: 'Налоги Q1 2026.xlsx',                type: 'sheet', size: '120 КБ',  folder: 'f-personal', modified: '28 апр' },
  { id: 'file-9',  name: 'Паспорт Семён — скан.pdf',           type: 'pdf',   size: '1.1 МБ',  folder: 'f-personal', modified: '15 янв' },
  { id: 'file-10', name: 'Кутузовский 14 — оценка банка.pdf',  type: 'pdf',   size: '0.8 МБ',  folder: 'f-deals',    modified: '6 мая'  },
  { id: 'file-11', name: 'Профсоюзная 41 — фото.jpg',          type: 'image', size: '2.1 МБ',  folder: 'f-objects',  modified: '4 мая'  },
  { id: 'file-12', name: 'Чек-лист показа.md',                 type: 'md',    size: '8 КБ',    folder: 'f-docs',     modified: '1 мая'  },
];

// Attach static data to global SEVEN_DATA (available after data.jsx loads)
window.SEVEN_DATA.FOLDERS = STORAGE_FOLDERS;
window.SEVEN_DATA.FILES   = STORAGE_FILES;
