/**
 * Verifies the optional live-AI path without any real provider:
 * a stub OpenAI-compatible server stands in for the model.
 *   node test/proxy-test.mjs
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
let failures = 0;
const check = (label, cond, extra) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (cond ? '' : ' — ' + (extra || '')));
  if (!cond) failures++;
};

// 1. stub provider
const provider = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const parsed = JSON.parse(body || '{}');
    const ok = req.url === '/v1/chat/completions' && req.headers.authorization === 'Bearer test-key';
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ok
      ? { choices: [{ message: { content: 'LIVE REPLY: grounded in ' + (parsed.messages || []).length + ' messages.' } }] }
      : { error: 'unauthorised' }));
  });
});
await new Promise((r) => provider.listen(4199, '127.0.0.1', r));

// 2. app server with a key configured
const app = spawn(process.execPath, ['server.js'], {
  env: Object.assign({}, process.env, {
    PORT: '4180',
    AI_PROVIDER_KEY: 'test-key',
    AI_BASE_URL: 'http://127.0.0.1:4199/v1',
    AI_MODEL: 'stub-model',
  }),
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((r) => setTimeout(r, 700));

const base = 'http://localhost:4180';
const health = await (await fetch(base + '/api/ai/health')).json();
check('health reports a configured key', health.aiConfigured === true, JSON.stringify(health));
check('health does not leak the key', JSON.stringify(health).indexOf('test-key') === -1);

const aiRes = await fetch(base + '/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
});
const aiJson = await aiRes.json();
check('proxy returns model text', aiRes.status === 200 && /LIVE REPLY/.test(aiJson.text || ''), JSON.stringify(aiJson));

const badRes = await fetch(base + '/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"nope":1}' });
check('proxy validates body', badRes.status === 400);

const indexRs = await fetch(base + '/');
const indexHtml = await indexRs.text();
check('static app served', indexRs.status === 200 && indexHtml.includes('Gather &amp; Glow'));
check('no key in served HTML', indexHtml.indexOf('test-key') === -1);
const cfg = await (await fetch(base + '/js/config.js')).text();
check('no key in client config', cfg.indexOf('test-key') === -1);

// 3. UI in live mode
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(base + '/#/assistant', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const pill = await page.textContent('#topbar-actions');
check('UI shows live mode', /Live AI/.test(pill), pill);
check('live notice shown', /Live model connected/.test(await page.textContent('#view')));
await page.click('[data-action="ai:prompt"][data-prompt="Create my planning timeline"]');
await page.waitForTimeout(1200);
const bubble = await page.textContent('.msg--ai:last-of-type');
check('live reply rendered in chat', /LIVE REPLY/.test(bubble), bubble.slice(0, 120));
check('reply labelled as live', /Live model/.test(await page.textContent('.chat-log')));
await browser.close();

// 4. rate limiting kicks in
let limited = false;
for (let i = 0; i < 40; i++) {
  const r = await fetch(base + '/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }) });
  if (r.status === 429) { limited = true; break; }
}
check('rate limiting returns 429', limited);

app.kill();
provider.close();
console.log('\n' + (failures === 0 ? 'PROXY CHECKS PASSED' : failures + ' PROXY CHECK(S) FAILED'));
process.exit(failures ? 1 : 0);
