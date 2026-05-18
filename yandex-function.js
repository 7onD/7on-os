// 7on OS — Yandex Cloud Function
// Runtime: Node.js 18 | Entry point: index.handler
// Env vars required:
//   BUCKET=7on-os-data           (Object Storage bucket name)
//   YC_KEY_ID=<static-key-id>    (IAM static access key for presigned URLs)
//   YC_SECRET_KEY=<static-secret> (IAM static access secret)
// Bucket CORS must allow PUT/GET/HEAD from * with Content-Type header.

const crypto = require('crypto');

const BUCKET     = process.env.BUCKET      || '7on-os-data';
const YC_KEY_ID  = process.env.YC_KEY_ID   || '';
const YC_SECRET  = process.env.YC_SECRET_KEY || '';
const REGION     = 'ru-central1';

const TABLES = new Set([
  'tasks', 'contacts', 'deals',
  'fin_income', 'fin_expenses', 'goals', 'monthly',
  'events', 'notes', 'files',
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

// ── Presigned URL (AWS SigV4 — Yandex Object Storage is S3-compatible) ────────
function presignUrl({ key, method = 'GET', expires = 3600 }) {
  if (!YC_KEY_ID || !YC_SECRET) throw new Error('YC_KEY_ID / YC_SECRET_KEY not set');

  const now       = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '');          // YYYYMMDD
  const amzdate   = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; // YYYYMMDDTHHMMSSZ
  const host      = `${BUCKET}.storage.yandexcloud.net`;
  const credScope = `${datestamp}/${REGION}/s3/aws4_request`;

  // Build sorted canonical query string
  const paramsObj = {
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    `${YC_KEY_ID}/${credScope}`,
    'X-Amz-Date':          amzdate,
    'X-Amz-Expires':       String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const qs = Object.keys(paramsObj).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(paramsObj[k])}`)
    .join('&');

  const canonicalReq  = [method, '/' + key, qs, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign  = ['AWS4-HMAC-SHA256', amzdate, credScope,
    crypto.createHash('sha256').update(canonicalReq).digest('hex')].join('\n');

  const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
  const sigKey = hmac(hmac(hmac(hmac('AWS4' + YC_SECRET, datestamp), REGION), 's3'), 'aws4_request');
  const sig    = crypto.createHmac('sha256', sigKey).update(stringToSign).digest('hex');

  return `https://${host}/${key}?${qs}&X-Amz-Signature=${sig}`;
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
    // ── presign-upload: returns presigned PUT URL for direct browser upload ──
    if (action === 'presign-upload') {
      const body   = parseBody(event);
      const ext    = ((body.filename || 'file').split('.').pop() || 'bin').toLowerCase();
      const fileId = 'file-' + Date.now();
      const key    = `files/${fileId}.${ext}`;
      const url    = presignUrl({ key, method: 'PUT', expires: 300 });
      return reply({ url, key, id: fileId });
    }

    // ── presign-download: returns presigned GET URL ───────────────────────────
    if (action === 'presign-download') {
      const key = qs.key;
      if (!key) return reply({ error: 'Missing key' }, 400);
      const url = presignUrl({ key, method: 'GET', expires: 3600 });
      return reply({ url });
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
