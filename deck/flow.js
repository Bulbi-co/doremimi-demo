/*
 * The deck's flow: one state machine that owns "may the presenter move on now?".
 *
 * Why it exists (owner, 2026-11-15): the presenter could press → faster than the phone could act, so the slides ran
 * ahead while the phone was still tapping through the last step, and the audience saw the phone "left behind". The
 * deck used to fire a message at the phone and forget it. Now every message carries an id, the phone answers
 * `dm-done` with that id once its presses have played and the screen has settled (app/app.js `receive`), and nothing
 * on the deck accepts input until both that answer and the slide's own transition are in.
 *
 * Pure on purpose: no DOM, no timers. `step(state, event)` returns the next state and the effects to perform, so
 * tests/flow.test.mjs drives the real machine, and sunum.js only performs effects and feeds events back.
 *
 * States
 *   loading  the phone has not said dm-ready; input waits (the first slide's message is held until it does)
 *   idle     input is accepted
 *   busy     waiting for the phone's dm-done for `pending` and/or for the dwell timer; input is ignored, not queued:
 *            a queued → would fire the moment the lock lifts and skip the step the audience is meant to watch
 *
 * Effects
 *   { type: 'show', slide }            render slide `slide` (classes, counter, notes)
 *   { type: 'send', msg }              post msg to the phone (msg.id is set when a dm-done is awaited)
 *   { type: 'mark' }                   repaint the step buttons from state.sub
 *   { type: 'timer', ms, token }       call back with { type: 'dwell', token } after ms
 *   { type: 'watchdog', ms, token }    call back with { type: 'watchdog', token } after ms
 *   { type: 'autotimer', ms, token }   call back with { type: 'autotick', token } after ms (auto-play, below)
 *
 * Auto-play (owner, ch. 14 §11: the deck "walks it unattended, still behind the flow lock"). It is not a second way
 * to move: a tick is turned into the very `next` a presenter's → is, so it can only fire while the deck is idle, plays
 * each step under the same lock and waits for the same dm-done. The machine arms one tick each time the deck comes to
 * rest, after a pause long enough to read what is there; anything the presenter does (→, ←, a dot, a step button, R)
 * hands the deck back to them and auto-play stops. It also stops by itself on the last slide, after its last step.
 */

/** A slide change keeps the lock at least this long: .device moves over 0.9 s (sunum.css), the slide fades in 0.72 s. */
export const SLIDE_DWELL = 900;
/** After a step's dm-done, a short beat so the result is seen before the next press can land. */
export const STEP_DWELL = 350;
/**
 * The longest any phone step may take before the deck frees itself. The slowest scripted step today is the round's
 * finish (step 11: four presses with 0.9 s gaps plus card animations, ~7 s) and a song start; a jump to a late game
 * slide replays the round fast first. 20 s is far past all of them. If it fires, the phone missed an answer: the
 * deck must never stay locked in front of an audience.
 */
export const WATCHDOG = 20000;
/**
 * Auto-play's pauses: after a step, long enough to see what the phone did; on a new slide, the slide's own reading
 * time (deck/slides.js readMs), never less than this; and a short beat when auto-play is switched on, because the
 * presenter has already been looking at the slide.
 */
export const AUTO_STEP = 3500;
export const AUTO_SLIDE = 5000;
export const AUTO_START = 1200;
/** The presenter's own inputs. Each one stops auto-play, whether or not the lock lets it move the deck. */
export const MANUAL = Object.freeze(['next', 'prev', 'goto', 'act', 'reset']);

/**
 * `pause` replaces every auto-play pause with one number. Only tools/auto-e2e.mjs sets it (?bekle=), so a headless run
 * walks the deck in minutes; the lock and every dm-done are waited for exactly as on stage.
 */
export function initial(slides, { pause = null } = {}) {
  return { phase: 'loading', slides, cur: -1, sub: 0, pending: null, waitPhone: false, waitDwell: false, nextId: 1, token: 0, held: null,
    auto: false, armed: false, autoToken: 0, pause };
}

/** Steps on slide i: the "canlı göster" buttons' messages, in order. */
const acts = (s, i) => s.slides[i]?.acts ?? [];

export function step(s, e) {
  // A presenter's input takes the deck back from auto-play first, so even a press the lock ignores stops it.
  const st = MANUAL.includes(e.type) && (s.auto || s.armed) ? { ...s, auto: false, armed: false } : s;
  const r = move(st, e);
  if (r.state === st && st !== s) return { state: st, effects: [{ type: 'mark' }] };
  return arm(r);
}

/** When auto-play is on and the deck has come to rest, one tick is armed; going busy disarms it. */
function arm({ state, effects }) {
  if (state.phase !== 'idle') return state.armed ? { state: { ...state, armed: false }, effects } : { state, effects };
  if (!state.auto || state.armed) return { state, effects };
  const token = state.autoToken + 1;
  return { state: { ...state, armed: true, autoToken: token }, effects: [...effects, { type: 'autotimer', ms: pauseOf(state), token }] };
}

/** How long auto-play waits on this rest: a fresh slide is read, a step is looked at. */
function pauseOf(s) {
  if (s.pause != null) return s.pause;
  if (s.justOn) return AUTO_START;
  return s.sub === 0 ? Math.max(AUTO_SLIDE, s.slides[s.cur]?.read ?? 0) : AUTO_STEP;
}

function move(s, e) {
  switch (e.type) {
    case 'auto': {
      // The control and the A key: on, or off again. `on` may force it either way.
      const on = e.on ?? !s.auto;
      if (on === s.auto) return { state: s, effects: [] };
      if (!on) return { state: { ...s, auto: false, armed: false }, effects: [{ type: 'mark' }] };
      // On the last slide with nothing left to play there is nothing to walk: stay off rather than look stuck.
      if (atEnd(s)) return { state: s, effects: [{ type: 'mark' }] };
      const r = arm({ state: { ...s, auto: true, justOn: true }, effects: [{ type: 'mark' }] });
      return { state: { ...r.state, justOn: false }, effects: r.effects };
    }
    case 'autotick': {
      if (!s.auto || !s.armed || e.token !== s.autoToken || s.phase !== 'idle') return { state: s, effects: [] };
      const st = { ...s, armed: false };
      if (atEnd(st)) return { state: { ...st, auto: false }, effects: [{ type: 'mark' }] };
      // The same move → makes: one step, or the next slide.
      return move(st, { type: 'next' });
    }
    case 'ready': {
      if (s.phase !== 'loading') return { state: s, effects: [] };
      const st = { ...s, phase: 'idle' };
      // The slide shown before the phone was ready held its message; play it now, under the lock.
      return st.held != null ? enter(st, st.held, { initial: true }) : { state: st, effects: [] };
    }
    case 'done': {
      if (s.phase !== 'busy' || e.id !== s.pending) return { state: s, effects: [] };
      return settle({ ...s, waitPhone: false, pending: null });
    }
    case 'dwell': {
      if (s.phase !== 'busy' || e.token !== s.token) return { state: s, effects: [] };
      return settle({ ...s, waitDwell: false });
    }
    case 'watchdog': {
      if (s.phase !== 'busy' || e.token !== s.token) return { state: s, effects: [] };
      return { state: { ...s, phase: 'idle', pending: null, waitPhone: false, waitDwell: false }, effects: [{ type: 'mark' }, { type: 'warn', text: 'phone did not answer; deck unlocked by the watchdog' }] };
    }
    case 'goto': {
      if (s.phase === 'loading') {
        // Before the phone is ready, the deck's opening slide (from the URL) still shows, so the page does not look
        // frozen, but its message is held. Only that first one: a dot or End pressed while the phone loads would be
        // the same race the lock exists to stop.
        if (s.cur !== -1) return { state: s, effects: [] };
        const i = clamp(s, e.slide);
        return { state: { ...s, cur: i, sub: 0, held: i }, effects: [{ type: 'show', slide: i }, { type: 'mark' }] };
      }
      if (s.phase !== 'idle') return { state: s, effects: [] };
      const i = clamp(s, e.slide);
      if (i === s.cur) return { state: s, effects: [] };
      return enter(s, i);
    }
    case 'next': {
      if (s.phase !== 'idle') return { state: s, effects: [] };
      const list = acts(s, s.cur);
      if (s.sub < list.length) return play(s, s.sub);
      if (s.cur >= s.slides.length - 1) return { state: s, effects: [] };
      return enter(s, s.cur + 1);
    }
    case 'prev': {
      if (s.phase !== 'idle') return { state: s, effects: [] };
      if (s.sub > 0) {
        // Undo one step: the phone goes back to the state before it (the scripted round replays to there; ch. 10
        // O-12), without playing it.
        const sub = s.sub - 1;
        const msg = sub > 0 ? acts(s, s.cur)[sub - 1] : s.slides[s.cur].phone;
        const st = { ...s, sub };
        return msg ? lock(st, { ...msg, play: false }, STEP_DWELL) : { state: st, effects: [{ type: 'mark' }] };
      }
      if (s.cur <= 0) return { state: s, effects: [] };
      return enter(s, s.cur - 1);
    }
    case 'act': {
      // A step button clicked directly. Any step may be picked, as before; the ones before it count as done.
      if (s.phase !== 'idle') return { state: s, effects: [] };
      if (!(e.k >= 0 && e.k < acts(s, s.cur).length)) return { state: s, effects: [] };
      return play(s, e.k);
    }
    case 'reset': {
      if (s.phase !== 'idle') return { state: s, effects: [] };
      const msg = s.slides[s.cur]?.phone;
      const st = { ...s, sub: 0 };
      return msg ? lock(st, { ...msg, play: false }, STEP_DWELL) : { state: st, effects: [{ type: 'mark' }] };
    }
    default:
      return { state: s, effects: [] };
  }
}

const clamp = (s, i) => Math.max(0, Math.min(s.slides.length - 1, i));
/** The last slide, its steps all played: where → has nothing left to do. */
const atEnd = s => s.cur >= s.slides.length - 1 && s.sub >= acts(s, s.cur).length;

function play(s, k) {
  const st = { ...s, sub: k + 1 };
  return lock(st, acts(s, s.cur)[k], STEP_DWELL, k);
}

function enter(s, i, { initial: first = false } = {}) {
  const st = { ...s, cur: i, sub: 0, held: null };
  const show = first ? [] : [{ type: 'show', slide: i }];
  const msg = s.slides[i].phone;
  const r = lock(st, msg ?? null, SLIDE_DWELL);
  return { state: r.state, effects: [...show, ...r.effects] };
}

/** Enter busy: send msg (if any) with a fresh id, start the dwell timer and the watchdog. */
function lock(s, msg, dwell, playing = null) {
  const token = s.token + 1;
  const id = msg ? s.nextId : null;
  const effects = [];
  if (msg) effects.push({ type: 'send', msg: { ...msg, id } });
  effects.push({ type: 'mark', playing }, { type: 'timer', ms: dwell, token }, { type: 'watchdog', ms: WATCHDOG, token });
  return {
    state: { ...s, phase: 'busy', pending: id, waitPhone: !!msg, waitDwell: true, token, nextId: msg ? s.nextId + 1 : s.nextId, playing },
    effects,
  };
}

function settle(s) {
  if (s.waitPhone || s.waitDwell) return { state: s, effects: [] };
  return { state: { ...s, phase: 'idle', playing: null }, effects: [{ type: 'mark' }] };
}
