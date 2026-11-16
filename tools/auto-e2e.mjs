// Auto-play, end to end, in headless Chrome (dossier ch. 14 §11: the deck "walks it unattended, still behind the
// flow lock"). tests/flow.test.mjs proves the machine; this proves the running deck and phone: the visible control
// starts it, a key from the presenter stops it, and left alone it walks every slide and every step to the last slide
// with no page error, no phone step that failed, and no watchdog (a watchdog means the phone missed an answer and
// the deck moved on without it). On the way it records what the phone really showed: every tab, the pages the
// slides promise, and the three languages.
//
//   npm start  (in another terminal)  then  node --experimental-websocket tools/auto-e2e.mjs http://127.0.0.1:4175 [pause-ms]
//
// The pause between presses defaults to 300 ms (?bekle=), so the run takes minutes, not the half hour the reading
// pauses add up to; the lock and every dm-done are waited for exactly as on stage. Exit code 0 = every check passed.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SLIDES } from '../deck/slides.js';
import { TABS, OGREN_TABS } from '../app/lib/nav.js';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const pause = Number(process.argv[3] ?? 300);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9935 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-auto-'))}`,
  '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ok = true;
const N = SLIDES.length;
const count = i => `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
const check = (cond, text) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${text}`); if (!cond) ok = false; };

try {
  let ver = null;
  for (let i = 0; i < 150 && !ver; i++) { await sleep(200); try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* starting */ } }
  if (!ver) throw new Error('headless Chrome did not start');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const errors = [], warnings = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    // The phone logs a step that threw as "[demo]", the deck a watchdog as "[sunum]": either means the walk was not clean.
    if (m.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(m.params.type)) warnings.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
  };
  await new Promise(r => (ws.onopen = r));
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });

  const open = async () => {
    await send('Page.navigate', { url: 'about:blank' }); await sleep(200);
    await send('Page.navigate', { url: `${base}/?bekle=${pause}#1` });
    for (let i = 0; i < 300 && !(await ev(`!!document.querySelector('.slide') && document.querySelector('#phone').contentDocument?.readyState === 'complete'`)); i++) await sleep(100);
    for (let i = 0; i < 300 && (await ev(`document.querySelector('#stage').getAttribute('aria-busy')`)) !== 'false'; i++) await sleep(100);
  };
  const auto = () => ev(`document.querySelector('#auto').getAttribute('aria-pressed')`);
  const key = k => ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true }))`);

  // 1. The control and the key; any presenter input stops it.
  await open();
  check(await ev(`(() => { const b = document.querySelector('#auto'); const r = b.getBoundingClientRect(); return !b.disabled && r.width > 0 && r.height > 0; })()`), 'the auto-play control is on screen');
  await key('a');
  check(await auto() === 'true', 'A switches auto-play on');
  await key('a');
  check(await auto() === 'false', 'A again switches it off');
  await ev(`document.querySelector('#auto').click()`);
  check(await auto() === 'true', 'the control switches it on');
  await key('ArrowRight');
  check(await auto() === 'false', '→ from the presenter switches it off');
  for (let i = 0; i < 300 && (await ev(`document.querySelector('#stage').getAttribute('aria-busy')`)) !== 'false'; i++) await sleep(100);

  // 2. Left alone from the cover, it walks the whole deck.
  await open();
  errors.length = 0; warnings.length = 0;
  // Test-side recorder: what the phone shows, sampled every 100 ms (each step holds its screen for at least 0.9 s).
  await ev(`(() => { window.__seen = { hashes: [], langs: [], counts: [], busyMoves: 0 }; let last = null, lastCount = null;
    setInterval(() => {
      const d = document.querySelector('#phone').contentDocument, w = document.querySelector('#phone').contentWindow;
      const h = w.location.hash; if (h !== last) { window.__seen.hashes.push(h); last = h; }
      const l = d.documentElement.lang; if (window.__seen.langs.at(-1) !== l) window.__seen.langs.push(l);
      const c = document.querySelector('#count').textContent; if (c !== lastCount) { window.__seen.counts.push(c); lastCount = c; }
    }, 100); })()`);
  const t0 = Date.now();
  await ev(`document.querySelector('#auto').click()`);
  let last = '';
  for (;;) {
    await sleep(500);
    const st = await ev(`({ auto: document.querySelector('#auto').getAttribute('aria-pressed'), count: document.querySelector('#count').textContent })`);
    if (st.count !== last) { console.log(`      ${st.count}  ${Math.round((Date.now() - t0) / 1000)} s`); last = st.count; }
    if (st.auto === 'false') break;
    if (Date.now() - t0 > 20 * 60_000) { check(false, 'auto-play finished within 20 minutes'); break; }
  }
  const seen = await ev('window.__seen');
  const end = await ev(`({ count: document.querySelector('#count').textContent, busy: document.querySelector('#stage').getAttribute('aria-busy'),
    acts: document.querySelectorAll('.slide.on .act').length, done: document.querySelectorAll('.slide.on .act.done').length })`);
  check(end.count === count(N - 1) && end.busy === 'false', `it stopped by itself on the last slide (${end.count}, ${Math.round((Date.now() - t0) / 1000)} s)`);
  check(end.done === end.acts, `the last slide's steps all played (${end.done}/${end.acts})`);
  check(JSON.stringify(seen.counts) === JSON.stringify(SLIDES.map((_, i) => count(i))), `every slide, in order, none skipped (${seen.counts.length}/${N})`);
  const hashes = new Set(seen.hashes.map(h => h.split('?')[0]));
  const want = [...TABS.map(t => t.hash), ...OGREN_TABS.map(t => `#/ogren/${t.key}`), '#/isaret-kategori/diyez', '#/isaret/diyez', '#/calgi/keman', '#/sarki/keman',
    '#/vakif', '#/burslar', '#/etkinlikler', '#/dore-ve-mimi', '#/profil', '#/hesabim', '#/ayarlar'];
  const missing = want.filter(h => !hashes.has(h));
  check(missing.length === 0, `the phone showed every tab, every Öğren tab and the promised pages${missing.length ? ' (missing ' + missing.join(' ') + ')' : ''}`);
  check(JSON.stringify(seen.langs) === JSON.stringify(['tr', 'en', 'fr', 'tr']), `the phone switched Türkçe → English → Français → Türkçe (${seen.langs.join(' → ')})`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  check(warnings.length === 0, `no failed phone step and no watchdog${warnings.length ? ': ' + warnings.join(' | ') : ''}`);
  ws.close();
} finally {
  chrome.kill();
}
process.exit(ok ? 0 : 1);
