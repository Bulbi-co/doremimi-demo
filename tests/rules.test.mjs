// Guards for the ported game rules. Run: node --test tests/
//
// They import the very files the phone runs (app/lib, app/data), never a copy. Where a fact can be read off the
// running app, it comes from there: the tile prefill is checked against the screenshot 13-game-tiles.png (rendered
// from c33d9ff), the deck path against the hand-worked table of dossier ch. 10 part 5. Golden files exported from
// the C# (ch. 10 O-13) do not exist yet; when they do, they replace the hand-worked numbers here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalise, find, Match, acceptedFor } from '../app/lib/answers.js';
import { LetterTiles } from '../app/lib/tiles.js';
import { LevelLadder, Level, Move } from '../app/lib/ladder.js';
import { LearningRound, QuestionDeck } from '../app/lib/round.js';
import { seeded } from '../app/lib/rng.js';
import { QUESTIONS, LEARNING } from '../app/data/content.js';

test('normalise folds Turkish letters, case, accents and punctuation (AnswerMatcher.cs:69-107)', () => {
  assert.equal(normalise('  FA ANAHTARI! '), 'fa anahtari');
  assert.equal(normalise('İĞÜŞÖÇ ıâ'), 'igusoc ia');
  assert.equal(normalise('pizzicàto'), 'pizzicato');
  assert.equal(normalise('Orta-kalın'), 'orta kalin');
});

test('find: short answers and numbers must be exact; longer ones forgive typos (AnswerMatcher.cs:32-66)', () => {
  assert.equal(find('sol', ['Fa anahtarı', 'fa']).result, Match.Wrong);
  assert.equal(find('si', ['Sol anahtarı', 'sol']).result, Match.Wrong);
  assert.equal(find('bemoll', ['Bemol', 'bemol işareti']).result, Match.Close);
  assert.equal(find('diyaz', ['Diyez', 'diyez işareti', 'diez']).result, Match.Close);
  assert.equal(find('6 tel', acceptedFor('Altı tel.')).result, Match.Exact);
  assert.equal(find('5 tel', acceptedFor('Altı tel.')).result, Match.Wrong);
  assert.equal(find('telli', acceptedFor('Telli çalgılar.')).result, Match.Exact);
  // "One letter turns Ney into Not and Cura into Cuma" (AnswerMatcher.cs:15-16): four letters must be exact.
  assert.equal(find('cuma', acceptedFor('Cura.')).result, Match.Wrong);
});

test('letter tiles of Fa anahtarı match the app: 2 + 8 letters, the A of FA and the 6th letter of ANAHTARI green', () => {
  // 13-game-tiles.png shows "2 kelime · 2 + 8 harf" and green tiles on the 2nd letter and the 8th tile.
  const tiles = LetterTiles.for('Fa anahtarı', 'sign:fa-anahtari', LEARNING.tilePrefillFraction);
  assert.deepEqual(tiles.wordLengths, [2, 8]);
  const green = tiles.tiles.map((t, i) => t.prefilled ? i : -1).filter(i => i >= 0);
  assert.deepEqual(green, [1, 8]);
  assert.equal(tiles.text, '_a _____a__');
  tiles.type('f'); tiles.backspace(); tiles.backspace();
  assert.equal(tiles.text, '_a _____a__', 'backspace never removes a green letter');
  // ceil, not round: 7 letters × 0.2 = 1.4 gives two free letters (LetterTiles.cs:74-80).
  assert.equal(LetterTiles.for('Altı tel', 'q:guitar-strings', LEARNING.tilePrefillFraction).tiles.filter(t => t.prefilled).length, 2);
});

test('the ladder moves down after four struggles and up after the run (LevelLadder.cs; learning.json since ch. 14)', () => {
  const ladder = new LevelLadder(LEARNING.ladder);
  for (let i = 0; i < 3; i++) assert.equal(ladder.record('Struggle'), Move.None);
  assert.equal(ladder.record('Struggle'), Move.Down);
  assert.equal(ladder.level, Level.Sec);
  assert.equal(ladder.record('Right'), Move.None);
  assert.equal(ladder.record('Right'), Move.None);
  assert.equal(ladder.record('Right'), Move.Up);
  assert.equal(ladder.level, Level.Yaz);
  assert.equal(ladder.rightNeeded, 0);
});

// The deck's scripted rounds, which this file played through the old one-round path (Yaz → Seç → Çevir), are played
// through ch. 14's story in tests/ch14.test.mjs: no round moves the child down after one or two struggles any more.

test('a move from the wrong stage throws, as the C# does', () => {
  const deck = new QuestionDeck(QUESTIONS);
  const round = new LearningRound([deck.find('sign:diyez')], deck, new LevelLadder(LEARNING.ladder), LEARNING, seeded(1));
  assert.throws(() => round.flip());
  assert.throws(() => round.next());
});
