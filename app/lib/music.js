/*
 * The app's music, ported: the 44 synthesised piano keys (Doremimi.Core/Audio/PianoKeys.cs), the song sequencer
 * (Doremimi.Core/Music/Sequencer.cs), the mixer that turns a song into one sound (SongRenderer.cs) and the karaoke
 * lines (Doremimi/ViewModels/SongPlayback.cs). The pure parts (everything but `Sound`) are what tests/music.test.mjs
 * checks; the sound itself needs a browser and is checked by ear.
 *
 * Every song is the one piano voice playing that instrument's tune. That is the app's design, not a demo shortcut
 * (ch. 06 §1.1: no recorded audio; ch. 11 OC-15 asks the owner whether it is enough).
 */

// ───────────────────────── PianoKeys.cs
export const KEY_COUNT = 44;
export const FIRST_MIDI = 45;          // A2; the last key is E6 (88)
export const SAMPLE_RATE = 22050;
const HIGH_SECONDS = 0.6, LOW_EXTRA_SECONDS = 0.3, ATTACK = 0.004, FADE = 0.03;
const PARTIALS = [1, 0.5, 0.25, 0.12], INHARMONICITY = 0.0004, HEADROOM = 0.85;

export const frequency = index => 440 * Math.pow(2, (FIRST_MIDI + index - 69) / 12);

/**
 * One key as 16-bit-range samples (floats in ±32767), sample for sample the C#'s Synthesis: four stretched partials
 * at 1, ½, ¼, ⅛, each upper one dying faster, a 4 ms attack and a 30 ms fade. Math.sin instead of the C#'s rotating
 * phasor: the phasor is only a speed trick, and the two agree far below one 16-bit step.
 */
export function keySamples(index) {
  if (!(index >= 0 && index < KEY_COUNT)) throw new RangeError(`key ${index}`);
  const low = 1 - index / (KEY_COUNT - 1);
  const n = Math.floor((HIGH_SECONDS + LOW_EXTRA_SECONDS * low) * SAMPLE_RATE);
  const out = new Float32Array(n);
  const tau = 0.16 + 0.14 * low;
  const parts = [];
  for (let p = 1; p <= PARTIALS.length; p++) {
    const f = p * frequency(index) * Math.sqrt(1 + INHARMONICITY * p * p);
    if (f >= SAMPLE_RATE / 2) break;
    parts.push({ step: 2 * Math.PI * f / SAMPLE_RATE, gain: PARTIALS[p - 1] * HEADROOM / 1.87 * 32767, decay: Math.exp(-1 / (tau / Math.pow(p, 0.7) * SAMPLE_RATE)) });
  }
  const attack = Math.floor(ATTACK * SAMPLE_RATE), fade = Math.floor(FADE * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const q of parts) v += q.gain * Math.pow(q.decay, i) * Math.sin(q.step * i);
    const env = Math.min(1, i / attack) * Math.min(1, (n - 1 - i) / fade);
    out[i] = Math.max(-32766, Math.min(32767, Math.round(v * env)));
  }
  return out;
}
const keyCache = new Map();
export const key = index => { let k = keyCache.get(index); if (!k) keyCache.set(index, k = keySamples(index)); return k; };

// ───────────────────────── Sequencer.cs
export const MEASURES_PER_LINE = 2;

/** "C4" is 60; a rest or anything unreadable is -1 (Sequencer.PitchToMidi). */
export function pitchToMidi(pitch) {
  if (!pitch || pitch.toLowerCase() === 'rest') return -1;
  let step = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[pitch[0].toUpperCase()];
  if (step === undefined) return -1;
  let i = 1;
  while (i < pitch.length && (pitch[i] === '#' || pitch[i] === 'b')) { step += pitch[i] === '#' ? 1 : -1; i++; }
  const octave = pitch.slice(i);
  return /^-?\d+$/.test(octave) ? (parseInt(octave, 10) + 1) * 12 + step : -1;
}

/** The bars in playing order with their pass (Sequencer.Expand): |: :| and first/second endings, once each. */
export function expand(measures) {
  const out = [];
  let start = 0, pass = 1, lastEnd = -1, budget = measures.length * 4 + 8;
  for (let i = 0; i < measures.length && budget-- > 0; i++) {
    const m = measures[i];
    if (pass === 2 && i > lastEnd && !m.ending) { pass = 1; start = i; }
    if (m.repeat_start && pass === 1) start = i;
    if (m.ending === 1 && pass === 2) continue;
    if (m.ending === 2 && pass === 1) continue;
    out.push({ measure: m, pass });
    if (m.repeat_end && pass === 1) { lastEnd = i; pass = 2; i = start - 1; }
  }
  return out;
}

/** Notes on the timeline (Sequencer.Sequence): ties merged, a syllable per verse, two played bars per karaoke line. */
export function sequence(song) {
  const sixteenth = 60 / Math.max(30, song.tempo_bpm ?? 100) / 4;
  const events = [];
  let time = 0, played = 0, tied = null;
  for (const { measure, pass } of expand(song.measures ?? [])) {
    const line = Math.floor(played++ / MEASURES_PER_LINE);
    for (const note of measure.notes ?? []) {
      const duration = Math.max(1, note.sixteenths) * sixteenth;
      const midi = pitchToMidi(note.pitch);
      if (tied && tied.midi === midi) {
        tied.duration += duration;
      } else {
        const lyrics = note.lyrics ?? [];
        let syllable = lyrics.length ? lyrics[Math.min(pass - 1, lyrics.length - 1)] : null;
        if (!syllable || !syllable.trim()) syllable = null;
        events.push({ start: time, duration, midi, syllable, measure: measure.number, line });
      }
      tied = note.tie_to_next && midi >= 0 ? events.at(-1) : null;
      time += duration;
    }
  }
  return events;
}
export const length = events => events.length ? events.at(-1).start + events.at(-1).duration : 0;

// ───────────────────────── SongRenderer.cs
/** A MIDI note moved by whole octaves into the 44 keys (SongRenderer.KeyIndex). */
export function keyIndex(midi) {
  const last = FIRST_MIDI + KEY_COUNT - 1;
  while (midi < FIRST_MIDI) midi += 12;
  while (midi > last) midi -= 12;
  return midi - FIRST_MIDI;
}

/** The C a song page's two-octave keyboard starts on (MusicSongPageViewModel.Base): under the song's median note. */
export function keyboardBase(events) {
  const heard = events.filter(e => e.midi >= 0).map(e => FIRST_MIDI + keyIndex(e.midi)).sort((a, b) => a - b);
  if (!heard.length) return 60;
  const median = heard[Math.floor(heard.length / 2)];
  return Math.max(48, Math.min(72, 12 * Math.floor((median - 6) / 12)));
}

/** Melodim's notes: even 0.4 s notes, four to a bar, eight to a line (SongRenderer.FromKeys). */
export const fromKeys = (keys, secondsPerNote = 0.4) =>
  keys.map((k, i) => ({ start: i * secondsPerNote, duration: secondsPerNote, midi: FIRST_MIDI + k, syllable: null, measure: Math.floor(i / 4) + 1, line: Math.floor(i / 8) }));

export const FADE_IN = 1.5, FADE_OUT = 2;
const MELODY_GAIN = 0.7, ROOT_GAIN = 0.3, TAIL = 0.9;

/**
 * The whole song as one buffer of samples in ±1 (SongRenderer.Job): every note is its key's samples at 0.7, a short
 * note damped at its length + 0.25 s so a fast run does not pile into a chord, the peak brought to 85% of full scale,
 * a 1.5 s fade-in and a 2 s fade-out.
 */
export function render(events, from = 0, fadeIn = FADE_IN, fadeOut = FADE_OUT) {
  const len = Math.max(0, length(events) - from) + TAIL;
  const n = Math.floor(len * SAMPLE_RATE);
  const mix = new Float32Array(n);
  for (const note of events) {
    if (note.midi < 0 || note.start + note.duration <= from || note.start < from) continue;
    const k = key(keyIndex(note.midi));
    const gain = note.line < 0 ? ROOT_GAIN : MELODY_GAIN;
    const at = Math.floor((note.start - from) * SAMPLE_RATE);
    const count = Math.min(k.length, Math.floor((note.duration + 0.25) * SAMPLE_RATE));
    for (let i = 0; i < count && at + i < n; i++) mix[at + i] += k[i] * gain * (i > count - 220 ? (count - i) / 220 : 1);
  }
  let peak = 1;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const scale = Math.min(1, 32767 * 0.85 / peak) / 32768;
  const fi = Math.max(1, Math.floor(fadeIn * SAMPLE_RATE)), fo = Math.max(1, Math.floor(Math.min(fadeOut, len / 2) * SAMPLE_RATE));
  for (let i = 0; i < n; i++) mix[i] *= scale * Math.min(1, i / fi) * Math.min(1, (n - 1 - i) / fo);
  return mix;
}

/**
 * The stand-in theme played the safe way (SongRenderer.SafeTheme): every pitch snapped down onto C major, and a soft
 * C, F or G root under each bar, marked line -1 so it is mixed at 0.3 and the karaoke ignores it.
 */
export function safeTheme(events) {
  const out = [];
  let bar = null;
  const snap = m => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12) ? m - 1 : m;
  const root = m => { const pc = ((m % 12) + 12) % 12; return pc === 5 || pc === 9 ? 53 : pc === 7 || pc === 11 || pc === 2 ? 55 : 48; };
  for (const e of events) {
    if (e.midi < 0) { out.push(e); continue; }
    const midi = snap(e.midi);
    if (e.measure !== bar) {
      bar = e.measure;
      const barLength = events.filter(x => x.measure === bar).reduce((a, x) => a + x.duration, 0);
      out.push({ start: e.start, duration: barLength, midi: root(midi), syllable: null, measure: e.measure, line: -1 });
    }
    out.push({ ...e, midi });
  }
  return out;
}

// ───────────────────────── ButtonMelody.cs: the note a button press plays
const PENTATONIC = [0, 2, 4, 7, 9];
const scaleKeys = tonic => Array.from({ length: KEY_COUNT }, (_, k) => k).filter(k => PENTATONIC.includes((((FIRST_MIDI + k - tonic) % 12) + 12) % 12));
/**
 * A gentle walk on a major pentatonic scale: one or two steps a press, never the same key twice, mostly keeping its
 * direction and bouncing at the ends, the scale moving a fifth every eight presses. The C# walk under its seeded
 * Random cannot be replayed here, so the rules are ported and tests/music.test.mjs checks the rules (ch. 10 P-10).
 */
export class ButtonMelody {
  constructor(random = Math.random, startKey = 60 - FIRST_MIDI) { this.random = random; this.key = startKey; this.tonic = 0; this.dir = 1; this.presses = 0; }
  next() {
    if (this.presses > 0 && this.presses % 8 === 0) this.tonic = (this.tonic + (this.random() < 0.5 ? 7 : 5)) % 12;
    this.presses++;
    if (this.random() >= 0.75) this.dir = -this.dir;
    const steps = 1 + (this.random() < 0.5 ? 0 : 1);
    let k = this.step(steps);
    if (k < 0) { this.dir = -this.dir; k = this.step(steps); }
    this.key = k;
    return k;
  }
  step(steps) {
    const keys = scaleKeys(this.tonic);
    const beyond = this.dir > 0 ? keys.filter(k => k > this.key) : keys.filter(k => k < this.key).reverse();
    return beyond.length >= steps ? beyond[steps - 1] : -1;
  }
}

// ───────────────────────── SongPlayback.cs: karaoke
/** Lines of syllables, each syllable remembering its note (SongPlayback.BuildLines). */
export function karaokeLines(events) {
  const lines = [];
  events.forEach((e, i) => {
    if (e.line < 0) return;
    if (!lines.length || lines.at(-1).number !== e.line) lines.push({ number: e.line, syllables: [] });
    if (e.syllable) lines.at(-1).syllables.push({ text: e.syllable, index: i });
  });
  return lines;
}
/** The note sounding at a time, or -1 before the first (SongPlayback.IndexAt). */
export function indexAt(events, t) {
  if (!events.length || events[0].start > t) return -1;
  let i = 0;
  while (i + 1 < events.length && events[i + 1].start <= t) i++;
  return i;
}

/** MusicLibrary.ForInstrument: the song file by slug, then by its instrument's name, then a slug that ends in it. */
export const slug = text => text.toLocaleLowerCase('en').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/i̇/g, 'i')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function songFor(name, songs) {
  const k = slug(name);
  return songs.find(s => s.slug !== 'ana-tema' && (s.slug === k || slug(s.instrument) === k)) ?? songs.find(s => s.slug !== 'ana-tema' && s.slug.endsWith('-' + k)) ?? null;
}

// ───────────────────────── the sound, in the browser only
/**
 * One AudioContext for keys and songs. A key press plays its buffer at once; a song plays its rendered buffer, and
 * only one song sounds at a time (ch. 06 §9.8: starting a song stops the one before).
 */
export class Sound {
  constructor() { this.ctx = null; this.buffers = new Map(); this.song = null; this.muted = false; }
  context() {
    // The deck owns the context (ch. 10 S-04): a click in the deck unlocks it, which a context made inside the phone's
    // frame would not get in every browser. Opened alone, the phone makes its own on the first tap.
    if (!this.ctx) { try { this.ctx = globalThis.parent !== globalThis ? globalThis.parent.__dmAudio?.() ?? null : null; } catch { this.ctx = null; } }
    if (!this.ctx) { const C = globalThis.AudioContext || globalThis.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  buffer(samples) {
    const ctx = this.context();
    const b = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    b.copyToChannel(samples instanceof Float32Array ? samples : Float32Array.from(samples), 0);
    return b;
  }
  /** A key, as a button press or a keyboard tap plays it. */
  key(index) {
    const ctx = this.context();
    if (!ctx || this.muted) return;
    let b = this.buffers.get(index);
    if (!b) { const s = key(index); const f = new Float32Array(s.length); for (let i = 0; i < s.length; i++) f[i] = s[i] / 32768; b = this.buffer(f); this.buffers.set(index, b); }
    const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start();
  }
  /** Plays a rendered song; `started(t0)` gets the context time it begins, which drives the karaoke clock. */
  play(samples, started) {
    this.stop();
    const ctx = this.context();
    if (!ctx) { started(null); return; }
    const src = ctx.createBufferSource(); src.buffer = this.buffer(samples); src.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.05;
    src.start(t0);
    this.song = src;
    started(t0);
  }
  stop() { try { this.song?.stop(); } catch { /* already ended */ } this.song = null; }
  now() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }
}
