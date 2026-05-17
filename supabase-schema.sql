-- 7on OS — Supabase schema + seed data
-- Запусти в Supabase → SQL Editor → New query

-- ─── ТАБЛИЦЫ ────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id text primary key,
  title text not null,
  due text,
  priority text,        -- 'high' | 'med' | 'low'
  done boolean default false,
  type text not null,   -- 'personal' | 'work'
  tag text
);

create table if not exists contacts (
  id text primary key,
  name text not null,
  phone text,
  addr text,
  params text,
  last_contact text,
  days_since integer default 0,
  status text,          -- 'hot' | 'warm' | 'work' | 'cold'
  next text,
  next_when text,
  notes text
);

create table if not exists deals (
  id text primary key,
  client text,
  object text,
  stage text,
  amount numeric,
  commission numeric,
  step integer,
  total integer,
  expected text
);

create table if not exists fin_income (
  id serial primary key,
  name text,
  amount numeric,
  pct integer
);

create table if not exists fin_expenses (
  id serial primary key,
  name text,
  amount numeric,
  pct integer
);

create table if not exists goals (
  id serial primary key,
  name text,
  target numeric,
  current numeric,
  pct integer
);

create table if not exists monthly (
  id serial primary key,
  month text,
  income numeric,
  expenses numeric,
  is_current boolean default false
);

create table if not exists events (
  id serial primary key,
  day integer,
  start_time numeric,
  end_time numeric,
  title text,
  kind text             -- 'work' | 'personal' | 'deal' | 'meeting'
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table tasks enable row level security;
alter table contacts enable row level security;
alter table deals enable row level security;
alter table fin_income enable row level security;
alter table fin_expenses enable row level security;
alter table goals enable row level security;
alter table monthly enable row level security;
alter table events enable row level security;

-- Разрешаем anon полный доступ (личный дашборд без авторизации)
create policy "anon full access" on tasks for all to anon using (true) with check (true);
create policy "anon full access" on contacts for all to anon using (true) with check (true);
create policy "anon full access" on deals for all to anon using (true) with check (true);
create policy "anon full access" on fin_income for all to anon using (true) with check (true);
create policy "anon full access" on fin_expenses for all to anon using (true) with check (true);
create policy "anon full access" on goals for all to anon using (true) with check (true);
create policy "anon full access" on monthly for all to anon using (true) with check (true);
create policy "anon full access" on events for all to anon using (true) with check (true);

-- ─── SEED DATA ──────────────────────────────────────────────────────────────

insert into tasks (id, title, due, priority, done, type, tag) values
  ('p1', 'Записаться к стоматологу', 'Сегодня', 'med', false, 'personal', null),
  ('p2', 'Тренировка 19:00', 'Сегодня · 19:00', 'low', false, 'personal', null),
  ('p3', 'Купить продукты на неделю', 'Сегодня', 'low', true, 'personal', null),
  ('p4', 'Оплатить квартиру', '20 мая', 'high', false, 'personal', null),
  ('p5', 'Забрать костюм из химчистки', 'Завтра', 'low', false, 'personal', null),
  ('p6', 'Позвонить маме', 'Сегодня', 'med', false, 'personal', null),
  ('p7', 'Дочитать «Антихрупкость»', 'На неделе', 'low', false, 'personal', null),
  ('w1', 'Показ квартиры — Тверская 18', 'Сегодня · 14:00', 'high', false, 'work', 'Показ'),
  ('w2', 'Подписать договор с Орловой', 'Сегодня · 17:30', 'high', false, 'work', 'Договор'),
  ('w3', 'Прозвон холодной базы (20 контактов)', 'Сегодня', 'med', false, 'work', 'Звонки'),
  ('w4', 'Фотосъёмка объекта на Маросейке', 'Завтра · 11:00', 'med', false, 'work', 'Объект'),
  ('w5', 'Подготовить документы для сделки Левитан', '20 мая', 'high', false, 'work', 'Сделка'),
  ('w6', 'Внести нового клиента в CRM', 'Сегодня', 'low', true, 'work', 'CRM'),
  ('w7', 'Согласовать оценку с банком', '22 мая', 'med', false, 'work', 'Сделка');

insert into contacts (id, name, phone, addr, params, last_contact, days_since, status, next, next_when, notes) values
  ('c1', 'Орлова Елена Викторовна', '+7 (916) 234-12-89', 'Тверская ул., 18, кв. 47', '78 м² · 3к · 6/12 · 32 млн ₽', '17 мая', 1, 'hot', 'Подписать договор', 'Сегодня 17:30', 'Готова к сделке, ждёт документы. Предпочитает наличный расчёт.'),
  ('c2', 'Левитан Андрей Сергеевич', '+7 (903) 187-55-02', 'Маросейка, 6/8, кв. 12', '54 м² · 2к · 4/7 · 24.5 млн ₽', '16 мая', 2, 'hot', 'Фотосъёмка объекта', 'Завтра 11:00', 'Срочная продажа, разъезд. Готов снизить цену на 5%.'),
  ('c3', 'Кузьмина Мария Игоревна', '+7 (925) 451-30-19', 'Ленинградский пр., 76, кв. 203', '42 м² · 1к · 14/18 · 16.8 млн ₽', '12 мая', 6, 'work', 'Уточнить дату показа', '21 мая', 'Сдаёт квартиру в аренду, хочет освободить к августу.'),
  ('c4', 'Соколов Игорь Павлович', '+7 (985) 712-44-31', 'Чистопрудный б-р, 3, кв. 8', '96 м² · 4к · 2/5 · 48 млн ₽', '8 мая', 10, 'warm', 'Прислать новые фото', '20 мая', 'Старый фонд, требует ремонта. Торг от 2 млн.'),
  ('c5', 'Морозова Анастасия', '+7 (964) 808-21-77', 'Большая Никитская, 22, кв. 31', '68 м² · 2к · 5/9 · 38 млн ₽', '5 мая', 13, 'warm', 'Назначить встречу', '22 мая', 'Раздумывает между продажей и сдачей. Нужна консультация.'),
  ('c6', 'Гаврилов Дмитрий', '+7 (916) 555-09-43', 'Кутузовский пр., 14, кв. 89', '110 м² · 3к · 9/14 · 62 млн ₽', '28 апр', 20, 'cold', 'Возобновить переговоры', 'На неделе', 'Снял с продажи в апреле, может вернуться к лету.'),
  ('c7', 'Беляева Ольга Николаевна', '+7 (903) 277-65-18', 'Профсоюзная, 41, кв. 156', '36 м² · 1к · 7/9 · 12.3 млн ₽', '2 мая', 16, 'work', 'Проверить документы', '23 мая', 'Наследство, нужна выписка ЕГРН. Спешит с продажей.'),
  ('c8', 'Терентьев Павел', '+7 (925) 119-87-22', 'Остоженка, 9, кв. 4', '128 м² · 4к · 3/6 · 95 млн ₽', '20 апр', 28, 'cold', 'Холодный обзвон', 'Когда удобно', 'Премиум-сегмент. Был интерес в марте, потом тишина.');

insert into deals (id, client, object, stage, amount, commission, step, total, expected) values
  ('d1', 'Орлова Е.В.', 'Тверская 18', 'Договор', 32, 0.96, 4, 5, '24 мая'),
  ('d2', 'Левитан А.С.', 'Маросейка 6/8', 'Показы', 24.5, 0.74, 2, 5, '5 июня'),
  ('d3', 'Беляева О.Н.', 'Профсоюзная 41', 'Документы', 12.3, 0.37, 3, 5, '30 мая');

insert into fin_income (name, amount, pct) values
  ('Комиссии', 1850, 78),
  ('Консультации', 320, 13),
  ('Партнёрские', 210, 9);

insert into fin_expenses (name, amount, pct) values
  ('Аренда офиса', 85, 100),
  ('Реклама', 64, 75),
  ('Транспорт', 41, 48),
  ('Продукты', 38, 45),
  ('Подписки', 18, 21),
  ('Кафе', 26, 31);

insert into goals (name, target, current, pct) values
  ('Резервный фонд', 2000, 1240, 62),
  ('Поездка в Японию', 600, 285, 48),
  ('Новая машина', 3500, 920, 26);

insert into monthly (month, income, expenses, is_current) values
  ('Дек', 1420, 290, false),
  ('Янв', 980, 320, false),
  ('Фев', 1640, 280, false),
  ('Мар', 2120, 340, false),
  ('Апр', 1880, 310, false),
  ('Май', 2380, 272, true);

insert into events (day, start_time, end_time, title, kind) values
  (1, 9, 10, 'Утренний планёрка', 'work'),
  (1, 11, 12.5, 'Прозвон базы', 'work'),
  (1, 14, 15.5, 'Показ — Тверская 18', 'deal'),
  (1, 17.5, 19, 'Подписание — Орлова', 'deal'),
  (1, 19, 20, 'Тренировка', 'personal'),
  (2, 11, 12, 'Фотосъёмка Маросейка', 'work'),
  (2, 13, 14, 'Обед с партнёром', 'meeting'),
  (2, 15, 16, 'Показ Кузьминой', 'deal'),
  (3, 10, 11, 'Звонок банку', 'work'),
  (3, 14, 15.5, 'Встреча с Соколовым', 'meeting'),
  (4, 9, 10, 'Стоматолог', 'personal'),
  (4, 12, 13, 'Сделка — Левитан', 'deal'),
  (4, 16, 17, 'Показ Морозовой', 'deal'),
  (5, 11, 12.5, 'Прозвон холодной базы', 'work'),
  (5, 18, 20, 'Ужин с семьёй', 'personal'),
  (6, 10, 12, 'Открытый показ', 'deal');
