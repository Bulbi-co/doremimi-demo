/*
 * Port of Doremimi.Core/Game/AnswerMatcher.cs and the parts of Doremimi.Core/Content/AcceptedAnswers.cs the phone
 * needs (dossier ch. 10, P-01 to P-03). The C# is the source of truth: if this file and it disagree, this file is wrong.
 *
 * Walks UTF-16 code units with an index loop, like C#'s `foreach (char c in text)`, not `for…of` code points: a music
 * glyph is two units in both languages, and neither unit is a letter.
 */

// Turkish letters are folded by hand before lower-casing (AnswerMatcher.cs:80-89). JS lower-cases İ to i + U+0307,
// two units, so the table must run first or İ would leave a combining dot behind.
const FOLD = {
  'İ': 'i', 'I': 'i', 'ı': 'i', 'i': 'i', 'î': 'i', 'Î': 'i',
  'Ş': 's', 'ş': 's',
  'Ğ': 'g', 'ğ': 'g',
  'Ü': 'u', 'ü': 'u', 'û': 'u', 'Û': 'u',
  'Ö': 'o', 'ö': 'o',
  'Ç': 'c', 'ç': 'c',
  'Â': 'a', 'â': 'a',
};
const LETTER_OR_DIGIT = /^[\p{L}\p{Nd}]$/u;
const DIGIT = /\p{Nd}/u;
const MARK = /^\p{Mn}$/u;

export const isLetterOrDigit = c => c.length === 1 && LETTER_OR_DIGIT.test(c);

/** Lower-case, diacritic-free, letters/digits/single spaces only (AnswerMatcher.Normalise, :69-107). */
export function normalise(text) {
  let out = '';
  let lastWasSpace = true;
  for (let k = 0; k < text.length; k++) {
    const raw = text[k];
    const c = FOLD[raw] ?? raw.toLowerCase();
    if (isLetterOrDigit(c)) {
      // Other accents fall back to their base letter: "pizzicàto" is still pizzicato.
      const stripped = c.normalize('NFD')[0];
      out += MARK.test(stripped) ? c : stripped;
      lastWasSpace = false;
    } else if (!lastWasSpace) {
      out += ' ';
      lastWasSpace = true;
    }
  }
  return out.trim();
}

/** How many typos a normalised answer forgives (AnswerMatcher.cs:59-66): none for 4 letters or fewer, or a digit. */
export function tolerance(n) {
  if (DIGIT.test(n)) return 0;
  return n.length <= 4 ? 0 : n.length <= 7 ? 1 : 2;
}

/** Optimal string alignment distance, three rolling rows (AnswerMatcher.cs:110-135). */
export function distance(a, b) {
  let before = new Array(b.length + 1).fill(0);
  let previous = new Array(b.length + 1).fill(0);
  let current = new Array(b.length + 1).fill(0);
  for (let j = 0; j <= b.length; j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) current[j] = Math.min(current[j], before[j - 2] + 1);
    }
    [before, previous, current] = [previous, current, before];
  }
  return previous[b.length];
}

export const Match = Object.freeze({ Wrong: 'Wrong', Close: 'Close', Exact: 'Exact' });

/** AnswerMatcher.Find (:32-56): exact wins at once, else the closest within tolerance is Close (still right). */
export function find(input, answers) {
  const typed = normalise(input);
  if (typed.length === 0) return { result: Match.Wrong, answer: null };
  let best = { result: Match.Wrong, answer: null };
  let bestDistance = Infinity;
  for (const answer of answers) {
    const expected = normalise(answer);
    if (expected.length === 0) continue;
    if (typed === expected) return { result: Match.Exact, answer };
    const tol = tolerance(expected);
    if (tol === 0) continue;
    const d = distance(typed, expected);
    if (d <= tol && d < bestDistance) { best = { result: Match.Close, answer }; bestDistance = d; }
  }
  return best;
}

// ───────────────────────────── AcceptedAnswers (Content/AcceptedAnswers.cs)

export const MAX_TYPEABLE_WORDS = 3;
const TRAILING = new Set(['.', '!', '?', ',', ';', ':', '…']);

/** The answer without its full stop: "Altı tel." → "Altı tel" (:25-32). */
export function clean(answer) {
  let s = answer.trim();
  let end = s.length;
  while (end > 0 && TRAILING.has(s[end - 1])) end--;
  return s.slice(0, end).trim();
}

export const words = answer => clean(answer).split(' ').filter(Boolean);
export const wordCount = answer => words(answer).length;
export const isTypeable = answer => { const n = wordCount(answer); return n > 0 && n <= MAX_TYPEABLE_WORDS; };

const UNITS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const numberWord = n => n < 10 ? UNITS[n] : n % 10 === 0 ? TENS[n / 10] : `${TENS[Math.floor(n / 10)]} ${UNITS[n % 10]}`;

function readNumber(word) {
  if (/^[0-9]+$/.test(word)) { const n = Number(word); return n < 100 ? n : -1; }
  const w = normalise(word);
  for (let n = 0; n < 100; n++) if (normalise(numberWord(n)) === w) return n;
  return -1;
}

const distinctByFold = list => { const seen = new Set(); return list.filter(x => { const k = normalise(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

/**
 * AcceptedAnswers.For (:45-68), for the instrument questions: a count also takes the number alone (altı, 6, altı tel,
 * 6 tel); a family also takes the family word and the singular (telli, telli çalgı). Ported rather than exported
 * because no exporter exists yet (dossier ch. 10 O-13); tests/rules.test.mjs pins the cases the deck relies on.
 */
export function acceptedFor(answer) {
  const whole = clean(answer);
  const forms = [whole];
  const w = whole.split(' ').filter(Boolean);
  if (w.length === 2) {
    const [head, noun] = w;
    const n = readNumber(head);
    if (n >= 0) { const word = numberWord(n); const digits = String(n); forms.push(word, digits, `${word} ${noun}`, `${digits} ${noun}`); }
    if (normalise(noun) === 'calgilar') forms.push(head, `${head} çalgı`);
  }
  return distinctByFold(forms);
}

export { distinctByFold };
