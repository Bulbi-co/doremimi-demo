// Guards for the deck's story (dossier ch. 14 §9, and the full walk of §11). They import the slides (deck/slides.js) and the phone's script
// (app/data/script.js), the two lists sunum.js and the phone really run. After ch. 14 renumbered the script, the deck
// kept asking for the old steps: slide 5 ("Tur sonu") opened Öğren's round and its "Turu bitir" opened Çal's. Nothing
// failed, because nothing held one list to the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLIDES, readMs } from '../deck/slides.js';
import { TABS, OGREN_TABS } from '../app/lib/nav.js';
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

// The walk of ch. 14 §11, in the order the slides tell it. Read as a subsequence, so §13's slides on the foundation's
// record can sit after the cover without this list naming them.
const WALK = ['kapak', 'gezinme', 'ilk', 'oyun', 'secenek', 'yardim', 'sonuc', 'kategoriler', 'ogren', 'ogren-calgi', 'izle',
  'cal', 'cal-oyun', 'doremimi', 'vakif', 'profil', 'pin', 'ayarlar', 'dil', 'platform', 'kapanis'];

test('the deck walks ch. 14 §11 start to finish: first launch, a round, every tab, the family, settings, platforms', () => {
  const order = SLIDES.map(s => s.id);
  assert.deepEqual(order.filter(id => WALK.includes(id)), WALK);
  assert.equal(new Set(order).size, order.length, 'slide ids are unique');
  // Each scenario is played in view, on the slide that tells it (play, not the fast replay of at).
  const on = {
    ilk: [stepWith('game.start', { origin: 'kesfet' }), stepWith('intro.finish')],
    oyun: [stepWith('game.type', { text: 'sol' }), stepWith('game.fill')],
    secenek: [stepWith('game.choose', { right: false })],
    yardim: [stepWith('game.dontknow'), stepWith('game.flip')],
    sonuc: [stepWith('game.finish'), stepWith('results.scroll')],
    kategoriler: [stepWith('scroll', { to: '.kats-sec' }), stepWith('tap', { sel: '[data-play="family:TelliCalgilar"]' }), stepWith('tap', { sel: '[data-today]' })],
    ogren: [stepWith('sign.flip'), stepWith('tap', { sel: '[data-push="#/isaret/diyez"]' })],
    'ogren-calgi': [stepWith('tap', { sel: '[data-fam="YayliCalgilar"]' }), stepWith('tap', { sel: '[data-push="#/calgi/keman"]' }), stepWith('page', { hash: '#/ogren/degerler' })],
    izle: [stepWith('video.open'), stepWith('gate.type')],
    cal: [stepWith('keys.play'), stepWith('song.play')],
    'cal-oyun': [stepWith('song.game')],
    doremimi: [stepWith('banner.show'), stepWith('tap', { sel: '[data-banner="3"]' })],
    vakif: [stepWith('tap', { sel: '[data-push="#/burslar"]' }), stepWith('open', { tap: '[data-push="#/etkinlikler"]' }), stepWith('open', { tap: '[data-push="#/dore-ve-mimi"]' })],
    profil: [stepWith('scroll', { to: '.plist.stats' }), stepWith('switcher.open')],
    pin: [stepWith('gate.open', { row: 'hesabim' })],
    ayarlar: [stepWith('tap', { sel: '[data-zorluk="orta"]' })],
    dil: [stepWith('tap', { sel: '[data-dil="en"]' }), stepWith('tap', { sel: '[data-dil="fr"]' }), stepWith('tap', { sel: '[data-dil="tr"]' })],
  };
  for (const [slide, steps] of Object.entries(on)) for (const k of steps) {
    assert.ok(k >= 0, `${slide}: a step the script does not have`);
    assert.equal(playedOn(k), slide, `step ${k} (${JSON.stringify(SCRIPT[k])}) is played on ${slide}`);
  }
  // The second PIN of the walk is the pin slide's (the first opens İzle's video).
  const pins = SCRIPT.flatMap((acts, i) => acts.some(a => a.name === 'gate.type') ? [i] : []);
  assert.deepEqual(pins.map(playedOn), ['izle', 'pin']);
  // Dil switches to English, to French, and back, in that order, so the walk ends in Türkçe.
  const langs = SCRIPT.flatMap(acts => acts.flatMap(a => a.sel?.match(/data-dil="(\w+)"/)?.[1] ?? []));
  assert.deepEqual(langs, ['en', 'fr', 'tr']);
  assert.equal(SCRIPT.at(-1)[0].hash, '#/doremimi', 'the deck closes on the foundation’s tab');
  assert.equal(SLIDES.at(-1).id, 'kapanis');
  assert.deepEqual(SLIDES.at(-1).phone, { type: 'act', name: 'goto', step: SCRIPT.length - 1 });
});

test('every tab and every Öğren tab is opened by the walk', () => {
  const hashes = new Set(SCRIPT.flat().filter(a => a.hash).map(a => a.hash));
  for (const tab of TABS) assert.ok(hashes.has(tab.hash), `the walk never opens ${tab.hash}`);
  // Çalgılar is opened the way a child opens it there, from a family card (its data-go is #/ogren/calgilar?aile=…).
  const taps = SCRIPT.flat().map(a => a.sel ?? a.tap).filter(Boolean);
  for (const { key } of OGREN_TABS) {
    assert.ok(hashes.has(`#/ogren/${key}`) || (key === 'calgilar' && taps.some(s => s.startsWith('[data-fam='))), `the walk never opens Öğren › ${key}`);
  }
});

test('every phone message after the cover is a step of the script, so a forward walk never starts the phone over', () => {
  // A plain go() would leave the phone off the script, and the next at(k) would replay everything from a fresh child.
  for (const { slide, msg } of messages().filter(m => m.slide !== 'kapak')) assert.ok(isGoto(msg), `${slide} sends ${JSON.stringify(msg)}`);
  assert.equal(SLIDES[0].phone.type, 'reset', 'the cover starts the phone fresh');
});

test('each tab’s slide opens on its own tab, as a step of the script', () => {
  for (const [id, tab] of [['kategoriler', '#/'], ['ogren', '#/ogren/'], ['izle', '#/izle'], ['cal', '#/cal'], ['doremimi', '#/doremimi'], ['profil', '#/profil'], ['ayarlar', '#/ayarlar']]) {
    const { phone } = SLIDES.find(s => s.id === id);
    assert.ok(isGoto(phone) && !phone.play, `${id} enters with at(k)`);
    const acts = SCRIPT[phone.step];
    assert.ok(acts.length === 1 && acts[0].name === 'page' && acts[0].hash.startsWith(tab), `${id} lands on ${tab} (step ${phone.step}: ${JSON.stringify(acts)})`);
  }
});

test('auto-play reads each slide for long enough: its reading time grows with its words and has a floor', () => {
  const short = readMs({ html: '<h1>İki kelime</h1>' }), long = readMs({ html: '<p>' + 'kelime '.repeat(30) + '</p>' });
  assert.ok(long > short);
  for (const s of SLIDES) assert.ok(readMs(s) >= 3000, `${s.id} is read in ${readMs(s)} ms`);
});

test('the deck no longer tells the old ladder story, and nothing it shows names a mode as a level', () => {
  const text = SLIDES.map(s => `${s.html} ${s.notes ?? ''} ${(s.acts ?? []).map(a => a[0]).join(' ')}`).join('\n');
  for (const old of [/Çevir'e iner/, /Yaz\s*→\s*Seç/, /merdiven/i, /iki zorlanma/i, /Önce yaz, sonra seç/, /Konu seç/, /Tekrar zamanı/, /Seviye(si)? (Yaz|Seç|Çevir)/]) {
    assert.doesNotMatch(text, old);
  }
  assert.ok(SCRIPT.flat().every(a => !('level' in a)), 'the script never picks a level');
});
