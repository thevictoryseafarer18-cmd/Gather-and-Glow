#!/usr/bin/env node
/**
 * Gather & Glow — local dev server + secure AI proxy.
 *
 *   npm start            → http://localhost:4173
 *
 * Serves the static app and exposes two small endpoints:
 *   GET  /api/ai/health  → { aiConfigured: boolean }
 *   POST /api/ai         → { text }            (proxied to the model provider)
 *
 * The provider key lives ONLY here, in the server environment:
 *   AI_PROVIDER_KEY   (required to enable live replies)
 *   AI_BASE_URL       (default https://api.openai.com/v1 — any OpenAI-compatible API)
 *   AI_MODEL          (default gpt-4o-mini)
 *   PORT              (default 4173)
 *
 * With no key set the app stays in its clearly labelled demo mode; the browser
 * never receives a key and no request leaves the machine.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const AI_KEY = process.env.AI_PROVIDER_KEY || '';
const AI_BASE = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/* ---------------- very small in-memory rate limiter ---------------- */
const hits = new Map();
function rateLimited(ip, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > limit;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req, limit = 262_144) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error('Request body too large.')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* ---------------- AI proxy ---------------- */
async function handleAi(req, res) {
  const ip = req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) return json(res, 429, { error: 'Too many requests. Wait a minute and try again.' });
  if (!AI_KEY) {
    return json(res, 503, {
      error: 'No AI provider key is configured on the server, so live replies are unavailable.',
      hint: 'Set AI_PROVIDER_KEY and restart, or keep using the labelled demo mode.',
    });
  }
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    return json(res, 400, { error: 'Invalid JSON body.' });
  }
  const messages = Array.isArray(payload.messages) ? payload.messages : null;
  if (!messages || !messages.length) return json(res, 400, { error: 'A messages array is required.' });

  const safeMessages = messages
    .filter((m) => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12_000) }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const upstream = await fetch(AI_BASE + '/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + AI_KEY,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: safeMessages,
        temperature: 0.6,
        max_tokens: 900,
      }),
    });
    clearTimeout(timer);
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('[ai] upstream error', upstream.status, detail.slice(0, 400));
      return json(res, 502, { error: 'The model provider rejected the request (' + upstream.status + ').' });
    }
    const data = await upstream.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';
    if (!text) return json(res, 502, { error: 'The model returned an empty reply.' });
    return json(res, 200, { text, model: AI_MODEL });
  } catch (err) {
    clearTimeout(timer);
    const message = err.name === 'AbortError' ? 'The model took too long to respond.' : 'Could not reach the model provider.';
    console.error('[ai]', err.message);
    return json(res, 502, { error: message });
  }
}

/* ---------------- static files ---------------- */
function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404 — not found</h1><p><a href="/">Back to Gather &amp; Glow</a></p>');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (pathname === '/api/ai/health' && req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      aiConfigured: Boolean(AI_KEY),
      provider: AI_KEY ? AI_BASE : null,
      model: AI_KEY ? AI_MODEL : null,
    });
  }
  if (pathname === '/api/ai' && req.method === 'POST') return handleAi(req, res);
  if (pathname.startsWith('/api/')) return json(res, 404, { error: 'Unknown API route.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
  return serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log('\n  Gather & Glow — running at http://localhost:' + PORT);
  console.log('  AI proxy: ' + (AI_KEY ? 'live (' + AI_MODEL + ')' : 'no key set → app runs in labelled demo mode'));
  console.log('  Press Ctrl+C to stop.\n');
});
