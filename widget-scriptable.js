// ╔══════════════════════════════════════════════════════╗
// ║         7on OS — Today Widget for Scriptable         ║
// ║         Medium size · Events + Tasks today           ║
// ╚══════════════════════════════════════════════════════╝
//
// Установка:
// 1. Скачать Scriptable из App Store (бесплатно)
// 2. Скопировать этот файл целиком в новый скрипт
// 3. Добавить виджет Scriptable среднего размера на экран
// 4. Выбрать этот скрипт в настройках виджета

const API = "https://functions.yandexcloud.net/d4eck1v8o203hh4lr9ov"

// ─── Цвета (повторяют тему дашборда) ─────────────────────────────────────────
const C = {
  bg:      new Color("#0f0f11"),
  surface: new Color("#17171a"),
  text:    new Color("#ededf0"),
  dim:     new Color("#8a8a93"),
  faint:   new Color("#56565d"),
  accent:  new Color("#d4ff4d"),   // жёлто-зелёный акцент
  red:     new Color("#ff6b7a"),   // просрочено / высокий приоритет
  orange:  new Color("#ffb45e"),   // средний приоритет
  blue:    new Color("#7aa7ff"),   // личное
  violet:  new Color("#b78cff"),   // сделки
  green:   new Color("#5ee5a0"),   // контакты
}

// Цвета типов события (как в календаре)
const KIND_COLOR = {
  deal:     C.violet,
  work:     C.accent,
  personal: C.blue,
  meeting:  C.orange,
  contact:  C.green,
}

// Цвета приоритетов задач
const PRIO_COLOR = {
  high: C.red,
  med:  C.orange,
  low:  C.faint,
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────
const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"]
const DOWS   = ["вс","пн","вт","ср","чт","пт","сб"]

function pad(n) { return String(n).padStart(2, "0") }

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

// Форматирует float-время (10.5 → "10:30")
function fmtTime(t) {
  if (t == null || t === -1) return null
  const h = Math.floor(t)
  const m = Math.round((t % 1) * 60)
  return `${pad(h)}:${pad(m)}`
}

// Безопасный GET к API
async function fetchTable(table) {
  try {
    const req = new Request(`${API}?table=${table}`)
    req.timeoutInterval = 10
    return await req.loadJSON()
  } catch (e) {
    return []
  }
}

// ─── Рендер одной строки (событие / задача) ───────────────────────────────────
//   [ ║ ] [12:00] Название задачи или события      [⚡]
function addRow(parent, { barColor, time, title, overdue, highPriority }) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.spacing = 6
  row.setPadding(2, 0, 2, 0)

  // Цветная полоска слева (как на сайте)
  const bar = row.addStack()
  bar.backgroundColor = barColor || C.faint
  bar.cornerRadius = 2
  bar.size = new Size(3, 16)

  // Время (если есть)
  if (time) {
    const timeTxt = row.addText(time)
    timeTxt.font = Font.boldSystemFont(9)
    timeTxt.textColor = barColor || C.dim
    timeTxt.lineLimit = 1
  }

  // Название
  const titleColor = overdue
    ? C.red
    : highPriority
      ? new Color("#ffd0a0")   // тёплый тинт для высокого приоритета
      : C.text

  const titleTxt = row.addText(title)
  titleTxt.font = Font.systemFont(11)
  titleTxt.textColor = titleColor
  titleTxt.lineLimit = 1
  titleTxt.minimumScaleFactor = 0.75

  // Бейдж просрочки
  if (overdue) {
    row.addSpacer()
    const badge = row.addText("⚡")
    badge.font = Font.systemFont(9.5)
  }
}

// Маленький заголовок секции
function addSectionLabel(parent, text) {
  const lbl = parent.addText(text)
  lbl.font = Font.boldSystemFont(8)
  lbl.textColor = C.faint
}

// ─── Основная функция ─────────────────────────────────────────────────────────
async function createWidget() {
  const today = todayIso()
  const now   = new Date()
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`

  // Параллельная загрузка данных
  const [tasks, events] = await Promise.all([
    fetchTable("tasks"),
    fetchTable("events"),
  ])

  // Сегодняшние события (по дате), отсортированные по времени начала
  const todayEvs = events
    .filter(e => e.event_date === today)
    .sort((a, b) => (a.start_time ?? 99) - (b.start_time ?? 99))

  // Просроченные задачи (не выполненные, дата < сегодня, ISO-формат)
  const overdueTasks = tasks
    .filter(t => !t.done && t.due && t.due < today && /^\d{4}-\d{2}-\d{2}$/.test(t.due))
    .map(t => ({ ...t, _ov: true }))
    .sort((a, b) => a.due.localeCompare(b.due))

  // Задачи на сегодня (не выполненные)
  const todayTasks = tasks
    .filter(t => !t.done && t.due === today)
    .map(t => ({ ...t, _ov: false }))
    .sort((a, b) => {
      const po = { high: 0, med: 1, low: 2 }
      return (po[a.priority] ?? 1) - (po[b.priority] ?? 1)
    })

  // Объединяем: сначала просроченные, потом сегодняшние
  const allTasks = [...overdueTasks, ...todayTasks]

  // Лимиты строк (чтобы влезло в medium widget)
  const hasEvents = todayEvs.length > 0
  const hasTasks  = allTasks.length > 0
  const maxEv = hasEvents ? (hasTasks ? 2 : 4) : 0
  const maxT  = hasTasks  ? (hasEvents ? 3 : 5) : 0

  // ══ Собираем виджет ════════════════════════════════════════════════════════
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.setPadding(14, 15, 12, 15)

  // ── Заголовок ──────────────────────────────────────────────────────────────
  const hdr = w.addStack()
  hdr.layoutHorizontally()
  hdr.centerAlignContent()

  const logoTxt = hdr.addText("7on")
  logoTxt.font = Font.boldSystemFont(11)
  logoTxt.textColor = C.accent

  hdr.addSpacer(5)
  const dotTxt = hdr.addText("·")
  dotTxt.font = Font.systemFont(10)
  dotTxt.textColor = C.faint
  hdr.addSpacer(5)

  const dateTxt = hdr.addText(
    `${DOWS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
  )
  dateTxt.font = Font.mediumSystemFont(11)
  dateTxt.textColor = C.dim

  hdr.addSpacer()

  const clockTxt = hdr.addText(nowStr)
  clockTxt.font = Font.systemFont(10)
  clockTxt.textColor = C.faint

  w.addSpacer(10)

  // ── Секция: События ────────────────────────────────────────────────────────
  if (todayEvs.length > 0) {
    addSectionLabel(w, "СОБЫТИЯ")
    w.addSpacer(5)

    todayEvs.slice(0, maxEv).forEach(e => {
      const color = KIND_COLOR[e.kind] || C.blue
      addRow(w, {
        barColor: color,
        time: fmtTime(e.start_time),
        title: e.title || "(без названия)",
        overdue: false,
        highPriority: false,
      })
      w.addSpacer(3)
    })

    if (todayEvs.length > maxEv) {
      const moreEvs = w.addText(`  +${todayEvs.length - maxEv} ещё`)
      moreEvs.font = Font.systemFont(9)
      moreEvs.textColor = C.faint
    }

    // Разделитель между секциями
    if (hasTasks) {
      w.addSpacer(7)
    }
  }

  // ── Секция: Задачи ─────────────────────────────────────────────────────────
  if (allTasks.length > 0) {
    // Формируем заголовок секции с подсчётом
    const parts = []
    if (overdueTasks.length) parts.push(`${overdueTasks.length} просроч.`)
    if (todayTasks.length)   parts.push(`${todayTasks.length} сегодня`)
    addSectionLabel(w, `ЗАДАЧИ  ${parts.join("  ·  ").toUpperCase()}`)
    w.addSpacer(5)

    allTasks.slice(0, maxT).forEach(t => {
      addRow(w, {
        barColor: t._ov ? C.red : (PRIO_COLOR[t.priority] || C.faint),
        time: t.time || null,
        title: t.title || "(без названия)",
        overdue: t._ov,
        highPriority: !t._ov && t.priority === "high",
      })
      w.addSpacer(3)
    })

    if (allTasks.length > maxT) {
      const moreT = w.addText(`  +${allTasks.length - maxT} задач`)
      moreT.font = Font.systemFont(9)
      moreT.textColor = C.faint
    }
  }

  // ── Пустое состояние ───────────────────────────────────────────────────────
  if (!hasEvents && !hasTasks) {
    w.addSpacer()
    const emptyTxt = w.addText("Свободный день 🎉")
    emptyTxt.font = Font.mediumSystemFont(14)
    emptyTxt.textColor = C.dim
    emptyTxt.centerAlignText()
    w.addSpacer()
  }

  return w
}

// ─── Запуск ───────────────────────────────────────────────────────────────────
const widget = await createWidget()

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  // Предпросмотр в самом приложении Scriptable
  await widget.presentMedium()
}

Script.complete()
