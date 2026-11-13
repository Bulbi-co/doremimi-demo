/*
 * Port of Doremimi.Core/Learning/LetterTiles.cs (dossier ch. 10, P-04 and P-05): the second typing try at Yaz.
 * One box per letter, words apart, a fifth of the letters prefilled (vowels first), fixed per question by a stable
 * FNV-1a hash of its id, so a card that comes back shows the same help.
 */
import { clean, find, Match, normalise, isLetterOrDigit } from './answers.js';

export const TileKind = Object.freeze({ Letter: 'Letter', Gap: 'Gap', Mark: 'Mark' });

const filled = t => t.kind !== TileKind.Letter || t.prefilled || t.typed != null;

/** ceil(fraction × letters), at least one, never all of them; none for a one-letter answer (:74-80). */
export function prefillCount(letters, fraction) {
  if (letters <= 1) return 0;
  const count = Math.ceil(letters * fraction);
  return Math.min(Math.max(count, 1), letters - 1);
}

/** FNV-1a over the UTF-16 code units (:150-161). */
export function stableHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Folded through the matcher, so ı ö ü â î û count as the vowels they are (:146-147).
const isVowel = c => ['a', 'e', 'i', 'o', 'u'].includes(normalise(c));

function spread(from, count, seed) {
  const out = [];
  if (count <= 0) return out;
  const step = from.length / count;
  const offset = (seed % 1000) / 1000 * step;
  for (let k = 0; k < count; k++) out.push(from[Math.min(from.length - 1, Math.floor(offset + k * step))]);
  return out;
}

export class LetterTiles {
  constructor(tiles) { this.tiles = tiles; }

  /** LetterTiles.For (:57-83). */
  static for(answer, seed, fraction) {
    const tiles = [];
    let word = 0;
    const text = clean(answer);
    for (let k = 0; k < text.length; k++) {
      const c = text[k];
      if (/\s/.test(c)) {
        // Runs of spaces are one gap, and a gap is only ever between two words.
        if (tiles.length > 0 && tiles[tiles.length - 1].kind !== TileKind.Gap) { tiles.push({ kind: TileKind.Gap, letter: ' ', word, prefilled: false, typed: null }); word++; }
      } else {
        tiles.push({ kind: isLetterOrDigit(c) ? TileKind.Letter : TileKind.Mark, letter: c, word, prefilled: false, typed: null });
      }
    }
    const letters = tiles.map((t, i) => t.kind === TileKind.Letter ? i : -1).filter(i => i >= 0);
    const count = prefillCount(letters.length, fraction);
    const vowels = letters.filter(i => isVowel(tiles[i].letter));
    const consonants = letters.filter(i => !vowels.includes(i));
    const h = stableHash(seed);
    const picks = count <= vowels.length ? spread(vowels, count, h) : [...vowels, ...spread(consonants, count - vowels.length, h)];
    for (const i of picks) tiles[i].prefilled = true;
    return new LetterTiles(tiles);
  }

  get wordLengths() {
    const counts = [];
    for (const t of this.tiles) if (t.kind === TileKind.Letter) counts[t.word] = (counts[t.word] ?? 0) + 1;
    return counts.filter(n => n !== undefined);
  }

  get isFull() { return this.tiles.every(filled); }

  /** The answer as it now reads, an empty tile as '_' (:42-47). */
  get text() {
    return this.tiles.map(t => t.kind === TileKind.Gap ? ' ' : t.kind === TileKind.Mark ? t.letter : t.prefilled ? t.letter : (t.typed ?? '_')).join('');
  }

  /** The index of the next box to fill, or -1. */
  get caret() { return this.tiles.findIndex(t => !filled(t)); }

  /** Fills the first empty tile; anything but a letter or digit is ignored (:89-97). */
  typeChar(c) {
    if (!isLetterOrDigit(c)) return false;
    const next = this.caret;
    if (next < 0) return false;
    this.tiles[next].typed = c;
    return true;
  }

  type(text) { let n = 0; for (let k = 0; k < text.length; k++) if (this.typeChar(text[k])) n++; return n; }

  /** Clears the last letter the child typed; a prefilled letter is never removed (:107-113). */
  backspace() {
    for (let i = this.tiles.length - 1; i >= 0; i--) if (this.tiles[i].typed != null) { this.tiles[i].typed = null; return true; }
    return false;
  }

  judge(accepted) { return this.isFull ? find(this.text, accepted) : { result: Match.Wrong, answer: null }; }
}
