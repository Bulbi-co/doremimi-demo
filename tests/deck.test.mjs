// Guards for the deck's story (dossier ch. 14 §9). They import the slides (deck/slides.js) and the phone's script
// (app/data/script.js), the two lists sunum.js and the phone really run. After ch. 14 renumbered the script, the deck
// kept asking for the old steps: slide 5 ("Tur sonu") opened Öğren's round and its "Turu bitir" opened Çal's. Nothing
// failed, because nothing held one list to the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLIDES } from '../deck/slides.js';
import { SCRIPT } from '../app/data/script.js';

/** Every phone message on the deck in the order → sends them: each slide's own, then its steps. */
const messages = () => SLIDES.flatMap(s => [
  ...(s.phone ? [{ slide: s.id, msg: s.phone, entry: true }] : []),
  ...(s.acts ?? []).map(([label, msg]) => ({ slide: s.id, msg, label })),
]);
const isGoto = m => m.type === 'act' && m.name === 'goto';
/** The slide whose step plays script step k where the audience sees it (play, not the fast replay of at). */
const playedOn = k => messages().find(({ msg }) => isGoto(msg) && msg.play && msg.step === k)?.slide;
const stepWith = (name, extra = {}) => SCRIPT.findIndex(acts => acts.some(a => a.name === name && Object.entries(extra).every(([k, v]) => a[k] === v)));

test('every scripted step the deck asks for is in the phone’s script', () => {
  for (const { slide, msg } of messages().filter(m => isGoto(m.msg))) {
    assert.ok(Number.isInteger(msg.step) && msg.step >= 0 && msg.step < SCRIPT.length, `${slide} asks for step ${msg.step} of ${SCRIPT.length}`);
  }
});

test('walking the deck with → plays the script front to back, once, to its last step', () => {
  // Rising order means a forward walk never sends the phone back, which would start the round over from a fresh
  // child and replay it in front of the audience.
  const steps = messages().filter(m => isGoto(m.msg)).map(m => m.msg.step);
  steps.forEach((k, i) => i && assert.ok(k >= steps[i - 1], `step ${k} comes after step ${steps[i - 1]}`));
  assert.equal(Math.max(...steps), SCRIPT.length - 1, 'the deck reaches the script’s last step');
});

test('the deck tells ch. 14 §9’s story: Keşfet → its written round → Öğren → Çal → results → family → foundation', () => {
  const order = SLIDES.map(s => s.id);
  const story = ['kesfet', 'oyun', 'ogren', 'cal', 'sonuc', 'aile', 'kapanis'];
  assert.deepEqual(order.filter(id => story.includes(id)), story);
  // Each part is played on its own slide, in view: the level question on Keşfet, the typing on Oyun, the Hazırlan
  // sheet and the turned card on Öğren, the song's round at the choices on Çal, the round's end on Tur sonu.
  assert.equal(playedOn(stepWith('game.start', { origin: 'kesfet' })), 'kesfet');
  assert.equal(playedOn(stepWith('game.type', { text: 'sol' })), 'oyun');
  assert.equal(playedOn(stepWith('game.choose', { right: false })), 'oyun');
  assert.equal(playedOn(stepWith('prep.open')), 'ogren');
  assert.equal(playedOn(stepWith('game.flip')), 'ogren');
  assert.equal(playedOn(stepWith('song.game')), 'cal');
  assert.equal(playedOn(stepWith('game.finish')), 'sonuc');
  assert.equal(playedOn(stepWith('results.scroll')), 'sonuc');
  assert.equal(SLIDES.find(s => s.id === 'kapanis').phone.hash, '#/doremimi', 'the deck closes on the foundation’s page');
});

test('Öğren and Çal open on their own tab, as a step of the script', () => {
  // A plain go() here would put the phone off the script, and the next step would replay the whole round first.
  for (const [id, tab] of [['ogren', '#/ogren/'], ['cal', '#/cal']]) {
    const { phone } = SLIDES.find(s => s.id === id);
    assert.ok(isGoto(phone) && !phone.play, `${id} enters with at(k)`);
    const acts = SCRIPT[phone.step];
    assert.ok(acts.length === 1 && acts[0].name === 'page' && acts[0].hash.startsWith(tab), `${id} lands on ${tab} (step ${phone.step}: ${JSON.stringify(acts)})`);
  }
});

test('the deck no longer tells the old ladder story, and nothing it shows names a mode as a level', () => {
  const text = SLIDES.map(s => `${s.html} ${s.notes ?? ''} ${(s.acts ?? []).map(a => a[0]).join(' ')}`).join('\n');
  for (const old of [/Çevir'e iner/, /Yaz\s*→\s*Seç/, /merdiven/i, /iki zorlanma/i, /Önce yaz, sonra seç/, /Konu seç/, /Tekrar zamanı/, /Seviye(si)? (Yaz|Seç|Çevir)/]) {
    assert.doesNotMatch(text, old);
  }
  assert.ok(SCRIPT.flat().every(a => !('level' in a)), 'the script never picks a level');
});
