// 7on OS — Cloudflare Worker API
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const TABLES = new Set([
  'tasks', 'contacts', 'deals', 'fin_income', 'fin_expenses', 'goals', 'monthly', 'events'
]);

const ok  = (d) => new Response(JSON.stringify(d), { headers: { ...CORS, 'Content-Type': 'application/json' } });
const err = (m, s = 400) => new Response(JSON.stringify({ error: m }), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url   = new URL(req.url);
    const parts = url.pathname.replace(/^\//, '').split('/'); // api / table / id
    const table = parts[1];
    const id    = parts[2];

    if (!table) return new Response('7on OS API v1', { headers: CORS });
    if (!TABLES.has(table)) return err('Unknown table', 403);

    try {
      // GET — select all
      if (req.method === 'GET') {
        const { results } = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
        return ok(results);
      }

      // POST — insert
      if (req.method === 'POST') {
        const body = await req.json();
        const cols = Object.keys(body);
        const vals = cols.map(c => body[c]);
        await env.DB
          .prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
          .bind(...vals).run();
        return ok({ ok: true });
      }

      // PATCH — update by id
      if (req.method === 'PATCH') {
        if (!id) return err('Missing id');
        const body = await req.json();
        const cols = Object.keys(body);
        const vals = [...cols.map(c => body[c]), id];
        await env.DB
          .prepare(`UPDATE ${table} SET ${cols.map(c => `${c}=?`).join(',')} WHERE id=?`)
          .bind(...vals).run();
        return ok({ ok: true });
      }

      // DELETE — delete by id
      if (req.method === 'DELETE') {
        if (!id) return err('Missing id');
        await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
        return ok({ ok: true });
      }

      return err('Method not allowed', 405);
    } catch (e) {
      return err(e.message, 500);
    }
  },
};
