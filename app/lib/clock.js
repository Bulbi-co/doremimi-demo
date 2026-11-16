/*
 * The time in the demo's fake status bar. It is the device's clock, not the app's, so it does not follow Ayarlar › Dil.
 *
 * It was formatted in the app's language on a ten-second timer: the deck's Ayarlar slide switched to English, the next
 * tick wrote "08:48 PM", and the phone went on to French and back to Türkçe still reading "08:48 PM", onto the closing
 * slide (seen in the walk of 2026-11-16). No locale is asked here on purpose: the 24-hour form is what a phone set up
 * in Türkiye shows, and it has no AM/PM to go stale.
 */

/** @param {Date} date @returns {string} "20:48", "09:05" */
export function deviceClock(date) {
  const two = n => String(n).padStart(2, '0');
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}
