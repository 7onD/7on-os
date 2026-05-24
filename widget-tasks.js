// ╔══════════════════════════════════════════════════════╗
// ║       7on OS — Tasks Widget for Scriptable           ║
// ║       Medium/Large · Compact list of ALL tasks       ║
// ╚══════════════════════════════════════════════════════╝
// Widget parameter (optional): "large" to force large size preview

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
}

const PRIO_CLR  = { high: C.red, med: C.accent, low: C.faint }
const TYPE_CLR  = { work: C.accent, personal: C.blue, study: C.violet }
const TYPE_ICON = { work: "💼", personal: "🏠", study: "📚" }

// ─── Утилиты ─────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0") }

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

async function fetchTable(t) {
  try {
    const r = new Request(`${API}?table=${t}`)
    r.timeoutInterval = 10
    return await r.loadJSON()
  } catch { return [] }
}

// Короткий лейбл даты: "сег", "завт", "03.06", "⚡03.05"
function shortDate(due, today) {
  if (!due) return null
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` })()
  if (due === today)    return null           // сегодня — не показываем, и так понятно
  if (due === tomorrow) return "завт"
  const [, m, d] = due.split('-')
  const lbl = `${parseInt(d)}.${m}`
  return due < today ? `⚡${lbl}` : lbl
}

// ─── Одна строка задачи ───────────────────────────────────────────────────────
function addTaskRow(col, task, today) {
  const isOverdue  = task.due && task.due < today
  const isDeadline = task.deadline === today && task.due !== today

  const row = col.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.spacing = 5

  // Приоритетная полоска
  const bar = row.addStack()
  bar.backgroundColor = isOverdue ? C.red : isDeadline ? C.orange : (PRIO_CLR[task.priority] || C.faint)
  bar.cornerRadius = 2
  bar.size = new Size(2, 12)

  // Название
  const title = row.addText(task.title || "")
  title.font = Font.systemFont(10.5)
  title.textColor = isOverdue ? C.red : isDeadline ? C.orange : C.text
  title.lineLimit = 1
  title.minimumScaleFactor = 0.78

  row.addSpacer()

  // Мета справа: время / дата / дедлайн
  const metaParts = []
  if (task.time)     metaParts.push(task.time)
  const dl = shortDate(task.due, today)
  if (dl)            metaParts.push(dl)
  if (task.deadline && task.deadline !== today) {
    const [, dm, dd] = task.deadline.split('-')
    metaParts.push(`⚑${parseInt(dd)}.${dm}`)
  } else if (isDeadline) {
    metaParts.push("⚑ дл!")
  }

  if (metaParts.length) {
    const meta = row.addText(metaParts.join(" "))
    meta.font = Font.systemFont(8.5)
    meta.textColor = isOverdue ? C.red : isDeadline ? C.orange : C.faint
    meta.lineLimit = 1
  }
}

// ─── Виджет ───────────────────────────────────────────────────────────────────
async function createWidget() {
  const today  = todayIso()
  const isLarge = config.widgetFamily === "large" || (config.runsInApp && config.widgetParameter === "large")
  const MAX    = isLarge ? 16 : 8

  const tasks = await fetchTable("tasks")
  const open  = tasks.filter(t => !t.done)

  // Группы: просроченные, сегодня+дедлайн сегодня, скоро, без даты
  const overdue    = open.filter(t => t.due && t.due < today)
    .sort((a,b) => a.due.localeCompare(b.due))

  const todayTasks = open.filter(t =>
      (t.due === today) ||
      (t.deadline === today && t.due !== today)
    )
    .sort((a,b) => ({high:0,med:1,low:2}[a.priority]??1) - ({high:0,med:1,low:2}[b.priority]??1))

  const upcoming   = open
    .filter(t => t.due && t.due > today && t.deadline !== today)
    .sort((a,b) => a.due.localeCompare(b.due))

  const noDate     = open
    .filter(t => !t.due && !t.deadline)
    .sort((a,b) => ({high:0,med:1,low:2}[a.priority]??1) - ({high:0,med:1,low:2}[b.priority]??1))

  // ══ Виджет ════════════════════════════════════════════════════════════════════
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

  const lbl = hdr.addText("задачи")
  lbl.font = Font.mediumSystemFont(11)
  lbl.textColor = C.dim

  hdr.addSpacer()

  // Счётчики в шапке
  const parts = []
  if (overdue.length)    parts.push(`${overdue.length}⚡`)
  if (todayTasks.length) parts.push(`${todayTasks.length} сег`)
  const cntTxt = parts.length ? parts.join("  ") : String(open.length)
  const cnt = hdr.addText(cntTxt)
  cnt.font = Font.boldSystemFont(10.5)
  cnt.textColor = overdue.length ? C.red : C.accent

  w.addSpacer(8)

  // ── Пустое состояние ─────────────────────────────────────────────────────────
  if (open.length === 0) {
    w.addSpacer()
    const e = w.addText("Всё готово 🎉")
    e.font = Font.mediumSystemFont(13)
    e.textColor = C.dim
    e.centerAlignText()
    w.addSpacer()
    return w
  }

  // ── Список ───────────────────────────────────────────────────────────────────
  const col = w.addStack()
  col.layoutVertically()
  col.spacing = 0

  let shown = 0

  function section(label, labelColor, items) {
    if (!items.length || shown >= MAX) return
    // Секционный заголовок
    const lRow = col.addStack()
    lRow.layoutHorizontally()
    const lTxt = lRow.addText(label)
    lTxt.font = Font.boldSystemFont(7.5)
    lTxt.textColor = labelColor
    col.addSpacer(3)

    for (const t of items) {
      if (shown >= MAX) break
      addTaskRow(col, t, today)
      col.addSpacer(4)
      shown++
    }
    col.addSpacer(4)
  }

  section(`ПРОСРОЧЕННЫЕ  ${overdue.length}`,    C.red,    overdue)
  section(`СЕГОДНЯ  ${todayTasks.length}`,       C.accent, todayTasks)
  section("БЛИЖАЙШИЕ",                           C.dim,    upcoming)
  section("БЕЗ ДАТЫ",                            C.faint,  noDate)

  if (open.length > shown) {
    const more = col.addText(`  +${open.length - shown} задач...`)
    more.font = Font.systemFont(9)
    more.textColor = C.faint
  }

  return w
}

// ─── Запуск ───────────────────────────────────────────────────────────────────
const widget = await createWidget()

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  const isLarge = config.widgetParameter === "large"
  if (isLarge) {
    await widget.presentLarge()
  } else {
    await widget.presentMedium()
  }
}

Script.complete()
