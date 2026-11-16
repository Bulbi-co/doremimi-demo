// Dossier ch. 14 in the running phone, headless Chrome: the rules tests/ch14.test.mjs checks in the modules, checked
// here where the child meets them. The first game asks the level and keeps it; Ayarlar changes it; each way in opens
// the round the way ch. 14 says; the Hazırlan sheet's count is the round's; no level name is on screen anywhere in
// the deck's scripted story; the hub leads everywhere once.
//
//   PORT=4177 node tools/serve.mjs  (in another terminal)  then  node --experimental-websocket tools/ch14-e2e.mjs http://127.0.0.1:4177
//
// Exit code 0 = every check passed.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCRIPT } from '../app/data/script.js';

const base = (process.argv[2] ?? 'http://127.0.0.1:4177').replace(/\/$/, '');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9935 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-ch14-'))}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let ok = true;
const check = (cond, text) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${text}`); if (!cond) ok = false; };
// The same words tests/ch14.test.mjs bans, as level names: capitalised or in capitals, alone.
const LEVEL_WORD = /(?<!\p{L})(Çevir|Seç|Yaz|ÇEVİR|SEÇ|YAZ|Yazma|Seçme|Çevirme)(?!\p{L})/u;

try {
  let ver = null;
  for (let i = 0; i < 150 && !ver; i++) { await sleep(200); try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* starting */ } }
  if (!ver) throw new Error('headless Chrome did not start');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  };
  await new Promise(r => (ws.onopen = r));
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r?.exceptionDetails) errors.push(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r?.result?.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: false });
  const open = async (hash, extra = '') => { await send('Page.navigate', { url: 'about:blank' }); await sleep(100); await send('Page.navigate', { url: `${base}/app/?still&reset${extra}${hash}` }); for (let i = 0; i < 100 && !(await ev(`!!document.querySelector('#page .page-in')`)); i++) await sleep(100); await sleep(300); };
  const tap = async sel => { const hit = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`); await sleep(250); return hit; };
  const saved = () => ev(`JSON.parse(localStorage.getItem('doremimi-demo-v1') || 'null')?.profile ?? null`);
  const text = sel => ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e => e.innerText).join(' \\n ')`);

  // The first game asks the level, whatever the way in, and keeps the answer.
  await open('#/');
  check(await tap('[data-do="play"][data-origin="kesfet"]'), 'Keşfet has the OYNA circle');
  check(await ev(`document.querySelectorAll('[data-level]').length`) === 3 && /Hangi seviyeden başlayalım\?/.test(await text('#gover')), 'the first game opens on the level question, three choices');
  check(!(await ev(`!!document.querySelector('[data-g="intro-close"]')`)), 'it cannot be closed before a level is chosen');
  await tap('[data-level="orta"]');
  check((await saved())?.difficulty === 'orta', 'the chosen level is saved in the profile');
  check(/Kartı gör/.test(await text('#gover')), 'then the intro, without the level page');
  await open('#/ayarlar');
  await tap('[data-zorluk="ileri"]');
  check((await saved())?.difficulty === 'ileri' && await ev(`document.querySelector('[data-zorluk="ileri"]').classList.contains('on')`), 'Ayarlar › Zorluk changes it');
  await open('#/cal');   // a fresh child again (?reset): an Öğren way in asks it too
  await open('#/ogren/aileler');
  await tap('[data-prep="family:TelliCalgilar"]');
  await tap('[data-do="prep-start"]');
  check(await ev(`document.querySelectorAll('[data-level]').length`) === 3, 'an Öğren way in asks the level on the first game too');

  // Each way in plays as ch. 14 says. A child with a level, so no level page: set it, then reload without ?reset.
  const withLevel = async hash => { await open('#/'); await ev(`localStorage.setItem('doremimi-demo-v1', JSON.stringify({ profile: { difficulty: 'baslangic', seenIntro: true } }))`); await send('Page.navigate', { url: `${base}/app/?still${hash}` }); await sleep(1500); };
  await withLevel('#/ogren/aileler');
  for (const fam of ['TelliCalgilar', 'YayliCalgilar', 'VurmaliCalgilar', 'TusluCalgilar', 'NefesliUflemeliCalgilar']) {
    await ev(`location.hash = '#/ogren/aileler'`); await sleep(400);
    await tap(`[data-prep="family:${fam}"]`);
    const n = await ev(`+document.querySelector('.pcount')?.dataset.count`);
    const said = await text('.pcount');
    await tap('[data-do="prep-start"]');
    const head = await text('#ghead');
    check(said === `Bu kategoride ${n} kart var` && head.includes(`Kart 1 / ${n}`), `${fam}: the sheet says ${n} kart and the round has ${n} (${head.replace(/\s+/g, ' ').trim()})`);
    check(!!(await ev(`document.querySelector('[data-g="flip"]')`)), `${fam}: Öğren's round turns the card over`);
    await tap('[data-g="exit"]');
  }
  await ev(`location.hash = '#/sarki/keman'`); await sleep(900);
  await tap('[data-play][data-origin="cal"]');
  check(await ev(`document.querySelectorAll('[data-choice]').length`) === 4, 'Çal › a song: the round opens at the four choices');
  await tap('[data-g="exit"]');
  await ev(`location.hash = '#/calgi/keman'`); await sleep(600);
  await tap('[data-play][data-origin="cal"]');
  check(await ev(`document.querySelectorAll('[data-choice]').length`) === 4, 'an instrument’s page: the choices too');
  await tap('[data-g="exit"]');
  await ev(`location.hash = '#/'`); await sleep(600);
  await tap('[data-play="family:TelliCalgilar"][data-origin="kesfet"]');
  check(!!(await ev(`document.querySelector('#sheet .field')`)) || (await ev(`document.querySelectorAll('[data-choice]').length`)) === 4, 'a Keşfet category: the round starts at the top (typing, or the choices for a long answer)');

  // The deck's whole story, step by step: no level name on the phone at any point.
  await send('Page.navigate', { url: `${base}/app/?still&reset&embed#/` }); await sleep(1500);
  for (let step = 0; step < SCRIPT.length; step++) {
    await ev(`window.postMessage({ type: 'act', name: 'goto', step: ${step}, play: true }, '*')`);
    await sleep(step >= 9 ? 9000 : 4000);
    const seen = await text('#game:not([hidden]), .overlay-host, #page');
    const hit = seen.match(LEVEL_WORD);
    check(!hit, `script step ${step}: no level name on screen${hit ? ` ("${hit[0]}")` : ''}`);
    if (await ev(`!document.querySelector('#game').hidden`)) check(!(await ev(`!!document.querySelector('#game .ladder, #game .ladder-line')`)), `script step ${step}: no ladder strip`);
  }
  check(/Doğru/.test(await text('#gover')) && !/Seviye/.test(await text('#results .stats3')), 'the results count right answers, not a level');

  // The hub: every destination once.
  await open('#/doremimi');
  const dest = await ev(`[...document.querySelectorAll('#page [data-push], #page [data-go], #page [data-ext]')].map(e => e.dataset.push ?? e.dataset.go ?? e.dataset.ext)`);
  check(dest.length >= 18 && new Set(dest).size === dest.length, `the hub's ${dest.length} destinations are all different`);

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
} catch (e) {
  check(false, e.message);
} finally {
  chrome.kill();
  process.exit(ok ? 0 : 1);
}
