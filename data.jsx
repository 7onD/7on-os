// 7on OS — Supabase data layer
const SUPABASE_URL = 'https://ezhxydoxiggrmjbfocun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aHh5ZG94aWdncm1qYmZvY3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDE2NDYsImV4cCI6MjA5NDYxNzY0Nn0.v1hkLOlauC2X2Gfi1Ds-IUOP0Fo0WuIo1wA7aiVYbhE';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUS_LABEL = {
  hot: 'Горячий',
  warm: 'В работе',
  work: 'В работе',
  cold: 'Холодный',
};

async function loadAllData() {
  const [
    { data: tasks },
    { data: contacts },
    { data: deals },
    { data: fin_income },
    { data: fin_expenses },
    { data: goals },
    { data: monthly },
    { data: events },
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

  const CONTACTS = contacts.map(c => ({
    ...c,
    lastContact: c.last_contact,
    daysSince: c.days_since,
    nextWhen: c.next_when,
  }));

  const MONTHLY = monthly.map(m => ({
    ...m,
    m: m.month,
    current: m.is_current,
  }));

  const EVENTS = events.map(e => ({
    ...e,
    start: e.start_time,
    end: e.end_time,
  }));

  window.SEVEN_DATA = {
    PERSONAL_TASKS: tasks.filter(t => t.type === 'personal'),
    WORK_TASKS: tasks.filter(t => t.type === 'work'),
    CONTACTS,
    DEALS: deals,
    FIN_INCOME: fin_income,
    FIN_EXPENSES: fin_expenses,
    GOALS: goals,
    MONTHLY,
    EVENTS,
    STATUS_LABEL,
  };
}

window.loadAllData = loadAllData;
window.sb = sb;
