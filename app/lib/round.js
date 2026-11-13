/*
 * Port of Doremimi.Core/Learning/LearningRound.cs and the two draws of QuestionDeck.cs (ChoicesFor, Deal), dossier
 * ch. 10 P-07 and P-08. A move from the wrong stage throws, as the C# does (LearningRound.cs:290-294), so a broken
 * deck script fails loudly in rehearsal instead of quietly showing the wrong card.
 */
import { find, Match, normalise, isTypeable } from './answers.js';
import { LetterTiles } from './tiles.js';
import { Level, Signal } from './ladder.js';

export const Stage = Object.freeze({
  Typing: 'Typing', Tiles: 'Tiles', Choices: 'Choices', Question: 'Question', Flipped: 'Flipped',
  Solved: 'Solved', Revealed: 'Revealed', Graded: 'Graded',
});

export const Resolution = Object.freeze({
  TypedFirstTry: 'TypedFirstTry', TypedWithTiles: 'TypedWithTiles', PickedAfterTyping: 'PickedAfterTyping',
  PickedFirstTry: 'PickedFirstTry', Knew: 'Knew', DidNotKnow: 'DidNotKnow', PickedWrong: 'PickedWrong', Skipped: 'Skipped',
});

export const Evidence = Object.freeze({ Recall: 'Recall', Recognised: 'Recognised', SelfReport: 'SelfReport', Failed: 'Failed' });
export const Verdict = Object.freeze({ Blank: 'Blank', Right: 'Right', Close: 'Close', Wrong: 'Wrong' });

/** RoundSummary.IsRight (RoundSummary.cs:18-19). */
export const isRight = r => [Resolution.TypedFirstTry, Resolution.TypedWithTiles, Resolution.PickedAfterTyping, Resolution.PickedFirstTry, Resolution.Knew].includes(r);

export class QuestionDeck {
  constructor(questions) {
    this.all = questions;
    this.byId = new Map(questions.map(q => [q.id, q]));
    this.concepts = [...new Set(questions.flatMap(q => q.conceptIds))];
  }

  find(id) { return this.byId.get(id) ?? null; }

  forConcept(conceptId) { return conceptId == null ? this.all : this.all.filter(q => q.conceptIds.includes(conceptId)); }

  /** QuestionDeck.ChoicesFor (:93-108): same group, then the fallback group, then any; folded duplicates dropped. */
  choicesFor(question, random, count) {
    const taken = new Set([...question.accepted, question.answer].map(normalise));
    const ranked = this.all
      .filter(o => o.kind === question.kind && o.id !== question.id)
      .map(o => ({ o, rank: o.distractorGroup === question.distractorGroup ? 0 : question.fallbackGroup != null && o.conceptIds.includes(question.fallbackGroup) ? 1 : 2, shuffle: random.next() }))
      .sort((a, b) => a.rank - b.rank || a.shuffle - b.shuffle);
    const wrong = [];
    for (const { o } of ranked) {
      if (wrong.length >= count - 1) break;
      const key = normalise(o.answer);
      if (taken.has(key)) continue;
      taken.add(key);
      wrong.push(o.answer);
    }
    return [...wrong, question.answer].map(c => ({ c, k: random.next() })).sort((a, b) => a.k - b.k).map(x => x.c);
  }

  /** QuestionDeck.Deal (:115-124): due first, then the lowest box, ties shuffled. */
  deal(conceptId, count, mastery, random) {
    return this.forConcept(conceptId)
      .map(q => ({ q, due: mastery ? mastery.isDue(q.id) : true, box: mastery ? mastery.boxOf(q.id) : 0, shuffle: random.next() }))
      .sort((a, b) => (a.due ? 0 : 1) - (b.due ? 0 : 1) || a.box - b.box || a.shuffle - b.shuffle)
      .slice(0, count)
      .map(e => e.q);
  }
}

export class LearningRound {
  constructor(cards, deck, ladder, config, random) {
    if (!cards.length) throw new Error('The round has no cards.');
    this.queue = cards.map(q => ({ question: q, isComeback: false }));
    this.comebacks = new Set();
    this.outcomes = [];
    this.deck = deck;
    this.ladder = ladder;
    this.config = config;
    this.random = random;
    this.index = 0;
    this.#startCard();
  }

  get current() { return this.queue[Math.min(this.index, this.queue.length - 1)].question; }
  get count() { return this.queue.length; }
  get isOver() { return this.index >= this.queue.length; }
  get isCardOver() { return [Stage.Solved, Stage.Revealed, Stage.Graded].includes(this.stage); }
  get xpEarned() { return this.outcomes.reduce((s, o) => s + o.xp, 0); }

  /** Try 1 at Yaz. A blank changes nothing; a miss opens the letter tiles (:153-166). */
  submit(text) {
    this.#require(Stage.Typing);
    if (normalise(text).length === 0) return { verdict: Verdict.Blank, answer: null };
    const match = find(text, this.current.accepted);
    if (match.result !== Match.Wrong) return this.#solve(Resolution.TypedFirstTry, match);
    this.typedFirst = true;
    this.tiles = LetterTiles.for(this.current.answer, this.current.id, this.config.tilePrefillFraction);
    this.stage = Stage.Tiles;
    return { verdict: Verdict.Wrong, answer: null };
  }

  /** Try 2, once every tile is filled. Only a miss here offers the four choices (:169-178). */
  submitTiles() {
    this.#require(Stage.Tiles);
    if (!this.tiles.isFull) return { verdict: Verdict.Blank, answer: null };
    const match = this.tiles.judge(this.current.accepted);
    if (match.result !== Match.Wrong) return this.#solve(Resolution.TypedWithTiles, match);
    this.#openChoices();
    return { verdict: Verdict.Wrong, answer: null };
  }

  /** One pick; there is no second (:181-195). */
  choose(choice) {
    this.#require(Stage.Choices);
    if (!this.choices.includes(choice)) throw new Error(`'${choice}' is not one of the offered choices.`);
    if (choice === this.current.answer) {
      this.#solve(this.typedFirst ? Resolution.PickedAfterTyping : Resolution.PickedFirstTry, { result: Match.Exact, answer: choice });
      return true;
    }
    this.wrongPick = choice;
    this.#end(Resolution.PickedWrong, Stage.Revealed);
    return false;
  }

  dontKnow() { this.#require(Stage.Typing, Stage.Tiles, Stage.Choices); this.#end(Resolution.Skipped, Stage.Revealed); }
  flip() { this.#require(Stage.Question); this.stage = Stage.Flipped; }
  grade(knew) { this.#require(Stage.Flipped); this.#end(knew ? Resolution.Knew : Resolution.DidNotKnow, Stage.Graded); }

  /** Records the finished card on the ladder and deals the next one (:219-237). */
  next() {
    if (this.isOver) throw new Error('The round is over.');
    if (!this.isCardOver) throw new Error(`The card is still at ${this.stage}.`);
    const { question, isComeback } = this.queue[this.index];
    const resolution = this.resolution;
    const move = this.ladder.record(signalOf(resolution, this.cardLevel));
    const outcome = {
      questionId: question.id, level: this.cardLevel, resolution, xp: this.#xpOf(resolution),
      evidence: evidenceOf(resolution, this.cardLevel), move, levelAfter: this.ladder.level, isComeback,
      firstTryTyped: resolution === Resolution.TypedFirstTry,
    };
    this.outcomes.push(outcome);
    if ([Resolution.PickedWrong, Resolution.Skipped, Resolution.DidNotKnow].includes(resolution) && !this.comebacks.has(question.id)) {
      this.comebacks.add(question.id);
      this.queue.splice(Math.min(this.index + 1 + this.config.comebackAfterCards, this.queue.length), 0, { question, isComeback: true });
    }
    this.index++;
    if (!this.isOver) this.#startCard();
    return outcome;
  }

  #startCard() {
    this.cardLevel = this.ladder.level;
    this.tiles = null;
    this.choices = [];
    this.wrongPick = null;
    this.typedFirst = false;
    this.resolution = null;
    if (this.cardLevel === Level.Yaz && isTypeable(this.current.answer)) this.stage = Stage.Typing;
    else if (this.cardLevel === Level.Yaz || this.cardLevel === Level.Sec) this.#openChoices();
    else this.stage = Stage.Question;
  }

  #openChoices() { this.choices = this.deck.choicesFor(this.current, this.random, this.config.choiceCount); this.stage = Stage.Choices; }

  #solve(resolution, match) {
    this.#end(resolution, Stage.Solved);
    return { verdict: match.result === Match.Close ? Verdict.Close : Verdict.Right, answer: match.answer };
  }

  #end(resolution, stage) { this.resolution = resolution; this.stage = stage; }

  #xpOf(r) {
    const xp = this.config.xp;
    return { TypedFirstTry: xp.typedFirstTry, TypedWithTiles: xp.typedWithTiles, PickedAfterTyping: xp.pickedAfterTyping, PickedFirstTry: xp.pickedFirstTry, Knew: xp.flippedKnew }[r] ?? 0;
  }

  #require(...stages) {
    if (this.isOver) throw new Error('The round is over.');
    if (!stages.includes(this.stage)) throw new Error(`The card is at ${this.stage}; that move belongs to ${stages.join(' or ')}.`);
  }
}

/** LearningRound.EvidenceOf (:258-265): a right first pick at Yaz is recall (long answers could never be mastered otherwise). */
export function evidenceOf(r, level) {
  if (r === Resolution.TypedFirstTry) return Evidence.Recall;
  if (r === Resolution.PickedFirstTry && level === Level.Yaz) return Evidence.Recall;
  if ([Resolution.TypedWithTiles, Resolution.PickedAfterTyping, Resolution.PickedFirstTry].includes(r)) return Evidence.Recognised;
  if (r === Resolution.Knew) return Evidence.SelfReport;
  return Evidence.Failed;
}

/** LearningRound.SignalOf (:271-276): at Yaz a struggle is a card not solved by typing in its two tries. */
export function signalOf(r, level) {
  if ([Resolution.TypedFirstTry, Resolution.TypedWithTiles, Resolution.Knew].includes(r)) return Signal.Right;
  if (r === Resolution.PickedFirstTry) return level === Level.Yaz ? Signal.Neutral : Signal.Right;
  return Signal.Struggle;
}
