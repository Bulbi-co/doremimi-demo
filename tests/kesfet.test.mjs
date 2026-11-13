// Guards for the cleaned Keşfet and game (superapp f8c3a52): Bugünün kartı's rotation (Doremimi.Core/Learning/DailyCard.cs)
// and the game's single accent (Doremimi/Controls/Accent.cs). They import the modules the phone runs, never a copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pick } from '../app/lib/daily.js';
import { accentSet, contrast, INK } from '../app/lib/accent.js';
import { resolve, PAGE_HOME } from '../app/lib/nav.js';
import { CONCEPTS } from '../app/data/content.js';

const day = (y, m, d) => new Date(y, m - 1, d, 13, 30);
const POOLS = [41, 30, 4];   // instruments, questions, signs: any non-empty sizes

test('the same date gives the same card, whatever the time of day', () => {
  assert.deepEqual(pick(day(2026, 11, 13), POOLS), pick(new Date(2026, 10, 13, 0, 1), POOLS));
  assert.deepEqual(pick(day(2026, 11, 13), POOLS), pick(new Date(2026, 10, 13, 23, 59), POOLS));
});

test('every kind shows within any three days, and each comes round with a new item', () => {
  for (const start of [day(2026, 1, 5), day(2026, 3, 29), day(2026, 11, 13), day(2025, 12, 30)]) {
    const kinds = new Set([0, 1, 2].map(i => pick(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), POOLS).kind));
    assert.deepEqual([...kinds].sort(), [0, 1, 2], start.toDateString());
  }
  assert.equal(pick(day(2026, 1, 8), POOLS).item, pick(day(2026, 1, 5), POOLS).item + 1);
});

test('the numbers are DailyCard.cs’s: epoch Monday 5 Jan 2026 is (0,0); 13 Nov 2026 is day 312, an instrument, item 104', () => {
  assert.deepEqual(pick(day(2026, 1, 5), POOLS), { kind: 0, item: 0 });
  assert.deepEqual(pick(day(2026, 1, 6), POOLS), { kind: 1, item: 0 });
  assert.deepEqual(pick(day(2026, 11, 13), POOLS), { kind: 0, item: 104 % 41 });
  assert.deepEqual(pick(day(2026, 1, 4), POOLS), { kind: 2, item: 3 }, 'a date before the epoch is defined too');
});

test('an empty pool hands its day to the next kind; no pools, no card', () => {
  assert.equal(pick(day(2026, 1, 7), [41, 30, 0]).kind, 0);
  assert.equal(pick(day(2026, 1, 5), []), null);
  assert.equal(pick(day(2026, 1, 5), [0, 0, 0]), null);
});

test('Keşfet draws its card from this rule, not from a day-of-year index', () => {
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  assert.match(app, /import \{ pick as pickDaily \} from '\.\/lib\/daily\.js'/);
  assert.match(app, /pickDaily\(/);
  assert.doesNotMatch(app, /dayOfYear/);
});

test('the accent keeps the hue where ink reads, and deepens only Bemol’s red (Accent.cs remarks)', () => {
  const orange = accentSet('#FF8A1E');            // Fa anahtarı
  assert.equal(orange.face, '#FF8A1E');
  assert.equal(orange.label, INK);
  const bemol = accentSet('#E8443A');
  assert.notEqual(bemol.face, '#E8443A', 'neither ink nor white reads on the raw red');
  assert.ok(contrast(bemol.face, '#FFFFFF') >= 4.5);
  for (const c of ['#FF8A1E', '#E8443A', '#3DBE5C', '#2F8CFF', '#B8763E']) {
    const a = accentSet(c);
    assert.ok(contrast(a.face, a.label) >= 4.5, c);
    assert.ok(contrast(a.text, '#FFFFFF') >= 4.5, c + ' text on white');
  }
});

test('the separate game hub is gone: its old links land on Keşfet, where Konu seç lives now', () => {
  assert.equal(resolve('#/oyun-merkezi').to, '#/');
  assert.equal(resolve('#/oyunlar').to, '#/');
  assert.ok(!('oyun-merkezi' in PAGE_HOME));
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /function gameHub|'oyun-merkezi':/);
});

test('a topic’s fact does not stop at a Turkish ordinal (ConceptCatalog.FirstSentence)', () => {
  assert.match(CONCEPTS['signcat:fa'].fact, /^5 çizgili portenin \(dizek\) 4\. çizgisi üzerine .*anahtardır\.$/);
  assert.match(CONCEPTS['signcat:sol'].fact, /2\. çizgisi üzerine/);
  assert.equal(CONCEPTS['signcat:bemol'].fact.split('. ').length, 1, 'still one sentence');
});
