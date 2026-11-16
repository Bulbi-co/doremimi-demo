// End-to-end check of the deck's flow lock in real headless Chrome (owner, 2026-11-15: the phone was being "left
// behind" when the presenter pressed on quickly). tests/flow.test.mjs proves the state machine; this proves the deck
// and the phone are wired to it: the presenter mashes → while the phone is playing, and the deck must stay put until
// the phone has finished, then move exactly one step. It also holds what the nine-slide deck promises on stage (owner,
// 2026-11-16): ← and R land on a step's own screen whatever was tapped on the phone in between, and the Oyna slide
// opens the game and plays nothing of the round.
//
//   npm start  (in another terminal)  then  node --experimental-websocket tools/flow-e2e.mjs http://127.0.0.1:4175
//
// Exit code 0 = every check passed. No dependencies (Node 22+, or 20 with --experimental-websocket).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SLIDES } from '../deck/slides.js';
import { flat } from './phone-routes.mjs';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9735 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-flow-'))}`,
  '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ok = true;
// The counter as the deck prints it and the slides this walks, read from the slides the deck runs: the numbers were
// written in by hand and went stale when ch. 14 added a slide. AILE carries the longest step the deck has left since
// the nine-slide cut (2026-11-16) took the played round off the Oyna slide: "Ebeveyn PIN'i" opens Profilim, presses
// Hesabım and types six digits on the gate, about five seconds of the phone acting by itself.
const N = SLIDES.length, at = id => SLIDES.findIndex(s => s.id === id);
const AILE = at('aile'), OGREN = at('ogren'), GAME = at('kesfet');
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

  // What the phone is showing, read from the phone itself: its page, and which layer is over it.
  const phoneAt = () => ev(`(() => { const d = document.querySelector('#phone').contentDocument; return document.querySelector('#phone').contentWindow.location.hash + (d.querySelector('.gate') ? ' gate' : '') + (d.querySelector('.who-ov') ? ' switcher' : '') + (d.querySelector('#game').hidden ? '' : ' game'); })()`);
  const press = async k => { await key(k); await sleep(100); await idle(); };
  const dot = async i => { await ev(`document.querySelector('[data-dot="${i}"]').click()`); await idle(); };
  // A tap on the phone's dock, as a presenter wandering off the slide's own screen would.
  const wander = async hash => { await ev(`document.querySelector('#phone').contentDocument.querySelector('#dock [data-go="${hash}"]').click()`); await sleep(400); };

  // To the Aile slide by its dot; the slides before it have steps of their own, which → would play first.
  await dot(AILE);
  check((await state()).count === count(AILE) && await phoneAt() === '#/profil', `walked to the Aile slide (${await phoneAt()})`);

  // The steps before the PIN each play under their own lock. Counted from the slides: the number was written in by
  // hand and went stale when a step was added.
  const BEFORE = SLIDES[AILE].acts.findIndex(a => flat(a[1]).some(m => m.name === 'gate.type'));
  for (let i = 0; i < BEFORE; i++) await press('ArrowRight');
  check(BEFORE > 0 && (await state()).done === BEFORE, `the ${BEFORE} step${BEFORE === 1 ? '' : 's'} before the PIN played and finished`);
  // The PIN step: the phone opens Profilim, presses Hesabım and types six digits; mash → throughout.
  const t0 = Date.now();
  await key('ArrowRight');
  await sleep(100);
  s = await state();
  check(s.playing === 1 && s.busy === 'true', 'the step button shows it is playing');
  await mash(15);
  s = await state();
  check(s.count === count(AILE) && s.done === BEFORE && s.busy === 'true', `mashing during the step neither skips it nor leaves the slide (${s.count}, ${s.done} done)`);
  await idle();
  const stepMs = Date.now() - t0;
  s = await state();
  check(s.count === count(AILE) && s.done === BEFORE + 1, `after the phone finishes, exactly one more step is done (${s.done})`);
  // The phone really finished what it was showing: the sixth digit was typed, the gate closed and Hesabım opened.
  check(await phoneAt() === '#/hesabim', `the phone was through the gate and on Hesabım before the deck unlocked (${await phoneAt()})`);
  // 1800 ms: the step's batch waits 0.9 s before each of its two presses (app/app.js run), before a digit is typed.
  // A deck that did not wait for the phone would unlock after its own 350 ms beat.
  check(stepMs >= 1800, `the step kept the deck locked while the phone typed (${stepMs} ms)`);

  // ← undoes the step, also under the lock.
  // Every further ← is pressed inside the page, in the same task that reads the lock, and only while it is held. Read
  // from here and then pressed, the last press could land just after the lock lifted: a real press, which undid a
  // second step, and the check failed one run in a few (2026-11-16) on a deck that was doing the right thing.
  await key('ArrowLeft');
  const pressIfBusy = () => ev(`(() => { if (document.querySelector('#stage').getAttribute('aria-busy') !== 'true') return false; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); return true; })()`);
  let presses = 0;
  while (await pressIfBusy()) { presses++; await sleep(30); }
  s = await state();
  check(presses >= 3 && s.count === count(AILE) && s.done === BEFORE, `← pressed ${presses} more times while the undo played: it took back the PIN step only (${s.count}, ${s.done} done)`);
  check(await phoneAt() === '#/profil switcher', `and the phone is back where the step before left it, Kim oynuyor? over Profilim (${await phoneAt()})`);
  await press('r');
  check(await phoneAt() === '#/profil' && (await state()).done === 0, `R puts the slide back as it opened (${await phoneAt()})`);

  // Every step is a whole state (deck/slides.js): it goes to its screen, then presses. So ← lands on the step
  // before and R on the slide's opening screen, whatever the presenter tapped on the phone in between.
  await dot(OGREN);
  check(await phoneAt() === '#/ogren/aileler', `the Öğren slide opens on Aileler (${await phoneAt()})`);
  await press('ArrowRight'); await press('ArrowRight');
  check(await phoneAt() === '#/calgi/keman' && (await state()).done === 2, `two steps on, the phone is on Keman's page (${await phoneAt()})`);
  await wander('#/cal');
  check(await phoneAt() === '#/cal', 'a tap on the dock took the phone to Çal, off the slide');
  await press('ArrowLeft');
  check(await phoneAt() === '#/ogren/calgilar?aile=yayli' && (await state()).done === 1, `← from there lands on the first step's screen, Yaylı Çalgılar (${await phoneAt()})`);
  await wander('#/izle');
  await press('r');
  check(await phoneAt() === '#/ogren/aileler' && (await state()).done === 0, `R from İzle puts the slide back as it opened (${await phoneAt()})`);

  // The Oyna slide opens the game and stops (owner, 2026-11-16: the presenters play it by hand). The deck opened on
  // slide 1, which makes the child a fresh one, so what Şimdi Oyna opens is the level question; the deck must leave it
  // unanswered, and the slide after it must not open with the game still up.
  await dot(GAME);
  for (let i = 0; i < SLIDES[GAME].acts.length; i++) await press('ArrowRight');
  await sleep(1500);   // long enough for a press the deck should not make to have shown
  const levels = await ev(`document.querySelector('#phone').contentDocument.querySelectorAll('#game [data-level]').length`);
  s = await state();
  check(s.count === count(GAME) && s.done === SLIDES[GAME].acts.length && await phoneAt() === '#/ game' && levels === 3, `Şimdi Oyna opened the game and the deck played nothing after it: the level question is still up (${await phoneAt()}, ${levels} levels)`);
  await press('ArrowRight');
  check((await state()).count === count(GAME + 1) && !(await phoneAt()).includes('game'), `→ leaves for the next slide and the game is closed (${(await state()).count}, ${await phoneAt()})`);

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  ws.close();
} finally {
  chrome.kill();
}
process.exit(ok ? 0 : 1);
