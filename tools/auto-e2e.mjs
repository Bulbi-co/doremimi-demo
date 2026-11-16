// Auto-play, end to end, in headless Chrome (dossier ch. 14 §11: the deck "walks it unattended, still behind the
// flow lock"). tests/flow.test.mjs proves the machine; this proves the running deck and phone: the visible control
// and the A key start it, anything the presenter does stops it, and left alone it walks every slide and every step,
// in order, to the last slide, with no page error, no phone step that failed and no watchdog (a watchdog means the
// phone missed an answer and the deck moved on without it). On the way it records what the phone really showed:
// every tab, the pages the slides promise, the parent gate, the song, and that it stayed in Turkish.
//
//   npm start  (in another terminal)  then
//   node --experimental-websocket tools/auto-e2e.mjs http://127.0.0.1:4175 [pause-ms | sahne] [shots-dir] [1600x900]
//
// The pause between moves defaults to 300 ms (?bekle=), so the run takes under a minute (44 s for the nine slides,
// 2026-11-16); the lock and every dm-done are waited for exactly as on stage. `sahne` in its place runs the deck as an
// audience sees it, with its own pauses (about three minutes: the walk alone took 175 s), and then each rest is also
// timed against the pause the slides ask for: a slide's reading time, a step's 3.5 s, the song's hold. With a
// shots-dir every rest is saved as a PNG (use `sahne` or a pause of 1500 or more, so a rest lasts long enough to be
// captured). Exit code 0 = every check passed.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SLIDES, asFlow } from '../deck/slides.js';
import { AUTO_STEP, AUTO_SLIDE, AUTO_START } from '../deck/flow.js';
import { TABS } from '../app/lib/nav.js';
import { resolve } from '../app/lib/nav.js';
import { flat } from './phone-routes.mjs';
import { launch, openDeck, sleep, DECK_STATE, restName } from './cdp.mjs';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const stagePace = process.argv[3] === 'sahne';
const pause = stagePace ? null : Number(process.argv[3] ?? 300);
const shots = process.argv[4] ?? null;
const [width, height] = (process.argv[5] ?? '1600x900').split('x').map(Number);
if (shots) mkdirSync(shots, { recursive: true });
const N = SLIDES.length;
const count = i => `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
let ok = true;
const check = (cond, text) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${text}`); if (!cond) ok = false; };

const c = await launch({ width, height });
try {
  const state = () => c.ev(DECK_STATE);
  const idle = async () => { for (let i = 0; i < 600; i++) { const s = await state(); if (s?.busy === 'false') return s; await sleep(50); } return null; };

  // 1. The control and the key; the presenter's input stops it.
  await openDeck(c, `${base}/?bekle=60000#1`);   // a pause far longer than this part, so nothing moves by itself
  check(await c.ev(`(() => { const b = document.querySelector('#auto'); const r = b.getBoundingClientRect(); return !b.disabled && r.width > 40 && r.height > 20 && r.bottom <= innerHeight && r.right <= innerWidth && b.textContent.trim() === 'Otomatik'; })()`), 'the auto-play control is on screen and says Otomatik');
  await c.key('a');
  check((await state()).auto === 'true' && await c.ev(`document.querySelector('#auto').textContent.trim()`) === 'Durdur', 'A switches auto-play on, and the control says Durdur');
  await c.key('a');
  check((await state()).auto === 'false', 'A again switches it off');
  await c.ev(`document.querySelector('#auto').click()`);
  check((await state()).auto === 'true', 'the control switches it on');
  await c.key('ArrowRight');
  let s = await state();
  check(s.auto === 'false' && s.count === count(1), `→ from the presenter switches it off and still moves one slide (${s.count})`);
  await c.ev(`document.querySelector('#auto').click()`);
  await c.key('ArrowRight');   // the lock from the slide change is still held: this press moves nothing
  s = await state();
  check(s.auto === 'false' && s.count === count(1) && s.busy === 'true', 'a press the lock ignores still stops auto-play');
  await idle();
  // While the phone takes letters, A is a letter: during auto-play it must stop the deck and not be typed. No step of
  // the deck reaches a typing stage since the nine-slide cut (2026-11-16: the Oyna slide opens the game and the
  // presenters play it), so this gets there the way they do: Şimdi Oyna by the deck, then on the phone a level and
  // Nasıl oynanır?'s pages, one press each.
  const GAME = SLIDES.findIndex(x => x.id === 'kesfet');
  const OYNA = SLIDES[GAME].acts.findIndex(a => flat(a[1]).some(m => m.name === 'oyna.press'));
  const inGame = sel => `document.querySelector('#phone').contentDocument.querySelector('#game ${sel}')`;
  await c.ev(`document.querySelector('[data-dot="${GAME}"]').click()`); await idle();
  await c.ev(`document.querySelectorAll('.slide.on .act')[${OYNA}].click()`); await idle();
  await c.ev(`${inGame('[data-level="baslangic"]')}.click()`); await sleep(300);
  for (let i = 0; i < 8 && await c.ev(`!!${inGame('[data-g="intro-next"]')}`); i++) { await c.ev(`${inGame('[data-g="intro-next"]')}.click()`); await sleep(300); }
  await sleep(1200);   // the card is dealt and turned before the keyboard takes a letter
  check(await c.ev(`!${inGame('.overlay.intro')} && !!${inGame('[data-kb="erase"]')}`), 'Şimdi Oyna, then a level and the intro by hand: the phone is at a typing stage');
  const before = await c.ev(`document.querySelector('#phone').contentDocument.body.innerText`);
  await c.ev(`document.querySelector('#auto').click()`);
  await c.key('a'); await sleep(300);
  const after = await c.ev(`document.querySelector('#phone').contentDocument.body.innerText`);
  check((await state()).auto === 'false' && before === after, 'at the typing stage, A stops auto-play and is not typed into the answer');
  await c.key('a'); await sleep(300);
  check(await c.ev(`document.querySelector('#phone').contentDocument.body.innerText`) !== before, 'with auto-play off the same key is a letter again (the check above can fail)');

  // 2. Left alone from the cover, it walks the whole deck.
  await openDeck(c, `${base}/${stagePace ? '' : `?bekle=${pause}`}#1`);
  c.errors.length = 0; c.warnings.length = 0;
  // Recorder in the page, sampled every 50 ms: each rest of the deck (slide, steps done), and what the phone showed.
  // `lasted` is how long each rest was held before the deck moved again; `song` what the phone did while a song page
  // was up (its equaliser on, a key lit, the karaoke line showing a syllable as the one being played).
  await c.ev(`(() => { const seen = window.__seen = { rests: [], lasted: [], hashes: [], langs: [], gate: false, song: { on: false, lit: false, sung: false, onAfter: false, eqAtLyrics: null } }; let last = '', since = 0;
    setInterval(() => {
      const d = document.querySelector('#phone').contentDocument, w = document.querySelector('#phone').contentWindow;
      const h = w.location.hash; if (seen.hashes.at(-1) !== h) seen.hashes.push(h);
      const l = d.documentElement.lang; if (seen.langs.at(-1) !== l) seen.langs.push(l);
      if (d.querySelector('.gate')) seen.gate = true;
      if (d.querySelector('#eq.on')) seen.song.on = true;
      if (d.querySelector('#song-keys .lit')) seen.song.lit = true;
      if (d.querySelector('#karaoke .now .on')) seen.song.sung = true;
      if (document.querySelector('#stage').getAttribute('aria-busy') !== 'false') { if (since) { seen.lasted.push(performance.now() - since); since = 0; } return; }
      // Only at rest: for the few milliseconds between the phone's new hash and its hashchange, the old page is still
      // drawn, and a sample taken there read as "playing on another page" (2026-11-16).
      if (d.querySelector('#eq.on') && !h.startsWith('#/sarki/')) seen.song.onAfter = true;
      const r = document.querySelector('#count').textContent + '|' + document.querySelectorAll('.slide.on .act.done').length;
      if (r !== last) { seen.rests.push(r); last = r; since = performance.now(); if (h.startsWith('#/sozler/')) seen.song.eqAtLyrics = d.querySelectorAll('#eq, #song-keys').length; }
    }, 50); })()`);
  const t0 = Date.now();
  await c.ev(`document.querySelector('#auto').click()`);
  let last = '', saved = 0;
  for (;;) {
    s = await state();
    const rest = `${s.count}|${s.done}`;
    if (s.busy === 'false' && rest !== last) {
      last = rest;
      const i = Number(s.count.slice(0, 2)) - 1;
      if (s.done === 0) console.log(`      ${s.count}  ${Math.round((Date.now() - t0) / 1000)} s`);
      // 400 ms: the dots and arrows fade back from their disabled look over 0.3 s (sunum.css), and a shot taken at once caught them dim.
      if (shots) { await sleep(pause == null ? 400 : Math.min(400, pause / 3)); await c.shot(join(shots, `${restName(SLIDES, i, s.done)}.png`)); saved++; }
    }
    if (s.auto === 'false' && s.busy === 'false') break;
    if (Date.now() - t0 > 25 * 60_000) { check(false, 'auto-play finished within 25 minutes'); break; }
    await sleep(shots ? 40 : 150);
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  // The recorder samples every 50 ms: read at once, it had not yet seen the last rest one run in a few, and the walk
  // read as one rest short (2026-11-16).
  await sleep(250);
  const seen = await c.ev('window.__seen');
  const end = await state();
  check(end.count === count(N - 1) && end.busy === 'false' && end.auto === 'false', `it stopped by itself on the last slide (${end.count}, ${secs} s)`);
  check(end.done === end.acts, `the last slide's steps all played (${end.done}/${end.acts})`);
  const want = SLIDES.flatMap((x, i) => Array.from({ length: (x.acts ?? []).length + 1 }, (_, k) => `${count(i)}|${k}`));
  check(JSON.stringify(seen.rests) === JSON.stringify(want), `every slide and every step, in order, none skipped (${seen.rests.length}/${want.length} rests)${JSON.stringify(seen.rests) === JSON.stringify(want) ? '' : ': first difference at ' + want.find((w, i) => seen.rests[i] !== w)}`);
  if (shots) check(saved === want.length, `every rest was saved (${saved} PNGs in ${shots})`);
  const hashes = new Set(seen.hashes.map(h => h.split('?')[0]));
  // A tab is shown by any page of its own: Öğren's slide opens on Aileler, not on the tab's first page, so the tabs
  // are told by what a hash resolves to (app/lib/nav.js), not by the dock's own links.
  const tabs = new Set(seen.hashes.map(h => resolve(h)).filter(r => r.kind === 'root').map(r => r.tab));
  const noTab = TABS.map(t => t.key).filter(k => !tabs.has(k));
  check(noTab.length === 0, `the phone showed every tab (${[...tabs].join(' ')})${noTab.length ? ', missing ' + noTab.join(' ') : ''}`);
  // Written out, so a slide that stops opening one of them fails here; and every hash a slide sends, so a new one
  // that the phone never reached does too. #/calgi/keman and #/hesabim are sent by no slide: a tap and the PIN open them.
  const promised = [...new Set(['#/', '#/doremimi', '#/izle', '#/ogren/aileler', '#/ogren/calgilar', '#/calgi/keman', '#/cal', '#/sarki/keman', '#/sozler/gitar', '#/profil', '#/hesabim',
    ...SLIDES.flatMap(x => [x.phone, ...(x.acts ?? []).map(a => a[1])]).flatMap(flat).filter(m => m.hash).map(m => m.hash.split('?')[0])])];
  const missing = promised.filter(h => !hashes.has(h));
  check(missing.length === 0, `and the ${promised.length} pages the slides promise${missing.length ? ' (missing ' + missing.join(' ') + ')' : ''}`);
  check(seen.gate && hashes.has('#/hesabim'), 'the parent gate came up and Hesabım opened behind it');
  // No slide changes the language since Ayarlar's went (2026-11-16); a phone left in French was what its `leave` was for.
  check(JSON.stringify(seen.langs) === JSON.stringify(['tr']), `the phone stayed in Turkish throughout (${seen.langs.join(' → ')})`);
  // The karaoke line's first syllable comes 4.8 s into the song, so only a run at stage pace stays long enough to see it.
  check(seen.song.on && seen.song.lit && (seen.song.sung || !stagePace), `Keman's song really played: the equaliser ran, a key lit${stagePace ? ', the karaoke line moved' : ''} (${JSON.stringify(seen.song)})`);
  check(!seen.song.onAfter && seen.song.eqAtLyrics === 0, 'and at no rest after it was a song still drawn as playing: the lyric sheet has no song page under it');
  // Each rest against the pause the deck is meant to keep: ?bekle's one number, or on stage the slide's reading
  // time, a step's AUTO_STEP or its own hold (the song). The very first rest is the short beat after switching on.
  const flow = SLIDES.map(asFlow);
  const meant = SLIDES.flatMap((x, i) => Array.from({ length: flow[i].acts.length + 1 }, (_, k) => pause ?? (k === 0 ? (i === 0 ? AUTO_START : Math.max(AUTO_SLIDE, flow[i].read)) : flow[i].holds[k - 1] ?? AUTO_STEP))).slice(0, -1);
  // 50 ms sampling at both ends and the timer's own lateness; a rest is never shorter than asked.
  const off = meant.map((ms, i) => ({ rest: want[i], ms, got: Math.round(seen.lasted[i] ?? -1) })).filter(x => x.got < x.ms - 120 || x.got > x.ms + 600);
  check(seen.lasted.length === meant.length && off.length === 0, `every rest lasted what the deck asks (${meant.length} rests, ${Math.round(meant.reduce((a, b) => a + b, 0) / 1000)} s of pauses)${off.length ? ': ' + off.slice(0, 6).map(x => `${x.rest} ${x.got} ms, not ${x.ms}`).join('; ') : ''}`);
  check(c.errors.length === 0, `no page errors${c.errors.length ? ': ' + c.errors.join(' | ') : ''}`);
  check(c.warnings.length === 0, `no failed phone step and no watchdog${c.warnings.length ? ': ' + c.warnings.join(' | ') : ''}`);
} catch (err) { console.log(String(err?.stack ?? err)); ok = false; } finally { c.close(); }
process.exit(ok ? 0 : 1);
