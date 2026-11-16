// What §14 forbids on screen, as words: asked of the sources by tests/xp.test.mjs and of the rendered page by
// tools/xp-e2e.mjs, from this one list so the two cannot drift. Whole words only: "altında" (under) is not gold,
// "expression" is not EXP, the clarinet's "pièce" (its reed) is not a coin, and "ClimbToLevel" (a badge rule's kind,
// never drawn) is not a level number.
export const XP_WORD = /(?<![\p{L}\p{N}])(XP|EXP)(?![\p{L}\p{N}])|deneyim puan|experience points?|points? d[’']expérience/iu;
export const GOLD_WORD = /(?<!\p{L})(altın|altınlar|jetons?|coins?|gold|pièces? d[’']or)(?!\p{L})/iu;
export const LEVEL_NUMBER = /(?<!\p{L})(seviye|sv|level|lvl|lv|niveau|niv)\.?\s*(\{\w+\}|\d)/iu;
