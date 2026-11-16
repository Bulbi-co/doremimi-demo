// Guards for the phone's type system (dossier ch. 14 §11): one role per kind of text, tight tracking on large titles
// and open on capitals, no Regular weight on small text or on colour, tabular figures for counts, and Inter as the app
// register's face until the app chooses otherwise. They read app/style.css, the stylesheet the phone loads, and
// app/app.js for where the counts are marked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const fonts = readFileSync(new URL('../assets/fonts/fonts.css', import.meta.url), 'utf8');
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = noComments(css).split('}').map(r => r.split('{')).filter(r => r.length === 2).map(([sel, body]) => ({ sel: sel.trim(), body }));
/** The :root block that holds the roles (the one that defines --t-title). */
const roles = rules.find(r => r.sel === ':root' && /--t-title/.test(r.body)).body;
const token = name => roles.match(new RegExp(`--${name}: ([^;]+);`))?.[1]?.trim();
const font = v => { const m = v.match(/^(\d{3}) (\d+)px\/(\d+)px/); return m ? { weight: +m[1], size: +m[2], line: +m[3] } : null; };
const ROLES = ['title', 'hero', 'section', 'card', 'row', 'row-s', 'body', 'meta', 'meta-s', 'eyebrow', 'label', 'label-l', 'chip', 'dock'];

test('every role is a font token, and the scale steps down: title > hero > section > card > row = body > meta > eyebrow', () => {
  const f = Object.fromEntries(ROLES.map(r => [r, font(token(`t-${r}`) ?? '')]));
  for (const r of ROLES) assert.ok(f[r], `--t-${r}`);
  const order = ['title', 'hero', 'section', 'card', 'row', 'meta', 'eyebrow'].map(r => f[r].size);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] < order[i - 1], `the scale does not step down at ${order}`);
  assert.equal(f.body.size, f.row.size, 'a row title and the text under it are the same size, told apart by weight');
  assert.ok(f.row.weight > f.body.weight, 'and the row title is the heavier');
  // a line height that holds descenders, never tighter than 1.2 nor looser than 1.5
  for (const r of ROLES) assert.ok(f[r].line / f[r].size >= 1.2 && f[r].line / f[r].size <= 1.5, `--t-${r} ${f[r].size}/${f[r].line}`);
});

test('tracking: tight on large titles, about neutral on body, open on capitals', () => {
  const ls = name => parseFloat(token(`ls-${name}`));
  assert.ok(ls('title') <= -0.015 && ls('title') < ls('section') && ls('section') < ls('card') && ls('card') < ls('row'), 'larger is tighter');
  assert.ok(ls('body') < 0 && ls('body') > -0.015);
  assert.ok(ls('eyebrow') >= 0.06, 'capitals are opened');
  // and the capitals are capitals: the eyebrow role sets them, with the case-sensitive punctuation Inter carries
  const eyebrow = rules.find(r => /\.eyebrow, \.ribbon\.small h2/.test(r.sel)).body;
  assert.match(eyebrow, /font: var\(--t-eyebrow\); letter-spacing: var\(--ls-eyebrow\); text-transform: uppercase; font-feature-settings: "case";/);
});

test('no Regular on small text or on colour: 13 px and below is Medium at least, a coloured face SemiBold', () => {
  for (const r of ROLES) { const f = font(token(`t-${r}`)); if (f.size <= 13) assert.ok(f.weight >= 500, `--t-${r} is ${f.weight} at ${f.size}px`); }
  // every app-register rule that sets a font itself, outside the tokens
  const scoped = rules.filter(r => r.sel.startsWith(':is(.topbar, .page, .overlay-host)'));
  assert.ok(scoped.length > 30);
  for (const { sel, body } of scoped) {
    const m = body.match(/font: (\d{3}) (\d+)px/);
    if (m && +m[2] <= 13) assert.ok(+m[1] >= 500, `${sel}: ${m[1]} at ${m[2]}px`);
  }
  // the text set on a category's or a header's colour
  const onColour = scoped.find(r => r.sel.includes('.kface small, .hero .txt small')).body;
  assert.match(onColour, /font: 600 13px\/18px/);
  for (const sel of ['.kface small', '.hero .txt small', '.sign-hero small', '.inst-hero .mt small', '.ftxt small']) assert.ok(scoped.some(r => r.sel.includes(sel) && /font: 600/.test(r.body)), sel);
});

test('each kind of text takes its role: page title, headers, sections, cards, rows, meta, eyebrows, buttons, tabs, chips', () => {
  const uses = (sel, role) => assert.ok(rules.some(r => r.sel.includes(sel) && r.body.includes(`font: var(--t-${role})`)), `${sel} → --t-${role}`);
  uses('.topbar h1', 'title');
  uses('.sign-hero b', 'hero'); uses('.inst-hero .mt b', 'hero'); uses('.song-head .mt b', 'hero');
  uses('.ribbon:not(.small) h2', 'section'); uses('.khead', 'section');
  uses('.h3', 'card'); uses('.today .ttxt b', 'card'); uses('.ftxt b', 'card');
  uses('.mt b', 'row'); uses('.imeta b', 'row');
  uses('.p, .srow', 'body');
  uses('.mt small', 'meta'); uses('.caption', 'meta'); uses('.imeta small', 'meta');
  uses('.eyebrow', 'eyebrow'); uses('.group-title', 'card'); uses('.badge', 'eyebrow');
  uses('.chunky:not(.oyna)', 'label'); uses('.otab', 'label'); uses('.chip-btn, .zopt', 'chip'); uses('.dock .tab span', 'dock');
});

test('counts are set in tabular figures: the category cards, the level chip, Profilim’s numbers, the game’s counter', () => {
  assert.match(noComments(css), /\.num \{ font-variant-numeric: tabular-nums; \}/);
  for (const [where, re] of [
    ['category card', /<small class="num">\$\{esc\(t\('cards', \{ n: cards \}\)\)\}/],
    ['level chip', /<b class="num">\$\{esc\(t\('level\.n', \{ n: profile\.level \}\)\)\}<\/b>/],
    ['Profilim level', /<b class="num">\$\{profile\.level\}<\/b>/],
    ['Profilim three', /<b class="num">\$\{profile\.badges\.length\}<\/b>/],
    ['İstatistikler', /<b class="num">\$\{v\}<\/b>/],
    ['the game’s card counter', /<small class="num">\$\{esc\(t\('game\.card'/],
    ['Aileler count', /<em class="num">\$\{esc\(t\('instruments', \{ n \}\)\)\}<\/em>/],
  ]) assert.match(app, re, where);
});

test('the app register is Inter, the shipped four weights, until the app chooses another face; the game keeps Baloo 2 and Nunito', () => {
  const root = rules.find(r => r.sel === ':root' && /--font-body/.test(r.body)).body;
  assert.match(root, /--font-body: "Inter"/);
  assert.match(root, /--font-display: "Inter"/);
  for (const w of ['Regular', 'Medium', 'SemiBold', 'Bold']) assert.match(fonts, new RegExp(`font-family: 'Inter'; src: url\\('Inter-${w}\\.ttf'\\)`), w);
  // every weight a role asks for is one Inter ships, so nothing is synthesised
  for (const r of ROLES) assert.ok([400, 500, 600, 700].includes(font(token(`t-${r}`)).weight), `--t-${r}`);
  assert.match(rules.find(r => r.sel === '.game').body, /--font-display: var\(--font-play\); --font-body: var\(--font-play-body\);/);
});
