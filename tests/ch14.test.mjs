// Guards for dossier ch. 14 on the demo phone: Keşfet is the game, the way in decides how a round is played, every
// question has a difficulty under the child's level, Öğren has six tabs and the Hazırlan sheet, and the hub leads
// everywhere once. They import the modules the phone runs (lib/modes.js, lib/ladder.js, lib/round.js, data/*). Where
// a rule lives only in app.js, which needs a browser, they read app.js's source for the one line that carries it;
// tools/ch14-e2e.mjs checks the same rules in the running phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RoundOrigin, ORIGIN_RULES, ladderFor, dealRound, byCeiling, prepCount, kesfetCategories, DIFFICULTIES, rankOf } from '../app/lib/modes.js';
import { Level, Move } from '../app/lib/ladder.js';
import { LearningRound, QuestionDeck, Stage } from '../app/lib/round.js';
import { Mastery, newlyEarned, stars } from '../app/lib/progress.js';
import { seeded } from '../app/lib/rng.js';
import { QUESTIONS, LEARNING, SUNUM_DECK, BADGES, CONCEPTS, FAMILIES, SIGN_CARDS, SIGN_CATEGORIES, INTRO_STEPS, LEVEL_QUESTION } from '../app/data/content.js';
import { GROUP_COLORS, DIFFICULTY } from '../app/data/site.js';
import { HUB, HUB_HEADER, hubDestinations } from '../app/data/hub.js';
import { OGREN_TABS, TABS, resolve, PAGE_HOME } from '../app/lib/nav.js';
import { SCRIPT } from '../app/data/script.js';

const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const deck = new QuestionDeck(QUESTIONS);
/** The source between two markers, so a guard reads one function, not the whole file. */
const slice = (from, to) => { const i = app.indexOf(from); assert.ok(i >= 0, `no ${from}`); const j = app.indexOf(to, i + from.length); assert.ok(j > i, `no ${to}`); return app.slice(i, j); };

// ───────────────────────── §3 the way in decides
test('each way in starts where ch. 14 says: Keşfet at Yaz and moving, Öğren at Çevir and Çal at Seç, both fixed', () => {
  assert.deepEqual(Object.values(RoundOrigin).sort(), ['cal', 'kesfet', 'ogren']);
  const k = ladderFor(RoundOrigin.Kesfet, LEARNING.ladder), o = ladderFor(RoundOrigin.Ogren, LEARNING.ladder), c = ladderFor(RoundOrigin.Cal, LEARNING.ladder);
  assert.deepEqual([k.level, k.fixed], [Level.Yaz, false]);
  assert.deepEqual([o.level, o.fixed], [Level.Cevir, true]);
  assert.deepEqual([c.level, c.fixed], [Level.Sec, true]);
  assert.throws(() => ladderFor('oyunlar', LEARNING.ladder), /Unknown round origin/);
});

test('Keşfet starts at Yaz whatever the saved ladder: the round is built from the origin alone', () => {
  // ladderFor takes no saved level at all; app.js must build every round with it and never read profile.ladder back.
  assert.equal(ladderFor.length, 2);
  assert.match(slice('function deal() {', '\n}'), /new LearningRound\(cards, deck, ladderFor\(G\.origin, LEARNING\.ladder\), LEARNING, G\.random\)/);
  assert.doesNotMatch(app, /Level\[profile\.ladder\]|new LevelLadder\(/);
});

test('down only after four struggles in a row in Keşfet; a right answer in between starts the count again', () => {
  assert.equal(LEARNING.ladder.downAfterStruggles, 4);
  const l = ladderFor(RoundOrigin.Kesfet, LEARNING.ladder);
  for (let i = 0; i < 3; i++) assert.equal(l.record('Struggle'), Move.None);
  assert.equal(l.record('Right'), Move.None);
  for (let i = 0; i < 3; i++) assert.equal(l.record('Struggle'), Move.None, 'the run restarted');
  assert.equal(l.record('Struggle'), Move.Down);
  assert.equal(l.level, Level.Sec);
});

test('Keşfet’s ladder still falls and climbs, only slower: 4 struggles to Seç, 4 to Çevir, 2 Bildim up, 3 right to Yaz', () => {
  const round = new LearningRound(deck.all.slice(), deck, ladderFor(RoundOrigin.Kesfet, LEARNING.ladder), LEARNING, seeded(2));
  const moves = [];
  const step = act => { act(); moves.push(round.next().move); };
  const fail = () => round.dontKnow();
  for (let i = 0; i < 8; i++) step(fail);
  assert.deepEqual(moves.filter(m => m !== Move.None), [Move.Down, Move.Down]);
  assert.deepEqual([moves.indexOf(Move.Down), moves.lastIndexOf(Move.Down)], [3, 7], 'on the 4th and the 8th struggle');
  assert.equal(round.ladder.level, Level.Cevir);
  // at Çevir a Bildim is a right answer: two of them climb back to Seç
  for (let i = 0; i < 2; i++) { assert.equal(round.stage, Stage.Question); round.flip(); round.grade(true); moves.push(round.next().move); }
  assert.equal(moves.at(-1), Move.Up);
  assert.equal(round.ladder.level, Level.Sec);
  for (let i = 0; i < 3; i++) { assert.equal(round.stage, Stage.Choices); round.choose(round.current.answer); moves.push(round.next().move); }
  assert.equal(moves.at(-1), Move.Up);
  assert.equal(round.ladder.level, Level.Yaz);
});

test('Öğren and Çal rounds never move, through a whole round of wrong and of right answers', () => {
  for (const [origin, level, play] of [
    [RoundOrigin.Ogren, Level.Cevir, (r, ok) => { assert.equal(r.stage, Stage.Question); r.flip(); r.grade(ok); }],
    [RoundOrigin.Cal, Level.Sec, (r, ok) => { assert.equal(r.stage, Stage.Choices); r.choose(ok ? r.current.answer : r.choices.find(x => x !== r.current.answer)); }],
  ]) {
    for (const ok of [false, true]) {
      const random = seeded(5);
      const round = new LearningRound(deck.all.slice(0, 6), deck, ladderFor(origin, LEARNING.ladder), LEARNING, random);
      while (!round.isOver) { play(round, ok); assert.equal(round.next().move, Move.None); assert.equal(round.ladder.level, level); }
    }
  }
});

test('every way into the game names its origin: Keşfet taps, Çal and the instrument page; Öğren goes through the sheet', () => {
  const tags = app.match(/<button[^>]*data-play="[^"]*"[^>]*>/g) ?? [];
  assert.ok(tags.length >= 3, 'category card, instrument page, song page');
  for (const t of tags) assert.match(t, /data-origin="(kesfet|cal)"/, t);
  for (const t of app.match(/data-do="play"[^>]*/g)) assert.match(t, /data-origin="kesfet"/, t);
  // the category card is Keşfet's; the instrument page and the song are Çal's (Çalgı bilgisi → Seç)
  assert.match(slice('function categoryCard(', '\n}'), /data-play="\$\{id\}" data-origin="kesfet"/);
  assert.match(slice('function instrumentPage(', '\n}'), /data-play="instrument:\$\{qk\}" data-origin="cal"/);
  assert.match(slice('function songPage(', '\n}'), /data-origin="cal"/);
  // Öğren's ways in open the Hazırlan sheet, never the game directly
  for (const f of ['function signCategory(', 'function signCard(', 'function familyCard(']) {
    const body = slice(f, '\n}');
    assert.match(body, /data-prep="/, f);
    assert.doesNotMatch(body, /data-play=/, f);
  }
  assert.match(app, /case 'prep-start': \{ const c = overlay\.data; closeOverlay\(\); return openGame\(\{ concept: c, origin: RoundOrigin\.Ogren \}\); \}/);
  // every call passes an origin, and Tekrar oyna keeps the round's own
  for (const call of app.match(/openGame\(\{[^}]*\}/g)) assert.match(call, /origin/, call);
  assert.match(app, /openGame\(\{ concept: c, origin: G\.origin, intro: false \}\)/);
});

// ───────────────────────── §4 difficulty
test('every question has a difficulty; the instrument ones keep the catalogue’s 14/11/6, the signs take ch. 14’s', () => {
  const keys = DIFFICULTIES.map(d => d.key);
  assert.deepEqual(DIFFICULTIES.map(d => [d.name, d.line]), [['Başlangıç', 'Müziğe yeni başlıyorum'], ['Orta', 'Biraz biliyorum'], ['İleri', 'Zor sorulara hazırım']]);
  for (const q of QUESTIONS) assert.ok(keys.includes(q.difficulty), `${q.id}: ${q.difficulty}`);
  const quiz = QUESTIONS.filter(q => q.kind === 'quiz');
  assert.deepEqual(keys.map(k => quiz.filter(q => q.difficulty === k).length), [14, 11, 6]);
  for (const q of quiz) assert.equal(DIFFICULTY[q.id.slice(2)].split(' ')[0].slice(0, 3), DIFFICULTIES[rankOf(q.difficulty)].name.slice(0, 3), q.id);
  const sign = Object.fromEntries(SIGN_CARDS.map(c => [c.name, c.difficulty]));
  assert.deepEqual(sign, { 'Sol anahtarı': 'baslangic', Porte: 'baslangic', 'Bitiş çizgisi': 'baslangic', Bemol: 'orta', Diyez: 'orta', Natürel: 'ileri', 'Fa anahtarı': 'ileri' });
});

test('the deal is a ceiling: the child’s level first, then below, and above only to fill a short pool, never a repeat', () => {
  for (const level of ['baslangic', 'orta', 'ileri']) {
    for (let seed = 1; seed <= 20; seed++) {
      const cards = dealRound({ deck, origin: RoundOrigin.Kesfet, level, mastery: new Mastery(LEARNING), random: seeded(seed), count: 6 });
      assert.equal(cards.length, 6);
      // each level has at least 6 questions, so a whole-deck round is all the child's own level
      assert.deepEqual([...new Set(cards.map(q => q.difficulty))], [level], `${level} seed ${seed}`);
    }
  }
  // a short concept: Keman has 2 Başlangıç, 2 Orta, 1 İleri; a Başlangıç child gets those first, then Orta, then İleri
  const violin = dealRound({ deck, origin: RoundOrigin.Cal, concept: 'instrument:violin', level: 'baslangic', mastery: new Mastery(LEARNING), random: seeded(3), count: 6 });
  assert.equal(new Set(violin).size, violin.length, 'no card twice');
  assert.deepEqual(violin.slice(0, 5).map(q => q.difficulty), ['baslangic', 'baslangic', 'orta', 'orta', 'ileri']);
  assert.equal(violin[5].difficulty, 'baslangic', 'the top-up from other instruments is under the ceiling too');
  // and an İleri child's top-up is İleri, whatever the shuffle: Keman has one İleri card, the deck five more
  for (let seed = 1; seed <= 10; seed++) {
    const hard = dealRound({ deck, origin: RoundOrigin.Cal, concept: 'instrument:violin', level: 'ileri', mastery: new Mastery(LEARNING), random: seeded(seed), count: 6 });
    assert.equal(hard[0].difficulty, 'ileri');
    assert.equal(hard[5].difficulty, 'ileri', `seed ${seed}: top-up ${hard[5].id}`);
  }
  // an Orta child prefers Orta, then the level below before the one above
  assert.deepEqual(byCeiling(['ileri', 'baslangic', 'orta'].map(difficulty => ({ difficulty })), 'orta').map(q => q.difficulty), ['orta', 'baslangic', 'ileri']);
  // no level yet: the deck's order, unfiltered
  const all = deck.all.slice(0, 9);
  assert.deepEqual(byCeiling(all, null), all);
});

test('the first game asks the level before anything else and stores it; Ayarlar › Zorluk changes it', () => {
  assert.equal(LEVEL_QUESTION, 'Hangi seviyeden başlayalım?');
  const open = slice('function openGame(', '\n}');
  assert.match(open, /const pages = \[\.\.\.\(profile\.difficulty \? \[\] : \['level'\]\), \.\.\.INTRO_STEPS\.map\(x => x\.key\)\];/);
  assert.match(open, /\|\| !profile\.difficulty\)\s*\? \{ step: 0, pages/);
  assert.match(slice('function chooseLevel(', '\n}'), /profile\.difficulty = key; save\(\);[\s\S]*deal\(\)/);
  assert.match(slice('function introHtml(', '\n}'), /data-level="\$\{d\.key\}"/);
  assert.match(app, /if \(t\.dataset\.level\) return chooseLevel\(t\.dataset\.level\);/);
  assert.match(slice('function settingsPage(', '\n}'), /data-zorluk="\$\{d\.key\}"/);
  assert.match(app, /if \(t\.dataset\.zorluk\) \{ profile\.difficulty = t\.dataset\.zorluk; save\(\);/);
  // and the round is dealt under it
  assert.match(slice('function deal() {', '\n}'), /level: profile\.difficulty/);
});

test('a round at exactly half right still earns two stars (learning.json roundStars.twoAt)', () => {
  const o = r => ({ resolution: r });
  assert.equal(stars([o('TypedFirstTry'), o('Skipped')], LEARNING.roundStars), 2);
  assert.equal(stars([o('TypedFirstTry'), o('Skipped'), o('Skipped')], LEARNING.roundStars), 1);
});

// ───────────────────────── §2 no level names in front of the child
const LEVEL_WORD = /(?<!\p{L})(Çevir|Seç|Yaz|ÇEVİR|SEÇ|YAZ|Yazma|Seçme|Çevirme)(?!\p{L})/u;
/** String content only: comments go, so a note to the next developer that names a level is not a failure. */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

test('no level name reaches the screen: the game, its intro, results and badges (plain verbs on a control stay)', () => {
  const game = code(slice('// ───────────────────────── the game (MusicCardGameViewModel.cs)', '// ───────────────────────── taps'));
  assert.doesNotMatch(game, LEVEL_WORD, game.match(LEVEL_WORD)?.[0]);
  assert.doesNotMatch(game, /ladderHtml|ladder-line|levelLabel|Seviye<\/small>/);
  for (const s of INTRO_STEPS) assert.doesNotMatch(`${s.title} ${s.text}`, LEVEL_WORD, s.title);
  for (const b of BADGES) assert.doesNotMatch(`${b.name} ${b.description}`, LEVEL_WORD, b.id);
  assert.deepEqual(BADGES.filter(b => ['yazma-zirvesi', 'cevir-kahramani'].includes(b.id)).map(b => [b.name, b.description]),
    [['Zirve', 'Zorlandın ama yine en üste tırmandın!'], ['Kart Kahramanı', 'Kartları çevirip üç kez "Bildim" dedin.']]);
  // Keşfet's OYNA shows the moves, never their names
  assert.doesNotMatch(code(slice('function oynaHtml(', '\n}')), LEVEL_WORD);
  // the verbs a child presses are not level names and stay
  assert.match(game, /Kartı çevir/);
  assert.match(game, /Cevabını yaz/);
});

// ───────────────────────── §5 Öğren
test('Öğren has six tabs, in ch. 14’s order, each a root of the Öğren tab with its own page', () => {
  assert.deepEqual(OGREN_TABS.map(t => t.label), ['İşaretler', 'Çalgılar', 'Aileler', 'Bilmeceler', 'Değerler', 'Notalar']);
  for (const t of OGREN_TABS) {
    assert.deepEqual([resolve(`#/ogren/${t.key}`).kind, resolve(`#/ogren/${t.key}`).tab, resolve(`#/ogren/${t.key}`).segment], ['root', 'ogren', t.key]);
    assert.match(slice('const LEARN_TABS = {', '\n};'), new RegExp(`\\n  ${t.key}: \\(\\) =>`), t.key);
  }
  assert.equal(TABS.find(t => t.key === 'ogren').hash, '#/ogren/isaretler');
  assert.doesNotMatch(app, /segtrack/, 'the two-button track is gone');
});

test('the Hazırlan sheet says the true count, and the round deals exactly that category, every card of it', () => {
  const cats = kesfetCategories(deck, CONCEPTS);
  for (const c of cats) {
    const cards = dealRound({ deck, origin: RoundOrigin.Ogren, concept: c, level: 'baslangic', mastery: new Mastery(LEARNING), random: seeded(9), count: LEARNING.cardsPerRound });
    assert.equal(cards.length, prepCount(deck, c), c);
    assert.ok(cards.every(q => q.conceptIds.includes(c)), `${c}: no other category's cards`);
    assert.equal(new Set(cards).size, cards.length);
  }
  assert.equal(prepCount(deck, 'signcat:bemol'), 1, 'a sign category has one card today, and the sheet says 1');
  assert.equal(prepCount(deck, 'family:YayliCalgilar'), 7, 'more than a round: Öğren reads the whole family');
  assert.match(slice('function prepHtml(', '\n}'), /const n = prepCount\(deck, concept\);[\s\S]*Bu kategoride \$\{n\} kart var/);
});

// ───────────────────────── §1 Keşfet
test('Keşfet is OYNA, the twelve categories in one grid and Bugünün kartı; no Tekrar row, no İşaretler/Çalgılar split', () => {
  const cats = kesfetCategories(deck, CONCEPTS);
  assert.equal(cats.length, 12);
  assert.deepEqual(cats.slice(0, 7), SIGN_CATEGORIES.map(c => 'signcat:' + c.key));
  assert.deepEqual(cats.slice(7), Object.keys(FAMILIES).map(k => 'family:' + k));
  const home = slice('function home() {', '\n}');
  assert.match(home, /\$\{oynaHtml\(\)\}[\s\S]*Kategoriler[\s\S]*kesfetCategories\(deck, CONCEPTS\)\.map\(categoryCard\)[\s\S]*\$\{todayHtml\(\)\}/);
  assert.doesNotMatch(code(app), /Tekrar zamanı|data-do="review"|'İŞARETLER'|'ÇALGILAR'/);
  // OYNA is a circle, and its card loop stops under reduced motion (every animation does: style.css's last rules)
  assert.match(slice('function oynaHtml(', '\n}'), /class="chunky oyna circle" data-do="play" data-origin="kesfet"/);
  const css = readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.chunky\.oyna\.circle \{[^}]*width: min\(56%, 220px\); aspect-ratio: 1;/);
  assert.match(css, /animation: okFlip 4\.5s/);
});

// CIEDE2000 (Sharma, Wu and Dalal 2005), checked against three pairs of their published test data below.
function lab(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const X = (c[0] * 0.4124564 + c[1] * 0.3575761 + c[2] * 0.1804375) / 0.95047, Y = c[0] * 0.2126729 + c[1] * 0.7151522 + c[2] * 0.0721750, Z = (c[0] * 0.0193339 + c[1] * 0.1191920 + c[2] * 0.9503041) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function de2000([L1, a1, b1], [L2, a2, b2]) {
  const r = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7))), ap1 = a1 * (1 + G), ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const h = (b, a) => { if (a === 0 && b === 0) return 0; const x = Math.atan2(b, a) / r; return x < 0 ? x + 360 : x; };
  const hp1 = h(b1, ap1), hp2 = h(b2, ap2), dL = L2 - L1, dC = Cp2 - Cp1;
  let dh = 0; if (Cp1 * Cp2 !== 0) { dh = hp2 - hp1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(dh * r / 2), Lb = (L1 + L2) / 2, Cpb = (Cp1 + Cp2) / 2;
  let hb = hp1 + hp2; if (Cp1 * Cp2 !== 0) { if (Math.abs(hp1 - hp2) > 180) hb = hb < 360 ? hb + 360 : hb - 360; hb /= 2; }
  const T = 1 - 0.17 * Math.cos((hb - 30) * r) + 0.24 * Math.cos(2 * hb * r) + 0.32 * Math.cos((3 * hb + 6) * r) - 0.20 * Math.cos((4 * hb - 63) * r);
  const dt = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7));
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cpb, SH = 1 + 0.015 * Cpb * T, RT = -Math.sin(2 * dt * r) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
const dE = (a, b) => de2000(lab(a), lab(b));

test('the colour distance is CIEDE2000: three pairs of Sharma et al.’s test data', () => {
  assert.equal(de2000([50, 2.6772, -79.7751], [50, 0, -82.7485]).toFixed(4), '2.0425');
  assert.equal(de2000([50, -1.3802, -84.2814], [50, 0, -82.7485]).toFixed(4), '1.0000');
  assert.equal(de2000([50, 2.5, 0], [73, 25, -18]).toFixed(4), '27.1492');
});

test('the twelve Keşfet colours and the seven group colours are at least ΔE 15 apart (sign pairs are content)', () => {
  const cats = kesfetCategories(deck, CONCEPTS).map(id => [id, CONCEPTS[id].color]);
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
    const [[a, ca], [b, cb]] = [cats[i], cats[j]];
    // Sign colours are the book series' and stay (ch. 14 §1); Diyez–Fa measures 14.6, which this change cannot move.
    if (a.startsWith('signcat:') && b.startsWith('signcat:')) continue;
    assert.ok(dE(ca, cb) >= 15, `${a} ${ca} – ${b} ${cb}: ${dE(ca, cb).toFixed(1)}`);
  }
  const groups = Object.entries(GROUP_COLORS);
  assert.equal(groups.length, 7);
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) assert.ok(dE(groups[i][1], groups[j][1]) >= 15, `${groups[i][0]} – ${groups[j][0]}`);
  // one family colour everywhere it is used: the family, its directory group, its concept and its badge
  const GROUP_OF = { TelliCalgilar: 'Telli', YayliCalgilar: 'Yaylı', VurmaliCalgilar: 'Vurmalı', TusluCalgilar: 'Tuşlu', NefesliUflemeliCalgilar: 'Nefesli' };
  for (const [k, f] of Object.entries(FAMILIES)) {
    assert.equal(GROUP_COLORS[GROUP_OF[k]], f.color, k);
    assert.equal(CONCEPTS['family:' + k].color, f.color, k);
    assert.equal(BADGES.find(b => b.conceptId === 'family:' + k).color, f.color, k);
  }
});

// ───────────────────────── §6 the hub
test('the hub leads everywhere once, every place it leads exists, and the foundation is its header', () => {
  const to = hubDestinations();
  assert.equal(new Set(to).size, to.length, `duplicates: ${to.filter((x, i) => to.indexOf(x) !== i)}`);
  assert.deepEqual(HUB.map(g => g.title), ['Faaliyetler', 'Katıl', 'Tanış', 'Bize ulaş', 'Uygulama']);
  assert.equal(HUB_HEADER.push, '#/vakif');
  for (const d of to.filter(x => x.startsWith('#/'))) {
    const r = resolve(d);
    if (r.kind === 'root') continue;
    assert.equal(r.kind, 'page', d);
    assert.ok(r.page in PAGE_HOME, `${d} has no home`);
    assert.match(app, new RegExp(`\\n  '?${r.page}'?: \\{ title:`), `${d} is not a page app.js draws`);
  }
  assert.ok(to.includes('#/ogren/degerler'), 'Müzikle Değerler Eğitimi opens Öğren › Değerler');
  assert.match(slice('function hub() {', '\n}'), /HUB\.map\(/);
});

// ───────────────────────── the deck's story (ch. 14 §9), played through the real rules
test('the deck’s script plays as ch. 14 tells it: Keşfet writes, Öğren turns cards, Çal picks, nothing moves the child', () => {
  const mastery = new Mastery(LEARNING);
  const earned = [];
  const run = round => () => { const o = round.next(); mastery.record(o.questionId, o.evidence); earned.push(...newlyEarned(BADGES, { mastery, deck, round: round.outcomes, days: [] }, earned).map(b => b.id)); return o; };
  // Keşfet's round over the fixed deck (steps 0-8)
  let random = seeded(11);
  const k = new LearningRound(SUNUM_DECK.map(id => deck.find(id)), deck, ladderFor(RoundOrigin.Kesfet, LEARNING.ladder), LEARNING, random);
  const endK = run(k);
  assert.equal(k.submit('sol').verdict, 'Wrong');
  k.tiles.type(k.tiles.tiles.filter(t => t.kind === 'Letter' && !t.prefilled).map(t => t.letter.toLocaleLowerCase('tr')).join(''));
  assert.equal(k.submitTiles().verdict, 'Right'); endK();
  k.submit('bemol'); k.tiles.type('solm');
  assert.equal(k.submitTiles().verdict, 'Wrong', 'solm must not pass as a typo of diyez');
  assert.equal(k.stage, Stage.Choices);
  k.choose(k.choices.find(c => c !== k.current.answer)); assert.equal(endK().move, Move.None);
  assert.equal(k.current.id, 'sign:bemol');
  assert.equal(k.stage, Stage.Typing, 'one struggle does not take the child off Yaz');
  assert.equal(k.submit('bemol').verdict, 'Right'); endK();
  assert.equal(k.ladder.level, Level.Yaz);
  // Diyez, picked wrong, comes back two cards later; Fa anahtarı, found with the tiles, counts as learned (Baba Sesler)
  assert.deepEqual(k.queue.map(x => x.question.id), ['sign:fa-anahtari', 'sign:diyez', 'sign:bemol', 'q:guitar-family', 'sign:diyez', 'q:violin-family', 'q:guitar-strings']);
  assert.deepEqual(earned, ['ilk-nota', 'baba-sesler', 'bemol-avcisi']);
  // Öğren › Aileler › Yaylı: the sheet's 7 cards, turned over (steps 10-11)
  random = seeded(11);
  const oCards = dealRound({ deck, origin: RoundOrigin.Ogren, concept: 'family:YayliCalgilar', level: 'baslangic', mastery, random, count: LEARNING.cardsPerRound });
  const o = new LearningRound(oCards, deck, ladderFor(RoundOrigin.Ogren, LEARNING.ladder), LEARNING, random);
  assert.equal(o.count, 7);
  assert.equal(o.stage, Stage.Question);
  o.flip(); o.grade(true); run(o)();
  // Çal › Keman: Bu çalgıyla oyna, every card at the choices, all right (steps 13-14)
  random = seeded(11);
  const cCards = dealRound({ deck, origin: RoundOrigin.Cal, concept: 'instrument:violin', level: 'baslangic', mastery, random, count: LEARNING.cardsPerRound });
  const c = new LearningRound(cCards, deck, ladderFor(RoundOrigin.Cal, LEARNING.ladder), LEARNING, random);
  const endC = run(c);
  const before = earned.length;
  while (!c.isOver) { assert.equal(c.stage, Stage.Choices); assert.equal(c.choose(c.current.answer), true); endC(); }
  assert.equal(c.ladder.level, Level.Sec);
  // what the running phone showed for this round (ch14-37-script-results.png): 6/6, +24 XP, 3 stars, Yaylı Şarkıcı
  assert.deepEqual([c.count, c.xpEarned, stars(c.outcomes, LEARNING.roundStars)], [6, 24, 3]);
  assert.deepEqual(earned.slice(before), ['yayli-sarkici']);
  // and the script the phone plays (app/data/script.js) is that story
  const script = JSON.stringify(SCRIPT);
  assert.match(script, /"name":"game\.start","deck":"sunum","origin":"kesfet","intro":true/);
  assert.match(script, /"name":"prep\.open","hash":"#\/ogren\/aileler","concept":"family:YayliCalgilar"/);
  assert.match(script, /"name":"song\.game","hash":"#\/sarki\/keman"/);
  assert.doesNotMatch(script, /"level":/, 'the script never picks a level');
});
