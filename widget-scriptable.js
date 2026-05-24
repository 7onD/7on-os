// ╔══════════════════════════════════════════════════════╗
// ║         7on OS — Today Widget for Scriptable         ║
// ║         Medium size · Two columns: Events | Tasks    ║
// ╚══════════════════════════════════════════════════════╝

const API = "https://functions.yandexcloud.net/d4eck1v8o203hh4lr9ov"

// ─── Цвета ────────────────────────────────────────────────────────────────────
const C = {
  bg:     new Color("#0f0f11"),
  text:   new Color("#ededf0"),
  dim:    new Color("#8a8a93"),
  faint:  new Color("#56565d"),
  accent: new Color("#d4ff4d"),
  red:    new Color("#ff6b7a"),
  orange: new Color("#ffb45e"),
  blue:   new Color("#7aa7ff"),
  violet: new Color("#b78cff"),
  green:  new Color("#5ee5a0"),
}
const KIND_CLR = {
  deal: C.violet, work: C.accent, personal: C.blue,
  meeting: C.orange, contact: C.green,
}
const PRIO_CLR = { high: C.red, med: C.orange, low: C.faint }

// ─── Утилиты ─────────────────────────────────────────────────────────────────
const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"]
const DOWS   = ["вс","пн","вт","ср","чт","пт","сб"]

function pad(n) { return String(n).padStart(2,"0") }
function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
function fmtTime(t) {
  if (t == null || t === -1) return null
  return `${pad(Math.floor(t))}:${pad(Math.round((t%1)*60))}`
}
async function fetchTable(t) {
  try {
    const r = new Request(`${API}?table=${t}`)
    r.timeoutInterval = 10
    return await r.loadJSON()
  } catch { return [] }
}

// ─── Рендер строки ────────────────────────────────────────────────────────────
// [ ║ ] [10:00] Название...  [⚡/⚑]
function addRow(col, { barColor, time, title, overdue, deadline }) {
  const row = col.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.spacing = 5

  // Цветная полоска
  const bar = row.addStack()
  bar.backgroundColor = barColor || C.faint
  bar.cornerRadius = 2
  bar.size = new Size(2, 14)

  // Время
  if (time) {
    const t = row.addText(time)
    t.font = Font.boldSystemFont(8.5)
    t.textColor = barColor || C.dim
    t.lineLimit = 1
  }

  // Название (обрезается)
  const txt = row.addText(title)
  txt.font = Font.systemFont(10.5)
  txt.textColor = overdue ? C.red : deadline ? C.orange : C.text
  txt.lineLimit = 1
  txt.minimumScaleFactor = 0.75

  // ⚡ просрочено / ⚑ дедлайн
  if (overdue) {
    const b = row.addText("⚡")
    b.font = Font.systemFont(9)
    b.lineLimit = 1
  } else if (deadline) {
    const b = row.addText("⚑")
    b.font = Font.systemFont(9)
    b.textColor = C.orange
    b.lineLimit = 1
  }
}

function addColLabel(col, text) {
  const l = col.addText(text)
  l.font = Font.boldSystemFont(8)
  l.textColor = C.faint
}

// ─── Виджет ───────────────────────────────────────────────────────────────────
async function createWidget() {
  const today = todayIso()
  const now   = new Date()
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`

  const [tasks, events] = await Promise.all([
    fetchTable("tasks"),
    fetchTable("events"),
  ])

  // Просроченные задачи
  const overdueTasks = tasks
    .filter(t => !t.done && t.due && t.due < today && /^\d{4}-\d{2}-\d{2}$/.test(t.due))
    .map(t => ({...t, _ov: true}))
    .sort((a,b) => a.due.localeCompare(b.due))

  // Задачи на сегодня (по due) + задачи с дедлайном сегодня (но due в другой день)
  const todayTasks = tasks
    .filter(t => !t.done && (t.due === today || (t.deadline === today && t.due !== today)))
    .map(t => ({...t, _ov: false, _dl: t.deadline === today && t.due !== today}))
    .sort((a,b) => {
      if (a._dl !== b._dl) return a._dl ? 1 : -1  // deadline-only tasks after due-tasks
      return ({high:0,med:1,low:2}[a.priority]??1) - ({high:0,med:1,low:2}[b.priority]??1)
    })

  const allTasks = [...overdueTasks, ...todayTasks]

  // Названия задач — чтобы не дублировать события, созданные из задач
  const taskTitles = new Set(allTasks.map(t => (t.title||"").trim().toLowerCase()))

  // События сегодня — без тех, что совпадают с задачами
  const todayEvs = events
    .filter(e =>
      e.event_date === today &&
      !taskTitles.has((e.title||"").trim().toLowerCase())
    )
    .sort((a,b) => (a.start_time??99)-(b.start_time??99))

  const MAX = 4  // максимум строк в каждом столбце

  // ══ Виджет ═══════════════════════════════════════════════════════════════════
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.setPadding(12, 14, 10, 14)

  // ── Шапка ────────────────────────────────────────────────────────────────────
  const hdr = w.addStack()
  hdr.layoutHorizontally()
  hdr.centerAlignContent()

  const logo = hdr.addText("7on")
  logo.font = Font.boldSystemFont(11)
  logo.textColor = C.accent

  hdr.addSpacer(4)
  const dot = hdr.addText("·")
  dot.font = Font.systemFont(10)
  dot.textColor = C.faint
  hdr.addSpacer(4)

  const dateTxt = hdr.addText(`${DOWS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`)
  dateTxt.font = Font.mediumSystemFont(11)
  dateTxt.textColor = C.dim

  hdr.addSpacer()

  const clock = hdr.addText(nowStr)
  clock.font = Font.systemFont(10)
  clock.textColor = C.faint

  w.addSpacer(9)

  // ── Пустое состояние ─────────────────────────────────────────────────────────
  if (todayEvs.length === 0 && allTasks.length === 0) {
    w.addSpacer()
    const e = w.addText("Свободный день 🎉")
    e.font = Font.mediumSystemFont(13)
    e.textColor = C.dim
    e.centerAlignText()
    w.addSpacer()
    return w
  }

  // ── Два столбца ───────────────────────────────────────────────────────────────
  const row = w.addStack()
  row.layoutHorizontally()
  row.topAlignContent()
  row.spacing = 0

  // ── Левый столбец: СОБЫТИЯ ────────────────────────────────────────────────────
  const left = row.addStack()
  left.layoutVertically()
  left.topAlignContent()
  left.spacing = 0

  // Заголовок
  const evLabel = todayEvs.length > 0
    ? `СОБЫТИЯ  ${todayEvs.length}`
    : "СОБЫТИЯ"
  addColLabel(left, evLabel)
  left.addSpacer(5)

  if (todayEvs.length === 0) {
    const none = left.addText("  —")
    none.font = Font.systemFont(10)
    none.textColor = C.faint
  } else {
    todayEvs.slice(0, MAX).forEach(e => {
      addRow(left, {
        barColor: KIND_CLR[e.kind] || C.blue,
        time: fmtTime(e.start_time),
        title: e.title || "",
        overdue: false,
      })
      left.addSpacer(4)
    })
    if (todayEvs.length > MAX) {
      const more = left.addText(`  +${todayEvs.length - MAX}...`)
      more.font = Font.systemFont(9)
      more.textColor = C.faint
    }
  }

  // Разделитель
  row.addSpacer(10)
  const sep = row.addStack()
  sep.backgroundColor = new Color("#ffffff", 0.07)
  sep.size = new Size(1, 110)
  row.addSpacer(10)

  // ── Правый столбец: ЗАДАЧИ ────────────────────────────────────────────────────
  const right = row.addStack()
  right.layoutVertically()
  right.topAlignContent()
  right.spacing = 0

  // Заголовок с подсчётом
  const parts = []
  if (overdueTasks.length) parts.push(`${overdueTasks.length}⚡`)
  if (todayTasks.length)   parts.push(`${todayTasks.length} сег`)
  const tLabel = allTasks.length > 0
    ? `ЗАДАЧИ  ${parts.join("  ")}`
    : "ЗАДАЧИ"
  addColLabel(right, tLabel)
  right.addSpacer(5)

  if (allTasks.length === 0) {
    const none = right.addText("  —")
    none.font = Font.systemFont(10)
    none.textColor = C.faint
  } else {
    allTasks.slice(0, MAX).forEach(t => {
      addRow(right, {
        barColor: t._ov ? C.red : t._dl ? C.orange : (PRIO_CLR[t.priority] || C.faint),
        time: t.time || null,
        title: t.title || "",
        overdue: t._ov,
        deadline: t._dl || false,
      })
      right.addSpacer(4)
    })
    if (allTasks.length > MAX) {
      const more = right.addText(`  +${allTasks.length - MAX}...`)
      more.font = Font.systemFont(9)
      more.textColor = C.faint
    }
  }

  return w
}

// ─── Запуск ───────────────────────────────────────────────────────────────────
const widget = await createWidget()

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}

Script.complete()
