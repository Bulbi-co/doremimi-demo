/*
 * Which page takes its category's colour on the backdrop (ShellViewModel.CanvasAccent; dossier ch. 13 §5).
 *
 * Owner, 2026-11-15: "every page is reactive to the dynamic color changes but only when it's appropriate". Appropriate
 * is a page one category owns: an Öğren family filter, a sign category, a sign's own page and an instrument's own page.
 * Keşfet, İzle, Çal and the hub keep their tab's wash on purpose, because no one category owns them. It follows the
 * page, not the tab, so a sign opened from Bugünün kartı takes its colour too. The game never asks: its ladder moods
 * stay, and speed changes only there (lib/backdrop.js TAB_PACE).
 *
 * Pure, with the data passed in, so tests/ch13.test.mjs runs the function app.js runs.
 */
export function pageAccentOf(route, { SIGN_CATEGORIES, SIGN_CARDS, DIRECTORY, GROUPS, GROUP_COLORS, slug }) {
  const { page: p, arg } = route;
  if (p === 'isaret-kategori') return SIGN_CATEGORIES.find(c => c.key === arg)?.color ?? null;
  if (p === 'isaret') { const k = SIGN_CARDS.find(c => c.id === arg); return SIGN_CATEGORIES.find(c => c.key === k?.category)?.color ?? null; }
  if (p === 'calgi') { const d = DIRECTORY.find(x => slug(x.name) === arg); return d ? GROUP_COLORS[d.group] : null; }
  if (!p && route.tab === 'ogren' && route.segment === 'calgilar') {
    const g = GROUPS.find(x => slug(x) === route.query?.get('aile'));
    return g ? GROUP_COLORS[g] : null;
  }
  return null;
}
