// Guards for the deck's opening section, "Dore Mimi, bugüne kadar" (dossier ch. 14 §13). The section states what the
// foundation has done, to the foundation, so its rules are the research's (doremimi-superapp content/doremimi-research:
// DEMO-INTEGRATION.md, CAVEATS.md): every number from facts.json, achievements only and no praise, right after the
// cover, live steps on pages the phone has. They import the slides the deck draws (deck/foundation.js, deck/slides.js)
// and the snapshot it reads (deck/foundation-facts.js); nothing here retypes a slide.
//
// The research lives in the app repo, which a deploy or another laptop does not have. There the comparison with
// facts.json is skipped and says so; the digest still tells a value edited by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { FOUNDATION_SLIDES, LISTINGS, MARKERS, SOURCE_TR } from '../deck/foundation.js';
import { FROM, FACTS, SOURCES } from '../deck/foundation-facts.js';
import { SLIDES } from '../deck/slides.js';
import { snapshot, digestOf, RESEARCH } from '../tools/foundation-facts.mjs';
import { knownRoute, flat } from '../tools/phone-routes.mjs';

/** What a person reads: the markup's text (attributes such as an image's file name are not read). */
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
/** Everything the section says: each slide, its label, its step buttons and the presenter's notes. */
const said = () => FOUNDATION_SLIDES.map(s => ({ id: s.id, shown: text(`${s.label} ${s.html} ${(s.acts ?? []).map(a => a[0]).join(' ')}`), notes: text(s.notes ?? '') }));

/*
 * The integers in a piece of text, as a person reads them. A date gives its year and its day ("2021-12-26" and
 * "26.12.2021" both read as 26 … 2021) but not its month number: the slides print months as words, and letting 01-12
 * in through every date would pass almost any small number typed by mistake. Everything else is taken digit for digit.
 */
function integersIn(words) {
  const out = [];
  const rest = words
    // A real month only, and nothing but a date: "s. 2746-2765" is a page range and keeps both its numbers.
    .replace(/\b(\d{4})-(0[1-9]|1[0-2])(?:-(\d{2})(?:\/(\d{2}))?)?(?![\d-])/g, (_, y, m, d, to) => { out.push(y); for (const x of [d, to]) if (x) out.push(String(Number(x))); return ' '; })
    .replace(/\b(\d{1,2})\.(0[1-9]|1[0-2])\.(\d{4})\b/g, (_, d, m, y) => { out.push(y, String(Number(d))); return ' '; });
  return [...out, ...(rest.match(/\d+/g) ?? [])];
}
/** Every integer the snapshot holds. Source ids (S7, S12 …) are names, not numbers: left out, or they would let 7 to 17 through. */
function integersOf(value, into = new Set()) {
  if (typeof value === 'number') into.add(String(value));
  else if (typeof value === 'string') integersIn(value).forEach(n => into.add(n));
  else if (Array.isArray(value)) value.forEach(v => integersOf(v, into));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => { if (k !== 'src') integersOf(v, into); });
  return into;
}

test('every integer on the foundation slides and in their notes is in the facts snapshot', () => {
  const known = integersOf(FACTS);
  let seen = 0;
  for (const s of said()) {
    for (const [where, words] of [['slide', s.shown], ['notes', s.notes]]) {
      for (const n of integersIn(words)) { seen++; assert.ok(known.has(n), `${s.id} (${where}) says ${n}, which deck/foundation-facts.js does not hold: “…${words.slice(Math.max(0, words.indexOf(n) - 40), words.indexOf(n) + 20)}…”`); }
    }
  }
  assert.ok(seen > 40, `the slides' numbers were read (${seen})`);
  // The reader itself: a month number does not come in through a date, a day and a year do; a source id is no number.
  assert.deepEqual([...integersOf({ a: '2021-12-26', b: ['26.12.2021 saat 15.00'], c: 10, d: '2023-03-22/24', e: 's. 2746-2765', f: '2021', src: ['S12'] })].sort(),
    ['00', '10', '15', '2021', '2023', '22', '24', '26', '2746', '2765'].sort());
});

test('each concert row gives the time and the hall its own fact gives', () => {
  // The rows' `time` and `where` are typed in deck/foundation.js; the fact's sentence is where they come from.
  const plain = s => s.replace(/[’']/g, "'");
  for (const l of LISTINGS) {
    const fact = FACTS.timeline.find(t => t.date === l.date);
    assert.ok(fact, `${l.date} is in the timeline`);
    if (l.time) assert.ok(fact.tr.includes(l.time), `${l.date}: ${l.time} is not in “${fact.tr}”`);
    for (const w of l.where) assert.ok(plain(fact.tr).includes(plain(w)), `${l.date}: “${w}” is not in “${fact.tr}”`);
  }
  for (const m of MARKERS) assert.ok(FACTS.timeline.some(t => t.date === m.date), `the timeline marker ${m.date} is a fact`);
  // Postponed, or a report of plans: said in the notes if asked, never drawn as something done.
  for (const date of ['2020-11-20/22', '2021-02-19']) assert.ok(![...MARKERS, ...LISTINGS].some(x => x.date === date), `${date} is not on a slide`);
});

test('the snapshot was not edited by hand: its digest is its own values’', () => {
  assert.equal(digestOf(FACTS, SOURCES), FROM.digest, 'deck/foundation-facts.js was changed without tools/foundation-facts.mjs');
  assert.equal(createHash('sha256').update(JSON.stringify({ FACTS, SOURCES })).digest('hex'), FROM.digest);
});

const hasResearch = existsSync(join(RESEARCH, 'facts.json'));
test('the snapshot is what the research says today (facts.json, sources.json)', { skip: hasResearch ? false : `the research is not at ${RESEARCH} (set DOREMIMI_APP)` }, () => {
  const now = snapshot(RESEARCH);
  assert.deepEqual(FACTS, now.FACTS, 'facts.json has moved on: run node tools/foundation-facts.mjs and read the slides again');
  assert.deepEqual(SOURCES, now.SOURCES);
  assert.equal(FROM.factsSha256, createHash('sha256').update(readFileSync(join(RESEARCH, 'facts.json'))).digest('hex'));
});

// Achievements only (DEMO-INTEGRATION.md): the audience is the people who did the work, so no thanks, no admiration,
// no adjective about it, and none of the two claims CAVEATS.md says the sources do not support.
const BANNED = ['teşekkür', 'takdir', 'hayran', 'gurur', 'harika', 'muhteşem', 'mükemmel', 'eşsiz', 'dünyada ilk', 'meb onaylı'];
test('the section praises nothing and thanks no one', () => {
  for (const s of said()) {
    const words = `${s.shown} ${s.notes}`.toLocaleLowerCase('tr');
    for (const b of BANNED) assert.ok(!words.includes(b), `${s.id} says “${b}”`);
  }
  // Turkish casing: HARİKA and Harika are the same word, and "MEB Onaylı" lowercases with a dotless ı.
  assert.equal('HARİKA'.toLocaleLowerCase('tr'), 'harika');
  assert.equal('MEB ONAYLI'.toLocaleLowerCase('tr'), 'meb onaylı');
  assert.ok(said().every(s => s.shown.length > 30 && s.notes.length > 30), 'every slide has its words and its notes');
});

test('no phone number and no e-mail address, and each note names where its facts come from', () => {
  for (const s of said()) {
    assert.doesNotMatch(`${s.shown} ${s.notes}`, /[\w.+-]+@[\w-]+\.\w+|\b0?\d{3}[ .-]\d{3}[ .-]\d{2}[ .-]?\d{2}\b|\+90/, s.id);
    assert.match(s.notes, /Kaynak: /, `${s.id}'s notes cite a source`);
    assert.doesNotMatch(s.shown, /Kaynak: /, `${s.id} keeps its sources off the slide`);
  }
  assert.ok(Object.values(SOURCE_TR).every(name => !/undefined|NaN/.test(name)));
});

test('the section sits right after the cover, whole and in order, before the app is shown', () => {
  const ids = FOUNDATION_SLIDES.map(s => s.id);
  assert.ok(ids.length >= 3);
  assert.equal(SLIDES[0].id, 'kapak');
  assert.deepEqual(SLIDES.slice(1, 1 + ids.length).map(s => s.id), ids);
  assert.ok(SLIDES.slice(1, 1 + ids.length).every((s, i) => s === FOUNDATION_SLIDES[i]), 'the deck draws the module’s own slides');
  assert.equal(SLIDES[1 + ids.length].id, 'gezinme', 'the app’s tour starts right after');
  assert.equal(new Set(SLIDES.map(s => s.id)).size, SLIDES.length, 'no slide twice');
});

test('the section’s live steps open pages the phone has', () => {
  const sent = FOUNDATION_SLIDES.flatMap(s => [s.phone, ...(s.acts ?? []).map(a => a[1])].filter(Boolean).flatMap(flat).map(m => ({ id: s.id, m })));
  assert.ok(sent.length >= 2, 'the section has a live step');
  for (const { id, m } of sent) {
    assert.equal(m.type, 'go', `${id}: a foundation slide only opens a page`);
    assert.ok(knownRoute(m.hash), `${id} opens ${m.hash}, which the phone does not have`);
  }
});
