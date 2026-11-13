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
import { LearningRound, QuestionDeck, Stage, Resolution, isRight } from '../app/lib/round.js';
import { Mastery, stars, newlyEarned } from '../app/lib/progress.js';
import { seeded } from '../app/lib/rng.js';
import { QUESTIONS, LEARNING, SUNUM_DECK, BADGES } from '../app/data/content.js';

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

test('the ladder moves down after two struggles and up after the run (LevelLadder.cs)', () => {
  const ladder = new LevelLadder(LEARNING.ladder);
  assert.equal(ladder.record('Struggle'), Move.None);
  assert.equal(ladder.record('Struggle'), Move.Down);
  assert.equal(ladder.level, Level.Sec);
  assert.equal(ladder.record('Right'), Move.None);
  assert.equal(ladder.record('Right'), Move.None);
  assert.equal(ladder.record('Right'), Move.Up);
  assert.equal(ladder.level, Level.Yaz);
  assert.equal(ladder.rightNeeded, 0);
});

/** Plays the deck's scripted round (dossier ch. 10 part 5) through the real rules. */
function playSunumRound() {
  const deck = new QuestionDeck(QUESTIONS);
  const random = seeded(11);
  const mastery = new Mastery(LEARNING);
  const round = new LearningRound(SUNUM_DECK.map(id => deck.find(id)), deck, new LevelLadder(LEARNING.ladder), LEARNING, random);
  const earned = [];
  const end = () => {
    const o = round.next();
    mastery.record(o.questionId, o.evidence);
    earned.push(...newlyEarned(BADGES, { mastery, deck, round: round.outcomes, days: [] }, earned).map(b => b.id));
    return o;
  };
  const wrongChoice = () => round.choices.find(c => c !== round.current.answer);

  // S06: c1 Fa anahtarı at Yaz, "sol", then the tiles filled right.
  assert.equal(round.stage, Stage.Typing);
  assert.equal(round.submit('sol').verdict, 'Wrong');
  const missing = round.tiles.tiles.filter(t => t.kind === 'Letter' && !t.prefilled).map(t => t.letter.toLocaleLowerCase('tr')).join('');
  round.tiles.type(missing);
  assert.equal(round.submitTiles().verdict, 'Right');
  assert.equal(end().resolution, Resolution.TypedWithTiles);

  // S07: c2 Diyez: "bemol", then "solm" in the tiles (must be judged wrong), then a wrong pick.
  round.submit('bemol');
  round.tiles.type('solm');
  assert.equal(round.submitTiles().verdict, 'Wrong', 'solm must not pass as a typo of diyez');
  assert.equal(round.stage, Stage.Choices);
  assert.equal(round.choices.length, 4);
  assert.equal(round.choose(wrongChoice()), false);
  assert.equal(end().resolution, Resolution.PickedWrong);

  // c3 Bemol: Bilmiyorum: the second struggle moves the ladder down to Seç.
  round.dontKnow();
  assert.equal(end().move, Move.Down);
  assert.equal(round.ladder.level, Level.Sec);

  // S08: c4 at Seç, a wrong pick; c2′ comes back, Bilmiyorum: down to Çevir.
  assert.equal(round.current.id, 'q:guitar-family');
  assert.equal(round.stage, Stage.Choices);
  round.choose(wrongChoice()); end();
  assert.equal(round.current.id, 'sign:diyez');
  round.dontKnow();
  assert.equal(end().move, Move.Down);
  assert.equal(round.ladder.level, Level.Cevir);

  // c3′ and c4′ at Çevir: flip, Bildim, twice: up to Seç.
  for (const id of ['sign:bemol', 'q:guitar-family']) {
    assert.equal(round.current.id, id);
    assert.equal(round.stage, Stage.Question);
    round.flip(); round.grade(true);
    var last = end();
  }
  assert.equal(last.move, Move.Up);
  assert.equal(round.ladder.level, Level.Sec);

  // S09: c5 and c6 at Seç, right picks.
  for (const id of ['q:violin-family', 'q:guitar-strings']) {
    assert.equal(round.current.id, id);
    assert.equal(round.choose(round.current.answer), true);
    end();
  }
  return { round, earned };
}

test('the deck round plays the path of dossier ch. 10 part 5: 9 cards, 5 right, +16 XP, 2 stars, ends at Seç', () => {
  const { round, earned } = playSunumRound();
  assert.equal(round.isOver, true);
  assert.equal(round.count, 9);
  assert.equal(round.outcomes.filter(o => isRight(o.resolution)).length, 5);
  assert.equal(round.xpEarned, 16);
  assert.equal(stars(round.outcomes, LEARNING.roundStars), 2);
  assert.equal(round.ladder.level, Level.Sec);
  assert.deepEqual(earned, ['ilk-nota', 'baba-sesler']);
});

test('a move from the wrong stage throws, as the C# does', () => {
  const deck = new QuestionDeck(QUESTIONS);
  const round = new LearningRound([deck.find('sign:diyez')], deck, new LevelLadder(LEARNING.ladder), LEARNING, seeded(1));
  assert.throws(() => round.flip());
  assert.throws(() => round.next());
});
