// 7on OS — Yandex Cloud Function (вставить в редактор кода)
// Runtime: Node.js 18 | Entry point: index.handler
// Env vars: BUCKET=7on-os-data
// Service account: storage.editor

const BUCKET = process.env.BUCKET || '7on-os-data';
const TABLES = new Set(['tasks','contacts','deals','fin_income','fin_expenses','goals','monthly','events']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ok  = (d, s = 200) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
const err = (m, s = 400) => ({ statusCode: s, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: m }) });

// IAM-токен через сервисный аккаунт (автоматически)
async function getToken() {
  const r = await fetch('http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' },
  });
  const d = await r.json();
  return d.access_token;
}

// Чтение JSON-файла из Object Storage
async function getTable(token, table) {
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${table}.json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GET ${table}: ${r.status}`);
  return r.json();
}

// Запись JSON-файла в Object Storage
async function saveTable(token, table, data) {
  const body = JSON.stringify(data);
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${table}.json`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`PUT ${table}: ${r.status} — ${await r.text()}`);
}

// Парсинг тела запроса (может быть base64)
function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf-8')
    : (event.body || '{}');
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  // Разбор пути: /api/tasks/ID или /tasks/ID
  const parts = (event.path || '/').replace(/^\/+/, '').split('/');
  const offset = parts[0] === 'api' ? 1 : 0;
  const table  = parts[offset];
  const id     = parts[offset + 1];

  if (!table) return ok({ message: '7on OS API — Yandex Cloud' });
  if (!TABLES.has(table)) return err('Unknown table', 403);

  try {
    const token = await getToken();

    // GET — вернуть все записи
    if (method === 'GET') {
      return ok(await getTable(token, table));
    }

    // POST — добавить запись
    if (method === 'POST') {
      const body = parseBody(event);
      const data = await getTable(token, table);
      // Автоинкремент для таблиц без явного id
      if (body.id === undefined) {
        body.id = data.length > 0 ? Math.max(...data.map(r => Number(r.id) || 0)) + 1 : 1;
      }
      data.push(body);
      await saveTable(token, table, data);
      return ok({ ok: true });
    }

    // PATCH — обновить запись по id
    if (method === 'PATCH') {
      if (!id) return err('Missing id');
      const body = parseBody(event);
      const data = await getTable(token, table);
      const updated = data.map(row => String(row.id) === String(id) ? { ...row, ...body } : row);
      await saveTable(token, table, updated);
      return ok({ ok: true });
    }

    // DELETE — удалить запись по id
    if (method === 'DELETE') {
      if (!id) return err('Missing id');
      const data = await getTable(token, table);
      await saveTable(token, table, data.filter(row => String(row.id) !== String(id)));
      return ok({ ok: true });
    }

    return err('Method not allowed', 405);
  } catch (e) {
    return err(e.message, 500);
  }
};
