// Guards for the deck's flow lock (owner, 2026-11-15): the presenter must not get past a slide or a step while the
// phone is still playing it. They drive the real machine (deck/flow.js), the one sunum.js runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initial, step, SLIDE_DWELL, STEP_DWELL, WATCHDOG, AUTO_STEP, AUTO_SLIDE, AUTO_START, MANUAL } from '../deck/flow.js';
import { SLIDES as DECK, readMs } from '../deck/slides.js';

const SLIDES = [
  { phone: { type: 'reset' } },
  { phone: { type: 'go', hash: '#/' }, acts: [{ type: 'act', name: 'a' }, { type: 'act', name: 'b' }] },
  { phone: null },
];

/** Runs events through the machine; returns the last state and every effect in order. */
function run(events, s = initial(SLIDES)) {
  const effects = [];
  for (const e of events) { const r = step(s, e); s = r.state; effects.push(...r.effects); }
  return { s, effects };
}
const sent = effects => effects.filter(e => e.type === 'send').map(e => e.msg);
const timerOf = (effects, kind = 'timer') => effects.filter(e => e.type === kind).at(-1);

/** From loading: show slide 0, phone ready, phone done, dwell over → idle on slide 0. */
function idleOn0() {
  let { s, effects } = run([{ type: 'goto', slide: 0 }, { type: 'ready' }]);
  const id = sent(effects)[0].id, t = timerOf(effects).token;
  ({ s } = run([{ type: 'done', id }, { type: 'dwell', token: t }], s));
  return s;
}

test('before the phone is ready, a slide shows but its message is held, and input is ignored', () => {
  const { s, effects } = run([{ type: 'goto', slide: 0 }, { type: 'next' }, { type: 'goto', slide: 2 }]);
  assert.equal(s.phase, 'loading');
  assert.equal(s.cur, 0);
  assert.deepEqual(sent(effects), []);
});

test('the held message is sent with an id when the phone is ready, under the lock', () => {
  const { s, effects } = run([{ type: 'goto', slide: 0 }, { type: 'ready' }]);
  assert.equal(s.phase, 'busy');
  assert.deepEqual(sent(effects), [{ type: 'reset', id: 1 }]);
});

test('→ while the phone is playing does nothing: no step is skipped, no slide is passed', () => {
  let s = idleOn0();
  let r = run([{ type: 'next' }], s);                    // to slide 1
  assert.equal(r.s.cur, 1);
  assert.equal(r.s.phase, 'busy');
  const before = r.s;
  r = run([{ type: 'next' }, { type: 'next' }, { type: 'prev' }, { type: 'act', k: 1 }, { type: 'goto', slide: 2 }, { type: 'reset' }], before);
  assert.equal(r.s, before, 'every input while busy leaves the state untouched');
  assert.deepEqual(r.effects, []);
});

test('the lock lifts only when BOTH the phone has answered and the dwell is over, in either order', () => {
  const s = idleOn0();
  const { s: b, effects } = run([{ type: 'next' }], s);
  const id = sent(effects)[0].id, token = timerOf(effects).token;
  assert.equal(run([{ type: 'done', id }], b).s.phase, 'busy', 'phone done, dwell running');
  assert.equal(run([{ type: 'dwell', token }], b).s.phase, 'busy', 'dwell over, phone still playing');
  assert.equal(run([{ type: 'done', id }, { type: 'dwell', token }], b).s.phase, 'idle');
  assert.equal(run([{ type: 'dwell', token }, { type: 'done', id }], b).s.phase, 'idle');
});

test('a late or foreign dm-done does not unlock a newer step', () => {
  const s = idleOn0();
  const { s: b, effects } = run([{ type: 'next' }], s);
  const { id } = sent(effects)[0], { token } = timerOf(effects);
  const r = run([{ type: 'dwell', token }, { type: 'done', id: id - 1 }, { type: 'done', id: 999 }], b);
  assert.equal(r.s.phase, 'busy');
  assert.equal(run([{ type: 'dwell', token: token - 1 }], b).s.waitDwell, true, 'an old timer does not end the new dwell');
});

test('→ plays the slide\'s steps in order, each under its own lock, before moving to the next slide', () => {
  let s = idleOn0();
  const trace = [];
  const advance = () => {
    const r = run([{ type: 'next' }], s); trace.push(...sent(r.effects).map(m => m.name ?? m.type));
    const msg = sent(r.effects)[0], t = timerOf(r.effects);
    s = run([...(msg ? [{ type: 'done', id: msg.id }] : []), { type: 'dwell', token: t.token }], r.s).s;
  };
  advance(); advance(); advance(); advance();
  assert.deepEqual(trace, ['go', 'a', 'b'], 'slide 1 opens, then its two steps; slide 2 has no phone message');
  assert.equal(s.cur, 2);
  assert.equal(s.phase, 'idle');
});

test('dwell lengths: a slide change waits for the device transition, a step for a short beat', () => {
  const s = idleOn0();
  const r1 = run([{ type: 'next' }], s);
  assert.equal(timerOf(r1.effects).ms, SLIDE_DWELL);
  assert.ok(SLIDE_DWELL >= 900, 'the .device transition in sunum.css is 0.9 s');
  const s1 = run([{ type: 'done', id: sent(r1.effects)[0].id }, { type: 'dwell', token: timerOf(r1.effects).token }], r1.s).s;
  const r2 = run([{ type: 'next' }], s1);
  assert.equal(timerOf(r2.effects).ms, STEP_DWELL);
});

test('a slide with no phone message still locks for its transition', () => {
  let s = idleOn0();
  const r = run([{ type: 'goto', slide: 2 }], s);
  assert.equal(r.s.phase, 'busy');
  assert.deepEqual(sent(r.effects), []);
  assert.equal(run([{ type: 'dwell', token: timerOf(r.effects).token }], r.s).s.phase, 'idle');
});

test('the watchdog frees a deck whose phone never answers, and only for the current lock', () => {
  const s = idleOn0();
  const r = run([{ type: 'next' }], s);
  const w = timerOf(r.effects, 'watchdog');
  assert.equal(w.ms, WATCHDOG);
  assert.equal(run([{ type: 'watchdog', token: w.token - 1 }], r.s).s.phase, 'busy');
  assert.equal(run([{ type: 'watchdog', token: w.token }], r.s).s.phase, 'idle');
});

test('← undoes one step by resending the state before it, without playing, under the lock', () => {
  let s = idleOn0();
  const go = e => { const r = run([e], s); const m = sent(r.effects)[0]; s = run([...(m ? [{ type: 'done', id: m.id }] : []), { type: 'dwell', token: timerOf(r.effects).token }], r.s).s; return m; };
  go({ type: 'next' }); go({ type: 'next' }); go({ type: 'next' });   // slide 1, steps a and b played
  assert.equal(s.sub, 2);
  const back = go({ type: 'prev' });
  assert.equal(s.sub, 1);
  assert.equal(back.name, 'a');
  assert.equal(back.play, false);
});

test('the deck routes every input through the machine, and the phone answers dm-done after each message', () => {
  const deck = readFileSync(new URL('../sunum.js', import.meta.url), 'utf8');
  // No direct path around the lock: the old next()/prev()/show() that sent to the phone themselves are gone, the
  // machine is really imported (not a commented-out line), and the only deck→phone posts are the machine's `send`
  // effect plus the two that are not steps (typed letters, Sesi aç).
  assert.doesNotMatch(deck, /function (next|prev|show)\(/);
  assert.match(deck, /^import \{ initial, step as flowStep \} from '\.\/deck\/flow\.js';$/m);
  assert.match(deck, /if \(m\.type === 'dm-done'\) dispatch\(\{ type: 'done', id: m\.id \}\)/);
  const posts = [...deck.matchAll(/phone\.contentWindow\.postMessage\((.+?), '\*'\)/g)].map(m => m[1]);
  assert.deepEqual(posts.sort(), ["fx.msg", "{ type: 'key', key: e.key }", "{ type: 'sound' }"].sort());
  // The phone answers every message that carries an id, after it has run (receive's queue), not only in a helper.
  const phone = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  const receive = phone.slice(phone.indexOf('function receive(m)'), phone.indexOf('async function done(id)'));
  assert.match(receive, /queue = queue\.then\(\(\) => run\(m\)\)[\s\S]*\.then\(\(\) => \(m\.id != null \? done\(m\.id\) : null\)\)/);
  assert.match(phone, /parent\.postMessage\(\{ type: 'dm-done', id \}, '\*'\)/);
});

// ───────────────────────── auto-play (ch. 14 §11): the deck walks itself, through the same lock

/** Plays the deck as sunum.js does with a phone that answers every message at once: each timer fires in turn. */
function autoWalk(slides, { limit = 2000, onIdle = null } = {}) {
  let s = initial(slides), trace = [], pauses = [];
  const timers = [];
  const feed = effects => { for (const fx of effects) {
    if (fx.type === 'send') { trace.push({ cur: s.cur, msg: fx.msg }); if (fx.msg.id != null) timers.push({ type: 'done', id: fx.msg.id }); }
    if (fx.type === 'timer') timers.push({ type: 'dwell', token: fx.token });
    if (fx.type === 'autotimer') { pauses.push({ cur: s.cur, sub: s.sub, ms: fx.ms }); timers.push({ type: 'autotick', token: fx.token }); }
  } };
  const go = e => { const r = step(s, e); s = r.state; feed(r.effects); };
  go({ type: 'goto', slide: 0 }); go({ type: 'ready' }); go({ type: 'auto' });
  for (let n = 0; timers.length && n < limit; n++) { go(timers.shift()); if (onIdle && s.phase === 'idle') onIdle(s, go); }
  return { s, trace, pauses };
}

test('auto-play presses → by itself: every step and every slide, in order, then it stops on the last one', () => {
  const { s, trace } = autoWalk(SLIDES);
  assert.deepEqual(trace.map(t => t.msg.name ?? t.msg.type), ['reset', 'go', 'a', 'b'], 'the same messages, in the same order, as → would send');
  assert.equal(s.cur, SLIDES.length - 1);
  assert.equal(s.auto, false, 'it switched itself off at the end');
  assert.equal(s.armed, false);
});

test('auto-play walks the real deck end to end: every phone message the slides hold, once, in order', () => {
  const slides = DECK.map(x => ({ phone: x.phone ?? null, acts: (x.acts ?? []).map(a => a[1]), read: readMs(x) }));
  const { s, trace, pauses } = autoWalk(slides);
  const expected = DECK.flatMap(x => [...(x.phone ? [x.phone] : []), ...(x.acts ?? []).map(a => a[1])]);
  assert.deepEqual(trace.map(({ msg: { id, ...m } }) => m), expected);
  assert.equal(s.cur, DECK.length - 1);
  assert.equal(s.auto, false);
  // Readable: a fresh slide stays for its reading time, a step for AUTO_STEP (A was pressed while the cover came in,
  // so even the first pause is the cover's reading time).
  for (const p of pauses) assert.equal(p.ms, p.sub === 0 ? Math.max(AUTO_SLIDE, readMs(DECK[p.cur])) : AUTO_STEP, `slide ${p.cur + 1}, after step ${p.sub}`);
  assert.ok(AUTO_STEP >= 3000 && AUTO_SLIDE >= 4000, 'long enough to see what the phone did and read the slide');
});

test('an auto tick cannot move a busy deck: it fires only at rest, and a stale one is ignored', () => {
  let s = idleOn0();
  let r = step(s, { type: 'auto' }); s = r.state;
  const t1 = r.effects.find(e => e.type === 'autotimer');
  assert.ok(t1, 'switching on at rest arms a tick');
  assert.equal(t1.ms, AUTO_START, 'a short one: the presenter has already been looking at this slide');
  r = step(s, { type: 'autotick', token: t1.token }); s = r.state;          // → slide 1, busy
  assert.equal(s.cur, 1); assert.equal(s.phase, 'busy');
  const before = s;
  r = step(s, { type: 'autotick', token: t1.token });
  assert.equal(r.state, before, 'the old tick again, while busy: nothing');
  r = step(s, { type: 'autotick', token: s.autoToken });
  assert.equal(r.state.cur, 1, 'even the current token does nothing while the phone plays');
  assert.equal(r.state.sub, 0);
  // At rest again, a new tick is armed; the one before it no longer counts.
  const id = sent([{ type: 'send', msg: { id: s.pending } }])[0].id;
  r = run([{ type: 'done', id }, { type: 'dwell', token: s.token }], s);
  const t2 = timerOf(r.effects, 'autotimer');
  assert.ok(t2 && t2.token !== t1.token);
  assert.equal(step(r.s, { type: 'autotick', token: t1.token }).state, r.s);
  assert.equal(step(r.s, { type: 'autotick', token: t2.token }).state.sub, 1, 'the armed tick plays the next step');
});

test('any input from the presenter stops auto-play, even one the lock ignores', () => {
  for (const type of MANUAL) {
    let s = idleOn0();
    s = step(s, { type: 'auto' }).state;
    const busy = step(s, { type: 'autotick', token: s.autoToken }).state;   // playing slide 1
    const e = type === 'goto' ? { type, slide: 2 } : type === 'act' ? { type, k: 0 } : { type };
    for (const from of [s, busy]) {
      const r = step(from, e);
      assert.equal(r.state.auto, false, `${type} while ${from.phase}`);
      assert.equal(r.state.armed, false);
      assert.ok(!r.effects.some(x => x.type === 'autotimer'), `${type} arms nothing`);
    }
  }
});

test('the A key and the control toggle it; switching on at the very end does nothing', () => {
  let s = idleOn0();
  s = step(s, { type: 'auto' }).state; assert.equal(s.auto, true);
  s = step(s, { type: 'auto' }).state; assert.equal(s.auto, false);
  assert.equal(step(s, { type: 'autotick', token: s.autoToken }).state.cur, 0, 'a tick armed before it was switched off does nothing');
  const { s: end } = autoWalk(SLIDES);
  const r = step(end, { type: 'auto' });
  assert.equal(r.state.auto, false);
  assert.ok(!r.effects.some(x => x.type === 'autotimer'));
});

test('sunum.js drives auto-play only through the machine: the control, A and the timer all dispatch', () => {
  const deck = readFileSync(new URL('../sunum.js', import.meta.url), 'utf8');
  assert.match(deck, /\$\('#auto'\)\.onclick = \(\) => dispatch\(\{ type: 'auto' \}\)/);
  assert.match(deck, /if \(k === 'a' \|\| k === 'A'\) dispatch\(\{ type: 'auto' \}\)/);
  assert.match(deck, /fx\.type === 'autotimer'\) setTimeout\(\(\) => dispatch\(\{ type: 'autotick', token: fx\.token \}\), fx\.ms\)/);
  // No loop of its own that clicks → or sends to the phone.
  assert.doesNotMatch(deck, /setInterval|\.click\(\)/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<button class="auto-btn" id="auto"[^>]*>/, 'a visible control');
});

test('the deck has no "Uygulamayı aç" link: a presentation, not an app showcase (owner, 2026-11-15)', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /Uygulamayı aç/);
  assert.doesNotMatch(html, /<a[^>]+href="app\/"/);
});
