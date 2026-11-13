/*
 * Ports of the profile's rules: XpLevels, MasteryTracker, RoundSummary and BadgeEvaluator (dossier ch. 10, P-08).
 * Days are local calendar days as YYYY-MM-DD; `dayShift` is the demo clock switch `gun=+N` (W-06).
 */
import { Evidence, isRight } from './round.js';
import { Move } from './ladder.js';

const iso = d => d.toLocaleDateString('sv');
export function today(dayShift = 0) { const d = new Date(); d.setDate(d.getDate() + dayShift); return iso(d); }
const addDays = (day, n) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };

/** XpLevels (XpLevels.cs:12-27): 80 XP to level 2, 40 more for each level after; XP carries over. */
export const toNextLevel = (config, level) => config.levelBaseXp + config.levelStepXp * (Math.max(level, 1) - 1);
export function addXp(config, level, xp, gained) {
  let lvl = Math.max(level, 1);
  const start = lvl;
  let total = Math.max(xp, 0) + gained;
  while (total >= toNextLevel(config, lvl)) { total -= toNextLevel(config, lvl); lvl++; }
  return { level: lvl, xp: total, levelsGained: lvl - start };
}

/** MasteryTracker (MasteryTracker.cs:77-117). `progress` is a plain object so it saves as JSON. */
export class Mastery {
  constructor(config, progress = {}, dayShift = 0) { this.config = config; this.progress = progress; this.dayShift = dayShift; }
  get today() { return today(this.dayShift); }
  of(id) { return this.progress[id] ?? null; }
  boxOf(id) { return this.of(id)?.box ?? 0; }
  isDue(id) { const p = this.of(id); return !p || p.dueDay <= this.today; }
  isMastered(id) { const p = this.of(id); return !!p && this.#mastered(p); }
  #mastered(p) { return p.box >= this.config.masteryMax && p.recallDays >= this.config.masteredRecallDays; }

  record(id, evidence) {
    const day = this.today;
    const before = this.of(id) ?? { id, box: 0, attempts: 0, recallDays: 0, recognised: 0, selfReports: 0, failed: 0, lastRecallDay: null, masteredDay: null };
    let p = { ...before, attempts: before.attempts + 1, lastDay: day };
    if (evidence === Evidence.Recall) {
      if (before.lastRecallDay !== day) p = { ...p, box: Math.min(this.config.masteryMax, before.box + 1), recallDays: before.recallDays + 1, lastRecallDay: day };
    } else if (evidence === Evidence.Recognised) p = { ...p, box: Math.max(before.box, 1), recognised: before.recognised + 1 };
    else if (evidence === Evidence.SelfReport) p = { ...p, selfReports: before.selfReports + 1 };
    else if (evidence === Evidence.Failed) p = { ...p, box: Math.max(0, before.box - 1), failed: before.failed + 1 };
    const mastered = this.#mastered(p);
    p.dueDay = addDays(day, this.config.dueAfterDays[p.box]);
    p.masteredDay = mastered ? (before.masteredDay && this.#mastered(before) ? before.masteredDay : day) : null;
    this.progress[id] = p;
    return p;
  }

  /** The mean of a concept's boxes over the top box; unseen questions count 0. */
  conceptMastery(conceptId, deck) {
    const boxes = deck.forConcept(conceptId).map(q => this.boxOf(q.id));
    return boxes.length ? boxes.reduce((a, b) => a + b, 0) / boxes.length / this.config.masteryMax : 0;
  }
}

/** RoundSummary.Stars (:25-32): 1 to 3 from the share of right cards, never 0, and they pay nothing. */
export function stars(outcomes, cfg) {
  if (!outcomes.length) return 1;
  const accuracy = outcomes.filter(o => isRight(o.resolution)).length / outcomes.length;
  return accuracy >= cfg.threeAt ? 3 : accuracy >= cfg.twoAt ? 2 : 1;
}

/** RoundSummary.PickConcepts (:39-64): struggled concepts first, weakest first, then random. */
export function pickConcepts(outcomes, deck, mastery, random, count) {
  const practised = [];
  const struggled = new Set();
  for (const o of outcomes) {
    for (const c of deck.find(o.questionId)?.conceptIds ?? []) {
      if (!practised.includes(c)) practised.push(c);
      if (!isRight(o.resolution)) struggled.add(c);
    }
  }
  return practised
    .map(c => ({ c, weak: struggled.has(c), m: mastery(c), s: random.next() }))
    .sort((a, b) => (a.weak ? 0 : 1) - (b.weak ? 0 : 1) || (a.weak ? a.m : 0) - (b.weak ? b.m : 0) || a.s - b.s)
    .slice(0, count)
    .map(e => e.c);
}

/** BadgeEvaluator.NewlyEarned (:21-64), over the whole deck, as the app's profile calls it after every card. */
export function newlyEarned(badges, ctx, earned) {
  const have = new Set(earned);
  return badges
    .filter(b => !have.has(b.id) && met(b, ctx))
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1));
}

function met(badge, { mastery, deck, round, days }) {
  const r = badge.rule;
  const all = Object.values(mastery.progress);
  const questionsOf = () => deck.forConcept(badge.conceptId ?? null).map(q => q.id);
  switch (r.kind) {
    case 'CardsPlayed': return all.reduce((s, p) => s + p.attempts, 0) >= r.count;
    case 'LearnQuestions': return questionsOf().filter(id => mastery.boxOf(id) >= 1).length >= r.count;
    case 'MasterQuestions': return questionsOf().filter(id => mastery.isMastered(id)).length >= r.count;
    case 'TypedFirstTryInRound': return round.filter(o => o.firstTryTyped).length >= r.count;
    case 'ClimbToLevel': return round.some(o => o.move === Move.Up && o.levelAfter === ({ Yaz: 2, Sec: 1, Cevir: 0 })[r.level]);
    case 'FlipKnew': return all.reduce((s, p) => s + p.selfReports, 0) >= r.count;
    case 'TryEveryFamily': {
      const families = deck.concepts.filter(id => id.startsWith('family:'));
      const tried = families.filter(f => deck.forConcept(f).some(q => mastery.of(q.id))).length;
      // A deck without families must not hand the badge out for trying none of none.
      return tried >= Math.max(1, r.count > 0 ? Math.min(r.count, families.length) : families.length);
    }
    case 'PlayDays': return (days ?? []).length >= r.count;
    default: throw new RangeError(`Unknown badge rule ${r.kind}`);
  }
}
