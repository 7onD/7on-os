// 7on OS — Yandex Cloud data layer
const API = 'https://functions.yandexcloud.net/d4eck1v8o203hh4lr9ov';

const STATUS_LABEL = { hot: 'Горячий', warm: 'Тёплый', work: 'В работе', cold: 'Холодный' };

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function apiFetch(qs, options = {}) {
  const r = await fetch(`${API}?${qs}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}
const apiGet   = (t)        => apiFetch(`table=${t}`);
const apiPost  = (t, body)  => apiFetch(`table=${t}`,          { method: 'POST',   body: JSON.stringify(body) });
const apiPatch = (t, id, b) => apiFetch(`table=${t}&id=${id}`, { method: 'PATCH',  body: JSON.stringify(b) });
const apiDel   = (t, id)    => apiFetch(`table=${t}&id=${id}`, { method: 'DELETE' });

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function loadAllData() {
  const [tasks, contacts, deals, fin_income, fin_expenses, goals, monthly, events, notes, files, folders, cal_tags, big_goals] =
    await Promise.all([
      apiGet('tasks'), apiGet('contacts'), apiGet('deals'),
      apiGet('fin_income'), apiGet('fin_expenses'), apiGet('goals'),
      apiGet('monthly'), apiGet('events'),
      apiGet('notes').catch(() => []),
      apiGet('files').catch(() => []),
      apiGet('folders').catch(() => []),
      apiGet('cal_tags').catch(() => []),
      apiGet('big_goals').catch(() => []),
    ]);

  // Default folders (shown when API returns empty)
  const DEFAULT_NOTE_FOLDERS = [
    { id: 'nf-personal', name: 'Личное',    icon: 'star',      color: '#ffb45e' },
    { id: 'nf-work',     name: 'Работа',    icon: 'briefcase', color: '#b78cff' },
    { id: 'nf-projects', name: 'Проекты',   icon: 'archive',   color: '#7aa7ff' },
  ];
  const DEFAULT_FILE_FOLDERS = [
    { id: 'f-deals',    name: 'Сделки',     icon: 'briefcase', color: '#b78cff' },
    { id: 'f-objects',  name: 'Объекты',    icon: 'home',      color: '#d4ff4d' },
    { id: 'f-docs',     name: 'Документы',  icon: 'file',      color: '#7aa7ff' },
    { id: 'f-personal', name: 'Личное',     icon: 'star',      color: '#ffb45e' },
  ];

  window.SUPABASE_OK = true;
  window.SEVEN_DATA = {
    PERSONAL_TASKS: tasks.filter(t => t.type === 'personal').map(t => ({ ...t, done: !!t.done })),
    WORK_TASKS:     tasks.filter(t => t.type === 'work').map(t => ({ ...t, done: !!t.done })),
    STUDY_TASKS:    tasks.filter(t => t.type === 'study').map(t => ({ ...t, done: !!t.done })),
    CONTACTS: contacts.map(c => ({ ...c, lastContact: c.last_contact, daysSince: c.days_since, nextWhen: c.next_when })),
    DEALS: deals,
    FIN_INCOME: fin_income,
    FIN_EXPENSES: fin_expenses,
    GOALS: goals,
    MONTHLY: monthly.map(m => ({ ...m, m: m.month, current: !!m.is_current })),
    EVENTS: events.map(e => ({ ...e, start: e.start_time, end: e.end_time })),
    NOTES: notes.map(n => ({ ...n, pinned: !!n.pinned, blocks: n.blocks })),
    FILES: files,   // real uploaded files; storage-data.jsx adds demo fallback
    FOLDERS: folders,
    NOTE_FOLDERS: folders.filter(f => f.id.startsWith('nf-')).length > 0
      ? folders.filter(f => f.id.startsWith('nf-'))
      : DEFAULT_NOTE_FOLDERS,
    FILE_FOLDERS: folders.filter(f => !f.id.startsWith('nf-')).length > 0
      ? folders.filter(f => !f.id.startsWith('nf-'))
      : DEFAULT_FILE_FOLDERS,
    CAL_TAGS: cal_tags,
    BIG_GOALS: big_goals,
    STATUS_LABEL,
  };
}

// ── TASKS ────────────────────────────────────────────────────────────────────
async function toggleTask(id, done) {
  const patch = { done: done ? 1 : 0 };
  if (done) patch.done_at = new Date().toISOString().slice(0, 10);
  else patch.done_at = '';
  await apiPatch('tasks', id, patch);
}
async function createTask({ title, due, time, priority, type, tag, description, reminder, deadline }) {
  const id = (type === 'personal' ? 'p' : type === 'work' ? 'w' : 'e') + Date.now();
  await apiPost('tasks', { id, title, due: due || '', time: time || '', priority, type, tag: tag || null, done: 0, description: description || '', reminder: reminder ?? -1, deadline: deadline || null });
  return id;
}
async function deleteTask(id) { await apiDel('tasks', id); }
async function updateTask(id, updates) {
  const p = { ...updates };
  if (p.done !== undefined) p.done = p.done ? 1 : 0;
  await apiPatch('tasks', id, p);
}

// ── CONTACTS ─────────────────────────────────────────────────────────────────
async function createContact({ name, phone, addr, params, last_contact, days_since, status, next, next_when, notes }) {
  const id = 'c' + Date.now();
  await apiPost('contacts', {
    id, name, phone: phone || '', addr: addr || '', params: params || '',
    last_contact: last_contact || '', days_since: days_since || 0,
    status, next: next || '', next_when: next_when || '', notes: notes || '',
  });
  return id;
}
async function updateContact(id, updates) { await apiPatch('contacts', id, updates); }
async function deleteContact(id) { await apiDel('contacts', id); }

// ── DEALS ─────────────────────────────────────────────────────────────────────
async function createDeal({ client, object, stage, amount, commission, expected }) {
  await apiPost('deals', { id: 'd' + Date.now(), client, object, stage, amount, commission, expected, step: 1, total: 5 });
}
async function updateDeal(id, updates) { await apiPatch('deals', id, updates); }
async function deleteDeal(id) { await apiDel('deals', id); }

// ── FINANCE ───────────────────────────────────────────────────────────────────
async function createFinIncome({ name, amount, pct })  { await apiPost('fin_income',  { name, amount, pct: pct || 0 }); }
async function deleteFinIncome(id)                      { await apiDel('fin_income',   id); }
async function createFinExpense({ name, amount, pct }) { await apiPost('fin_expenses', { name, amount, pct: pct || 0 }); }
async function deleteFinExpense(id)                     { await apiDel('fin_expenses',  id); }
async function updateGoal(id, current, target) {
  await apiPatch('goals', id, { current, pct: Math.min(100, Math.round((current / target) * 100)) });
}
async function createGoal({ name, target, current }) {
  const cur = current || 0;
  await apiPost('goals', { name, target, current: cur, pct: Math.min(100, Math.round((cur / target) * 100)) });
}
async function deleteGoal(id) { await apiDel('goals', id); }

// ── BIG GOALS (long-term) ─────────────────────────────────────────────────────
const BIG_GOAL_COLORS = ['var(--accent)', 'var(--blue)', 'var(--violet)', 'var(--orange)', '#5ee5a0', 'var(--red)'];
async function createBigGoal({ title, color, items }) {
  const id = 'bg' + Date.now();
  await apiPost('big_goals', { id, title, color: color || 'var(--accent)', items: items || [] });
  return id;
}
async function updateBigGoal(id, fields) { await apiPatch('big_goals', id, fields); }
async function deleteBigGoal(id) { await apiDel('big_goals', id); }

// ── EVENTS ────────────────────────────────────────────────────────────────────
async function createEvent({ day, start, end, title, kind, description, reminder, event_date, task_id, contact_id }) {
  const body = { day, start_time: start, end_time: end, title, kind, description: description || '', reminder: reminder ?? -1, event_date: event_date || '' };
  if (task_id)    body.task_id    = task_id;
  if (contact_id) body.contact_id = contact_id;
  await apiPost('events', body);
}
async function updateEvent(id, updates) {
  const p = { ...updates };
  if (p.start !== undefined) { p.start_time = p.start; delete p.start; }
  if (p.end   !== undefined) { p.end_time   = p.end;   delete p.end;   }
  await apiPatch('events', id, p);
}
async function deleteEvent(id) { await apiDel('events', id); }

// ── FOLDERS ───────────────────────────────────────────────────────────────────
async function createFolder({ name, icon, color, kind = 'files' }) {
  const prefix = kind === 'notes' ? 'nf-' : 'f-';
  const id = prefix + Date.now();
  await apiPost('folders', { id, name, icon: icon || 'folder', color: color || '#7aa7ff' });
  return id;
}
async function updateFolder(id, updates) { await apiPatch('folders', id, updates); }
async function deleteFolder(id) { await apiDel('folders', id); }

// ── NOTES ─────────────────────────────────────────────────────────────────────
async function createNote({ title, folder, pinned, modified, preview, blocks }) {
  const id = 'n' + Date.now();
  await apiPost('notes', { id, title, folder: folder || 'f-personal', pinned: pinned ? 1 : 0, modified: modified || '', preview: preview || '', blocks: typeof blocks === 'string' ? blocks : JSON.stringify(blocks || []) });
  return id;
}
async function updateNote(id, updates) {
  const p = { ...updates };
  if (p.pinned !== undefined) p.pinned = p.pinned ? 1 : 0;
  if (p.blocks !== undefined && typeof p.blocks !== 'string') p.blocks = JSON.stringify(p.blocks);
  await apiPatch('notes', id, p);
}
async function deleteNote(id) { await apiDel('notes', id); }

// ── CALENDAR TAGS ─────────────────────────────────────────────────────────────
async function createCalTag({ name, color }) {
  const id = 'tag-' + Date.now();
  await apiPost('cal_tags', { id, name, color: color || '#d4ff4d' });
  return id;
}
async function deleteCalTag(id) { await apiDel('cal_tags', id); }

// ── FILES ──────────────────────────────────────────────────────────────────────
function detectFileType(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
  if (['doc','docx'].includes(ext)) return 'doc';
  if (['xls','xlsx','csv'].includes(ext)) return 'sheet';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'zip';
  if (['md','txt'].includes(ext)) return 'md';
  return 'file';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

// Upload a File object through the Cloud Function (no presigned URLs needed).
// Limit: ~4 MB (base64 overhead ~33%, function body limit ~6 MB).
async function uploadFileProxy(file) {
  const MAX = 4 * 1024 * 1024;
  if (file.size > MAX) throw new Error(`Файл слишком большой (максимум 4 МБ). Большие файлы загружайте через Yandex Cloud Console.`);
  const base64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return apiFetch('action=upload', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, data: base64, contentType: file.type || 'application/octet-stream' }),
  });
}

// Returns a direct URL to download/open a stored file via the function proxy.
function getDownloadUrl(key, inline = false) {
  return `${API}?action=download&key=${encodeURIComponent(key)}${inline ? '&inline=1' : ''}`;
}

async function createFileRecord({ id, name, type, size, folder, modified, key }) {
  await apiPost('files', { id, name, type, size, folder: folder || 'f-docs', modified, key });
}
async function updateFileRecord(id, updates) { await apiPatch('files', id, updates); }
async function deleteFileRecord(id) { await apiDel('files', id); }

// ── exports ───────────────────────────────────────────────────────────────────
window.loadAllData   = loadAllData;
window.STATUS_LABEL  = STATUS_LABEL;
Object.assign(window, {
  toggleTask, createTask, deleteTask, updateTask,
  createContact, updateContact, deleteContact,
  createDeal, updateDeal, deleteDeal,
  createFinIncome, deleteFinIncome,
  createFinExpense, deleteFinExpense,
  updateGoal, createGoal, deleteGoal,
  createEvent, updateEvent, deleteEvent,
  createNote, updateNote, deleteNote,
  uploadFileProxy, getDownloadUrl, createFileRecord, updateFileRecord, deleteFileRecord,
  detectFileType, formatFileSize,
  createFolder, updateFolder, deleteFolder,
  createCalTag, deleteCalTag,
});
