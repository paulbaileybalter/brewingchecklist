// Password gate for the whole site (Cloudflare Worker serving static assets from ./public).
// Runs on the server BEFORE any page is served, so the checklist is never sent to someone who isn't signed in.
//
// Required environment variable (Cloudflare Worker -> Settings -> Variables and Secrets):
//   SITE_PASSWORD   the shared password (add it as a Secret / encrypted)
// Optional:
//   CHECKLIST       (KV namespace binding, set in wrangler.jsonc) shared ticks, comments and notes
//   SESSION_SECRET  random string used to sign login cookies (defaults to SITE_PASSWORD;
//                   changing either one signs everyone out)

const COOKIE = 'bal_session';
const SESSION_SECONDS = 60 * 60 * 24 * 14; // stay signed in for 14 days

// Files needed by the login page itself (fonts and logo are not sensitive).
const PUBLIC_PATHS = new Set(['/favicon.svg', '/icon-192.png', '/icon-512.png', '/manifest.json', '/robots.txt']);
const PUBLIC_PREFIXES = ['/fonts/'];

const enc = new TextEncoder();

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Compare passwords by comparing fixed-length HMACs of each (constant-time, no length leak).
async function passwordMatches(input, expected) {
  const [x, y] = await Promise.all([hmacHex('balter-compare', input), hmacHex('balter-compare', expected)]);
  return safeEqual(x, y);
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

async function makeToken(secret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${exp}.${await hmacHex(secret, 'bal-session:' + exp)}`;
}

async function tokenValid(token, secret) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, await hmacHex(secret, 'bal-session:' + exp));
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function loginPage(error) {
  const smile = 'M136.3,70.4l-9.4-9.4c-1.6-1.6-4.3-1.6-6,0-1.6,1.6-1.6,4.3,0,6l2.3,2.3c-9.6,13.2-25.2,21.7-42.7,21.7s-33.1-8.6-42.7-21.8l2.3-2.3c1.6-1.6,1.6-4.3,0-6-1.6-1.6-4.3-1.6-6,0l-9.4,9.4c-1.6,1.6-1.6,4.3,0,6,.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2l1.1-1.1c11.2,14.7,28.9,24.2,48.7,24.2s37.5-9.5,48.7-24.2l1.1,1.1c.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2c1.6-1.6,1.6-4.3,0-6';
  const box = 'M152.5,8.5v144H8.5V8.5h144M161,0H0v161h161V0h0Z';
  return `<!DOCTYPE html>
<html lang="en-AU"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign in — Balter Brewing</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" content="#47D7AC">
<style>
@font-face{font-family:'Lexend';src:local('Lexend'),url('/fonts/lexend-latin-wght-normal.woff2') format('woff2');font-weight:100 900;font-display:swap;}
*{box-sizing:border-box;}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#000;font-family:'Lexend','Segoe UI',system-ui,Arial,sans-serif;padding:20px;overflow:hidden;}
.bubbles{position:fixed;inset:0;pointer-events:none;overflow:hidden;}
.bubbles span{position:absolute;bottom:-40px;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.95),rgba(71,215,172,.12));border:1px solid rgba(71,215,172,.28);animation:rise linear infinite;}
@keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:.7}100%{transform:translateY(-115vh) scale(1.15);opacity:0}}
@media (prefers-reduced-motion:reduce){.bubbles{display:none}}
.card{position:relative;width:min(400px,100%);background:#fff;border:1px solid #E7E5DE;border-radius:18px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px rgba(0,0,0,.08);overflow:hidden;}
.stripe{display:flex;height:6px}.stripe i{flex:1}
.in{padding:30px 30px 28px;text-align:center}
.logo{width:72px;height:72px;margin:0 auto 14px;display:block}
.kicker{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#7566A0;font-weight:600}
h1{font-size:21px;margin:6px 0 4px;font-weight:700;letter-spacing:-.01em}
p{margin:0 0 20px;font-size:13.5px;color:#6B685D}
label{display:block;text-align:left;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#6B685D;font-weight:600;margin-bottom:6px}
input{width:100%;border:1.5px solid #E7E5DE;background:#FAFAF7;border-radius:10px;padding:12px 14px;font:inherit;font-size:16px}
input:focus{outline:none;border-color:#47D7AC;background:#fff}
button{margin-top:14px;width:100%;border:none;background:#000;color:#fff;border-radius:10px;padding:13px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}
button:hover{background:#7566A0}
button:focus-visible,input:focus-visible{outline:2px solid #7566A0;outline-offset:2px}
.err{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:rgba(253,170,99,.25);font-size:13px;font-weight:500;color:#000}
</style></head>
<body>
<div class="bubbles" aria-hidden="true">${[...Array(10)].map((_, i) => `<span style="width:${10 + ((i * 7) % 24)}px;height:${10 + ((i * 7) % 24)}px;left:${(i * 11 + 4) % 100}%;animation-duration:${16 + ((i * 5) % 14)}s;animation-delay:-${(i * 3) % 14}s"></span>`).join('')}</div>
<form class="card" method="POST" action="/login">
  <div class="stripe"><i style="background:#47D7AC"></i><i style="background:#FDAA63"></i><i style="background:#7566A0"></i><i style="background:#99D6EA"></i></div>
  <div class="in">
    <svg class="logo" viewBox="0 0 161 161" aria-hidden="true"><path fill="#47D7AC" d="${smile}"/><path fill="#47D7AC" d="${box}"/></svg>
    <div class="kicker">Balter Brewing</div>
    <h1>Team Leader Checklist</h1>
    <p>Enter the password to continue.</p>
    ${error ? `<div class="err" role="alert">${error}</div>` : ''}
    <label for="pw">Password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required maxlength="200">
    <button type="submit">Sign in</button>
  </div>
</form>
</body></html>`;
}

function html(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...extra },
  });
}

/* ------------------------------------------------------------------ *
 * Shared checklist data (Workers KV, binding name: CHECKLIST)
 * One KV entry per date:  day:YYYY-MM-DD
 *   { ver, checks:{id:{v,by,t}}, comments:{id:{v,by,t}}, notes:[{id,text,by,t}] }
 * Devices send small patches (only what changed); the server merges them,
 * stamping each change with its own clock, so the last change to a field wins
 * and different people's changes to different fields never overwrite each other.
 * ------------------------------------------------------------------ */
const ID_RE = /^[a-z]+-\d{1,2}$/;
const NOTE_ID_RE = /^[a-z0-9-]{8,40}$/;
const KEEP_SECONDS = 60 * 60 * 24 * 400;
const MAX_NOTES = 60;

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

function emptyDoc() { return { ver: '', checks: {}, comments: {}, notes: [] }; }

async function loadDoc(env, key) {
  const doc = await env.CHECKLIST.get(key, 'json');
  if (!doc || typeof doc !== 'object') return emptyDoc();
  return { ver: doc.ver || '', checks: doc.checks || {}, comments: doc.comments || {}, notes: Array.isArray(doc.notes) ? doc.notes : [] };
}

async function handleApi(request, env, url) {
  const m = url.pathname.match(/^\/api\/day\/(\d{4}-\d{2}-\d{2})$/);
  if (!m) return json({ error: 'Not found' }, 404);
  if (!env.CHECKLIST) return json({ error: 'KV namespace CHECKLIST is not bound' }, 503);

  const date = m[1];
  const when = Date.parse(date + 'T00:00:00Z');
  if (isNaN(when) || Math.abs(when - Date.now()) > 1000 * 60 * 60 * 24 * 400) return json({ error: 'Bad date' }, 400);
  const key = 'day:' + date;

  if (request.method === 'GET') {
    const doc = await loadDoc(env, key);
    const ver = url.searchParams.get('ver');
    if (ver && ver === doc.ver) return json({ unchanged: true, ver: doc.ver });
    return json(doc);
  }

  // Writes: must be same-origin JSON (blocks cross-site form posts)
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ error: 'Forbidden' }, 403);

  if (request.method === 'DELETE') {
    await env.CHECKLIST.delete(key);
    return json(emptyDoc());
  }

  if (request.method === 'PUT') {
    if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'Expected JSON' }, 415);
    const text = await request.text();
    if (text.length > 30000) return json({ error: 'Too large' }, 413);
    let body;
    try { body = JSON.parse(text); } catch (e) { return json({ error: 'Bad JSON' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'Bad body' }, 400);

    const doc = await loadDoc(env, key);
    const now = Date.now();

    for (const [id, f] of Object.entries(body.checks || {}).slice(0, 60)) {
      if (!ID_RE.test(id) || !f || typeof f !== 'object') continue;
      if (f.v) doc.checks[id] = { v: true, by: clean(f.by, 80), t: now };
      else delete doc.checks[id];
    }
    for (const [id, f] of Object.entries(body.comments || {}).slice(0, 60)) {
      if (!ID_RE.test(id) || !f || typeof f !== 'object') continue;
      const v = clean(f.v, 300);
      if (v.trim()) doc.comments[id] = { v, by: clean(f.by, 80), t: now };
      else delete doc.comments[id];
    }
    if (Array.isArray(body.notesRemove)) {
      const gone = new Set(body.notesRemove.slice(0, 60).map(String));
      doc.notes = doc.notes.filter((n) => !gone.has(n.id));
    }
    if (Array.isArray(body.notesAdd)) {
      for (const a of body.notesAdd.slice(0, 10)) {
        if (!a || !NOTE_ID_RE.test(String(a.id)) || doc.notes.some((n) => n.id === a.id)) continue;
        const textVal = clean(a.text, 1000);
        if (!textVal.trim() || doc.notes.length >= MAX_NOTES) continue;
        doc.notes.push({ id: String(a.id), text: textVal, by: clean(a.by, 80), t: now });
      }
    }

    doc.ver = crypto.randomUUID();
    await env.CHECKLIST.put(key, JSON.stringify(doc), { expirationTtl: KEEP_SECONDS });
    return json(doc);
  }

  return json({ error: 'Method not allowed' }, 405);
}

async function handle(request, env, next) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!env.SITE_PASSWORD) {
    return html('<h1 style="font-family:sans-serif">Site not configured</h1><p style="font-family:sans-serif">Set the SITE_PASSWORD variable in Cloudflare Pages settings.</p>', 500);
  }
  const secret = env.SESSION_SECRET || env.SITE_PASSWORD;

  // Assets the login page needs
  if (PUBLIC_PATHS.has(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return next();

  // Log out
  if (path === '/logout') {
    return new Response(null, { status: 303, headers: { Location: '/login', 'Set-Cookie': cookieHeader('', 0), 'Cache-Control': 'no-store' } });
  }

  const signedIn = await tokenValid(getCookie(request, COOKIE), secret);

  // Login
  if (path === '/login') {
    if (request.method === 'POST') {
      let password = '';
      try { password = String((await request.formData()).get('password') || ''); } catch (e) {}
      if (password && password.length <= 200 && (await passwordMatches(password, env.SITE_PASSWORD))) {
        return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': cookieHeader(await makeToken(secret), SESSION_SECONDS), 'Cache-Control': 'no-store' } });
      }
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return html(loginPage('That password didn’t work. Please try again.'), 401);
    }
    if (signedIn) return new Response(null, { status: 303, headers: { Location: '/' } });
    return html(loginPage(''));
  }

  // Everything else needs a valid session
  if (!signedIn) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return new Response(null, { status: 303, headers: { Location: '/login', 'Cache-Control': 'no-store' } });
    }
    return new Response('Unauthorised', { status: 401 });
  }

  if (path.startsWith('/api/')) return handleApi(request, env, url);

  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set('Cache-Control', 'private, no-cache');
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return out;
}

export default {
  fetch(request, env) {
    return handle(request, env, () => env.ASSETS.fetch(request));
  },
};
