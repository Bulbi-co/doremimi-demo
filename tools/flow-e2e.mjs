// End-to-end check of the deck's flow lock in real headless Chrome (owner, 2026-11-15: the phone was being "left
// behind" when the presenter pressed on quickly). tests/flow.test.mjs proves the state machine; this proves the deck
// and the phone are wired to it: the presenter mashes → while the phone is playing, and the deck must stay put until
// the phone has finished, then move exactly one step.
//
//   npm start  (in another terminal)  then  node --experimental-websocket tools/flow-e2e.mjs http://127.0.0.1:4175
//
// Exit code 0 = every check passed. No dependencies (Node 22+, or 20 with --experimental-websocket).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SLIDES } from '../deck/slides.js';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9735 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-flow-'))}`,
  '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ok = true;
// The counter as the deck prints it, and the game slide (Oyun: its first step types "sol" and reaches the letter
// tiles), read from the slides the deck runs: the numbers were written in by hand and went stale when ch. 14 added a
// slide.
const N = SLIDES.length, GAME = SLIDES.findIndex(s => s.id === 'oyun');
const count = i => `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
const check = (cond, text) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${text}`); if (!cond) ok = false; };

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
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${base}/#1` });

  const state = () => ev(`({ count: document.querySelector('#count').textContent, busy: document.querySelector('#stage').getAttribute('aria-busy') ?? 'false',   // a deck without the lock reads as always idle
    done: [...document.querySelectorAll('.slide.on .act.done')].length, playing: [...document.querySelectorAll('.slide.on .act.playing')].length,
    nextDisabled: document.querySelector('#next').disabled })`);
  const idle = async (limit = 30000) => { const t = Date.now(); while (Date.now() - t < limit) { const s = await state(); if (s?.busy === 'false') return Date.now() - t; await sleep(50); } return -1; };
  const key = k => ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true }))`);
  const mash = async (n, k = 'ArrowRight') => { for (let i = 0; i < n; i++) { await key(k); await sleep(30); } };

  // Wait for the deck's script and the phone page before reading the lock: until sunum.js runs there is no
  // aria-busy, which reads as idle (the old deck, used as this check's CONTROL, never has one).
  for (let i = 0; i < 300 && !(await ev(`!!document.querySelector('.slide') && document.querySelector('#phone').contentDocument?.readyState === 'complete'`)); i++) await sleep(100);
  await sleep(500);
  check(await idle() >= 0, 'the deck opens and unlocks once the phone is ready');
  check((await state()).count === count(0), 'it opens on slide 1');

  // A slide change: mash → ten times; only one slide may pass.
  const tSlide = Date.now();
  await mash(10);
  let s = await state();
  check(s.count === count(1), `ten → presses move one slide (on ${s.count})`);
  check(s.busy === 'true' && s.nextDisabled, 'the deck shows it is waiting and → is disabled');
  await idle();
  const slideLock = Date.now() - tSlide;
  check(slideLock >= 900, `the slide change held the lock at least as long as the device moves (${slideLock} ms from the first press)`);

  // To the game slide by its dot; the slides before it have steps of their own, which → would play first.
  await ev(`document.querySelector('[data-dot="${GAME}"]').click()`); await idle();
  check((await state()).count === count(GAME), 'walked to the game slide');

  // A game step: the phone types "sol" and sends; mash → throughout.
  const t0 = Date.now();
  await key('ArrowRight');
  await sleep(100);
  s = await state();
  check(s.playing === 1 && s.busy === 'true', 'the step button shows it is playing');
  await mash(15);
  s = await state();
  check(s.count === count(GAME) && s.done === 0, `mashing during the step neither skips it nor leaves the slide (${s.count}, ${s.done} done)`);
  await idle();
  const stepMs = Date.now() - t0;
  s = await state();
  check(s.count === count(GAME) && s.done === 1, `after the phone finishes, exactly one step is done (${s.done})`);
  // The phone really finished what it was showing: the typed attempt was sent and the game moved to the tiles.
  const phoneStage = await ev(`(() => { const d = document.querySelector('#phone').contentDocument; return { tiles: !!d.querySelector('[data-tile], .tiles'), keys: d.querySelectorAll('.key, [data-key]').length }; })()`);
  check(phoneStage?.tiles, 'the phone reached the letter tiles before the deck unlocked');
  check(stepMs >= 1500, `the step kept the deck locked while the phone typed (${stepMs} ms)`);

  // ← undoes the step, also under the lock.
  // The undo replays fast, so pressing ← "until it unlocks" races it: the last press can land just after the lock
  // lifts, and that one is a real press. So: the slide must never change while the deck says busy, and at most one
  // slide may pass in total.
  await key('ArrowLeft');
  let presses = 0, movedWhileBusy = false;
  for (;;) { const st = await state(); if (st.busy !== 'true') break; if (st.count !== count(GAME)) movedWhileBusy = true; await key('ArrowLeft'); presses++; await sleep(30); }
  await idle();
  s = await state();
  check(!movedWhileBusy && [count(GAME), count(GAME - 1)].includes(s.count), `← pressed ${presses} times during the undo: no move while busy, at most one after (${s.count})`);
  if (s.count === count(GAME - 1)) { await ev(`document.querySelector('[data-dot="${GAME}"]').click()`); await idle(); }
  check((await state()).done === 0, 'the undo leaves no step done');

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  ws.close();
} finally {
  chrome.kill();
}
process.exit(ok ? 0 : 1);
