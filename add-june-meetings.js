// Одноразовый скрипт: добавить планерки по понедельникам июня 2026 в 12:30–14:00 (работа)
// Запуск: node add-june-meetings.js

const API = 'https://functions.yandexcloud.net/d4eck1v8o203hh4lr9ov';

// Понедельники июня 2026: 1, 8, 15, 22, 29
const JUNE_MONDAYS = ['2026-06-01','2026-06-08','2026-06-15','2026-06-22','2026-06-29'];

async function createEvent(event) {
  const r = await fetch(`${API}?table=events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  return r.json();
}

(async () => {
  for (const date of JUNE_MONDAYS) {
    const result = await createEvent({
      id: 'ev-plannerka-' + date,
      title: 'Планерка',
      kind: 'work',
      start_time: 12.5,   // 12:30
      end_time: 14,        // 14:00
      event_date: date,
      day: 1,              // понедельник
      description: '',
      reminder: -1,
    });
    console.log(`${date}:`, result);
  }
  console.log('Готово!');
})();
