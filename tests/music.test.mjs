// Guards for the ported music (app/lib/music.js): the sequencer, the key fold, the keyboard's base, the karaoke lines,
// the song lookup and the button walk. They import the file the phone runs and read the real song files the app
// ships (app/data/songs, copied unchanged from Doremimi/Assets/Content/music). Where the app has been rendered, the
// numbers come from the render: 62-song-page.png shows Akordeon's first sung line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pitchToMidi, expand, sequence, length, keyIndex, keyboardBase, karaokeLines, indexAt, songFor, safeTheme, keySamples, frequency, render, ButtonMelody, FIRST_MIDI, KEY_COUNT, SAMPLE_RATE } from '../app/lib/music.js';
import { SONGS, DIRECTORY } from '../app/data/site.js';
import { seeded } from '../app/lib/rng.js';

const song = slug => JSON.parse(readFileSync(new URL(`../app/data/songs/${slug}.json`, import.meta.url), 'utf8'));

test('pitchToMidi reads letters, accidentals and octaves; rests and junk are -1 (Sequencer.PitchToMidi)', () => {
  assert.equal(pitchToMidi('C4'), 60);
  assert.equal(pitchToMidi('A4'), 69);
  assert.equal(pitchToMidi('Bb4'), 70);
  assert.equal(pitchToMidi('C#4'), 61);
  assert.equal(pitchToMidi('rest'), -1);
  assert.equal(pitchToMidi('H4'), -1);
});

test('expand plays a repeat twice and takes the first ending once, then the second (Sequencer.Expand)', () => {
  const m = (number, extra = {}) => ({ number, notes: [], ...extra });
  const order = list => expand(list).map(x => `${x.measure.number}.${x.pass}`).join(' ');
  assert.equal(order([m(1, { repeat_start: true }), m(2, { repeat_end: true }), m(3)]), '1.1 2.1 1.2 2.2 3.1');
  assert.equal(order([m(1, { repeat_start: true }), m(2, { ending: 1, repeat_end: true }), m(3, { ending: 2 }), m(4)]), '1.1 2.1 1.2 3.2 4.1');
});

test('a tie lengthens the note it continues; the second verse sings its own syllable', () => {
  const s = { tempo_bpm: 60, measures: [
    { number: 1, repeat_start: true, notes: [{ pitch: 'C4', sixteenths: 4, lyrics: ['bir', 'iki'], tie_to_next: true }] },
    { number: 2, repeat_end: true, notes: [{ pitch: 'C4', sixteenths: 4 }, { pitch: 'D4', sixteenths: 4 }] },
  ] };
  const ev = sequence(s);
  assert.deepEqual(ev.map(e => [e.midi, e.duration, e.syllable]), [[60, 2, 'bir'], [62, 1, null], [60, 2, 'iki'], [62, 1, null]]);
  assert.equal(length(ev), 6);
});

test("Akordeon's first sung line is the one 62-song-page.png shows", () => {
  const ev = sequence(song('akordeon'));
  const lines = karaokeLines(ev);
  assert.equal(lines[0].syllables.length, 0, 'bars 1-2 are instrumental: the page shows ♪ ♪ ♪');
  assert.equal(lines[1].syllables.map(s => s.text).join(' '), 'fa fa sol fa mi re do do re mi fa mi do re');
  // 100 bpm: a sixteenth is 0.15 s, so the opening two-sixteenth rest lasts 0.3 s and the first A4 starts there.
  assert.equal(ev[0].midi, -1);
  assert.ok(Math.abs(ev[1].start - 0.3) < 1e-9);
  assert.equal(indexAt(ev, 0.31), 1);
  assert.equal(indexAt(ev, -1), -1);
});

test('keyIndex folds by whole octaves into the 44 keys (SongRenderer.KeyIndex)', () => {
  assert.equal(keyIndex(60), 15);
  assert.equal(keyIndex(FIRST_MIDI - 1), 11);           // G#2 → G#3
  assert.equal(keyIndex(FIRST_MIDI + KEY_COUNT), 32);   // F6 → F5
  for (let m = 0; m < 128; m++) { const k = keyIndex(m); assert.ok(k >= 0 && k < KEY_COUNT); assert.equal(((FIRST_MIDI + k - m) % 12 + 12) % 12, 0); }
});

test("the song page keyboard starts on a C under the song's median, between C3 and C5", () => {
  for (const s of SONGS) { const b = keyboardBase(sequence(song(s.slug))); assert.equal(b % 12, 0); assert.ok(b >= 48 && b <= 72, s.slug); }
});

test('every instrument in the directory finds its song, by the app’s three-step lookup (MusicLibrary.ForInstrument)', () => {
  assert.equal(songFor('Viyolonsel', SONGS).slug, 'cello-viyolonsel');
  assert.equal(songFor('Kontrabas', SONGS).slug, 'kontrabass');
  assert.equal(songFor('Ut', SONGS).slug, 'ut');
  assert.equal(songFor('Tumba', SONGS).instrument, 'Kalimba');
  assert.equal(songFor('Kudüm', SONGS).slug, 'kudum');
  const missing = DIRECTORY.filter(d => !songFor(d.name, SONGS)).map(d => d.name);
  assert.deepEqual(missing, []);
});

test('the theme is played on C major with a soft root under each bar (SongRenderer.SafeTheme)', () => {
  const ev = safeTheme(sequence(song('ana-tema')));
  assert.ok(ev.filter(e => e.midi >= 0 && e.line >= 0).every(e => [0, 2, 4, 5, 7, 9, 11].includes(e.midi % 12)));
  // ana-tema itself has no accidental, so the snap is checked on a C♯ and an F♯: each goes down a half step.
  const snapped = safeTheme([{ start: 0, duration: 1, midi: 61, measure: 1, line: 0 }, { start: 1, duration: 1, midi: 66, measure: 1, line: 0 }]);
  assert.deepEqual(snapped.filter(e => e.line === 0).map(e => e.midi), [60, 65]);
  const roots = ev.filter(e => e.line === -1);
  assert.ok(roots.length > 0 && roots.every(r => [48, 53, 55].includes(r.midi)));
});

test('a key is the app’s synthesis: A4 is 440 Hz, the length follows the register, no sample clips', () => {
  assert.equal(frequency(24), 440);
  const low = keySamples(0), high = keySamples(43);
  // 0.6 + 0.3 × 1 is 0.8999… in doubles, and the C#'s (int) cast truncates: 19 844 samples, not 19 845.
  assert.equal(low.length, 19844);
  assert.equal(high.length, Math.floor(0.6 * SAMPLE_RATE));
  const peak = Math.max(...high.map(Math.abs));
  assert.ok(peak < 32767 * 0.85 / 1.87 * 1.875 && peak > 5000);
  // A4 crosses zero upward 440 times a second: count them over the first 0.2 s.
  const a4 = keySamples(24);
  let ups = 0;
  for (let i = 1; i < 0.2 * SAMPLE_RATE; i++) if (a4[i - 1] < 0 && a4[i] >= 0) ups++;
  assert.ok(Math.abs(ups - 88) <= 2, `zero crossings ${ups}`);
});

test('a rendered song peaks at 85% of full scale and fades in from silence', () => {
  const mix = render(sequence(song('akordeon')).slice(0, 40));
  const peak = mix.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
  assert.ok(peak <= 0.851 && peak > 0.3, `peak ${peak}`);
  assert.equal(mix[0], 0);
});

test('the button walk never repeats a key, stays on its scale and moves a fifth every eight presses (ButtonMelody)', () => {
  const walk = new ButtonMelody(seeded(4).unit);
  let last = walk.key;
  for (let i = 0; i < 400; i++) {
    const tonicBefore = walk.tonic;
    const k = walk.next();
    assert.notEqual(k, last);
    assert.ok(k >= 0 && k < KEY_COUNT);
    assert.ok([0, 2, 4, 7, 9].includes((((FIRST_MIDI + k - walk.tonic) % 12) + 12) % 12), 'off the scale');
    if (i > 0 && i % 8 === 0) assert.ok([5, 7].includes((walk.tonic - tonicBefore + 12) % 12)); else assert.equal(walk.tonic, tonicBefore);
    last = k;
  }
});
