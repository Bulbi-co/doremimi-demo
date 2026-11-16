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
import { FOUNDATION_SLIDES, MARKERS, SOURCE_TR } from '../deck/foundation.js';
import { FROM, FACTS, SOURCES } from '../deck/foundation-facts.js';
import { SLIDES } from '../deck/slides.js';
import { snapshot, digestOf, RESEARCH } from '../tools/foundation-facts.mjs';

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

test('each timeline marker is a dated fact, and nothing postponed or only planned is drawn as done', () => {
  for (const m of MARKERS) assert.ok(FACTS.timeline.some(t => t.date === m.date), `the timeline marker ${m.date} is a fact`);
  assert.ok(MARKERS.length >= 6, 'the timeline was read');
  // Postponed, or a report of plans: said in the notes if asked, never drawn as something done.
  const [shown, notes] = [said()[0].shown, said()[0].notes];
  for (const date of ['2020-11-20/22', '2021-02-19']) {
    assert.ok(!MARKERS.some(x => x.date === date), `${date} is not on the slide`);
    assert.ok(FACTS.timeline.some(t => t.date === date && notes.includes(text(t.tr))), `${date} is in the notes, in its fact's own words`);
  }
  assert.doesNotMatch(shown, /ertelendi|planlandı|hazırlıyor/);
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

test('the section is one slide, right after the cover, with the books, the concerts and the site as its three cards', () => {
  // One slide, not four (owner, 2026-11-16: the books and CSO slides were "too unnecessary", fold them into this one).
  assert.deepEqual(FOUNDATION_SLIDES.map(s => s.id), ['bugune-kadar']);
  assert.deepEqual(SLIDES.slice(0, 3).map(s => s.id), ['kapak', 'bugune-kadar', 'gezinme'], 'cover, the foundation, then the app’s tour');
  assert.equal(SLIDES[1], FOUNDATION_SLIDES[0], 'the deck draws the module’s own slide');
  const html = FOUNDATION_SLIDES[0].html;
  const cards = [...html.matchAll(/<li>[^]*?<b>([^<]+)<\/b><span>([^<]+)<\/span><\/div><\/li>/g)].map(m => [m[1], m[2]]);
  const N = Object.fromEntries(FACTS.numbers.map(n => [n.key, n]));
  assert.equal(cards.length, 3);
  assert.equal(cards[0][0], `${N.books.value} kitap, ${FACTS.books.titlesTr.length} çalgı`);
  assert.ok(cards[0][1].includes(FACTS.books.seriesTr) && cards[0][1].includes(FACTS.books.author) && cards[0][1].includes(String(FACTS.books.year)));
  assert.ok(cards[1][1].startsWith(`${FACTS.concerts.ages.replace('-', '–')} yaş için`), cards[1][1]);
  assert.equal(cards[2][0], N.siteVideos.tr);
  assert.ok(cards[2][1].includes(N.riddles.tr) && cards[2][1].includes(String(N.guestAnswerers.value)), cards[2][1]);
  // Both pictures are someone else's, and each says whose beside it (the repo is public).
  assert.deepEqual([...html.matchAll(/<figcaption>([^<]+)<\/figcaption>/g)].map(m => m[1]), ['Görsel: idefix.com', 'Afiş: CSO, Biletinial']);
  for (const [, file] of html.matchAll(/src="(assets\/foundation\/[^"]+)"/g)) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${file} is in the repo`);
});

test('the section sends the phone nothing: it is read before the app is shown', () => {
  for (const s of FOUNDATION_SLIDES) { assert.equal(s.layout, 'full'); assert.ok(!s.phone && !(s.acts ?? []).length, `${s.id} has a live step`); }
});
