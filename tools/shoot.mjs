// Screenshots the deck and the phone with headless Chrome over the DevTools protocol, so a person (or an agent) can
// LOOK at every slide and screen after a change. No dependencies: Node 22+, or Node 20 with --experimental-websocket.
//
//   node --experimental-websocket tools/shoot.mjs http://localhost:4175 docs/screens
//
// The plan is below: each shot loads a URL at a size, runs a few steps in the page (a deck key, a phone message, a
// click), waits, and saves a PNG. Chrome is started here with its own throwaway profile and stopped at the end.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = (process.argv[2] ?? 'http://localhost:4175').replace(/\/$/, '');
const out = process.argv[3] ?? 'docs/screens';
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
const port = 9335 + Math.floor(Math.random() * 400);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(out, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const profileDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'dm-shoot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let version = null;
for (let i = 0; i < 50 && !version; i++) { await sleep(200); try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* starting */ } }
if (!version) { chrome.kill(); throw new Error('Chrome did not start'); }

const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') problems.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) problems.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200));
};
await new Promise(r => (ws.onopen = r));
const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');

const evaluate = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r?.exceptionDetails) problems.push('eval: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text).split('\n')[0]);
  return r?.result?.value;
};
async function load(url, w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(150);
  await send('Page.navigate', { url });
  await sleep(1800);
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, `${name}.png`), Buffer.from(r.data, 'base64'));
  console.log('  ' + name);
}

// In the deck: a key the presenter presses; in the phone: a message the deck would send, or a tap by selector.
const deckKey = k => `document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`;
const msg = m => `window.postMessage(${JSON.stringify(m)}, '*')`;
const tap = sel => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) throw new Error('no ' + ${JSON.stringify(sel)}); el.click(); })()`;

const SLIDES = 9;
const DECK = [];
// Every slide as it opens, then after each "canlı göster" step (→ plays the next one).
const STEPS = { 2: 2, 3: 2, 4: 2, 5: 1, 6: 2, 7: 2 };
const GAME = n => n === 4 || n === 5;   // the scripted round replays fast to the slide's step first
for (let n = 1; n <= SLIDES; n++) {
  DECK.push({ name: `slide-${String(n).padStart(2, '0')}`, url: `${base}/?v=shoot#${n}`, w: 1440, h: 900, wait: GAME(n) ? 9000 : 3500 });
  for (let s = 1; s <= (STEPS[n] ?? 0); s++) {
    DECK.push({ name: `slide-${String(n).padStart(2, '0')}-step${s}`, cont: true, steps: [deckKey('ArrowRight')], w: 1440, h: 900, wait: GAME(n) ? 9000 : n === 6 ? 5000 : 3500 });
  }
}

const app = (hash, extra = '') => `${base}/app/?still&reset${extra}${hash}`;
const PHONE = [
  ['phone-01-kesfet', app('#/')],
  ['phone-02-kesfet-scrolled', app('#/'), [`document.querySelector('#page').scrollTop = 900`]],
  ['phone-03-ogren-isaretler', app('#/ogren/isaretler')],
  ['phone-04-ogren-isaretler-flipped', app('#/ogren/isaretler'), [tap('[data-flip]')]],
  ['phone-05-ogren-calgilar', app('#/ogren/calgilar')],
  ['phone-06-calgi-piyano', app('#/calgi/piyano')],
  ['phone-07-isaret-diyez', app('#/isaret/diyez')],
  ['phone-08-doremimi-hub', app('#/doremimi')],
  ['phone-09-doremimi-hub-scrolled', app('#/doremimi'), [`document.querySelector('#page').scrollTop = 800`]],
  ['phone-10-doremimi-nedir', app('#/doremimi-nedir')],
  ['phone-11-kitaplar', app('#/kitaplar')],
  ['phone-12-izle', app('#/izle')],
  ['phone-13-izle-gate', app('#/izle'), [tap('[data-video]')]],
  ['phone-13b-izle-player', app('#/izle'), [tap('[data-video]'), ...'135790'.split('').map(d => tap(`[data-pin="${d}"]`))]],
  ['phone-14-cal', app('#/cal')],
  ['phone-15-cal-scrolled', app('#/cal'), [`document.querySelector('#page').scrollTop = 700`]],
  ['phone-16-sarki-akordeon', app('#/sarki/akordeon')],
  ['phone-17-sarki-akordeon-playing', app('#/sarki/akordeon'), [tap('[data-song="toggle"]')], 3500],
  ['phone-18-sozler-akordeon', app('#/sozler/akordeon')],
  ['phone-19-melodim', app('#/cal'), [tap('#free-keys [data-key="60"]'), tap('#free-keys [data-key="64"]'), tap('#free-keys [data-key="67"]'), `location.hash = '#/melodim'`]],
  ['phone-20-profil', app('#/profil')],
  ['phone-21-kim-oynuyor', app('#/profil'), [tap('[data-do="switcher"]')]],
  ['phone-22-ayarlar', app('#/ayarlar')],
  ['phone-24-gate', app('#/profil'), [tap('[data-do="hesabim"]')]],
  ['phone-25-hesabim', app('#/profil'), [tap('[data-do="hesabim"]'), ...'135790'.split('').map(d => tap(`[data-pin="${d}"]`))], 1500],
  ['phone-26-vakif', app('#/vakif')],
  ['phone-27-dore-ve-mimi', app('#/karakterler')],
  ['phone-30-game-intro', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 0 })], 2500],
  ['phone-31-game-yaz-typed', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 1 }), msg({ type: 'act', name: 'game.type', text: 'sol' })], 4000],
  ['phone-32-game-tiles', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 2 })], 4000],
  ['phone-33-game-solved', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 3 })], 5000],
  ['phone-34-game-choices', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 5 })], 7000],
  ['phone-35-game-reveal', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 6 })], 7000],
  ['phone-36-game-sec', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 8 })], 8000],
  ['phone-37-game-cevir', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 9 }), msg({ type: 'act', name: 'game.next' }), msg({ type: 'act', name: 'game.flip' })], 9000],
  ['phone-38-game-results', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 11 })], 10000],
  ['phone-39-game-results-badges', app('#/', '&embed'), [msg({ type: 'act', name: 'goto', step: 12 })], 11000],
].map(([name, url, steps = [], wait = 1200]) => ({ name, url, steps, wait, w: 430, h: 932 }));
// The Platformlar slide's frames (index.html #frames) are copied from these into assets/screens/, so they show the
// demo's own navigation: the app's c33d9ff captures still had the old four-tab dock.
// v3 (superapp f8c3a52, the milk-white clean-up): one shot per screen in docs/dossier/screens/v2 of the app, at the
// app's 430 x 932, with no fake status bar (?sunum seeds the deck like the embed, without the phone frame), so the two
// can be laid side by side. `node … tools/shoot.mjs <base> docs/screens '^v3/'`.
const sunum = (step, extra = [], wait = 6000) => [app('#/', '&sunum'), [msg({ type: 'act', name: 'goto', step }), ...extra], wait];
const V3 = [
  ['v3/01-kesfet', app('#/')],
  ['v3/02-kesfet-full', app('#/'), [], 1500, 2000],
  // ?gun=+1 and +2 are the next two kinds of Bugünün kartı (02b/02d in the app's set); a tap turns the question over.
  ['v3/02b-home-today-soru', app('#/', '&gun=+1'), [`document.querySelector('.today').scrollIntoView()`]],
  ['v3/02c-home-today-soru-cevap', app('#/', '&gun=+1'), [tap('[data-today]'), `document.querySelector('.today').scrollIntoView()`]],
  ['v3/02d-home-today-isaret', app('#/', '&gun=+2'), [`document.querySelector('.today').scrollIntoView()`]],
  ['v3/10-hub', app('#/doremimi')],
  ['v3/05-izle', app('#/izle')],
  ['v3/06-cal', app('#/cal')],
  ['v3/11-game-intro', ...sunum(0, [], 2500)],
  ['v3/12-game-yaz', ...sunum(1, [], 4000)],
  ['v3/12b-game-yaz-typed', ...sunum(1, [msg({ type: 'act', name: 'game.type', text: 'sol' })], 4000)],
  ['v3/13-game-tiles', ...sunum(2, [], 4500)],
  ['v3/18-game-solved', ...sunum(3, [], 5000)],
  ['v3/14-game-choices', ...sunum(5, [], 7000)],
  ['v3/19-game-reveal', ...sunum(6, [], 7000)],
  ['v3/20-game-results', ...sunum(11, [], 10000)],
].map(([name, url, steps = [], wait = 1200, h = 932]) => ({ name, url, steps, wait, w: 430, h }));
const TABLET = [
  // &embed: the standalone page narrows to a 440 px phone column on a wide screen (style.css .app:not(.embed)), and a
  // tablet runs the app full width with the content column centred, as dossier screen 20-tablet-home.png shows.
  { name: 'tablet-01-kesfet', url: app('#/', '&embed'), steps: [], wait: 1500, w: 1024, h: 1366 },
];

mkdirSync(join(out, 'v3'), { recursive: true });
for (const s of [...DECK, ...PHONE, ...TABLET, ...V3]) {
  if (only && !only.test(s.name)) continue;
  if (!s.cont) await load(s.url, s.w, s.h);
  for (const st of s.steps ?? []) { await evaluate(st); await sleep(250); }
  await sleep(s.wait ?? 1200);
  await shot(s.name);
}

ws.close();
chrome.kill();
if (problems.length) { console.log('PROBLEMS\n  ' + [...new Set(problems)].join('\n  ')); process.exitCode = 1; } else console.log('no console errors');
