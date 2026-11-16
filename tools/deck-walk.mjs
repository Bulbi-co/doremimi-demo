// Walks the whole deck by hand, as a presenter does: → from the cover, one press per rest, to the last slide's last
// step, saving a PNG of every slide and every step so a person (or an agent) can LOOK at each one.
//
//   npm start  (in another terminal)  then  node --experimental-websocket tools/deck-walk.mjs http://127.0.0.1:4175 <dir> [1440x900]
//
// Exit code 0 = every slide and step was reached in order, with no page error, no failed phone step and no watchdog,
// and on no slide does the phone stand on a footer control or on the slide's own words (the closing slide centres the
// phone, and the dots ran under it once the deck had 16 of them and the auto-play control).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SLIDES } from '../deck/slides.js';
import { launch, openDeck, sleep, DECK_STATE, restName } from './cdp.mjs';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const out = process.argv[3] ?? 'docs/screens/deck';
const [width, height] = (process.argv[4] ?? '1440x900').split('x').map(Number);
mkdirSync(out, { recursive: true });
const N = SLIDES.length;
const count = i => `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
let ok = true;
const check = (cond, text) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${text}`); if (!cond) ok = false; };

const c = await launch({ width, height });
try {
  await openDeck(c, `${base}/#1`);
  const idle = async () => { for (let i = 0; i < 600; i++) { const s = await c.ev(DECK_STATE); if (s?.busy === 'false') return s; await sleep(50); } return null; };
  const rests = [], covered = [];
  // What the phone's frame covers, among the things a presenter reads or presses: each visible footer control and
  // each text block of the slide that is up. Rects are on screen, so the stage's scale is already in them.
  const UNDER_PHONE = `(() => { const d = document.querySelector('#device'); if (d.classList.contains('away')) return [];
    const p = d.getBoundingClientRect(), hit = r => r.width > 0 && r.height > 0 && r.left < p.right - 4 && r.right > p.left + 4 && r.top < p.bottom - 4 && r.bottom > p.top + 4;
    const name = el => el.id || el.className || el.tagName;
    return [...document.querySelectorAll('.foot .nav > *, .foot .dots > *, .foot .madeby, .slide.on .col h1, .slide.on .col p, .slide.on .col li, .slide.on .act, .slide.on .closing > *')]
      .filter(el => getComputedStyle(el).display !== 'none' && hit(el.getBoundingClientRect())).map(name); })()`;
  for (let i = 0; i < N; i++) {
    for (let k = 0; k <= (SLIDES[i].acts ?? []).length; k++) {
      const s = await idle();
      if (!s || s.count !== count(i) || s.done !== k) { check(false, `${restName(SLIDES, i, k)}: the deck is on ${s?.count}, ${s?.done} done`); throw new Error('walk left the plan'); }
      await sleep(400);   // the step's last frame: a toast, a banner sliding in
      await c.shot(join(out, `${restName(SLIDES, i, k)}.png`));
      rests.push(restName(SLIDES, i, k));
      const under = await c.ev(UNDER_PHONE);
      if (under?.length) covered.push(`${restName(SLIDES, i, k)}: ${[...new Set(under)].join(', ')}`);
      if (i < N - 1 || k < (SLIDES[i].acts ?? []).length) { await c.key('ArrowRight'); await sleep(120); }
    }
  }
  check(rests.length === SLIDES.reduce((n, s) => n + 1 + (s.acts ?? []).length, 0), `every slide and step was shown and saved (${rests.length} PNGs in ${out})`);
  check(covered.length === 0, `the phone covers no control and no text on any slide${covered.length ? ': ' + covered.slice(0, 4).join(' | ') : ''}`);
  check(c.errors.length === 0, `no page errors${c.errors.length ? ': ' + c.errors.join(' | ') : ''}`);
  check(c.warnings.length === 0, `no failed phone step and no watchdog${c.warnings.length ? ': ' + c.warnings.join(' | ') : ''}`);
} catch (err) { console.log(String(err)); ok = false; } finally { c.close(); }
process.exit(ok ? 0 : 1);
