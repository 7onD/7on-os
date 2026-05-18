// 7on OS — Yandex Cloud Function
// Runtime: Node.js 18 | Entry point: index.handler
// Env: BUCKET=7on-os-data | Service account: storage.editor

const BUCKET = process.env.BUCKET || '7on-os-data';
const TABLES = new Set(['tasks','contacts','deals','fin_income','fin_expenses','goals','monthly','events']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const reply = (d, s = 200) => ({
  statusCode: s,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(d),
});

async function getToken() {
  const r = await fetch('http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' },
  });
  return (await r.json()).access_token;
}

async function getTable(token, table) {
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${table}.json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GET ${table}: ${r.status}`);
  return r.json();
}

async function saveTable(token, table, data) {
  const body = JSON.stringify(data);
  const r = await fetch(`https://storage.yandexcloud.net/${BUCKET}/${table}.json`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });
  if (!r.ok) throw new Error(`PUT ${table}: ${r.status} — ${await r.text()}`);
}

function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf-8')
    : (event.body || '{}');
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports.handler = async (event) => {
  const method = event.httpMethod || 'GET';

  if (method === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  // Параметры из query string: ?table=tasks&id=123
  const qs    = event.queryStringParameters || {};
  const table = qs.table;
  const id    = qs.id;

  if (!table) return reply({ message: '7on OS API — Yandex' });
  if (!TABLES.has(table)) return reply({ error: 'Unknown table' }, 403);

  try {
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
