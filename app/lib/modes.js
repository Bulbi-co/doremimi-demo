/*
 * Where a round comes from decides how it is played (dossier ch. 14 §3 and §4). Pure, with the deck and the mastery
 * passed in, so tests/ch14.test.mjs runs the code app.js runs.
 *
 * The child never picks a way to play. Keşfet's round opens at the top, where the child writes the answer, and the
 * game moves down only after four struggles in a row; Öğren's round is the cards turned over to read, and Çal's is the
 * four choices, and neither moves. The names of those three ways stay out of the screen: as names they read as three
 * different games rather than one game that adapts (owner, 2026-11-16).
 */
import { LevelLadder, Level } from './ladder.js';

/** The ways into the game. Not "mode" or "entry": the app's GameGuardTests bans those names for a picker. */
export const RoundOrigin = Object.freeze({ Kesfet: 'kesfet', Ogren: 'ogren', Cal: 'cal' });

/** The level each way in starts at, and whether the ladder may move from there. */
export const ORIGIN_RULES = Object.freeze({
  [RoundOrigin.Kesfet]: { start: Level.Yaz, fixed: false },
  [RoundOrigin.Ogren]: { start: Level.Cevir, fixed: true },
  [RoundOrigin.Cal]: { start: Level.Sec, fixed: true },
});

/** The demo's old `?seviye=` links and the deck's `game.start { level }` name the way in by its level. */
export const ORIGIN_OF_LEVEL = Object.freeze({ yaz: RoundOrigin.Kesfet, cevir: RoundOrigin.Ogren, sec: RoundOrigin.Cal });

export function rulesOf(origin) {
  const r = ORIGIN_RULES[origin];
  if (!r) throw new RangeError(`Unknown round origin ${origin}`);
  return r;
}

/**
 * A new ladder for a round. The child's saved level is deliberately not an argument: Keşfet starts at the top every
 * time (ch. 14 §3), so a child who slid down in one round is not greeted lower in the next.
 */
export function ladderFor(origin, config) {
  const { start, fixed } = rulesOf(origin);
  return new LevelLadder(config, start, { fixed });
}

/** Every question's difficulty and the child's level use these three, easiest first. */
export const DIFFICULTIES = Object.freeze([
  { key: 'baslangic', name: 'Başlangıç', line: 'Müziğe yeni başlıyorum' },
  { key: 'orta', name: 'Orta', line: 'Biraz biliyorum' },
  { key: 'ileri', name: 'İleri', line: 'Zor sorulara hazırım' },
]);
export const rankOf = key => DIFFICULTIES.findIndex(d => d.key === key);

/**
 * The ceiling (ch. 14 §4): the child's own level first, then the levels below it, nearest first; only when those run
 * out, the levels above, nearest first, so a short pool is filled from the next level up rather than repeated.
 * Stable: within a tier the deck's own order (due first, then the lowest box) is kept. No level yet: unchanged.
 */
export function byCeiling(cards, level) {
  const L = rankOf(level);
  if (L < 0) return cards.slice();
  const tier = q => { const d = rankOf(q.difficulty); return d === L ? 0 : d < L ? 1 + (L - d) : 10 + (d - L); };
  return cards.map((q, i) => ({ q, i, t: tier(q) })).sort((a, b) => a.t - b.t || a.i - b.i).map(x => x.q);
}

/**
 * The cards of a round. Öğren deals the whole category and nothing else, unfiltered: the child is reading it, and the
 * Hazırlan sheet promised "N kart". Keşfet and Çal deal a round's worth under the ceiling; a short concept is topped up
 * from the rest of the deck, same kinds only, as the app's Deal does (MusicCardGameViewModel.cs:201-216).
 */
export function dealRound({ deck, origin, concept = null, level = null, mastery, random, count }) {
  rulesOf(origin);
  const all = c => deck.deal(c, deck.all.length, mastery, random);
  if (origin === RoundOrigin.Ogren) return concept == null ? all(null).slice(0, count) : all(concept);
  const cards = byCeiling(all(concept), level).slice(0, count);
  if (cards.length < count && concept != null) {
    const kinds = new Set(cards.map(c => c.kind));
    cards.push(...byCeiling(all(null).filter(c => kinds.has(c.kind) && !cards.includes(c)), level).slice(0, count - cards.length));
  }
  return cards;
}

/** What the Hazırlan sheet says: the true count of the cards the Öğren round will deal. */
export const prepCount = (deck, concept) => deck.forConcept(concept).length;

/** Keşfet's categories: every concept but the single instruments, in the deck's order, signs and families together. */
export const kesfetCategories = (deck, concepts) => deck.concepts.filter(id => !id.startsWith('instrument:') && concepts[id]);
