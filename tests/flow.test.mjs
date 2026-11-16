// Guards for the deck's flow lock (owner, 2026-11-15): the presenter must not get past a slide or a step while the
// phone is still playing it. They drive the real machine (deck/flow.js), the one sunum.js runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initial, step, SLIDE_DWELL, STEP_DWELL, WATCHDOG, AUTO_STEP, AUTO_SLIDE, AUTO_START, MANUAL } from '../deck/flow.js';
import { SLIDES as DECK, readMs, READ_MAX } from '../deck/slides.js';
import { FOUNDATION_SLIDES } from '../deck/foundation.js';

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

// ───────────────────────── auto-play (dossier ch. 14 §11): the deck walks itself, through the same lock

/** The deck as sunum.js hands it to the machine. */
const asFlow = slides => slides.map(x => ({ phone: x.phone ?? null, acts: (x.acts ?? []).map(a => a[1]), read: readMs(x) }));
/**
 * Plays a deck as sunum.js does, with a phone that answers every message and timers that fire in the order they were
 * set. Auto-play is switched on at the cover; the walk ends when no timer is left (or after `limit` of them).
 */
function autoWalk(slides, { limit = 3000, pause = null } = {}) {
  let s = initial(slides, { pause });
  const trace = [], pauses = [], timers = [];
  let moved = 0;
  const feed = effects => { for (const fx of effects) {
    if (fx.type === 'send') { trace.push(fx.msg); if (fx.msg.id != null) timers.push({ type: 'done', id: fx.msg.id }); }
    if (fx.type === 'timer') timers.push({ type: 'dwell', token: fx.token });
    if (fx.type === 'autotimer') { pauses.push({ cur: s.cur, sub: s.sub, ms: fx.ms }); timers.push({ type: 'autotick', token: fx.token }); }
  } };
  const go = e => { const before = s; const r = step(s, e); s = r.state; feed(r.effects); if (e.type === 'autotick' && before.phase !== 'idle' && (s.cur !== before.cur || s.sub !== before.sub)) moved++; };
  go({ type: 'goto', slide: 0 }); go({ type: 'ready' }); go({ type: 'auto' });
  let n = 0;
  for (; timers.length && n < limit; n++) go(timers.shift());
  return { s, trace, pauses, ended: timers.length === 0, movedWhileBusy: moved };
}

test('auto-play presses → by itself: every step and every slide, in order, then it stops on the last one', () => {
  const { s, trace, ended } = autoWalk(SLIDES);
  assert.deepEqual(trace.map(m => m.name ?? m.type), ['reset', 'go', 'a', 'b'], 'the same messages, in the same order, as → would send');
  assert.ok(ended, 'the walk comes to an end: no tick is armed after the last slide');
  assert.equal(s.cur, SLIDES.length - 1);
  assert.equal(s.phase, 'idle');
  assert.equal(s.auto, false, 'it switched itself off at the end');
  assert.equal(s.armed, false);
});

test('auto-play walks the real deck end to end: every phone message the slides hold, once, in order', () => {
  const { s, trace, pauses, ended } = autoWalk(asFlow(DECK));
  const expected = DECK.flatMap(x => [...(x.phone ? [x.phone] : []), ...(x.acts ?? []).map(a => a[1])]);
  assert.deepEqual(trace.map(({ id, ...m }) => m), expected);
  assert.ok(trace.every(m => Number.isInteger(m.id)), 'each one carries an id, so each one is waited for');
  assert.ok(ended);
  assert.equal(s.cur, DECK.length - 1);
  assert.equal(s.auto, false);
  // One pause per rest that has something after it: each slide and each step but the very last rest.
  assert.equal(pauses.length, DECK.reduce((n, x) => n + 1 + (x.acts ?? []).length, 0) - 1);
});

test('auto-play\'s pauses are readable: a slide stays for its reading time, a step long enough to watch, the foundation slides longest', () => {
  const { pauses } = autoWalk(asFlow(DECK));
  for (const p of pauses) assert.equal(p.ms, p.sub === 0 ? Math.max(AUTO_SLIDE, readMs(DECK[p.cur])) : AUTO_STEP, `slide ${p.cur + 1}, after step ${p.sub}`);
  assert.ok(AUTO_STEP >= 3000 && AUTO_SLIDE >= 4000, 'long enough to see what the phone did and to read a title');
  // Reading time follows the words on the slide, so the foundation's text slides (dark, full width, no phone) stay
  // longer than any slide of the tour, and nothing stays past READ_MAX.
  const slidePause = id => pauses.find(p => p.sub === 0 && DECK[p.cur].id === id).ms;
  const text = FOUNDATION_SLIDES.filter(x => x.layout === 'full');
  assert.ok(text.length >= 3, 'the section has its text slides');
  const tour = DECK.filter(x => !FOUNDATION_SLIDES.includes(x) && x.id !== 'kapanis').map(x => slidePause(x.id));
  for (const x of text) assert.ok(slidePause(x.id) > Math.max(...tour), `${x.id} (${slidePause(x.id)} ms) stays longer than the longest tour slide (${Math.max(...tour)} ms)`);
  assert.ok(pauses.every(p => p.ms <= READ_MAX));
  assert.equal(readMs({ html: '<h1 class="x">bir iki</h1> <p>üç</p>' }), 2500 + 3 * 300, 'words are counted, markup is not');
  // ?bekle= (tools/auto-e2e.mjs) replaces every pause and nothing else.
  const fast = autoWalk(asFlow(DECK), { pause: 300 });
  assert.ok(fast.pauses.every(p => p.ms === 300));
  assert.equal(fast.trace.length, autoWalk(asFlow(DECK)).trace.length);
});

test('an auto tick cannot move a busy deck: it fires only at rest, and a stale one is ignored', () => {
  let s = idleOn0();
  let r = step(s, { type: 'auto' }); s = r.state;
  const t1 = r.effects.find(e => e.type === 'autotimer');
  assert.ok(t1, 'switching on at rest arms a tick');
  assert.equal(t1.ms, AUTO_START, 'a short one: the presenter has already been looking at this slide');
  assert.equal(r.effects.filter(e => e.type === 'autotimer').length, 1, 'one tick, not two');
  r = step(s, { type: 'autotick', token: t1.token }); s = r.state;          // → slide 1, busy
  assert.equal(s.cur, 1); assert.equal(s.phase, 'busy');
  assert.ok(!r.effects.some(e => e.type === 'autotimer'), 'nothing is armed while the phone plays');
  const before = s;
  assert.equal(step(s, { type: 'autotick', token: t1.token }).state, before, 'the old tick again, while busy: nothing');
  assert.equal(step(s, { type: 'autotick', token: s.autoToken + 1 }).state, before, 'nor a made-up one');
  // At rest again a new tick is armed, with the slide's reading time; the one before it no longer counts.
  r = run([{ type: 'done', id: s.pending }, { type: 'dwell', token: s.token }], s);
  const t2 = timerOf(r.effects, 'autotimer');
  assert.ok(t2 && t2.token !== t1.token);
  assert.equal(t2.ms, AUTO_SLIDE);
  assert.equal(step(r.s, { type: 'autotick', token: t1.token }).state, r.s, 'the first tick, late: nothing');
  const played = step(r.s, { type: 'autotick', token: t2.token });
  assert.equal(played.state.sub, 1, 'the armed tick plays the next step');
  assert.equal(sent(played.effects)[0].name, 'a');
  assert.equal(autoWalk(SLIDES).movedWhileBusy, 0);
});

test('any input from the presenter stops auto-play, even one the lock ignores', () => {
  for (const type of MANUAL) {
    let s = idleOn0();
    s = step(s, { type: 'auto' }).state;
    const busy = step(s, { type: 'autotick', token: s.autoToken }).state;   // playing slide 1
    assert.equal(busy.phase, 'busy');
    const e = type === 'goto' ? { type, slide: 2 } : type === 'act' ? { type, k: 0 } : { type };
    for (const from of [s, busy]) {
      const r = step(from, e);
      assert.equal(r.state.auto, false, `${type} while ${from.phase}`);
      assert.equal(r.state.armed, false);
      assert.ok(!r.effects.some(x => x.type === 'autotimer'), `${type} arms nothing`);
      assert.ok(r.effects.some(x => x.type === 'mark'), `${type} repaints the control`);
      // And the tick that was already waiting does nothing when it lands.
      assert.equal(step(r.state, { type: 'autotick', token: from.autoToken }).state, r.state);
    }
    // The press the lock ignored moved nothing: only auto-play changed.
    const ignored = step(busy, e).state;
    assert.deepEqual({ ...ignored, auto: true }, { ...busy, auto: true, armed: false });
  }
  assert.deepEqual([...MANUAL].sort(), ['act', 'goto', 'next', 'prev', 'reset'], 'every input the presenter has');
});

test('the A key and the control toggle it; before the phone is ready it waits; at the very end it stays off', () => {
  let s = idleOn0();
  s = step(s, { type: 'auto' }).state; assert.equal(s.auto, true);
  const token = s.autoToken;
  s = step(s, { type: 'auto' }).state; assert.equal(s.auto, false);
  assert.equal(step(s, { type: 'autotick', token }).state.cur, 0, 'a tick armed before it was switched off does nothing');
  assert.equal(step(s, { type: 'auto', on: false }).state, s, 'forcing off what is off changes nothing');
  // Switched on while the phone is still loading (?oynat): nothing is armed until the first slide has settled.
  let r = run([{ type: 'goto', slide: 0 }, { type: 'auto', on: true }]);
  assert.equal(r.s.auto, true);
  assert.ok(!r.effects.some(x => x.type === 'autotimer'));
  r = run([{ type: 'ready' }], r.s);
  assert.ok(!r.effects.some(x => x.type === 'autotimer'), 'still busy with the cover');
  r = run([{ type: 'done', id: r.s.pending }, { type: 'dwell', token: r.s.token }], r.s);
  assert.equal(r.effects.filter(x => x.type === 'autotimer').length, 1, 'armed once the cover is at rest');
  // On the last slide, with nothing left to play, there is nothing to walk.
  const { s: end } = autoWalk(SLIDES);
  r = run([{ type: 'auto' }], end);
  assert.equal(r.s.auto, false);
  assert.ok(!r.effects.some(x => x.type === 'autotimer'));
});

test('sunum.js drives auto-play only through the machine: the control, A and the timer all dispatch', () => {
  const deck = readFileSync(new URL('../sunum.js', import.meta.url), 'utf8');
  assert.match(deck, /^\$\('#auto'\)\.onclick = \(\) => dispatch\(\{ type: 'auto' \}\);$/m);
  assert.match(deck, /^  if \(k === 'a' \|\| k === 'A'\) dispatch\(\{ type: 'auto' \}\);$/m);
  assert.match(deck, /^  else if \(fx\.type === 'autotimer'\) setTimeout\(\(\) => dispatch\(\{ type: 'autotick', token: fx\.token \}\), fx\.ms\);$/m);
  // The machine is given each slide's reading time, and the test-only pause comes from ?bekle= alone.
  assert.match(deck, /read: readMs\(s\) \}\)\), \{ pause: Number\.isFinite\(pause\) \? pause : null \}\)/);
  // No loop of its own that clicks → or presses a step: every move is the machine's `next`.
  // (Read without its comments: one of them names the phone's own element.click().)
  const code = deck.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /setInterval|\.click\(\)|dispatchEvent/);
  // While the phone takes letters, a key during auto-play stops it and is not sent to the phone as a letter.
  assert.match(deck, /if \(flow\.auto\) dispatch\(\{ type: 'auto', on: false \}\); else phone\.contentWindow\.postMessage\(\{ type: 'key', key: e\.key \}, '\*'\);/);
  // The control is in the page, is a button, and is never among the controls the lock disables.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<button class="auto-btn" id="auto" type="button" aria-pressed="false"[^>]*>.*<b id="auto-t">Otomatik<\/b><\/button>/);
  const mark = deck.slice(deck.indexOf('function mark()'), deck.indexOf('/* ---------- tuşlar'));
  assert.doesNotMatch(mark.match(/\[\$\('#prev'\)[^\n]*disabled = busy/)[0], /#auto/);
});

test('the deck has no "Uygulamayı aç" link: a presentation, not an app showcase (owner, 2026-11-15)', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /Uygulamayı aç/);
  assert.doesNotMatch(html, /<a[^>]+href="app\/"/);
});
