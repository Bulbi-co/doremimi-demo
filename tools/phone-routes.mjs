// What the phone can be asked for, read from the phone itself, for the deck's guards (tests/deck.test.mjs,
// tests/foundation.test.mjs): a slide that sends a hash the phone does not know lands on a blank page in front of the
// audience, and one that names an act the phone lacks does nothing, and neither fails anywhere else.
//
// app/app.js cannot be imported outside a browser (it draws at load), so the page names and the act names are read
// from its source. Both lists are checked for names that must be there, so a reader that stops matching fails loudly
// and does not pass an empty list.
import { readFileSync } from 'node:fs';
import { resolve, OGREN_TABS } from '../app/lib/nav.js';

const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');

const pagesBlock = app.slice(app.indexOf('const PAGES = {'), app.indexOf('\n};', app.indexOf('const PAGES = {')));
export const PAGES = [...pagesBlock.matchAll(/^\s+(?:'([\w-]+)'|([\w-]+)): \{ title:/gm)].map(m => m[1] ?? m[2]);
for (const must of ['profil', 'ayarlar', 'vakif', 'calgi', 'hesabim']) if (!PAGES.includes(must)) throw new Error(`phone-routes: PAGES was not read from app/app.js (no "${must}" in ${PAGES.length} names)`);

const actsBlock = app.slice(app.indexOf('const ACTS = {'), app.indexOf('\n};', app.indexOf('const ACTS = {')));
export const ACT_NAMES = [...[...actsBlock.matchAll(/^  '([\w.]+)': /gm)].map(m => m[1]), ...[...app.matchAll(/^ACTS\.(\w+) = /gm)].map(m => m[1])];
for (const must of ['goto', 'game.type', 'gate.type', 'scroll']) if (!ACT_NAMES.includes(must)) throw new Error(`phone-routes: ACTS was not read from app/app.js (no "${must}" in ${ACT_NAMES.length} names)`);

/** True when the phone draws something of its own at `hash`: a tab root (an Öğren tab by its key) or a page it has. */
export function knownRoute(hash) {
  if (typeof hash !== 'string' || !hash.startsWith('#/')) return false;
  const r = resolve(hash);
  if (r.kind === 'root') return r.tab !== 'ogren' || r.segment == null || OGREN_TABS.some(t => t.key === r.segment);
  return r.kind === 'page' && PAGES.includes(r.page);
}

/** A deck message as the plain messages it sends, a batch opened up. */
export const flat = msg => (msg?.type === 'batch' ? msg.msgs.flatMap(flat) : msg ? [msg] : []);
