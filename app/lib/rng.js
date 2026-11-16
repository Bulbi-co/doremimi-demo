/*
 * The demo's random numbers. C#'s System.Random sequence cannot be reproduced in JS, so a deck run inside the slides
 * uses a seeded generator and plays the same every time (dossier ch. 10, G-05); opened on its own it seeds from the clock.
 * `next()` mirrors Random.Next(): a non-negative int below 2^31 - 1.
 */
export function seeded(seed) {
  let a = seed >>> 0;
  const unit = () => {
    // mulberry32
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next: () => Math.floor(unit() * 2147483647), unit };
}

export const fromClock = () => seeded((Date.now() ^ (performance.now() * 1000)) >>> 0);
