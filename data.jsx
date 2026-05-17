// 7on OS — Supabase data layer + CRUD
const SUPABASE_URL = 'https://ezhxydoxiggrmjbfocun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aHh5ZG94aWdncm1qYmZvY3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDE2NDYsImV4cCI6MjA5NDYxNzY0Nn0.v1hkLOlauC2X2Gfi1Ds-IUOP0Fo0WuIo1wA7aiVYbhE';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUS_LABEL = {
  hot: 'Горячий',
  warm: 'Тёплый',
  work: 'В работе',
  cold: 'Холодный',
};

// ── LOAD ────────────────────────────────────────────────────────────────────

const EMPTY_DATA = () => ({
  PERSONAL_TASKS: [], WORK_TASKS: [], CONTACTS: [], DEALS: [],
  FIN_INCOME: [], FIN_EXPENSES: [], GOALS: [], MONTHLY: [], EVENTS: [],
  STATUS_LABEL,
});

async function loadAllData() {
  // Race actual fetch against a 6-second timeout (Supabase can be blocked in RF)
  let timedOut = false;

  const fetchData = async () => {
    const [
      { data: tasks,        error: e1 },
      { data: contacts,     error: e2 },
      { data: deals,        error: e3 },
      { data: fin_income,   error: e4 },
      { data: fin_expenses, error: e5 },
      { data: goals,        error: e6 },
      { data: monthly,      error: e7 },
      { data: events,       error: e8 },
    ] = await Promise.all([
      sb.from('tasks').select('*').order('id'),
      sb.from('contacts').select('*').order('id'),
      sb.from('deals').select('*').order('id'),
      sb.from('fin_income').select('*').order('id'),
      sb.from('fin_expenses').select('*').order('id'),
      sb.from('goals').select('*').order('id'),
      sb.from('monthly').select('*').order('id'),
      sb.from('events').select('*').order('id'),
    ]);

    if (timedOut) return; // timeout already resolved, skip

    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8;
    if (err) throw new Error(err.message);

    const CONTACTS = contacts.map(c => ({
      ...c, lastContact: c.last_contact, daysSince: c.days_since, nextWhen: c.next_when,
    }));
    const MONTHLY = monthly.map(m => ({ ...m, m: m.month, current: m.is_current }));
    const EVENTS  = events.map(e => ({ ...e, start: e.start_time, end: e.end_time }));

    window.SUPABASE_OK = true;
    window.SEVEN_DATA = {
      PERSONAL_TASKS: tasks.filter(t => t.type === 'personal'),
      WORK_TASKS: tasks.filter(t => t.type === 'work'),
      CONTACTS, DEALS: deals, FIN_INCOME: fin_income,
      FIN_EXPENSES: fin_expenses, GOALS: goals, MONTHLY, EVENTS, STATUS_LABEL,
    };
  };

  const timeoutPromise = new Promise(resolve => setTimeout(() => {
    timedOut = true;
    window.SUPABASE_OK = false;
    window.SEVEN_DATA = EMPTY_DATA();
    resolve();
  }, 6000));

  await Promise.race([fetchData(), timeoutPromise]);
}

// ── TASKS ───────────────────────────────────────────────────────────────────

async function toggleTask(id, done) {
  const { error } = await sb.from('tasks').update({ done }).eq('id', id);
  if (error) throw error;
}

async function createTask({ title, due, priority, type, tag, description }) {
  const id = (type === 'personal' ? 'p' : 'w') + Date.now();
  const { error } = await sb.from('tasks').insert({ id, title, due, priority, type, tag: tag || null, done: false, description: description || '' });
  if (error) throw error;
}

async function deleteTask(id) {
  const { error } = await sb.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

async function updateTask(id, updates) {
  const { error } = await sb.from('tasks').update(updates).eq('id', id);
  if (error) throw error;
}

// ── CONTACTS ────────────────────────────────────────────────────────────────

async function createContact({ name, phone, addr, params, last_contact, days_since, status, next, next_when, notes }) {
  const id = 'c' + Date.now();
  const { error } = await sb.from('contacts').insert({ id, name, phone, addr, params, last_contact, days_since: days_since || 0, status, next, next_when, notes });
  if (error) throw error;
}

async function updateContact(id, updates) {
  const { error } = await sb.from('contacts').update(updates).eq('id', id);
  if (error) throw error;
}

async function deleteContact(id) {
  const { error } = await sb.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

// ── DEALS ───────────────────────────────────────────────────────────────────

async function createDeal({ client, object, stage, amount, commission, expected }) {
  const id = 'd' + Date.now();
  const { error } = await sb.from('deals').insert({ id, client, object, stage, amount, commission, expected, step: 1, total: 5 });
  if (error) throw error;
}

async function updateDeal(id, updates) {
  const { error } = await sb.from('deals').update(updates).eq('id', id);
  if (error) throw error;
}

async function deleteDeal(id) {
  const { error } = await sb.from('deals').delete().eq('id', id);
  if (error) throw error;
}

// ── FINANCE ─────────────────────────────────────────────────────────────────

async function createFinIncome({ name, amount, pct }) {
  const { error } = await sb.from('fin_income').insert({ name, amount, pct: pct || 0 });
  if (error) throw error;
}

async function deleteFinIncome(id) {
  const { error } = await sb.from('fin_income').delete().eq('id', id);
  if (error) throw error;
}

async function createFinExpense({ name, amount, pct }) {
  const { error } = await sb.from('fin_expenses').insert({ name, amount, pct: pct || 0 });
  if (error) throw error;
}

async function deleteFinExpense(id) {
  const { error } = await sb.from('fin_expenses').delete().eq('id', id);
  if (error) throw error;
}

async function updateGoal(id, current, target) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const { error } = await sb.from('goals').update({ current, pct }).eq('id', id);
  if (error) throw error;
}

async function createGoal({ name, target, current }) {
  const cur = current || 0;
  const pct = Math.min(100, Math.round((cur / target) * 100));
  const { error } = await sb.from('goals').insert({ name, target, current: cur, pct });
  if (error) throw error;
}

async function deleteGoal(id) {
  const { error } = await sb.from('goals').delete().eq('id', id);
  if (error) throw error;
}

// ── EVENTS ──────────────────────────────────────────────────────────────────

async function createEvent({ day, start, end, title, kind, description }) {
  const { error } = await sb.from('events').insert({ day, start_time: start, end_time: end, title, kind, description: description || '' });
  if (error) throw error;
}

async function updateEvent(id, updates) {
  const payload = { ...updates };
  if (payload.start !== undefined) { payload.start_time = payload.start; delete payload.start; }
  if (payload.end !== undefined) { payload.end_time = payload.end; delete payload.end; }
  const { error } = await sb.from('events').update(payload).eq('id', id);
  if (error) throw error;
}

async function deleteEvent(id) {
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
}

window.loadAllData = loadAllData;
window.sb = sb;
window.STATUS_LABEL = STATUS_LABEL;
Object.assign(window, {
  toggleTask, createTask, deleteTask, updateTask,
  createContact, updateContact, deleteContact,
  createDeal, updateDeal, deleteDeal,
  createFinIncome, deleteFinIncome,
  createFinExpense, deleteFinExpense,
  updateGoal, createGoal, deleteGoal,
  createEvent, updateEvent, deleteEvent,
});
