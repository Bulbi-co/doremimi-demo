// Guards for the deck's story (dossier ch. 14 §9). They import the slides (deck/slides.js) and the phone's script
// (app/data/script.js), the two lists sunum.js and the phone really run. After ch. 14 renumbered the script, the deck
// kept asking for the old steps: slide 5 ("Tur sonu") opened Öğren's round and its "Turu bitir" opened Çal's. Nothing
// failed, because nothing held one list to the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLIDES } from '../deck/slides.js';
import { SCRIPT } from '../app/data/script.js';
import { BANNER_GO } from '../app/data/hub.js';
import { DIFFICULTIES } from '../app/lib/modes.js';
import { LANG_KEYS } from '../app/i18n/index.js';
import { TABS } from '../app/lib/nav.js';
import { knownRoute, ACT_NAMES, flat } from '../tools/phone-routes.mjs';

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

test('the deck tells ch. 14 §9’s story, then §11’s rest of the app: Oyna and its whole round → Öğren → Çal → İzle → the foundation’s tab → family → Ayarlar', () => {
  const order = SLIDES.map(s => s.id);
  const story = ['kesfet', 'ogren', 'cal', 'izle', 'vakif', 'aile', 'ayarlar', 'kapanis'];
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

// ───────────────────────── the walkthrough (dossier ch. 14 §11): every tab and scenario, each step a whole state

const slide = id => SLIDES.find(s => s.id === id);
/** What a slide's steps ask the phone for, a batch opened up: [[act names or hashes of step 1], [of step 2], …]. */
const asked = id => slide(id).acts.map(([, msg]) => flat(msg).map(m => (m.type === 'go' ? m.hash : m.name)));

test('every hash the deck sends is a route the phone has, and every act one the phone knows', () => {
  const all = messages().flatMap(({ slide: id, msg }) => flat(msg).map(m => ({ id, m })));
  assert.ok(all.length > 40, 'the deck’s messages were read');
  for (const { id, m } of all) {
    if (m.type === 'go' || m.type === 'reset') assert.ok(knownRoute(m.hash), `${id} sends the phone to ${m.hash}, which it does not have`);
    else if (m.type === 'act') assert.ok(ACT_NAMES.includes(m.name), `${id} asks for "${m.name}", which the phone does not know`);
    else assert.fail(`${id} sends a message of type ${m.type}`);
  }
  assert.ok(!knownRoute('#/yok') && !knownRoute('#/ogren/yok') && !knownRoute('#/oyunlar'), 'an unknown page, an unknown Öğren tab and a retired route are not routes');
});

test('the deck opens every tab of the dock, each on a slide of its own', () => {
  const entries = SLIDES.filter(s => s.phone).map(s => { const m = flat(s.phone)[0]; return m.type === 'go' ? m.hash : SCRIPT[m.step]?.find(a => a.name === 'page')?.hash; });
  for (const tab of TABS) assert.ok(entries.some(h => h === tab.hash || (tab.key === 'ogren' && h?.startsWith('#/ogren/'))), `no slide opens on ${tab.key} (${tab.hash})`);
});

test('İzle shows a riddle the way a child meets it: the parent gate first, the player only behind the PIN', () => {
  assert.equal(slide('izle').phone.hash, '#/izle');
  assert.deepEqual(asked('izle'), [['#/izle', 'video.open'], ['#/izle', 'video.open', 'gate.type']]);
  // The demo's own PIN, typed by the phone: no step carries one of its own.
  assert.ok(slide('izle').acts.every(([, msg]) => flat(msg).every(m => m.pin === undefined)));
});

test('the logo’s tab shows the banner and then the foundation’s own page, opened by tapping that banner', () => {
  assert.equal(slide('vakif').phone.hash, '#/doremimi');
  const [banner, page] = slide('vakif').acts.map(([, msg]) => flat(msg));
  const shown = banner.find(m => m.name === 'banner.show').index;
  assert.equal(BANNER_GO[shown], '#/vakif', 'the banner the slide brings forward is the one that leads to the foundation’s page');
  assert.deepEqual(page.map(m => (m.type === 'go' ? m.hash : m.name)), ['#/doremimi', 'banner.show', 'tap']);
  assert.equal(page.find(m => m.name === 'banner.show').index, shown);
  assert.equal(page.find(m => m.name === 'tap').sel, `[data-banner="${shown}"]`, 'the tap is on the banner that was shown');
});

test('Ayarlar changes Zorluk once, then the language to English, to French and back to Turkish, each step a whole state', () => {
  const s = slide('ayarlar');
  const states = [s.phone, ...s.acts.map(a => a[1])];
  assert.ok(states.every(m => m.type === 'act' && m.name === 'settings'), 'every message is the whole settings state');
  assert.ok(states.every(m => DIFFICULTIES.some(d => d.key === m.zorluk) && LANG_KEYS.includes(m.dil)), 'each names a real Zorluk and a real language');
  assert.equal(s.phone.quiet, true, 'the slide opens without a press nobody asked for');
  assert.ok(s.acts.every(a => !a[1].quiet), 'the steps press, as a parent would');
  assert.deepEqual(states.map(m => m.dil), ['tr', 'tr', 'en', 'fr', 'tr'], 'Türkçe → English → Français → Türkçe');
  assert.deepEqual([...new Set(states.map(m => m.dil))].sort(), [...LANG_KEYS].sort(), 'all the app’s languages are shown');
  // One thing changes per step, so each press on the phone is the one the button names.
  states.slice(1).forEach((m, i) => assert.equal((m.zorluk !== states[i].zorluk) + (m.dil !== states[i].dil), 1, `step ${i + 1} changes exactly one setting`));
  assert.notEqual(states[1].zorluk, states[0].zorluk, 'the first step is Zorluk');
  // The phone is left in Turkish: the slides after it show it again.
  assert.equal(states.at(-1).dil, 'tr');
  assert.ok(SLIDES.indexOf(s) > SLIDES.indexOf(slide('aile')), 'Ayarlar follows the family slide, where Profilim is');
});

test('Oyna shows the categories and Bugünün kartı before the round starts', () => {
  const steps = slide('kesfet').acts.map(([, msg]) => flat(msg));
  const start = steps.findIndex(m => m.some(x => x.name === 'goto' && x.step === 0));
  const scrolls = steps.slice(0, start).map(m => m.find(x => x.name === 'scroll')?.to);
  assert.deepEqual(scrolls, ['.kats-sec', '.today']);
  // The phone really draws both: a selector that matches nothing scrolls to the top and says nothing.
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  assert.match(app, /<div class="kats-sec">/);
  assert.match(app, /<button class="tile today" data-today="1"/);
});

test('no slide after the cover has more than one sentence of lead, and every slide has presenter notes', () => {
  for (const s of SLIDES) assert.ok((s.notes ?? '').replace(/<[^>]+>/g, '').trim().length > 40, `${s.id} has no presenter notes`);
  for (const id of ['izle', 'vakif', 'ayarlar']) {
    const lead = /<p class="lead">([^<]*)<\/p>/.exec(slide(id).html)[1];
    assert.equal(lead.split(/[.!?](?:\s|$)/).filter(x => x.trim()).length, 1, `${id}: "${lead}" is one sentence`);
    assert.ok(/<h1 class="title tour">[^<]{5,40}<\/h1>/.test(slide(id).html), `${id} has a short title`);
  }
});
