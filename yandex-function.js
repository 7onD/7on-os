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


// ── Telegram Bot helpers ──────────────────────────────────────────────────────
function tgApi(method, body) {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

// Send message to owner (chat_id stored in TG_OWNER_ID)
async function tgSend(text, chatId) {
  const id = chatId || process.env.TG_OWNER_ID;
  if (!id) return;
  await tgApi('sendMessage', { chat_id: id, text, parse_mode: 'HTML' });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Parse Telegram webhook update → { chatId, text } or null
function parseTgUpdate(body) {
  const msg = body?.message || body?.edited_message;
  if (!msg) return null;
  return {
    chatId: String(msg.chat?.id || ''),
    text: (msg.text || '').trim(),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';
  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const qs     = event.queryStringParameters || {};
  const table  = qs.table;
  const id     = qs.id;
  const action = qs.action;

  if (!table && !action) return reply({ message: '7on OS API v2 — Yandex' });

  try {
    // ── bot-setup: register Telegram webhook (call once) ─────────────────────
    if (action === 'bot-setup') {
      const funcUrl = process.env.FUNCTION_URL;
      if (!funcUrl) return reply({ error: 'FUNCTION_URL not set' }, 500);
      const res = await tgApi('setWebhook', {
        url: `${funcUrl}?action=bot`,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      });
      return reply({ ok: true, tg: res });
    }

    // ── bot: Telegram webhook ─────────────────────────────────────────────────
    if (action === 'bot') {
      const body = parseBody(event);
      const upd  = parseTgUpdate(body);
      if (!upd) return reply({ ok: true });

      const { chatId, text } = upd;

      // Security: only owner can use bot
      const ownerId = process.env.TG_OWNER_ID;
      if (ownerId && chatId !== ownerId) {
        await tgSend('⛔ Доступ запрещён.', chatId);
        return reply({ ok: true });
      }

      const storToken = await getToken();

      // ── /task или /t — рабочая задача ─────────────────────────────────────
      if (/^\/task\b|^\/t\b/i.test(text)) {
        const title = text.replace(/^\/task\s*|^\/t\s*/i, '').trim();
        if (!title) { await tgSend('✏️ Укажи название:\n/task Позвонить Иванову', chatId); return reply({ ok: true }); }
        const tasks = await getTable(storToken, 'tasks');
        tasks.push({ id: 'w' + Date.now(), title, type: 'work', priority: 'med', done: 0, due: '', time: '', tag: 'Риэлтор', description: '📱 Из Telegram', reminder: -1 });
        await saveTable(storToken, 'tasks', tasks);
        await tgSend(`✅ Рабочая задача создана:\n<b>${title}</b>`, chatId);
        return reply({ ok: true });
      }

      // ── /p — личная задача ────────────────────────────────────────────────
      if (/^\/p\b/i.test(text)) {
        const title = text.replace(/^\/p\s*/i, '').trim();
        if (!title) { await tgSend('✏️ Укажи название:\n/p Купить продукты', chatId); return reply({ ok: true }); }
        const tasks = await getTable(storToken, 'tasks');
        tasks.push({ id: 'p' + Date.now(), title, type: 'personal', priority: 'med', done: 0, due: '', time: '', tag: 'Личное', description: '📱 Из Telegram', reminder: -1 });
        await saveTable(storToken, 'tasks', tasks);
        await tgSend(`✅ Личная задача создана:\n<b>${title}</b>`, chatId);
        return reply({ ok: true });
      }

      // ── /study — учебная задача ───────────────────────────────────────────
      if (/^\/study\b/i.test(text)) {
        const title = text.replace(/^\/study\s*/i, '').trim();
        if (!title) { await tgSend('✏️ Укажи название:\n/study Прочитать главу', chatId); return reply({ ok: true }); }
        const tasks = await getTable(storToken, 'tasks');
        tasks.push({ id: 'e' + Date.now(), title, type: 'study', priority: 'med', done: 0, due: '', time: '', tag: 'Учёба', description: '📱 Из Telegram', reminder: -1 });
        await saveTable(storToken, 'tasks', tasks);
        await tgSend(`✅ Учебная задача создана:\n<b>${title}</b>`, chatId);
        return reply({ ok: true });
      }

      // ── /tasks — список открытых задач ───────────────────────────────────
      if (/^\/tasks\b/i.test(text)) {
        const tasks = await getTable(storToken, 'tasks');
        const open  = tasks.filter(t => !t.done);
        if (!open.length) { await tgSend('📋 Открытых задач нет', chatId); return reply({ ok: true }); }
        const work     = open.filter(t => t.type === 'work');
        const personal = open.filter(t => t.type === 'personal');
        const study    = open.filter(t => t.type === 'study');
        const lines = [`📋 Открытых задач: <b>${open.length}</b>`];
        if (work.length)     { lines.push(''); lines.push(`💼 Рабочие (${work.length}):`);    work.slice(0,7).forEach(t => lines.push(`  • ${t.title}`)); }
        if (personal.length) { lines.push(''); lines.push(`🏠 Личные (${personal.length}):`); personal.slice(0,7).forEach(t => lines.push(`  • ${t.title}`)); }
        if (study.length)    { lines.push(''); lines.push(`📚 Учёба (${study.length}):`);     study.slice(0,7).forEach(t => lines.push(`  • ${t.title}`)); }
        await tgSend(lines.join('\n'), chatId);
        return reply({ ok: true });
      }

      // ── /today — события и задачи на сегодня ─────────────────────────────
      if (/^\/today\b/i.test(text)) {
        const iso    = todayIso();
        const [events, tasks] = await Promise.all([getTable(storToken, 'events'), getTable(storToken, 'tasks')]);
        const todayEvs  = events.filter(e => e.event_date === iso).sort((a, b) => a.start_time - b.start_time);
        const todayTask = tasks.filter(t => !t.done && (t.due || '').toLowerCase().includes('сегодня'));
        const lines = [`📅 <b>Сегодня, ${iso}</b>`];
        if (todayEvs.length) {
          lines.push('\n🗓 <b>События:</b>');
          todayEvs.forEach(e => {
            const hh = e.start_time === -1 ? 'весь день' : `${String(Math.floor(e.start_time)).padStart(2,'0')}:00`;
            lines.push(`  ${hh} — ${e.title}`);
          });
        }
        if (todayTask.length) {
          lines.push('\n✅ <b>Задачи на сегодня:</b>');
          todayTask.forEach(t => lines.push(`  • ${t.title}`));
        }
        if (!todayEvs.length && !todayTask.length) lines.push('\nНет событий и задач 🎉');
        await tgSend(lines.join('\n'), chatId);
        return reply({ ok: true });
      }

      // ── /id — показать свой chat_id (для настройки) ───────────────────────
      if (/^\/id\b/i.test(text)) {
        await tgSend(`Твой chat_id: <code>${chatId}</code>\nДобавь его в переменную TG_OWNER_ID`, chatId);
        return reply({ ok: true });
      }

      // ── /start или /help ──────────────────────────────────────────────────
      if (/^\/start\b|^\/help\b/i.test(text)) {
        await tgSend(
          '🤖 <b>7on OS Bot</b>\n\n' +
          '/task [название]  — рабочая задача\n' +
          '/p [название]     — личная задача\n' +
          '/study [название] — учебная задача\n' +
          '/tasks            — все открытые задачи\n' +
          '/today            — события и задачи на сегодня\n' +
          '/id               — твой chat_id\n' +
          '/help             — эта справка',
          chatId,
        );
        return reply({ ok: true });
      }

      await tgSend('❓ Не понял. Напиши /help', chatId);
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
