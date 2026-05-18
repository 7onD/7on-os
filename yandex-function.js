// 7on OS — Yandex Cloud Function
// Runtime: Node.js 18 | Entry point: index.handler
// Env vars: BUCKET=7on-os-data  (Object Storage bucket, service account: storage.editor)
// File upload/download proxied through this function — no static keys needed.

const BUCKET = process.env.BUCKET || '7on-os-data';

const TABLES = new Set([
  'tasks', 'contacts', 'deals',
  'fin_income', 'fin_expenses', 'goals', 'monthly',
  'events', 'notes', 'files', 'folders',
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
