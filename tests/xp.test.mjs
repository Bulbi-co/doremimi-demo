// Guards for dossier ch. 14 §14 on the demo's phone: no XP and no gold anywhere on screen, in Turkish, English or
// French, and the XP level ("Seviye N") is never a chip, a card, a popup or a line. The number itself is still recorded:
// it is the backend's record of progress and orders nothing on screen.
//
// These read the sources of everything a screen can show (the string tables, the localised content, app.js's templates,
// the stylesheet). The screens as the browser draws them are asked by tools/xp-e2e.mjs, which needs Chrome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI } from '../app/i18n/ui.js';
import { LANG_KEYS } from '../app/i18n/index.js';
import { localise } from '../app/data/localise.js';
import { LEARNING } from '../app/data/content.js';
import { addXp } from '../app/lib/progress.js';
import { XP_WORD, GOLD_WORD, LEVEL_NUMBER } from './xp-words.mjs';

const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');
/** Comments go: a note that says why XP is not drawn is not XP on screen. */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
const js = code(app);
const slice = (from, to) => { const i = js.indexOf(from); assert.ok(i >= 0, `no ${from}`); const j = js.indexOf(to, i + from.length); assert.ok(j > i, `no ${to} after ${from}`); return js.slice(i, j); };

/** Every string under a value, with the path to it. */
const strings = (v, path = '') => typeof v === 'string' ? [[path, v]]
  : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => strings(x, path ? `${path}.${k}` : k)) : [];

test('no string the phone can show names XP, gold or an XP level, in any language: the tables and the content', () => {
  assert.deepEqual(LANG_KEYS, ['tr', 'en', 'fr']);
  for (const lang of LANG_KEYS) {
    const all = [...strings(UI[lang], 'ui'), ...strings(localise(lang), 'content')];
    assert.ok(all.length > 800, `${lang}: ${all.length} strings read`);
    for (const [path, s] of all) {
      assert.doesNotMatch(s, XP_WORD, `${lang} ${path}`);
      assert.doesNotMatch(s, GOLD_WORD, `${lang} ${path}`);
      assert.doesNotMatch(s, LEVEL_NUMBER, `${lang} ${path}`);
    }
  }
});

// The app's own lists, copied unchanged and shown as they are (İzle's titles, the lyric sheets, the library). They stay
// Turkish and are the foundation's words, so only the word that is never right on a screen is asked of them: a song
// may one day sing of gold, and a method book may be called "Seviye 2".
test('the videos, lyric sheets and library lists the phone shows never say XP either', () => {
  let read = 0;
  for (const file of ['videos', 'lyrics', 'library']) {
    const all = strings(JSON.parse(readFileSync(new URL(`../app/data/site/${file}.json`, import.meta.url), 'utf8')), file);
    read += all.length;
    for (const [path, s] of all) assert.doesNotMatch(s, XP_WORD, path);
  }
  assert.ok(read > 500, `${read} strings read`);
});

test('in the tables "Seviye" is left only where it means difficulty, Ayarlar › Zorluk, and the XP keys are gone', () => {
  const WORD = { tr: /seviye/iu, en: /level/iu, fr: /niveau/iu };
  for (const lang of LANG_KEYS) {
    const named = Object.keys(UI[lang]).filter(k => strings(UI[lang][k]).some(([, s]) => WORD[lang].test(s)));
    assert.deepEqual(named.filter(k => !k.startsWith('settings.zorluk')), [], `${lang}: a level outside Zorluk`);
  }
  // the keys the level chip, its card, the popup and the XP lines were drawn from are gone, not just unused
  for (const lang of LANG_KEYS) {
    assert.deepEqual(Object.keys(UI[lang]).filter(k => /^(xp|levelUp)\.|^level(\.n)?$|^(results\.xp|profile\.xpNote|profile\.rank|panel\.level|game\.levelChip|stats\.best)$/.test(k)), [], lang);
  }
  // Profilim's row into the parent panel says what the panel now holds. The words are the app's on its §14 branch
  // ("Çocukların seviyesi ve pratiği" on its main until that lands, so app-parity cannot hold this one yet).
  assert.equal(UI.tr['profile.panel.line'], 'Çocukların pratiği ve rozetleri');
});

test('the intro’s last page promises stars and nothing else, in §14’s words', () => {
  assert.equal(localise('tr').INTRO_STEPS.at(-1).text, 'Doğru cevaplar yıldız getirir. Yanlış cevap hiçbir şey kaybettirmez.');
  assert.match(localise('en').INTRO_STEPS.at(-1).text, /^Right answers bring stars\./);
  assert.match(localise('fr').INTRO_STEPS.at(-1).text, /^Les bonnes réponses rapportent des étoiles\./);
});

// The two places the number grows: a card that ends, and an instrument opened for the first time.
const RECORD = /const lv = addXp\(LEARNING, profile\.level, profile\.xp, ([\w.]+)\);\s*profile\.level = lv\.level; profile\.xp = lv\.xp;/g;

test('the progress number is still recorded, by the real rule, after every card and a first instrument', () => {
  assert.deepEqual([...js.matchAll(RECORD)].map(m => m[1]), ['LEARNING.xp.seenInstrument', 'o.xp']);
  assert.match(slice('function endCard() {', '\n}'), /const lv = addXp\(LEARNING, profile\.level, profile\.xp, o\.xp\);\s*profile\.level = lv\.level; profile\.xp = lv\.xp;[\s\S]*\n  save\(\);/);
  assert.match(js, /const freshProfile = \(\) => \(\{ xp: 0, level: 1,/);
  // the best round is kept the same way: written when a round ends, read by no screen (both mentions are that one line)
  assert.match(slice('function finish() {', '\n}'), /profile\.best = Math\.max\(profile\.best \?\? 0, G\.results\.right\);/);
  assert.equal(js.match(/profile\.best\b/g).length, 2);
  // and the rule it calls still counts and still crosses a level (learning.json: 80 for the first)
  assert.deepEqual(addXp(LEARNING, 1, 0, 10), { level: 1, xp: 10, levelsGained: 0 });
  assert.equal(addXp(LEARNING, 1, LEARNING.levelBaseXp - 1, 1).levelsGained, 1);
});

test('app.js reads the progress number nowhere else: nothing draws XP, a level or a level-up', () => {
  const rest = js.replace(RECORD, '').replace('const freshProfile = () => ({ xp: 0, level: 1,', '');
  for (const re of [/\bxp\b/i, /xpEarned/, /profile\.level\b/, /levelsGained|toNextLevel|levelUp/i]) assert.doesNotMatch(rest, re, rest.match(re)?.[0]);
  for (const re of [XP_WORD, GOLD_WORD]) assert.doesNotMatch(rest.replace(/var\(--text-gold\)|class="gold"/g, ''), re, 'a word in a template');
});

test('the screens are what §14 says: top bar, game header, outcome chip, toast, results, Profilim, parent panel', () => {
  // top bar: back (on a pushed page), the title, the avatar; no chip
  const bar = slice('topbar.innerHTML = `', '`;');
  assert.deepEqual([...bar.matchAll(/<(button|div|span|h1)\b[^>]*?(?:class="([^"$]*)|>)/g)].map(m => m[2] ?? m[1]).filter(c => !/^(face|avatar who)$/.test(c)), ['chunky white round backbtn', 'title', 'h1', 'tile']);
  assert.match(bar, /<button class="tile" data-go="#\/profil" data-do="avatar"/);
  // game header: close and the title (with the card counter under it), nothing after them
  const head = slice("$('#ghead').innerHTML = `", '`;');
  assert.match(head, /^\$\('#ghead'\)\.innerHTML = `\s*<button class="chunky white close" data-g="exit"[^\n]*\n\s*<div class="t"><b>\$\{esc\(t\('game\.title'\)\)\}<\/b>\$\{playing \? `<small class="num">\$\{esc\(t\('game\.card', [^\n]*<\/small>` : ''\}<\/div>$/);
  // outcome: the praise line alone; the chip has one hole for words
  assert.deepEqual([...js.matchAll(/G\.outcome = (\{[^;]*\});/g)].map(m => m[1].replace(/t\(.*\)/, 't()')), ['{ praise: t() }', '{ praise: t() }']);
  const chip = js.match(/const chip = [^\n]*/)[0];
  assert.deepEqual([...chip.matchAll(/\$\{esc\(([^)]*)\)\}/g)].map(m => m[1]), ['G.outcome.praise']);
  // toast for a first instrument: its name, no reward before it
  assert.match(js, /\n\s*toast\(t\('instrument\.discovered', \{ name: d\.label \}\)\);/);
  // results: two tiles, Doğru and Yıldız
  const results = slice('function resultsHtml() {', '\n}');
  assert.deepEqual([...results.matchAll(/<div class="rrow"><small>\$\{esc\(t\('([\w.]+)'\)\)\}<\/small><b>([^<]*)<\/b>/g)].map(m => [m[1], m[2]]),
    [['results.right', '${R.right}/${R.count}'], ['results.stars', '${R.stars}/3']]);
  assert.match(results, /<p class="p r-info">\$\{esc\(info\)\}<\/p>\n\s*<div class="stats2 num">/);
  // Profilim: the child, three counts, İlerleme, İstatistikler, Rozetler, then the family rows; no level card or note
  const profil = slice('function profilePage() {', '\n}');
  assert.deepEqual([...profil.matchAll(/<div class="card ([\w -]+)"/g)].map(m => m[1]), ['child-head', 'prof-counts', 'plist', 'plist stats', 'badges']);
  assert.deepEqual([...profil.match(/<div class="card prof-counts">[^\n]*/)[0].matchAll(/t\('([\w.]+)'/g)].map(m => m[1]), ['profile.badges', 'profile.rounds', 'profile.stars']);
  // İstatistikler: rounds played and questions answered. "En iyi tur" was the best round's XP in the app (ch. 03 §16.4).
  assert.deepEqual([...profil.match(/<div class="card plist stats">[^\n]*/)[0].matchAll(/\['(stats\.\w+)', ([^\]]+)\]/g)].map(m => [m[1], m[2]]),
    [['stats.rounds', 'profile.rounds ?? 0'], ['stats.answered', 'profile.answered ?? 0']]);
  // parent panel: cards, days, questions seen; instruments, riddles, badges
  assert.deepEqual([...slice('const parentPanel = () =>', '`; };').matchAll(/t\('([\w.]+)'/g)].map(m => m[1]), ['panel.line1', 'panel.line2', 'panel.local', 'account.pin']);
});

test('nothing is left to draw them with: no chip, level box, level-up or XP class in a template or the stylesheet', () => {
  const GONE = /\b(levelbtn|lvbox|lvl-num|xp-chip|xpChip|xpb|prof-level)\b|\.g-head \.sv\b|class="avatar sv\b|--text-xp/;
  assert.doesNotMatch(js, GONE, js.match(GONE)?.[0]);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), GONE, css.match(GONE)?.[0]);
});
