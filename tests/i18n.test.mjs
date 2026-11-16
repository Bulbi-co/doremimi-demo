// Guards for the phone's three languages (dossier ch. 14 §11): every key in every language, no player-facing word left
// in app.js, the game's content translated entry for entry with answers that its own matcher and keyboard accept, and
// the language chosen as the spec says. They import the modules the phone runs (i18n/*, data/localise.js,
// lib/answers.js); for app.js, which needs a browser, they read its source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI } from '../app/i18n/ui.js';
import { LANGS, pickLang, translator, percent } from '../app/i18n/index.js';
import { KEYBOARDS } from '../app/i18n/keyboards.js';
import { localise, OVERLAYS } from '../app/data/localise.js';
import * as TR from '../app/data/content.js';
import { DIRECTORY, GROUPS, LEGAL } from '../app/data/site.js';
import { find, normalise, isTypeable, isLetterOrDigit } from '../app/lib/answers.js';

const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const LANG = ['tr', 'en', 'fr'];
/** Code without its comments: a note to the next developer is not a string on screen. */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const placeholders = v => [...new Set((typeof v === 'object' ? Object.values(v).join(' ') : v).match(/\{\w+\}/g) ?? [])].sort();

test('the Dil row offers exactly Türkçe, English and Français, each under its own name', () => {
  assert.deepEqual(LANGS.map(l => [l.key, l.name]), [['tr', 'Türkçe'], ['en', 'English'], ['fr', 'Français']]);
  assert.deepEqual(Object.keys(UI).sort(), [...LANG].sort());
});

test('every key is in every language, with the same {placeholders}; a plural set has one and other', () => {
  const keys = new Set(LANG.flatMap(l => Object.keys(UI[l])));
  assert.ok(keys.size > 250, `${keys.size} keys`);
  for (const k of keys) {
    for (const l of LANG) {
      const v = UI[l][k];
      assert.ok(v != null && v !== '', `${l} is missing ${k}`);
      if (typeof v === 'object') assert.deepEqual(Object.keys(v).sort(), ['one', 'other'], `${l} ${k}`);
      assert.deepEqual(placeholders(v), placeholders(UI.tr[k]), `${l} ${k} fills other blanks than tr`);
    }
  }
});

test('every key app.js asks for exists; a key it builds from a list exists for each item of the list', () => {
  const literal = [...code(app).matchAll(/\bt\(['`]([\w.-]+)['`]/g)].map(m => m[1]);
  assert.ok(literal.length > 200, `${literal.length} calls`);
  for (const k of literal) assert.ok(k in UI.tr, `t('${k}') has no entry`);
  // the keys app.js builds: tabs, Öğren's tabs, video kinds, settings, families, hub rows, keyboard sizes, legal texts
  const built = [
    ...['kesfet', 'ogren', 'izle', 'cal'].flatMap(k => [`tab.${k}`, `tab.${k}.title`]), 'tab.doremimi.title', 'tab.doremimi.aria',
    ...['isaretler', 'calgilar', 'aileler'].map(k => `ogren.${k}`),
    ...['riddle', 'clip', 'interview', 'karaoke', 'intro'].map(k => `kind.${k}`),
    ...['zorluk', 'dil', 'motion', 'buttons', 'music', 'notify'].flatMap(k => [`settings.${k}`, `settings.${k}.line`]),
    ...['small', 'medium', 'large'].flatMap(k => [`kb.${k}`, `kb.${k}.aria`]),
    ...['gizlilik', 'kosullar', 'kvkk'].map(k => `legal.${k}`),
    ...GROUPS.map(g => `family.${g.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/\s+/g, '-')}`),
    ...['firstTry', 'withTiles', 'rightPick'].map(k => `game.${k}`), ...['one', 'two', 'three'].map(k => `results.${k}`),
    ...['si', 'mi'].flatMap(k => [`burs.${k}`, `burs.${k}.line`]), ...['rounds', 'answered'].map(k => `stats.${k}`),
    ...['oyna', 'ogren', 'izle', 'cal'].map(k => `whatis.${k}`),
  ];
  for (const k of built) assert.ok(k in UI.tr, `${k} has no entry`);
});

/*
 * The literal-text guard. It reads app.js as JavaScript, not as text: a small scanner collects the quoted strings and
 * the static parts of template literals (a ${…} hole becomes \0), skipping comments and regular expressions. Words on
 * screen then come from three places in a template: the text between two tags, a screen-reader or tooltip attribute,
 * and a toast's arguments; a Turkish letter in any string is a fourth sign (most Turkish words have one). Each match is
 * a word a child or a parent would read that no language table holds.
 */
function literals(src) {
  const strings = [], templates = [];
  const ctx = [{ kind: 'code', depth: 0 }];
  let i = 0, prev = '(';
  while (i < src.length) {
    const top = ctx.at(-1), ch = src[i];
    if (top.kind === 'tpl') {
      if (ch === '\\') { top.text += src[i + 1]; i += 2; continue; }
      if (ch === '`') { templates.push(top.text); ctx.pop(); i++; prev = 'x'; continue; }
      if (ch === '$' && src[i + 1] === '{') { top.text += '\0'; ctx.push({ kind: 'code', depth: 0 }); i += 2; prev = '('; continue; }
      top.text += ch; i++; continue;
    }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (ch === '/' && /[(,=:[!&|?{};+\-*%<>~^]/.test(prev)) {   // a regular expression, not a division
      i++; let cls = false;
      while (i < src.length && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; }
      i++; while (/[a-z]/.test(src[i] ?? '')) i++; prev = 'x'; continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1, text = '';
      while (j < src.length && src[j] !== ch) { if (src[j] === '\\') { text += src[j + 1]; j += 2; } else text += src[j++]; }
      strings.push(text); i = j + 1; prev = 'x'; continue;
    }
    if (ch === '`') { ctx.push({ kind: 'tpl', text: '' }); i++; continue; }
    if (ch === '{') top.depth++;
    if (ch === '}') { if (top.depth === 0 && ctx.length > 1) { ctx.pop(); i++; prev = 'x'; continue; } top.depth--; }
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return { strings, templates };
}
function literalText(src) {
  const { strings, templates } = literals(src);
  const found = [];
  const word = s => /\p{L}{2,}/u.test(s);
  for (const tpl of templates) {
    for (const m of tpl.matchAll(/>([^<>]*)</g)) { const text = m[1].replace(/\0/g, '').replace(/&[a-z]+;|&#\d+;/g, '').trim(); if (word(text)) found.push(text); }
    for (const m of tpl.matchAll(/\b(?:aria-label|title|placeholder|alt)="([^"\0]*)"/g)) if (word(m[1])) found.push(m[1]);
  }
  for (const m of src.matchAll(/\btoast\((['"`])([^'"`]+)\1/g)) found.push(m[2]);
  for (const s of [...strings, ...templates]) if (/[çğıöşüÇĞİÖŞÜ]/.test(s)) found.push(s.replace(/\0/g, '…'));
  return found;
}
// What is allowed to be literal, each found in app.js today: the brand set as a word mark on the about page, Mimi's
// name as her picture's alt text, the video host after the kind on the player ("Klipler · YouTube"), and the directory
// group a song without an instrument is filed under (a key, never shown: L.groupName shows it).
const ALLOWED = new Set(['doremimi', 'Mimi', '· YouTube', 'Diğer']);

test('app.js holds no player-facing word of its own: everything on screen comes from the tables', () => {
  const all = literalText(app);
  assert.deepEqual(all.filter(w => !ALLOWED.has(w)), []);
  assert.deepEqual([...ALLOWED].filter(w => !all.includes(w)), [], 'an allowance nothing uses any more');
  // and the guard sees what it is meant to: each kind of literal, planted, is found
  assert.deepEqual(literalText('x = `<b>Kapat</b>`'), ['Kapat']);
  assert.deepEqual(literalText('x = `<b>${esc(t("a"))} kart</b>`'), ['kart']);
  assert.deepEqual(literalText('x = `<i aria-label="Close"></i>`'), ['Close']);
  assert.deepEqual(literalText("toast('Silindi')"), ['Silindi']);
  assert.deepEqual(literalText("const a = ['IconX', 'Şarkılar'];"), ['Şarkılar']);
  assert.deepEqual(literalText('// Şarkılar in a comment\nconst a = 1;'), []);
});

test('the game’s content is translated entry for entry: every sign, family, instrument, question, badge and banner', () => {
  for (const lang of ['en', 'fr']) {
    const O = OVERLAYS[lang];
    assert.equal(O.draft, true, `${lang} is marked as a draft for a native review`);
    assert.deepEqual(Object.keys(O.signCategories).sort(), TR.SIGN_CATEGORIES.map(c => c.key).sort(), lang);
    assert.deepEqual(Object.keys(O.signCards).sort(), TR.SIGN_CARDS.map(c => c.id).sort(), lang);
    for (const [id, c] of Object.entries(O.signCards)) for (const f of ['name', 'prompt', 'definition', 'kids']) assert.ok(c[f], `${lang} ${id}.${f}`);
    assert.deepEqual(Object.keys(O.families).sort(), Object.keys(TR.FAMILIES).sort(), lang);
    assert.deepEqual(Object.keys(O.instruments).sort(), Object.keys(TR.INSTRUMENTS).sort(), lang);
    for (const [k, i] of Object.entries(O.instruments)) assert.equal(!!i.summary, !!TR.INSTRUMENTS[k].summary, `${lang} ${k}: a summary where tr has one`);
    assert.deepEqual(Object.keys(O.quiz).sort(), TR.QUIZ.map(q => q[0]).sort(), lang);
    for (const [k, q] of Object.entries(O.quiz)) for (const f of ['q', 'tip', 'answer']) assert.ok(q[f], `${lang} ${k}.${f}`);
    assert.deepEqual(Object.keys(O.badges).sort(), TR.BADGES.map(b => b.id).sort(), lang);
    assert.deepEqual(Object.keys(O.intro).sort(), TR.INTRO_STEPS.map(s => s.key).sort(), lang);
    assert.equal(O.banners.length, TR.BANNERS.length, lang);
    assert.deepEqual(Object.keys(O.difficulties).sort(), ['baslangic', 'ileri', 'orta'], lang);
    assert.deepEqual(Object.keys(O.groups).sort(), [...GROUPS].sort(), lang);
    assert.deepEqual(Object.keys(O.directory).sort(), DIRECTORY.map(d => d.name).sort(), lang);
    assert.equal(O.faq.length, LEGAL.yardim.sections.length, lang);
    assert.ok(O.levelQuestion, lang);
  }
});

test('a question is the same question in every language: id, colour, difficulty, concepts; only the words change', () => {
  const tr = localise('tr').QUESTIONS;
  for (const lang of ['en', 'fr']) {
    const L = localise(lang).QUESTIONS;
    assert.deepEqual(L.map(q => [q.id, q.accent, q.difficulty, q.conceptIds.join(), q.distractorGroup]), tr.map(q => [q.id, q.accent, q.difficulty, q.conceptIds.join(), q.distractorGroup]));
    for (let i = 0; i < L.length; i++) assert.notEqual(L[i].prompt, tr[i].prompt, `${lang} ${L[i].id} still asks in Turkish`);
  }
  // the Turkish deck is the one content.js always built
  assert.equal(localise('tr').QUESTIONS, TR.QUESTIONS);
});

test('every answer is accepted by its own language’s matcher, and every typeable one can be typed on its keyboard', () => {
  for (const lang of LANG) {
    const keys = new Set([...KEYBOARDS[lang].rows.join(''), ...KEYBOARDS[lang].digits].map(c => normalise(c.toLocaleLowerCase(lang))));
    for (const q of localise(lang).QUESTIONS) {
      assert.ok(q.accepted.length > 0, `${lang} ${q.id}`);
      assert.equal(find(q.answer, q.accepted).result, 'Exact', `${lang} ${q.id}: "${q.answer}" is not among its own accepted answers`);
      if (!isTypeable(q.answer)) continue;
      for (const ch of normalise(q.answer).replace(/ /g, '')) assert.ok(keys.has(ch), `${lang} ${q.id}: "${ch}" of "${q.answer}" is not on the keyboard`);
    }
  }
  // per language: the English answer is not accepted for the Turkish card, and an accent-free French answer is
  const bemol = lang => localise(lang).QUESTIONS.find(q => q.id === 'sign:bemol');
  assert.equal(find('flat', bemol('tr').accepted).result, 'Wrong');
  assert.equal(find('flat', bemol('en').accepted).result, 'Exact');
  assert.equal(find('bemol', bemol('fr').accepted).result, 'Exact', 'Bémol typed without its accent');
  assert.equal(find('becarre', localise('fr').QUESTIONS.find(q => q.id === 'sign:naturel').accepted).result, 'Exact');
});

test('the language starts as the spec says: ?dil=, then the Dil row, then the device, else Türkçe; the deck’s phone is Turkish', () => {
  assert.equal(pickLang({ query: 'fr', saved: 'en', languages: ['tr'] }), 'fr');
  assert.equal(pickLang({ saved: 'en', languages: ['fr-FR'] }), 'en');
  assert.equal(pickLang({ languages: ['fr-FR', 'en'] }), 'fr');
  assert.equal(pickLang({ languages: ['en-GB'] }), 'en');
  assert.equal(pickLang({ languages: ['de-DE', 'es'] }), 'tr', 'none of the three: Türkçe');
  assert.equal(pickLang({ languages: ['en-US'], embed: true }), 'tr', 'inside the Turkish deck the laptop’s language does not decide');
  assert.equal(pickLang({ saved: 'fr', languages: ['en-US'], embed: true }), 'fr', 'but the Dil row still does');
  assert.equal(pickLang({ query: 'de', languages: ['de'] }), 'tr');
  // and app.js asks it with what the device says, and saves the Dil row's choice
  assert.match(app, /pickLang\(\{ query: params\.get\('dil'\), saved: profile\.settings\.lang, languages: navigator\.languages \?\? \[navigator\.language\], embed: EMBED \}\)/);
  assert.match(app, /if \(d\.dil\) \{ profile\.settings\.lang = d\.dil; save\(\); setLang\(d\.dil\); return rerender\(\); \}/);
});

test('switching applies at once: the tables, the content and the deck the game deals from all follow setLang', () => {
  const set = app.slice(app.indexOf('function setLang('), app.indexOf('\n}', app.indexOf('function setLang(')));
  assert.match(set, /t = translator\(lang\); L = localise\(lang\);/);
  assert.match(set, /deck = new QuestionDeck\(L\.QUESTIONS\);/);
  assert.match(set, /document\.documentElement\.lang = lang;/);
  // the Dil row lists the three under their own names, on the settings page
  const settings = app.slice(app.indexOf('function settingsPage('), app.indexOf('\n}', app.indexOf('function settingsPage(')));
  assert.match(settings, /segmented\('dil', LANGS\.map\(l => \[l\.key, l\.name\]\), lang, 'data-dil'\)/);
  // a fresh child (the deck's reset, Hesabı sil) goes back to the default language
  assert.match(app, /function freshChild\(\) \{ store\.wipe\(\); profile = freshProfile\(\); mastery = new Mastery\(LEARNING, profile\.mastery, DAY_SHIFT\); setLang\(langNow\(\)\); \}/);
});

test('counts and shares are written the language’s way, in glyphs the shipped fonts have', () => {
  assert.equal(translator('tr')('cards', { n: 1 }), '1 kart');
  assert.equal(translator('en')('cards', { n: 1 }), '1 card');
  assert.equal(translator('en')('cards', { n: 7 }), '7 cards');
  assert.equal(translator('fr')('cards', { n: 0 }), '0 carte', 'French counts zero as one');
  assert.equal(percent('tr', 0.5), '%50');
  assert.equal(percent('en', 0.5), '50%');
  assert.equal(percent('fr', 0.5), '50\u00A0%', 'a no-break space (U+00A0), which the shipped fonts have; U+202F they do not');
  // French sets a no-break space before ? ! : ; in the tables, so a line never starts with the mark
  for (const [k, v] of Object.entries(UI.fr)) for (const s of typeof v === 'object' ? Object.values(v) : [v]) assert.doesNotMatch(s, / [?!:;]/, `fr ${k}: ${s}`);
});

test('what stays Turkish stays Turkish, and says so: the foundation’s texts carry a line in the other languages', () => {
  assert.match(app, /const trOnly = \(\) => lang === 'tr' \? '' : /);
  for (const f of ['function foundation(', 'function legalPage(']) assert.match(app.slice(app.indexOf(f), app.indexOf('\n}', app.indexOf(f))), /\$\{trOnly\(\)\}/, f);
  // the help page is the app's own text, not the foundation's, and is translated
  assert.notEqual(localise('en').FAQ[0][0], LEGAL.yardim.sections[0][0]);
});
