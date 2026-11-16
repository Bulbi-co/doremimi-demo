// Guards for the phone's ch. 13 pass (superapp 2c43f0f; owner, 2026-11-15): the app register is Inter and flat, the
// game keeps Baloo / Nunito and its ladder moods, a page one category owns takes that colour on the backdrop, and
// speed changes only in the game. They run the phone's own modules: lib/backdrop.js under a canvas stub, lib/canvas.js
// with the real data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pageAccentOf } from '../app/lib/canvas.js';
import { SIGN_CATEGORIES, SIGN_CARDS } from '../app/data/content.js';
import { DIRECTORY, GROUPS, GROUP_COLORS } from '../app/data/site.js';
import { slug } from '../app/lib/music.js';
import { contrast } from '../app/lib/accent.js';

// lib/backdrop.js builds its note shapes with Path2D at load and draws on a 2D canvas: stub just enough to run it.
class Path2D { ellipse() {} rect() {} moveTo() {} lineTo() {} bezierCurveTo() {} closePath() {} addPath() {} }
globalThis.Path2D ??= Path2D;
globalThis.DOMMatrix ??= class { scale() { return this; } translate() { return this; } };
globalThis.ResizeObserver ??= class { observe() {} };
globalThis.window ??= { devicePixelRatio: 1 };
const { Backdrop, MOODS, TAB_PACE, TAB_ALPHA, accentMood } = await import('../app/lib/backdrop.js');
const canvas = () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }), getBoundingClientRect: () => ({ width: 430, height: 932 }) });

const DATA = { SIGN_CATEGORIES, SIGN_CARDS, DIRECTORY, GROUPS, GROUP_COLORS, slug };
const css = readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');

test('the game keeps its ladder moods exactly: Çevir slow lilac, Seç cyan, Yaz quick gold (owner, 2026-11-15)', () => {
  assert.deepEqual(MOODS.cevir, { tints: ['#E85BE6', '#2B9BFF', '#3FDAFF'], notes: ['#E85BE6', '#14107A', '#1C6FAA'], alpha: 0.24, pace: 0.55, celebrates: true });
  assert.deepEqual(MOODS.sec, { tints: ['#3FDAFF', '#2B9BFF', '#38E08C'], notes: ['#2B9BFF', '#1C6FAA', '#14107A'], alpha: 0.28, pace: 1.0, celebrates: true });
  assert.deepEqual(MOODS.yaz, { tints: ['#FFCC00', '#FF4D00', '#E0109E'], notes: ['#FF4D00', '#E0109E', '#14107A'], alpha: 0.30, pace: 1.7, celebrates: true });
  // and the game never asks for a page colour: its setMood calls pass no accent
  // (the whole line: a call's own parentheses, moodOf(l), would end a [^)]* match before the options)
  const calls = app.match(/gameBg\??\.setMood\(.*$/gm);
  assert.ok(calls.length >= 1);
  for (const call of calls) assert.doesNotMatch(call, /accent/);
});

test('speed changes only in the game: every page mood, tab or category, runs at TAB_PACE and TAB_ALPHA', () => {
  const pages = Object.entries(MOODS).filter(([k]) => !['cevir', 'sec', 'yaz'].includes(k)).map(([, m]) => m);
  const accents = [...Object.values(GROUP_COLORS), ...SIGN_CATEGORIES.map(c => c.color)].map(accentMood);
  for (const m of [...pages, ...accents]) {
    assert.equal(m.pace, TAB_PACE);
    assert.equal(m.alpha, TAB_ALPHA);
    assert.equal(m.celebrates, false, 'only a level change sweeps');
  }
  assert.equal(TAB_ALPHA, 0.06, 'BackdropMood.TabFieldAlpha');
});

test('a category colour leads the field, and its lead note shows on the milk base (2:1), gold included', () => {
  for (const color of [...Object.values(GROUP_COLORS), ...SIGN_CATEGORIES.map(c => c.color)]) {
    const m = accentMood(color);
    assert.equal(m.tints[0], color.toUpperCase());
    assert.ok(contrast(m.notes[0], '#F7F6FB') >= 2, `${color}: lead note ${m.notes[0]}`);
  }
  assert.equal(accentMood('#f6b53a'), accentMood('#F6B53A'), 'memoised, so setMood sees one object per colour');
});

test('which pages take a colour: a family filter, a sign category, a sign, an instrument; not Keşfet, İzle, Çal, the hub', () => {
  const at = r => pageAccentOf({ page: null, ...r }, DATA);
  const yayli = GROUPS.find(g => slug(g) === 'yayli');
  assert.equal(at({ tab: 'ogren', segment: 'calgilar', query: new URLSearchParams('aile=yayli') }), GROUP_COLORS[yayli]);
  assert.equal(at({ tab: 'ogren', segment: 'calgilar', query: new URLSearchParams('') }), null, 'Tümü: the Öğren wash');
  assert.equal(at({ tab: 'ogren', segment: 'isaretler' }), null);
  assert.equal(at({ tab: 'ogren', page: 'isaret-kategori', arg: 'bemol' }), SIGN_CATEGORIES.find(c => c.key === 'bemol').color);
  const card = SIGN_CARDS[0];
  assert.equal(at({ tab: 'kesfet', page: 'isaret', arg: card.id }), SIGN_CATEGORIES.find(c => c.key === card.category).color, 'from Bugünün kartı too');
  assert.equal(at({ tab: 'ogren', page: 'calgi', arg: 'keman' }), GROUP_COLORS[DIRECTORY.find(d => slug(d.name) === 'keman').group]);
  for (const tab of ['kesfet', 'izle', 'cal', 'doremimi']) assert.equal(at({ tab }), null, tab);
  assert.equal(at({ tab: 'doremimi', page: 'vakif' }), null);
  // and the shell really asks it on every render
  assert.match(app, /shellBg\.setMood\(route\.tab, \{ accent: pageAccent\(\) \}\)/);
});

test('the pages draw a sparser field than the game: fewer, smaller, farther notes on the same seed', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const game = new Backdrop(canvas(), { seed }), tabs = new Backdrop(canvas(), { seed, tabs: true });
    assert.ok(tabs.notes.length < game.notes.length, `seed ${seed}`);
    const avg = (b, k) => b.notes.reduce((a, n) => a + n[k], 0) / b.notes.length;
    // Smaller for its depth, not only because the notes sit farther: size / (40 + 64·depth) is the 0.9–1.1 jitter,
    // times TAB_SIZE on a page, so a page's never passes 0.88 × 1.1.
    for (const n of tabs.notes) assert.ok(n.size / (40 + 64 * n.depth) <= 0.88 * 1.1 + 1e-9, `seed ${seed} size`);
    assert.ok(avg(tabs, 'depth') < avg(game, 'depth'), `seed ${seed} depth`);
  }
  assert.match(app, /new Backdrop\(\$\('#bg'\), \{[^}]*tabs: true/);
  assert.doesNotMatch(app.match(/new Backdrop\(\$\('#gbg'\)[^)]*\)/)[0], /tabs/);
});

test('two registers: Inter for the app, Baloo 2 and Nunito back inside the game, the banner title and OYNA', () => {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')));
  assert.match(root, /--font-display: "Inter"/);
  assert.match(root, /--font-body: "Inter"/);
  const game = css.match(/\.game \{[^}]*\}/)[0];
  assert.match(game, /--font-display: var\(--font-play\); --font-body: var\(--font-play-body\);/);
  assert.match(css, /\.hero \.txt b \{ font: 800 22px\/26px var\(--font-play\); \}/);
  // the circle since ch. 14 §1 (Şimdi Oyna since §10); its word stays in the playful register
  assert.match(css, /\.oyna \.word \{[^}]*font: 800 25px\/25px var\(--font-play\);/);
  assert.match(readFileSync(new URL('../assets/fonts/fonts.css', import.meta.url), 'utf8'), /font-family: 'Inter'; src: url\('Inter-SemiBold\.ttf'\)/);
});

test('buttons lose the lip off the game only; OYNA and the game keep theirs', () => {
  assert.match(css, /:is\(\.topbar, \.page, \.overlay-host\) \.chunky:not\(\.oyna\) \{ --lipd: 0px; --sink: 0px;/);
  // the game sits outside every scope of that rule
  assert.match(app, /<section class="game" id="game"|gameEl = \$\('#game'\)/);
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(html, /<main class="page" id="page"[^>]*><\/main>\s*<nav class="dock"[^>]*><\/nav>\s*<section class="game"/, 'the game is a sibling of .page, not inside it');
});

test('Oyna: a category card shows progress only once played; Bugünün kartı is plain', () => {
  // ch. 14 §1 replaced the İŞARETLER / ÇALGILAR list with one grid of cards (tests/ch14.test.mjs); the rule that a card
  // says only "N kart" until it has been played carries over.
  const card = app.slice(app.indexOf('function categoryCard('), app.indexOf('function home('));
  assert.doesNotMatch(card, /henüz oynamadın/);
  assert.match(card, /\$\{esc\(t\('cards', \{ n: cards \}\)\)\}\$\{played \? ` · \$\{esc\(pct\(m\)\)\}` : ''\}/);
  assert.match(card, /\$\{played \? `<span class="ktrack">/);
  const today = css.match(/\.today \{[^}]*\}/)[0];
  assert.doesNotMatch(today, /0 8px 0 0/, 'no coloured edge under it');
  assert.match(css, /\.today \.tface::before \{[^}]*width: 3px; background: var\(--acc\);/);
});
