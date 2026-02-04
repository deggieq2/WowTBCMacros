export interface Env {
  DB: D1Database;
  TURNSTILE_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function isAdmin(request: Request) {
  return Boolean(
    request.headers.get('X-Admin') ||
      request.headers.get('CF-Access-Authenticated-User-Email')
  );
}

async function verifyTurnstile(secret: string, token: string, ip?: string) {
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  });
  const data = (await response.json()) as { success: boolean };
  return data.success;
}

async function hashVoter(ip: string, userAgent: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ip}|${userAgent}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');

    try {
      if (request.method === 'GET' && path === '/macros') {
        const status = url.searchParams.get('status') || 'approved';
        const classFilter = url.searchParams.get('class');
        const query = url.searchParams.get('q');

        if (query) {
          const result = await env.DB.prepare(
            `SELECT macros.* FROM macros_fts
             JOIN macros ON macros_fts.id = macros.id
             WHERE macros_fts MATCH ? AND macros.status = ?
             ORDER BY macros.updated_at DESC
             LIMIT 50`
          )
            .bind(query, status)
            .all();
          return jsonResponse(result.results || []);
        }

        let sql = 'SELECT * FROM macros WHERE status = ?';
        const params: string[] = [status];
        if (classFilter) {
          sql += ' AND class = ?';
          params.push(classFilter);
        }
        sql += ' ORDER BY updated_at DESC LIMIT 50';

        const result = await env.DB.prepare(sql).bind(...params).all();
        return jsonResponse(result.results || []);
      }

      if (request.method === 'GET' && path.startsWith('/macros/')) {
        const id = path.split('/')[2];
        const result = await env.DB.prepare('SELECT * FROM macros WHERE id = ?').bind(id).first();
        if (!result) return jsonResponse({ error: 'Not found' }, 404);
        return jsonResponse(result);
      }

      if (request.method === 'POST' && path === '/submissions') {
        const body = (await request.json()) as {
          title: string;
          class: string;
          tags: string[];
          macro_text: string;
          description: string;
          turnstileToken: string;
        };

        if (!body.turnstileToken) return jsonResponse({ error: 'Missing Turnstile token' }, 400);

        const ip = request.headers.get('CF-Connecting-IP') || '';
        const valid = await verifyTurnstile(env.TURNSTILE_SECRET, body.turnstileToken, ip);
        if (!valid) return jsonResponse({ error: 'Turnstile failed' }, 400);

        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const macroId = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO macros (id, title, class, tags, macro_text, description, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        )
          .bind(macroId, body.title, body.class, JSON.stringify(body.tags), body.macro_text, body.description, now, now)
          .run();

        await env.DB.prepare(
          `INSERT INTO macros_fts (id, title, class, tags, description, macro_text)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(macroId, body.title, body.class, JSON.stringify(body.tags), body.description, body.macro_text)
          .run();

        await env.DB.prepare(
          `INSERT INTO submissions (id, macro_id, submitter_meta, created_at) VALUES (?, ?, ?, ?)`
        )
          .bind(id, macroId, JSON.stringify({ ip }), now)
          .run();

        return jsonResponse({ id: macroId, status: 'pending' }, 201);
      }

      if (request.method === 'POST' && path === '/vote') {
        const body = (await request.json()) as { macro_id: string; turnstileToken: string };
        if (!body.turnstileToken) return jsonResponse({ error: 'Missing Turnstile token' }, 400);

        const ip = request.headers.get('CF-Connecting-IP') || '';
        const userAgent = request.headers.get('User-Agent') || 'unknown';
        const valid = await verifyTurnstile(env.TURNSTILE_SECRET, body.turnstileToken, ip);
        if (!valid) return jsonResponse({ error: 'Turnstile failed' }, 400);

        const voterHash = await hashVoter(ip, userAgent);
        const existing = await env.DB.prepare(
          'SELECT id FROM votes WHERE macro_id = ? AND voter_hash = ?'
        )
          .bind(body.macro_id, voterHash)
          .first();
        if (existing) return jsonResponse({ status: 'already_voted' }, 200);

        const voteId = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO votes (id, macro_id, voter_hash, created_at) VALUES (?, ?, ?, ?)'
        )
          .bind(voteId, body.macro_id, voterHash, now)
          .run();

        return jsonResponse({ status: 'ok' }, 201);
      }

      if (request.method === 'GET' && path === '/admin/queue') {
        if (!isAdmin(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const result = await env.DB.prepare(
          'SELECT * FROM macros WHERE status = ? ORDER BY created_at DESC'
        )
          .bind('pending')
          .all();
        return jsonResponse(result.results || []);
      }

      if (request.method === 'PATCH' && path.startsWith('/admin/macros/')) {
        if (!isAdmin(request)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const id = path.split('/')[3];
        const body = (await request.json()) as {
          status?: 'approved' | 'rejected' | 'pending';
          title?: string;
          class?: string;
          tags?: string[];
          macro_text?: string;
          description?: string;
        };

        const now = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE macros SET
             status = COALESCE(?, status),
             title = COALESCE(?, title),
             class = COALESCE(?, class),
             tags = COALESCE(?, tags),
             macro_text = COALESCE(?, macro_text),
             description = COALESCE(?, description),
             updated_at = ?
           WHERE id = ?`
        )
          .bind(
            body.status ?? null,
            body.title ?? null,
            body.class ?? null,
            body.tags ? JSON.stringify(body.tags) : null,
            body.macro_text ?? null,
            body.description ?? null,
            now,
            id
          )
          .run();

        const updated = await env.DB.prepare('SELECT * FROM macros WHERE id = ?').bind(id).first();
        if (updated) {
          await env.DB.prepare('DELETE FROM macros_fts WHERE id = ?').bind(id).run();
          await env.DB.prepare(
            `INSERT INTO macros_fts (id, title, class, tags, description, macro_text)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
            .bind(
              updated.id,
              updated.title,
              updated.class,
              updated.tags,
              updated.description,
              updated.macro_text
            )
            .run();
        }

        return jsonResponse({ status: 'ok' });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      return jsonResponse({ error: (error as Error).message }, 500);
    }
  }
};
