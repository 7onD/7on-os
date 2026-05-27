// ╔══════════════════════════════════════════════════════╗
// ║       7on OS — Quick Add (Scriptable script)         ║
// ║   Запуск: из Shortcuts → «Run Scriptable Script»     ║
// ╚══════════════════════════════════════════════════════╝

const API = "https://functions.yandexcloud.net/d4eck1v8o203hh4lr9ov"

function pad(n) { return String(n).padStart(2, "0") }
function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
function tomorrowIso() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
async function postData(table, body) {
  const req = new Request(`${API}?table=${table}`)
  req.method = "POST"
  req.headers = { "Content-Type": "application/json" }
  req.body = JSON.stringify(body)
  return req.loadJSON()
}

// ── Шаг 1: Задача или Событие ────────────────────────────────────────────────
const typeAlert = new Alert()
typeAlert.title = "7on — Быстрое добавление"
typeAlert.message = "Что добавить?"
typeAlert.addAction("✅ Задача")
typeAlert.addAction("📅 Событие")
typeAlert.addCancelAction("Отмена")
const typeChoice = await typeAlert.presentSheet()
if (typeChoice === -1) { Script.complete(); return }

// ════════════════════════════════════════════════════════
// ЗАДАЧА
// ════════════════════════════════════════════════════════
if (typeChoice === 0) {
  const titleAlert = new Alert()
  titleAlert.title = "Новая задача"
  titleAlert.addTextField("Название…")
  titleAlert.addAction("Далее →")
  titleAlert.addCancelAction("Отмена")
  if (await titleAlert.presentAlert() === -1) { Script.complete(); return }
  const title = titleAlert.textFieldValue(0).trim()
  if (!title) { Script.complete(); return }

  // Тип задачи
  const kindAlert = new Alert()
  kindAlert.title = title
  kindAlert.message = "Тип задачи"
  kindAlert.addAction("💼 Рабочая")
  kindAlert.addAction("🏠 Личная")
  kindAlert.addAction("📚 Учебная")
  const kindChoice = await kindAlert.presentSheet()
  if (kindChoice === -1) { Script.complete(); return }
  const types = ["work", "personal", "study"]
  const tags  = ["Работа", "Личное", "Учёба"]
  const pfx   = ["w", "p", "e"]
  const type  = types[kindChoice], tag = tags[kindChoice], idPfx = pfx[kindChoice]

  // Срок
  const dateAlert = new Alert()
  dateAlert.title = title
  dateAlert.message = "Срок выполнения"
  dateAlert.addAction("📅 Сегодня")
  dateAlert.addAction("📅 Завтра")
  dateAlert.addAction("📆 Без срока")
  const dateChoice = await dateAlert.presentSheet()
  if (dateChoice === -1) { Script.complete(); return }
  const due = dateChoice === 0 ? todayIso() : dateChoice === 1 ? tomorrowIso() : ""

  await postData("tasks", {
    id: idPfx + Date.now(), title, type, tag, due,
    time: "", priority: "med", done: 0,
    description: "⚡ Быстрое добавление", reminder: -1, deadline: null
  })

  const ok = new Alert()
  ok.title = "✅ Задача добавлена"
  ok.message = `${title}\n${due ? "📅 " + due : "без срока"}`
  ok.addAction("OK")
  await ok.presentAlert()
}

// ════════════════════════════════════════════════════════
// СОБЫТИЕ
// ════════════════════════════════════════════════════════
else {
  const titleAlert = new Alert()
  titleAlert.title = "Новое событие"
  titleAlert.addTextField("Название…")
  titleAlert.addAction("Далее →")
  titleAlert.addCancelAction("Отмена")
  if (await titleAlert.presentAlert() === -1) { Script.complete(); return }
  const title = titleAlert.textFieldValue(0).trim()
  if (!title) { Script.complete(); return }

  // Дата
  const dateAlert = new Alert()
  dateAlert.title = title
  dateAlert.message = "Дата события"
  dateAlert.addAction("📅 Сегодня")
  dateAlert.addAction("📅 Завтра")
  dateAlert.addTextField("Или ДД.ММ (например 15.06)")
  dateAlert.addAction("Ввести дату →")
  dateAlert.addCancelAction("Отмена")
  const dateChoice = await dateAlert.presentAlert()
  if (dateChoice === -1) { Script.complete(); return }

  let eventDate = ""
  if (dateChoice === 0)      eventDate = todayIso()
  else if (dateChoice === 1) eventDate = tomorrowIso()
  else {
    const raw = dateAlert.textFieldValue(0).trim()
    const m = raw.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/)
    if (m) {
      const yr = m[3] || String(new Date().getFullYear())
      eventDate = `${yr}-${pad(parseInt(m[2]))}-${pad(parseInt(m[1]))}`
    }
  }
  if (!eventDate) { Script.complete(); return }

  // Время (необязательно)
  const timeAlert = new Alert()
  timeAlert.title = title + "  ·  " + eventDate
  timeAlert.message = "Время начала (необязательно)"
  timeAlert.addTextField("Например: 10:30")
  timeAlert.addAction("Добавить с временем")
  timeAlert.addAction("Весь день")
  timeAlert.addCancelAction("Отмена")
  const timeChoice = await timeAlert.presentAlert()
  if (timeChoice === -1) { Script.complete(); return }

  let startFloat = -1, endFloat = -1
  if (timeChoice === 0) {
    const raw = timeAlert.textFieldValue(0).trim()
    const m = raw.match(/^(\d{1,2})[:\.](\d{2})$/)
    if (m) {
      startFloat = parseInt(m[1]) + parseInt(m[2]) / 60
      endFloat   = Math.min(startFloat + 1, 23)
    }
  }

  const d = new Date(eventDate + "T00:00:00")
  const dow = d.getDay()
  await postData("events", {
    id: "ev" + Date.now(),
    start_time: startFloat, end_time: endFloat,
    title, kind: "personal",
    description: "⚡ Быстрое добавление",
    reminder: -1, event_date: eventDate,
    day: dow === 0 ? 7 : dow,
  })

  const ok = new Alert()
  ok.title = "✅ Событие добавлено"
  ok.message = `${title}\n📅 ${eventDate}${startFloat >= 0 ? "\n⏰ " + pad(Math.floor(startFloat)) + ":" + pad(Math.round((startFloat % 1) * 60)) : "\nвесь день"}`
  ok.addAction("OK")
  await ok.presentAlert()
}

Script.complete()
