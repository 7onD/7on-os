// 7on OS — sample data

const PERSONAL_TASKS = [
  { id: 'p1', title: 'Записаться к стоматологу', due: 'Сегодня', priority: 'med', done: false },
  { id: 'p2', title: 'Тренировка 19:00', due: 'Сегодня · 19:00', priority: 'low', done: false },
  { id: 'p3', title: 'Купить продукты на неделю', due: 'Сегодня', priority: 'low', done: true },
  { id: 'p4', title: 'Оплатить квартиру', due: '20 мая', priority: 'high', done: false },
  { id: 'p5', title: 'Забрать костюм из химчистки', due: 'Завтра', priority: 'low', done: false },
  { id: 'p6', title: 'Позвонить маме', due: 'Сегодня', priority: 'med', done: false },
  { id: 'p7', title: 'Дочитать «Антихрупкость»', due: 'На неделе', priority: 'low', done: false },
];

const WORK_TASKS = [
  { id: 'w1', title: 'Показ квартиры — Тверская 18', due: 'Сегодня · 14:00', priority: 'high', done: false, tag: 'Показ' },
  { id: 'w2', title: 'Подписать договор с Орловой', due: 'Сегодня · 17:30', priority: 'high', done: false, tag: 'Договор' },
  { id: 'w3', title: 'Прозвон холодной базы (20 контактов)', due: 'Сегодня', priority: 'med', done: false, tag: 'Звонки' },
  { id: 'w4', title: 'Фотосъёмка объекта на Маросейке', due: 'Завтра · 11:00', priority: 'med', done: false, tag: 'Объект' },
  { id: 'w5', title: 'Подготовить документы для сделки Левитан', due: '20 мая', priority: 'high', done: false, tag: 'Сделка' },
  { id: 'w6', title: 'Внести нового клиента в CRM', due: 'Сегодня', priority: 'low', done: true, tag: 'CRM' },
  { id: 'w7', title: 'Согласовать оценку с банком', due: '22 мая', priority: 'med', done: false, tag: 'Сделка' },
];

const CONTACTS = [
  {
    id: 'c1', name: 'Орлова Елена Викторовна', phone: '+7 (916) 234-12-89',
    addr: 'Тверская ул., 18, кв. 47', params: '78 м² · 3к · 6/12 · 32 млн ₽',
    lastContact: '17 мая', daysSince: 1, status: 'hot',
    next: 'Подписать договор', nextWhen: 'Сегодня 17:30',
    notes: 'Готова к сделке, ждёт документы. Предпочитает наличный расчёт.',
  },
  {
    id: 'c2', name: 'Левитан Андрей Сергеевич', phone: '+7 (903) 187-55-02',
    addr: 'Маросейка, 6/8, кв. 12', params: '54 м² · 2к · 4/7 · 24.5 млн ₽',
    lastContact: '16 мая', daysSince: 2, status: 'hot',
    next: 'Фотосъёмка объекта', nextWhen: 'Завтра 11:00',
    notes: 'Срочная продажа, разъезд. Готов снизить цену на 5%.',
  },
  {
    id: 'c3', name: 'Кузьмина Мария Игоревна', phone: '+7 (925) 451-30-19',
    addr: 'Ленинградский пр., 76, кв. 203', params: '42 м² · 1к · 14/18 · 16.8 млн ₽',
    lastContact: '12 мая', daysSince: 6, status: 'work',
    next: 'Уточнить дату показа', nextWhen: '21 мая',
    notes: 'Сдаёт квартиру в аренду, хочет освободить к августу.',
  },
  {
    id: 'c4', name: 'Соколов Игорь Павлович', phone: '+7 (985) 712-44-31',
    addr: 'Чистопрудный б-р, 3, кв. 8', params: '96 м² · 4к · 2/5 · 48 млн ₽',
    lastContact: '8 мая', daysSince: 10, status: 'warm',
    next: 'Прислать новые фото', nextWhen: '20 мая',
    notes: 'Старый фонд, требует ремонта. Торг от 2 млн.',
  },
  {
    id: 'c5', name: 'Морозова Анастасия', phone: '+7 (964) 808-21-77',
    addr: 'Большая Никитская, 22, кв. 31', params: '68 м² · 2к · 5/9 · 38 млн ₽',
    lastContact: '5 мая', daysSince: 13, status: 'warm',
    next: 'Назначить встречу', nextWhen: '22 мая',
    notes: 'Раздумывает между продажей и сдачей. Нужна консультация.',
  },
  {
    id: 'c6', name: 'Гаврилов Дмитрий', phone: '+7 (916) 555-09-43',
    addr: 'Кутузовский пр., 14, кв. 89', params: '110 м² · 3к · 9/14 · 62 млн ₽',
    lastContact: '28 апр', daysSince: 20, status: 'cold',
    next: 'Возобновить переговоры', nextWhen: 'На неделе',
    notes: 'Снял с продажи в апреле, может вернуться к лету.',
  },
  {
    id: 'c7', name: 'Беляева Ольга Николаевна', phone: '+7 (903) 277-65-18',
    addr: 'Профсоюзная, 41, кв. 156', params: '36 м² · 1к · 7/9 · 12.3 млн ₽',
    lastContact: '2 мая', daysSince: 16, status: 'work',
    next: 'Проверить документы', nextWhen: '23 мая',
    notes: 'Наследство, нужна выписка ЕГРН. Спешит с продажей.',
  },
  {
    id: 'c8', name: 'Терентьев Павел', phone: '+7 (925) 119-87-22',
    addr: 'Остоженка, 9, кв. 4', params: '128 м² · 4к · 3/6 · 95 млн ₽',
    lastContact: '20 апр', daysSince: 28, status: 'cold',
    next: 'Холодный обзвон', nextWhen: 'Когда удобно',
    notes: 'Премиум-сегмент. Был интерес в марте, потом тишина.',
  },
];

const DEALS = [
  { id: 'd1', client: 'Орлова Е.В.', object: 'Тверская 18', stage: 'Договор', amount: 32, commission: 0.96, step: 4, total: 5, expected: '24 мая' },
  { id: 'd2', client: 'Левитан А.С.', object: 'Маросейка 6/8', stage: 'Показы', amount: 24.5, commission: 0.74, step: 2, total: 5, expected: '5 июня' },
  { id: 'd3', client: 'Беляева О.Н.', object: 'Профсоюзная 41', stage: 'Документы', amount: 12.3, commission: 0.37, step: 3, total: 5, expected: '30 мая' },
];

const FIN_INCOME = [
  { name: 'Комиссии', amount: 1850, pct: 78 },
  { name: 'Консультации', amount: 320, pct: 13 },
  { name: 'Партнёрские', amount: 210, pct: 9 },
];

const FIN_EXPENSES = [
  { name: 'Аренда офиса', amount: 85, pct: 100 },
  { name: 'Реклама', amount: 64, pct: 75 },
  { name: 'Транспорт', amount: 41, pct: 48 },
  { name: 'Продукты', amount: 38, pct: 45 },
  { name: 'Подписки', amount: 18, pct: 21 },
  { name: 'Кафе', amount: 26, pct: 31 },
];

const GOALS = [
  { name: 'Резервный фонд', target: 2000, current: 1240, pct: 62 },
  { name: 'Поездка в Японию', target: 600, current: 285, pct: 48 },
  { name: 'Новая машина', target: 3500, current: 920, pct: 26 },
];

// month history in thousands ₽
const MONTHLY = [
  { m: 'Дек', income: 1420, expenses: 290 },
  { m: 'Янв', income: 980, expenses: 320 },
  { m: 'Фев', income: 1640, expenses: 280 },
  { m: 'Мар', income: 2120, expenses: 340 },
  { m: 'Апр', income: 1880, expenses: 310 },
  { m: 'Май', income: 2380, expenses: 272, current: true },
];

// Calendar events for current week (May 18 — May 24, 2026)
const EVENTS = [
  { day: 1, start: 9, end: 10, title: 'Утренний планёрка', kind: 'work' },
  { day: 1, start: 11, end: 12.5, title: 'Прозвон базы', kind: 'work' },
  { day: 1, start: 14, end: 15.5, title: 'Показ — Тверская 18', kind: 'deal' },
  { day: 1, start: 17.5, end: 19, title: 'Подписание — Орлова', kind: 'deal' },
  { day: 1, start: 19, end: 20, title: 'Тренировка', kind: 'personal' },
  { day: 2, start: 11, end: 12, title: 'Фотосъёмка Маросейка', kind: 'work' },
  { day: 2, start: 13, end: 14, title: 'Обед с партнёром', kind: 'meeting' },
  { day: 2, start: 15, end: 16, title: 'Показ Кузьминой', kind: 'deal' },
  { day: 3, start: 10, end: 11, title: 'Звонок банку', kind: 'work' },
  { day: 3, start: 14, end: 15.5, title: 'Встреча с Соколовым', kind: 'meeting' },
  { day: 4, start: 9, end: 10, title: 'Стоматолог', kind: 'personal' },
  { day: 4, start: 12, end: 13, title: 'Сделка — Левитан', kind: 'deal' },
  { day: 4, start: 16, end: 17, title: 'Показ Морозовой', kind: 'deal' },
  { day: 5, start: 11, end: 12.5, title: 'Прозвон холодной базы', kind: 'work' },
  { day: 5, start: 18, end: 20, title: 'Ужин с семьёй', kind: 'personal' },
  { day: 6, start: 10, end: 12, title: 'Открытый показ', kind: 'deal' },
];

const STATUS_LABEL = {
  hot: 'Горячий',
  warm: 'В работе',
  work: 'В работе',
  cold: 'Холодный',
};

window.SEVEN_DATA = {
  PERSONAL_TASKS, WORK_TASKS, CONTACTS, DEALS,
  FIN_INCOME, FIN_EXPENSES, GOALS, MONTHLY, EVENTS, STATUS_LABEL,
};
