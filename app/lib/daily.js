/*
 * Bugünün kartı, ported from Doremimi.Core/Learning/DailyCard.cs (superapp f8c3a52): which kind of card today is and
 * which item of that kind. A pure function of the date and the pools' sizes, so every child sees the same card on the
 * same day, offline, and a test can ask any date.
 *
 * The kind turns every day (instrument, question, sign, instrument, …) and each pool is walked one item per turn of
 * the kinds. The spec's fixed weekday table was cut to this on purpose (the owner wanted Keşfet "really simpler"); an
 * empty pool hands its day to the next kind instead of showing nothing.
 */

/** Day zero, a Monday (DailyCard.Epoch). */
export const EPOCH = { y: 2026, m: 1, d: 5 };

// DateOnly.DayNumber counts calendar days. Date.UTC on the local y/m/d does the same with no DST hour to round away.
const dayNumber = date => Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
const EPOCH_DAY = Math.round(Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d) / 864e5);
const mod = (v, by) => ((v % by) + by) % by;

/**
 * @param {Date} date the child's local calendar day (the time of day is ignored)
 * @param {number[]} poolSizes one size per kind; the demo passes [instruments, questions, signs] as the app does
 * @returns {{ kind: number, item: number } | null} null only when every pool is empty
 */
export function pick(date, poolSizes) {
  const kinds = poolSizes.length;
  if (kinds === 0) return null;
  const day = dayNumber(date) - EPOCH_DAY;
  const turn = Math.floor(day / kinds);
  let kind = mod(day, kinds);
  for (let tried = 0; tried < kinds; tried++, kind = (kind + 1) % kinds) {
    if (poolSizes[kind] > 0) return { kind, item: mod(turn, poolSizes[kind]) };
  }
  return null;
}
