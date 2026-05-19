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

  const now = new Date();
  const WINDOW_MS = force ? Infinity : 5 * 60 * 1000;
  const msgs = [];
  const debugInfo = debug ? { now: now.toISOString(), tasks: [], events: [] } : null;

  // Check events
  events.forEach(ev => {
    const mins = parseInt(ev.reminder ?? '-1');
    if (mins < 0 || ev.start_time === -1) return;
    if (!ev.event_date) return;

    const [y, mo, d] = ev.event_date.split('-').map(Number);
    const evDate = new Date(y, mo - 1, d);
    const h = ev.start_time ?? 9;
    evDate.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);

    const fireAt = new Date(evDate.getTime() - mins * 60000);
    const diff = now - fireAt;
    const key = `ev_${ev.id}_${mins}`;

    if (debugInfo) debugInfo.events.push({ id: ev.id, title: ev.title, event_date: ev.event_date, reminder: mins, fireAt: fireAt.toISOString(), diffMin: Math.round(diff/60000), alreadyNotified: !!notified[key] });

    if (diff >= 0 && diff < WINDOW_MS && !notified[key]) {
      const hh = `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}`;
      const when = mins === 0 ? 'начинается сейчас' : mins < 60 ? `через ${mins} мин` : mins === 60 ? 'через 1 час' : mins >= 1440 ? 'завтра' : `через ${Math.round(mins/60)} ч`;
      msgs.push({ key, text: `📅 <b>${ev.title}</b>\n${ev.event_date} ${hh} · ${when}` });
    }
  });

  // Check tasks
  tasks.forEach(t => {
    if (t.done) return;
    const mins = parseInt(t.reminder ?? '-1');
    if (mins < 0) return;

    const due = (t.due || '').trim();
    const iso = due.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!iso) {
      if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, due, reminder: mins, skip: 'due not ISO format' });
      return;
    }

    const dueDate = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]), 9, 0, 0);
    if (t.time && /^\d{1,2}:\d{2}$/.test(t.time)) {
      const [h, m] = t.time.split(':').map(Number);
      dueDate.setHours(h, m, 0, 0);
    }

    const fireAt = new Date(dueDate.getTime() - mins * 60000);
    const diff = now - fireAt;
    const key = `task_${t.id}_${mins}`;

    if (debugInfo) debugInfo.tasks.push({ id: t.id, title: t.title, due, reminder: mins, fireAt: fireAt.toISOString(), diffMin: Math.round(diff/60000), alreadyNotified: !!notified[key] });

    if (diff >= 0 && diff < WINDOW_MS && !notified[key]) {
      const when = mins === 0 ? 'срок наступил' : mins < 60 ? `через ${mins} мин` : mins >= 1440 ? 'завтра' : `через ${Math.round(mins/60)} ч`;
      msgs.push({ key, text: `✅ <b>${t.title}</b>\n${when}` });
    }
  });

  if (msgs.length > 0) {
    await Promise.all(msgs.map(m => tgSend(ownerId, `🔔 Напоминание\n\n${m.text}`)));
    msgs.forEach(m => { notified[m.key] = Date.now(); });
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    Object.keys(notified).forEach(k => { if (notified[k] < cutoff) delete notified[k]; });
    await saveNotified(storToken, notified);
  }

  return { ok: true, sent: msgs.length, ...(debugInfo || {}) };
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports.handler = async (event) => {
  // Yandex Cloud Timer Trigger — runs reminder check on schedule
  if (event.messages && Array.isArray(event.messages)) {
    try {
      const storToken = await getToken();
      const result = await runReminderCheck(storToken);
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
          const lines    = [`📋 Открытых задач: <b>${open.length}</b>`];
          if (work.length)     { lines.push(''); lines.push(`💼 Рабочие (${work.length}):`);    work.slice(0,8).forEach(t => lines.push(`  • ${t.title}`)); }
          if (personal.length) { lines.push(''); lines.push(`🏠 Личные (${personal.length}):`); personal.slice(0,8).forEach(t => lines.push(`  • ${t.title}`)); }
          if (study.length)    { lines.push(''); lines.push(`📚 Учёба (${study.length}):`);     study.slice(0,8).forEach(t => lines.push(`  • ${t.title}`)); }
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
        const todayEvs  = events
          .filter(e => e.event_date === iso)
          .sort((a, b) => (a.start_time ?? 99) - (b.start_time ?? 99));
        const todayTask = tasks.filter(t =>
          !t.done && (t.due === iso || (t.due || '').toLowerCase().includes('сегодня')));
        const lines = [`📅 <b>Сегодня, ${iso}</b>`];
        if (todayEvs.length) {
          lines.push('\n🗓 <b>События:</b>');
          todayEvs.forEach(e => {
            const hh = e.start_time === -1 ? 'весь день'
              : `${String(Math.floor(e.start_time)).padStart(2,'0')}:00`;
            lines.push(`  ${hh} — ${e.title}`);
          });
        }
        if (todayTask.length) {
          lines.push('\n✅ <b>Задачи на сегодня:</b>');
          todayTask.forEach(t => lines.push(`  • ${t.title}`));
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
          '📝 <b>Заметка</b> — сохранить заметку\n\n' +
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
