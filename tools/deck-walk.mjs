// Walks the whole deck by hand, as a presenter does: → from the cover, one press per rest, to the last slide's last
// step, saving a PNG of every slide and every step so a person (or an agent) can LOOK at each one.
//
//   npm start  (in another terminal)  then  node --experimental-websocket tools/deck-walk.mjs http://127.0.0.1:4175 <dir> [1440x900]
//
// Exit code 0 = every slide and step was reached in order, with no page error, no failed phone step and no watchdog.
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
  const rests = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k <= (SLIDES[i].acts ?? []).length; k++) {
      const s = await idle();
      if (!s || s.count !== count(i) || s.done !== k) { check(false, `${restName(SLIDES, i, k)}: the deck is on ${s?.count}, ${s?.done} done`); throw new Error('walk left the plan'); }
      await sleep(400);   // the step's last frame: a toast, a banner sliding in
      await c.shot(join(out, `${restName(SLIDES, i, k)}.png`));
      rests.push(restName(SLIDES, i, k));
      if (i < N - 1 || k < (SLIDES[i].acts ?? []).length) { await c.key('ArrowRight'); await sleep(120); }
    }
  }
  check(rests.length === SLIDES.reduce((n, s) => n + 1 + (s.acts ?? []).length, 0), `every slide and step was shown and saved (${rests.length} PNGs in ${out})`);
  check(c.errors.length === 0, `no page errors${c.errors.length ? ': ' + c.errors.join(' | ') : ''}`);
  check(c.warnings.length === 0, `no failed phone step and no watchdog${c.warnings.length ? ': ' + c.warnings.join(' | ') : ''}`);
} catch (err) { console.log(String(err)); ok = false; } finally { c.close(); }
process.exit(ok ? 0 : 1);
