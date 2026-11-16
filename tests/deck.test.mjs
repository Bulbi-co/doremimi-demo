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
  // Up to Çal's page (step 12). The script's last three steps (a song's round and its results) are no longer shown:
  // owner, 2026-11-16, no way into the game from a song and no XP on screen.
  assert.equal(Math.max(...steps), SCRIPT.findIndex(acts => acts.some(x => x.name === 'page' && x.hash === '#/cal')), 'the deck ends its script on Çal’s page');
  // Nothing is skipped in front of the audience: every played step follows the one before it by exactly one, so the
  // phone never fast-replays moves between two buttons (the flash the owner recorded between steps 2 and 6).
  const played = messages().filter(m => isGoto(m.msg) && m.msg.play).map(m => m.msg.step);
  played.forEach((k, i) => i && played[i - 1] < 9 && k < 9 && assert.equal(k, played[i - 1] + 1, `the round plays step ${played[i - 1] + 1} before step ${k}`));
});

test('the deck tells ch. 14 §9’s story: Oyna and its whole round → Öğren → Çal → family → foundation', () => {
  const order = SLIDES.map(s => s.id);
  const story = ['kesfet', 'ogren', 'cal', 'aile', 'kapanis'];
  assert.deepEqual(order.filter(id => story.includes(id)), story);
  // The whole round is played on the Oyna slide (owner, 2026-11-16), a family's instruments and one instrument's
  // page on Öğren. No slide shows results or XP, and none opens the game from a song.
  for (const id of ['oyun', 'sonuc']) assert.ok(!order.includes(id), `the ${id} slide is gone`);
  assert.equal(playedOn(stepWith('game.start', { origin: 'kesfet' })), 'kesfet');
  assert.equal(playedOn(stepWith('game.type', { text: 'sol' })), 'kesfet');
  assert.equal(playedOn(stepWith('game.choose', { right: false })), 'kesfet');
  assert.equal(playedOn(stepWith('open', { hash: '#/ogren/aileler' })), 'ogren');
  assert.equal(playedOn(stepWith('open', { hash: '#/ogren/calgilar?aile=yayli' })), 'ogren');
  for (const name of ['song.game', 'game.finish', 'results.scroll']) assert.equal(playedOn(stepWith(name)), undefined, `${name} is not shown`);
  assert.doesNotMatch(SLIDES.map(s => `${s.html} ${s.notes ?? ''} ${(s.acts ?? []).map(x => x[0]).join(' ')}`).join(' '), /\bXP\b|bu çalgıyla oyna/i);
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
