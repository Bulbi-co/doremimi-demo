/*
 * The game's single accent, ported from Doremimi/Controls/Accent.cs and Readable.cs (superapp f8c3a52): where one card
 * owns the screen, its colour goes on the primary action (Gönder, Kartı çevir, Devam, Anladım), the given letter tiles
 * and the caret; everything else stays white and ink.
 *
 * Ink is tried before white on purpose: ink on the raw colour keeps the hue, so an orange card gets an orange Gönder.
 * Only a colour where neither ink nor white reaches 4.5:1 is deepened (today, Bemol's #E8443A). The previous rule
 * deepened every accent until white read on it, which turned orange into brown and yellow into olive.
 */
export const INK = '#16182C';
export const WHITE = '#FFFFFF';
const MIN = 4.5;

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); t = Math.min(1, Math.max(0, t)); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase(); };
const lum = h => rgb(h).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

/** Readable.Darken: toward ink in 5% steps until the colour reads 4.5:1 on `background`. */
export function darken(color, background = WHITE) {
  for (let step = 0; step <= 20; step++) { const c = mix(color, INK, step / 20); if (contrast(c, background) >= MIN) return c; }
  return INK;
}
/** Motion.Edge: a toy card's or a button's edge is its face 32% toward ink. */
export const edge = face => mix(face, INK, 0.32);

/** AccentSet.From: the face, its label, the edge under it, and the colour's text shade (the caret, the chip). */
export function accentSet(c) {
  c = c.toUpperCase();
  let face, label;
  if (contrast(INK, c) >= MIN) [face, label] = [c, INK];
  else if (contrast(WHITE, c) >= MIN) [face, label] = [c, WHITE];
  else [face, label] = [darken(c), WHITE];
  return { face, label, edge: edge(face), text: darken(c) };
}
/** AccentSet.Ink: the neutral primary, for screens no single card owns (results, popups). */
export const INK_SET = { face: INK, label: WHITE, edge: '#05060F', text: INK };
