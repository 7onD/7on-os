// 7on OS — Yandex Cloud Function
// Runtime: Node.js 18 | Entry point: index.handler
// Env vars: BUCKET=7on-os-data  (Object Storage bucket, service account: storage.editor)
// File upload/download proxied through this function — no static keys needed.

const BUCKET = process.env.BUCKET || '7on-os-data';

const TABLES = new Set([
  'tasks', 'contacts', 'deals',
  'fin_income', 'fin_expenses', 'goals', 'monthly',
  'events', 'notes', 'files', 'folders', 'cal_tags',
]);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const reply = (d, s = 200) => ({
  statusCode: s,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(d),
});

// ── Yandex metadata token ─────────────────────────────────────────────────────
async function getToken() {
  const r = await fetch(
    'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } },
  );
  return (await r.json()).access_token;
}

// ── Object Storage helpers ────────────────────────────────────────────────────
async function getTable(token, table) {
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${table}.json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GET ${table}: ${r.status}`);
  return r.json();
}

async function saveTable(token, table, data) {
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${table}.json`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`PUT ${table}: ${r.status} — ${await r.text()}`);
}

function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf-8')
    : (event.body || '{}');
  try { return JSON.parse(raw); } catch { return {}; }
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Telegram Bot API ──────────────────────────────────────────────────────────
function tgApi(method, body) {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

// Persistent reply keyboard (shown instead of regular keyboard)
const MAIN_KB = {
  keyboard: [
    ['📋 Задачи', '📅 Сегодня'],
    ['👥 Контакты', '📝 Заметка'],
    ['📆 Событие в календарь'],
  ],
  resize_keyboard: true,
  persistent: true,
};

// Inline keyboard for tasks menu (attached to message)
const KB_TASKS = {
  inline_keyboard: [
    [
      { text: '➕ Рабочая',  callback_data: 'new_task_work'     },
      { text: '➕ Личная',   callback_data: 'new_task_personal' },
      { text: '➕ Учебная',  callback_data: 'new_task_study'    },
    ],
    [
      { text: '📋 Список открытых задач', callback_data: 'list_tasks' },
    ],
  ],
};

async function tgSend(chatId, text, opts = {}) {
  return tgApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...opts });
}

async function tgEdit(chatId, messageId, text, opts = {}) {
  return tgApi('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...opts });
}

async function tgAnswer(callbackId, text = '') {
  return tgApi('answerCallbackQuery', { callback_query_id: callbackId, text });
}

// Parse incoming Telegram update — returns { type, chatId, ... } or null
function parseTgUpdate(body) {
  if (body?.callback_query) {
    const cq = body.callback_query;
    return {
      type: 'callback',
      chatId: String(cq.message?.chat?.id || ''),
      callbackId: cq.id,
      data: cq.data || '',
      messageId: cq.message?.message_id,
    };
  }
  const msg = body?.message || body?.edited_message;
  if (!msg) return null;
  return {
    type: 'message',
    chatId: String(msg.chat?.id || ''),
    text: (msg.text || '').trim(),
  };
}

// ── Bot conversation state (persisted in Object Storage) ─────────────────────
async function getBotState(storToken) {
  try {
    const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/bot_state.json`, {
      headers: { Authorization: `Bearer ${storToken}` },
    });
    if (r.status === 404) return {};
    return await r.json();
  } catch { return {}; }
}

async function saveBotState(storToken, state) {
  try {
    await fetch(`https://storage.yandexcloud.net/${BUCKET}/bot_state.json`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${storToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch {}
}

// ── Parse task due date (ISO + Russian text) ─────────────────────────────────
function parseServerDueDate(due, timeStr) {
  if (!due) return null;
  const s = due.toLowerCase().trim();
  const now = new Date();
  let d = null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    d = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]), 9, 0, 0);
  } else if (s.startsWith('сегодня') || s === 'today') {
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  } else if (s.startsWith('завтра') || s === 'tomorrow') {
    const tmp = new Date(now); tmp.setDate(tmp.getDate() + 1);
    d = new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate(), 9, 0, 0);
  } else {
    const MONTH_MAP = { 'янв':0,'фев':1,'мар':2,'апр':3,'май':4,'мая':4,'июн':5,'июл':6,'авг':7,'сен':8,'окт':9,'ноя':10,'дек':11 };
    for (const [key, mi] of Object.entries(MONTH_MAP)) {
      if (s.includes(key)) {
        const m = s.match(/(\d+)/);
        if (m) { d = new Date(now.getFullYear(), mi, parseInt(m[1]), 9, 0, 0); break; }
      }
    }
    if (!d) {
      const dot = s.match(/(\d{1,2})\.(\d{1,2})/);
      if (dot) d = new Date(now.getFullYear(), parseInt(dot[2]) - 1, parseInt(dot[1]), 9, 0, 0);
    }
  }

  if (d && timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

// ── Server-side reminder check ────────────────────────────────────────────────
async function getNotified(storToken) {
  try {
    const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/tg_notified.json`, {
      headers: { Authorization: `Bearer ${storToken}` },
    });
    if (r.status === 404) return {};
    return await r.json();
  } catch { return {}; }
}

async function saveNotified(storToken, notified) {
  try {
    await fetch(`https://storage.yandexcloud.net/${BUCKET}/tg_notified.json`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${storToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(notified),
    });
  } catch {}
}

async function runReminderCheck(storToken, { debug = false, force = false } = {}) {
  const ownerId = process.env.TG_OWNER_ID;
  if (!ownerId) return { ok: false, reason: 'TG_OWNER_ID not set' };

  const [tasks, events, notified] = await Promise.all([
    getTable(storToken, 'tasks'),
    getTable(storToken, 'events'),
    getNotified(storToken),
  ]);

  // Adjust for Moscow time (UTC+3): server runs in UTC, user times are Moscow.
  // Adding 3h to now makes "now" expressed in Moscow wall-clock terms,
  // so comparisons with dates constructed from user-inputted hours are correct.
  const now = new Date(new Date().getTime() + 3 * 3600 * 1000);
  const WINDOW_MS = force ? Infinity : 5 * 60 * 1000;
  const msgs = [];
  const debugInfo = debug ? { now: now.toISOString(), tasks: [], events: [] } : null;

  // Check events — auto-fire at start time + optional advance reminder
  events.forEach(ev => {
    if (ev.start_time === -1 || !ev.event_date) return;

    const [y, mo, d] = ev.event_date.split('-').map(Number);
    const evDate = new Date(y, mo - 1, d);
    const h = ev.start_time ?? 9;
    evDate.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    const hh = `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}`;
    const mins = parseInt(ev.reminder ?? '-1');

    // Auto: fire at event start
    const diffAt = now - evDate;
    const keyAt = `ev_${ev.id}_at`;
    if (debugInfo) debugInfo.events.push({ id: ev.id, title: ev.title, event_date: ev.event_date, start: hh, reminder: mins, fireAt: evDate.toISOString(), diffMin: Math.round(diffAt/60000), alreadyNotified: !!notified[keyAt] });
    if (diffAt >= 0 && diffAt < WINDOW_MS && !notified[keyAt]) {
      msgs.push({ key: keyAt, text: `📅 <b>${ev.title}</b>\n${ev.event_date} ${hh} · начинается сейчас` });
    }

    // Additional advance reminder
    if (mins > 0) {
      const fireAt = new Date(evDate.getTime() - mins * 60000);
      const diff2 = now - fireAt;
      const keyAdv = `ev_${ev.id}_adv_${mins}`;
      if (diff2 >= 0 && diff2 < WINDOW_MS && !notified[keyAdv]) {
        const when = mins < 60 ? `через ${mins} мин` : mins === 60 ? 'через 1 час' : mins >= 1440 ? 'завтра' : `через ${Math.round(mins/60)} ч`;
        msgs.push({ key: keyAdv, text: `📅 <b>${ev.title}</b>\n${ev.event_date} ${hh} · ${when}` });
      }
    }
  });

  // Check tasks — auto-fire at due time if time set; advance reminder as addition
  tasks.forEach(t => {
    if (t.done) return;
    const mins = parseInt(t.reminder ?? '-1');

    const dueDate = parseServerDueDate(t.due, t.time);
    if (!dueDate) {
      if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, due: t.due, reminder: mins, skip: 'cannot parse due date' });
      return;
    }

    if (t.time) {
      // Auto: fire at exact due time
      const diffAt = now - dueDate;
      const keyAt = `task_${t.id}_at`;
      if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, due: t.due, time: t.time, reminder: mins, fireAt: dueDate.toISOString(), diffMin: Math.round(diffAt/60000), alreadyNotified: !!notified[keyAt] });
      if (diffAt >= 0 && diffAt < WINDOW_MS && !notified[keyAt]) {
        msgs.push({ key: keyAt, text: `✅ <b>${t.title}</b>\nВремя пришло` });
      }
      // Additional advance reminder
      if (mins > 0) {
        const fireAt = new Date(dueDate.getTime() - mins * 60000);
        const diff2 = now - fireAt;
        const keyAdv = `task_${t.id}_adv_${mins}`;
        if (diff2 >= 0 && diff2 < WINDOW_MS && !notified[keyAdv]) {
          const when = mins < 60 ? `через ${mins} мин` : `через ${Math.round(mins/60)} ч`;
          msgs.push({ key: keyAdv, text: `✅ <b>${t.title}</b>\nСрок ${when}` });
        }
      }
    } else if (mins > 0) {
      // No time — only fire if advance reminder explicitly set
      const fireAt = new Date(dueDate.getTime() - mins * 60000);
      const diff = now - fireAt;
      const keyAdv = `task_${t.id}_adv_${mins}`;
      if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, due: t.due, reminder: mins, fireAt: fireAt.toISOString(), diffMin: Math.round(diff/60000), alreadyNotified: !!notified[keyAdv] });
      if (diff >= 0 && diff < WINDOW_MS && !notified[keyAdv]) {
        const when = mins < 60 ? `срок через ${mins} мин` : mins >= 1440 ? 'срок завтра' : `срок через ${Math.round(mins/60)} ч`;
        msgs.push({ key: keyAdv, text: `✅ <b>${t.title}</b>\n${when}` });
      }
    } else {
      if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, due: t.due, reminder: mins, skip: 'no time set and no advance reminder' });
    }
  });

  // Check deadline reminders — always fire 2h before end of deadline day (22:00 Moscow)
  tasks.forEach(t => {
    if (t.done || !t.deadline) return;
    const dlMatch = t.deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dlMatch) return;
    const [, dy, dm, dd] = dlMatch.map(Number);
    // 22:00 Moscow = 22:00 in our +3h adjusted time
    const fireAt = new Date(dy, dm - 1, dd, 22, 0, 0);
    const diffDl = now - fireAt;
    const keyDl = `task_${t.id}_deadline_2h`;
    if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, deadline: t.deadline, fireAt: fireAt.toISOString(), diffMin: Math.round(diffDl/60000), alreadyNotified: !!notified[keyDl] });
    if (diffDl >= 0 && diffDl < WINDOW_MS && !notified[keyDl]) {
      msgs.push({ key: keyDl, text: `⏰ <b>${t.title}</b>\n🔴 Крайний срок — сегодня!` });
    }
  });

  if (msgs.length > 0) {
    await Promise.all(msgs.map(m => tgSend(ownerId, `🔔 Напоминание\n\n${m.text}`)));
    // force=1 — только для теста, не сохраняем состояние чтобы не блокировать реальные уведомления
    if (!force) {
      msgs.forEach(m => { notified[m.key] = Date.now(); });
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      Object.keys(notified).forEach(k => { if (notified[k] < cutoff) delete notified[k]; });
      await saveNotified(storToken, notified);
    }
  }

  return { ok: true, sent: msgs.length, ...(debugInfo || {}) };
}

// ── Morning brief at 09:00 Moscow ─────────────────────────────────────────────
async function runMorningBrief(storToken) {
  const ownerId = process.env.TG_OWNER_ID;
  if (!ownerId) return;

  // Moscow time = UTC + 3h
  const mosNow = new Date(new Date().getTime() + 3 * 3600 * 1000);
  const h = mosNow.getUTCHours(), min = mosNow.getUTCMinutes();
  if (h !== 9 || min > 5) return; // only fire at 09:00–09:05 Moscow

  const y = mosNow.getUTCFullYear();
  const mo = String(mosNow.getUTCMonth() + 1).padStart(2, '0');
  const d  = String(mosNow.getUTCDate()).padStart(2, '0');
  const todayStr = `${y}-${mo}-${d}`;

  const notified = await getNotified(storToken);
  const briefKey = `morning_brief_${todayStr}`;
  if (notified[briefKey]) return; // already sent today

  const [tasks, events] = await Promise.all([
    getTable(storToken, 'tasks'),
    getTable(storToken, 'events'),
  ]);

  const todayTasks   = tasks.filter(t => !t.done && (t.due === todayStr || (t.due || '').toLowerCase().startsWith('сегодня')));
  const overdueTasks = tasks.filter(t => !t.done && t.due && t.due < todayStr && !/сегодня|завтра/.test((t.due || '').toLowerCase()));
  // Exclude task-linked events (task_id set or title matches a today/overdue task)
  const allTodayTaskTitles = new Set([...todayTasks, ...overdueTasks].map(t => (t.title || '').trim().toLowerCase()));
  const todayEvents  = events
    .filter(e => e.event_date === todayStr && !e.task_id && !allTodayTaskTitles.has((e.title || '').trim().toLowerCase()))
    .sort((a, b) => (a.start_time ?? 99) - (b.start_time ?? 99));

  const MONTHS_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const DOW_RU = ['вс','пн','вт','ср','чт','пт','сб'];
  const dateObj = new Date(y, parseInt(mo)-1, parseInt(d));
  const dayLabel = `${DOW_RU[dateObj.getDay()]}, ${parseInt(d)} ${MONTHS_SHORT[parseInt(mo)-1]}`;

  const lines = [`☀️ <b>Доброе утро! ${dayLabel}</b>`];

  if (todayEvents.length) {
    lines.push('\n🗓 <b>События:</b>');
    todayEvents.forEach(e => {
      const st = e.start_time;
      const hh = st === -1 ? 'весь день'
        : `${String(Math.floor(st)).padStart(2,'0')}:${String(Math.round((st%1)*60)).padStart(2,'0')}`;
      lines.push(`  ${hh} — ${e.title}`);
    });
  }

  if (todayTasks.length) {
    lines.push('\n✅ <b>Задачи на сегодня:</b>');
    todayTasks.forEach(t => {
      const meta = [];
      if (t.time) meta.push(t.time);
      if (t.priority === 'high') meta.push('🔴 высокий');
      if (t.deadline) meta.push(`⚑ дл ${t.deadline}`);
      const typeIcon = t.type === 'work' ? '💼' : t.type === 'study' ? '📚' : '🏠';
      lines.push(`  ${typeIcon} ${t.title}${meta.length ? ' · ' + meta.join(' · ') : ''}`);
    });
  }

  if (overdueTasks.length) {
    lines.push(`\n⚡ <b>Просроченные (${overdueTasks.length}):</b>`);
    overdueTasks.slice(0, 5).forEach(t => {
      const meta = [`📅 ${t.due}`];
      if (t.priority === 'high') meta.push('🔴');
      if (t.deadline) meta.push(`⚑ дл ${t.deadline}`);
      lines.push(`  ⚠ ${t.title} · ${meta.join(' ')}`);
    });
    if (overdueTasks.length > 5) lines.push(`  ...и ещё ${overdueTasks.length - 5}`);
  }

  if (!todayEvents.length && !todayTasks.length && !overdueTasks.length) {
    lines.push('\nСвободный день 🎉');
  }

  await tgSend(ownerId, lines.join('\n'));
  notified[briefKey] = Date.now();
  await saveNotified(storToken, notified);
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports.handler = async (event) => {
  // Yandex Cloud Timer Trigger — runs reminder check + morning brief on schedule
  if (event.messages && Array.isArray(event.messages)) {
    try {
      const storToken = await getToken();
      const [result] = await Promise.all([
        runReminderCheck(storToken),
        runMorningBrief(storToken),
      ]);
      return { statusCode: 200, body: JSON.stringify(result) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const qs     = event.queryStringParameters || {};
  const table  = qs.table;
  const id     = qs.id;
  const action = qs.action;

  if (!table && !action) return reply({ message: '7on OS API v2 — Yandex' });

  try {
    // ── check-reminders: manual trigger / test ──────────────────────────────
    if (action === 'check-reminders') {
      const storToken = await getToken();
      const debug = qs.debug === '1';
      const force = qs.force === '1';
      return reply(await runReminderCheck(storToken, { debug, force }));
    }

    // ── clear-notified: reset tg_notified.json (fix poisoned state after force=1 tests) ──
    if (action === 'clear-notified') {
      const storToken = await getToken();
      await saveNotified(storToken, {});
      return reply({ ok: true, cleared: true, message: 'tg_notified.json сброшен — уведомления снова будут приходить' });
    }

    // ── bot-setup: register Telegram webhook (call once) ─────────────────────
    if (action === 'bot-setup') {
      const funcUrl = process.env.FUNCTION_URL;
      if (!funcUrl) return reply({ error: 'FUNCTION_URL not set' }, 500);
      const res = await tgApi('setWebhook', {
        url: `${funcUrl}?action=bot`,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      });
      return reply({ ok: true, tg: res });
    }

    // ── bot: Telegram webhook ─────────────────────────────────────────────────
    if (action === 'bot') {
      const body = parseBody(event);
      const upd  = parseTgUpdate(body);
      if (!upd) return reply({ ok: true });

      const { chatId } = upd;

      // Security: only owner can use bot
      const ownerId = process.env.TG_OWNER_ID;
      if (ownerId && chatId !== ownerId) {
        if (upd.type === 'callback') await tgAnswer(upd.callbackId, '⛔ Доступ запрещён');
        else await tgSend(chatId, '⛔ Доступ запрещён.');
        return reply({ ok: true });
      }

      const storToken = await getToken();
      const allState  = await getBotState(storToken);
      const userState = allState[chatId] || {};

      // ── Callback query (inline button press) ─────────────────────────────
      if (upd.type === 'callback') {
        const { callbackId, data, messageId } = upd;
        await tgAnswer(callbackId);

        // ➕ New task buttons
        if (['new_task_work', 'new_task_personal', 'new_task_study'].includes(data)) {
          const prompts = {
            new_task_work:     '💼 рабочую',
            new_task_personal: '🏠 личную',
            new_task_study:    '📚 учебную',
          };
          const waitKey = {
            new_task_work:     'task_work',
            new_task_personal: 'task_personal',
            new_task_study:    'task_study',
          };
          allState[chatId] = { waiting: waitKey[data] };
          await saveBotState(storToken, allState);
          await tgEdit(chatId, messageId,
            `✏️ Введи название <b>${prompts[data]}</b> задачи:\n\n<i>/cancel — отмена</i>`);
          return reply({ ok: true });
        }

        // 📋 List open tasks
        if (data === 'list_tasks') {
          const tasks = await getTable(storToken, 'tasks');
          const open  = tasks.filter(t => !t.done);
          if (!open.length) {
            await tgEdit(chatId, messageId, '📋 Открытых задач нет ✅');
            return reply({ ok: true });
          }
          const work     = open.filter(t => t.type === 'work');
          const personal = open.filter(t => t.type === 'personal');
          const study    = open.filter(t => t.type === 'study');
          const todayStr = todayIso();
          const fmtTask = (t) => {
            const meta = [];
            if (t.due) { if (t.due < todayStr) meta.push(`⚡${t.due}`); else if (t.due === todayStr) meta.push('📅 сегодня'); else meta.push(`📅 ${t.due}`); }
            if (t.time) meta.push(`⏰ ${t.time}`);
            if (t.priority === 'high') meta.push('🔴');
            if (t.deadline) meta.push(`⚑ ${t.deadline}`);
            return `  • ${t.title}${meta.length ? '  <i>' + meta.join(' ') + '</i>' : ''}`;
          };
          const lines    = [`📋 Открытых задач: <b>${open.length}</b>`];
          if (work.length)     { lines.push(''); lines.push(`💼 Рабочие (${work.length}):`);    work.slice(0,8).forEach(t => lines.push(fmtTask(t))); }
          if (personal.length) { lines.push(''); lines.push(`🏠 Личные (${personal.length}):`); personal.slice(0,8).forEach(t => lines.push(fmtTask(t))); }
          if (study.length)    { lines.push(''); lines.push(`📚 Учёба (${study.length}):`);     study.slice(0,8).forEach(t => lines.push(fmtTask(t))); }
          await tgEdit(chatId, messageId, lines.join('\n'));
          return reply({ ok: true });
        }

        return reply({ ok: true });
      }

      // ── Text message ──────────────────────────────────────────────────────
      const { text } = upd;

      // /cancel — abort any pending input
      if (/^\/cancel\b/i.test(text)) {
        if (userState.waiting) {
          delete allState[chatId];
          await saveBotState(storToken, allState);
          await tgSend(chatId, '❌ Отменено', { reply_markup: MAIN_KB });
        } else {
          await tgSend(chatId, '❌ Нечего отменять', { reply_markup: MAIN_KB });
        }
        return reply({ ok: true });
      }

      // ── Handle pending conversation state (multi-step input) ─────────────
      if (userState.waiting) {
        const { waiting } = userState;

        // Waiting for task title
        if (['task_work', 'task_personal', 'task_study'].includes(waiting)) {
          const typeMap  = { task_work: 'work',    task_personal: 'personal', task_study: 'study'   };
          const tagMap   = { task_work: 'Риэлтор', task_personal: 'Личное',   task_study: 'Учёба'   };
          const idMap    = { task_work: 'w',        task_personal: 'p',        task_study: 'e'       };
          const labelMap = { task_work: '💼 Рабочая', task_personal: '🏠 Личная', task_study: '📚 Учебная' };

          const tasks = await getTable(storToken, 'tasks');
          tasks.push({
            id:          idMap[waiting] + Date.now(),
            title:       text,
            type:        typeMap[waiting],
            priority:    'med',
            done:        0,
            due:         '',
            time:        '',
            tag:         tagMap[waiting],
            description: '📱 Из Telegram',
            reminder:    -1,
          });
          await saveTable(storToken, 'tasks', tasks);
          delete allState[chatId];
          await saveBotState(storToken, allState);
          await tgSend(chatId,
            `✅ ${labelMap[waiting]} задача создана:\n<b>${text}</b>`,
            { reply_markup: MAIN_KB });
          return reply({ ok: true });
        }

        // Waiting for event title
        if (waiting === 'event_title') {
          allState[chatId] = { waiting: 'event_date', event_title: text };
          await saveBotState(storToken, allState);
          await tgSend(chatId,
            `📅 Дата для "<b>${text}</b>":\nВведи дату (<code>2026-05-25</code>, <code>сегодня</code>, <code>завтра</code>, <code>25.05</code>)\n\n<i>/cancel — отмена</i>`,
            { reply_markup: MAIN_KB });
          return reply({ ok: true });
        }

        // Waiting for event date
        if (waiting === 'event_date') {
          const { event_title } = userState;
          const mosNow = new Date(new Date().getTime() + 3 * 3600 * 1000);
          let dateStr = text.toLowerCase().trim();
          const mkIso = (dt) => `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
          if (dateStr === 'сегодня' || dateStr === 'today') dateStr = mkIso(mosNow);
          else if (dateStr === 'завтра' || dateStr === 'tomorrow') dateStr = mkIso(new Date(mosNow.getTime() + 86400000));
          else {
            const dot = dateStr.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
            if (dot) dateStr = `${dot[3] || mosNow.getUTCFullYear()}-${dot[2].padStart(2,'0')}-${dot[1].padStart(2,'0')}`;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            await tgSend(chatId, '⚠️ Не понял дату. Напиши: <code>2026-05-25</code>, <code>25.05</code>, <code>сегодня</code> или <code>завтра</code>');
            return reply({ ok: true });
          }
          allState[chatId] = { waiting: 'event_time', event_title, event_date: dateStr };
          await saveBotState(storToken, allState);
          await tgSend(chatId,
            `⏰ Время начала для <b>${event_title}</b> (${dateStr}):\nНапиши <code>10:00</code> или <code>весь день</code>\n\n<i>/cancel — отмена</i>`,
            { reply_markup: MAIN_KB });
          return reply({ ok: true });
        }

        // Waiting for event time
        if (waiting === 'event_time') {
          const { event_title, event_date } = userState;
          const timeText = text.toLowerCase().trim();
          let startFloat = -1, endFloat = -1;
          if (timeText !== 'весь день' && timeText !== 'allday') {
            const tm = timeText.match(/^(\d{1,2}):(\d{2})/);
            if (!tm) {
              await tgSend(chatId, '⚠️ Не понял время. Напиши <code>10:00</code> или <code>весь день</code>');
              return reply({ ok: true });
            }
            startFloat = parseInt(tm[1]) + parseInt(tm[2]) / 60;
            endFloat = Math.min(startFloat + 1, 20);
          }
          const evList = await getTable(storToken, 'events');
          const d = new Date(event_date + 'T00:00:00');
          const dow = d.getDay();
          evList.push({
            id: 'ev' + Date.now(), start_time: startFloat, end_time: endFloat,
            title: event_title, kind: 'personal', description: '📱 Из Telegram',
            reminder: -1, event_date, day: dow === 0 ? 7 : dow,
          });
          await saveTable(storToken, 'events', evList);
          delete allState[chatId];
          await saveBotState(storToken, allState);
          const timeLabel = startFloat === -1 ? 'весь день'
            : `${String(Math.floor(startFloat)).padStart(2,'0')}:${String(Math.round((startFloat%1)*60)).padStart(2,'0')}`;
          await tgSend(chatId,
            `✅ Событие добавлено в календарь:\n<b>${event_title}</b>\n📅 ${event_date} · ${timeLabel}`,
            { reply_markup: MAIN_KB });
          return reply({ ok: true });
        }

        // Waiting for note text
        if (waiting === 'note') {
          const notes = await getTable(storToken, 'notes');
          const now   = new Date().toISOString();
          notes.push({
            id:      'n' + Date.now(),
            title:   text.slice(0, 80),
            content: text,
            folder:  '',
            pinned:  0,
            created: now,
            updated: now,
          });
          await saveTable(storToken, 'notes', notes);
          delete allState[chatId];
          await saveBotState(storToken, allState);
          await tgSend(chatId,
            `📝 Заметка сохранена:\n<b>${text.slice(0, 80)}</b>`,
            { reply_markup: MAIN_KB });
          return reply({ ok: true });
        }
      }

      // ── Main navigation buttons ───────────────────────────────────────────

      // 📋 Задачи
      if (text === '📋 Задачи' || /^\/tasks?\b/i.test(text)) {
        const tasks    = await getTable(storToken, 'tasks');
        const open     = tasks.filter(t => !t.done);
        const work     = open.filter(t => t.type === 'work').length;
        const personal = open.filter(t => t.type === 'personal').length;
        const study    = open.filter(t => t.type === 'study').length;
        await tgSend(chatId,
          `📋 <b>Задачи</b>\n\n` +
          `💼 Рабочих: <b>${work}</b>\n` +
          `🏠 Личных: <b>${personal}</b>\n` +
          `📚 Учебных: <b>${study}</b>\n\n` +
          `Всего открытых: <b>${open.length}</b>`,
          { reply_markup: KB_TASKS });
        return reply({ ok: true });
      }

      // 📅 Сегодня
      if (text === '📅 Сегодня' || /^\/today\b/i.test(text)) {
        const iso = todayIso();
        const [events, tasks] = await Promise.all([
          getTable(storToken, 'events'),
          getTable(storToken, 'tasks'),
        ]);
        // Tasks: due today OR deadline today (deadline-only gets separate note)
        const todayTask = tasks.filter(t =>
          !t.done && (
            t.due === iso ||
            (t.due || '').toLowerCase().includes('сегодня') ||
            (t.deadline === iso && t.due !== iso)
          )
        );
        // Events: exclude task-linked ones (by task_id or title match)
        const taskTitlesSet = new Set(todayTask.map(t => (t.title || '').trim().toLowerCase()));
        const todayEvs = events
          .filter(e =>
            e.event_date === iso &&
            !e.task_id &&
            !taskTitlesSet.has((e.title || '').trim().toLowerCase())
          )
          .sort((a, b) => (a.start_time ?? 99) - (b.start_time ?? 99));

        const typeIcon = t => t.type === 'work' ? '💼' : t.type === 'study' ? '📚' : '🏠';
        const pText    = p => p === 'high' ? ' 🔴' : p === 'low' ? ' ⬇️' : '';

        const lines = [`📅 <b>Сегодня, ${iso}</b>`];
        if (todayEvs.length) {
          lines.push('\n🗓 <b>События:</b>');
          todayEvs.forEach(e => {
            const hh = e.start_time === -1 ? 'весь день'
              : `${String(Math.floor(e.start_time)).padStart(2,'0')}:${String(Math.round((e.start_time%1)*60)).padStart(2,'0')}`;
            lines.push(`  ${hh} — ${e.title}`);
          });
        }
        if (todayTask.length) {
          lines.push('\n✅ <b>Задачи на сегодня:</b>');
          todayTask.forEach(t => {
            const meta = [];
            if (t.time) meta.push(`⏰ ${t.time}`);
            if (t.due < iso) meta.push(`⚡ просрочено (${t.due})`);
            if (t.deadline === iso) meta.push('⚑ дедлайн сегодня');
            else if (t.deadline) meta.push(`⚑ дл ${t.deadline}`);
            lines.push(`  ${typeIcon(t)}${pText(t.priority)} <b>${t.title}</b>${meta.length ? '\n      ' + meta.join(' · ') : ''}`);
          });
        }
        if (!todayEvs.length && !todayTask.length) lines.push('\nНет событий и задач 🎉');
        await tgSend(chatId, lines.join('\n'), { reply_markup: MAIN_KB });
        return reply({ ok: true });
      }

      // 👥 Контакты
      if (text === '👥 Контакты' || /^\/contacts?\b/i.test(text)) {
        const contacts = await getTable(storToken, 'contacts');
        const hot  = contacts.filter(c => c.status === 'hot');
        const warm = contacts.filter(c => c.status === 'warm');
        const work = contacts.filter(c => c.status === 'work');
        const cold = contacts.filter(c => c.status === 'cold');
        const lines = [`👥 <b>Контакты: ${contacts.length}</b>`, ''];
        lines.push(`🔥 Горячих: <b>${hot.length}</b>`);
        lines.push(`🌡 Тёплых: <b>${warm.length}</b>`);
        lines.push(`💼 В работе: <b>${work.length}</b>`);
        lines.push(`❄️ Холодных: <b>${cold.length}</b>`);
        if (hot.length) {
          lines.push('\n🔥 <b>Горячие лиды:</b>');
          hot.slice(0, 7).forEach(c => {
            lines.push(`  • <b>${c.name}</b>${c.addr ? ' · ' + c.addr : ''}`);
            if (c.next) lines.push(`    → ${c.next}`);
          });
        }
        await tgSend(chatId, lines.join('\n'), { reply_markup: MAIN_KB });
        return reply({ ok: true });
      }

      // 📆 Событие в календарь
      if (text === '📆 Событие в календарь' || /^\/event\b/i.test(text)) {
        allState[chatId] = { waiting: 'event_title' };
        await saveBotState(storToken, allState);
        await tgSend(chatId,
          '📆 Введи название события:\n\n<i>/cancel — отмена</i>',
          { reply_markup: MAIN_KB });
        return reply({ ok: true });
      }

      // 📝 Заметка
      if (text === '📝 Заметка' || /^\/note\b/i.test(text)) {
        allState[chatId] = { waiting: 'note' };
        await saveBotState(storToken, allState);
        await tgSend(chatId,
          '📝 Введи текст заметки:\n\n<i>/cancel — отмена</i>',
          { reply_markup: MAIN_KB });
        return reply({ ok: true });
      }

      // /id — show own chat_id (for initial setup)
      if (/^\/id\b/i.test(text)) {
        await tgSend(chatId,
          `Твой chat_id: <code>${chatId}</code>\nДобавь в переменную TG_OWNER_ID`,
          { reply_markup: MAIN_KB });
        return reply({ ok: true });
      }

      // /start or /help
      if (/^\/start\b|^\/help\b/i.test(text)) {
        await tgSend(chatId,
          '🤖 <b>7on OS Bot</b>\n\n' +
          'Используй кнопки внизу:\n\n' +
          '📋 <b>Задачи</b> — создать или посмотреть задачи\n' +
          '📅 <b>Сегодня</b> — события и задачи на сегодня\n' +
          '👥 <b>Контакты</b> — контакты и горячие лиды\n' +
          '📝 <b>Заметка</b> — сохранить заметку\n' +
          '📆 <b>Событие в календарь</b> — добавить событие на дату/время\n\n' +
          'Ежедневно в 9:00 приходит утренний бриф с задачами и событиями.\n\n' +
          '/cancel — отменить текущий ввод\n' +
          '/id — твой chat_id',
          { reply_markup: MAIN_KB });
        return reply({ ok: true });
      }

      await tgSend(chatId, '❓ Используй кнопки внизу или /help', { reply_markup: MAIN_KB });
      return reply({ ok: true });
    }

    // ── check-password: verify without exposing password in source code ─────────
    if (action === 'check-password') {
      const body = parseBody(event);
      const stored = process.env.APP_PASSWORD || '0510';
      return reply({ ok: body.password === stored });
    }

    // ── upload: proxy file upload through function (no CORS/static-keys needed) ─
    if (action === 'upload') {
      const body = parseBody(event);
      const { filename, data: fileData, contentType } = body;
      if (!filename || !fileData) return reply({ error: 'Missing filename or data' }, 400);
      const ext    = ((filename.split('.').pop()) || 'bin').toLowerCase();
      const fileId = 'file-' + Date.now();
      const key    = `files/${fileId}.${ext}`;
      const token  = await getToken();
      const buf    = Buffer.from(fileData, 'base64');
      const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType || 'application/octet-stream' },
        body: buf,
      });
      if (!r.ok) throw new Error(`Storage PUT ${r.status}: ${await r.text()}`);
      return reply({ ok: true, id: fileId, key });
    }

    // ── download: proxy file download through function ─────────────────────────
    if (action === 'download') {
      const key = qs.key;
      if (!key) return reply({ error: 'Missing key' }, 400);
      const token = await getToken();
      const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return reply({ error: `File not found (${r.status})` }, r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const ct  = r.headers.get('content-type') || 'application/octet-stream';
      const fname = key.split('/').pop();
      const inline = qs.inline === '1';
      return {
        statusCode: 200,
        headers: {
          ...CORS,
          'Content-Type': ct,
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fname)}`,
        },
        body: buf.toString('base64'),
        isBase64Encoded: true,
      };
    }

    // ── Table CRUD ────────────────────────────────────────────────────────────
    if (!table)              return reply({ error: 'Missing table or action' }, 400);
    if (!TABLES.has(table))  return reply({ error: 'Unknown table' }, 403);

    const token = await getToken();

    if (method === 'GET') {
      return reply(await getTable(token, table));
    }

    if (method === 'POST') {
      const body = parseBody(event);
      const data = await getTable(token, table);
      if (body.id === undefined) {
        body.id = data.length > 0 ? Math.max(...data.map(r => Number(r.id) || 0)) + 1 : 1;
      }
      data.push(body);
      await saveTable(token, table, data);
      return reply({ ok: true });
    }

    if (method === 'PATCH') {
      if (!id) return reply({ error: 'Missing id' }, 400);
      const body = parseBody(event);
      const data = await getTable(token, table);
      await saveTable(token, table, data.map(r => String(r.id) === String(id) ? { ...r, ...body } : r));
      return reply({ ok: true });
    }

    if (method === 'DELETE') {
      if (!id) return reply({ error: 'Missing id' }, 400);
      const data = await getTable(token, table);
      await saveTable(token, table, data.filter(r => String(r.id) !== String(id)));
      return reply({ ok: true });
    }

    return reply({ error: 'Method not allowed' }, 405);
  } catch (e) {
    return reply({ error: e.message }, 500);
  }
};
