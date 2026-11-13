/*
 * The phone's navigation as data and one pure function, so tests/nav.test.mjs can check it without a browser: the
 * dock of dossier ch. 11 NR-02 (Keşfet · Öğren · logo · İzle · Çal), the routes of NR-91 and where a page lives.
 * app.js draws what `resolve` decides.
 */
export const TABS = [
  { key: 'kesfet', hash: '#/', label: 'Keşfet', icon: 'IconHome', title: 'Keşfet' },
  { key: 'ogren', hash: '#/ogren/isaretler', label: 'Öğren', icon: 'IconBook', title: 'Öğren' },
  // The centre slot carries the official logo and no label (OC-02); its screen-reader name is Doremimi.
  { key: 'doremimi', hash: '#/doremimi', label: '', logo: true, title: 'Doremimi' },
  { key: 'izle', hash: '#/izle', label: 'İzle', icon: 'IconEye', title: 'İzle' },
  { key: 'cal', hash: '#/cal', label: 'Çal', icon: 'IconNote', title: 'Çal' },
];
export const TAB_OF = { '': 'kesfet', ogren: 'ogren', doremimi: 'doremimi', izle: 'izle', cal: 'cal' };
// Old routes stay as redirects so a stale deep link (a bookmark, an old slide) still lands (NR-91).
export const REDIRECTS = { oyunlar: '#/oyun-merkezi', daha: '#/doremimi', 'ogren/videolar': '#/izle', 'ogren/kitaplik': '#/cal', 'kim-oynuyor': '#/profil' };
/*
 * Where a page lives when it is opened with nothing under it (a deep link, or the deck's `go`): the song page in
 * Çal, the instrument in Öğren, the foundation's pages in the hub. Opened by a tap, a page stays on the tab it was
 * tapped from, as in the app (Keşfet's banner 2 pushes Dore ve Mimi on Keşfet's own stack, NR-10). The profile pages
 * have no home: Profilim is pushed over whichever tab the avatar was tapped on (NR-60).
 */
export const PAGE_HOME = { calgi: 'ogren', isaret: 'ogren', 'isaret-kategori': 'ogren', sarki: 'cal', sozler: 'cal', melodim: 'cal',
  'oyun-merkezi': 'kesfet', 'doremimi-nedir': 'doremimi', kitaplar: 'doremimi', 'dore-ve-mimi': 'doremimi', vakif: 'doremimi', ekip: 'doremimi',
  burslar: 'doremimi', gonullu: 'doremimi', iletisim: 'doremimi', yardim: 'doremimi', metin: 'doremimi', hakkinda: 'doremimi', tasarim: 'doremimi' };

export function parse(hash) {
  const [path, query] = (hash.replace(/^#\/?/, '') || '').split('?');
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query || '') };
}

/**
 * What a hash means, given the tab showing, whether pages are stacked on it, and whether a tap (not a link) asked:
 * `game` (the layer), `redirect` (an old route), `root` (a tab, which clears the stack) or `page` (pushed on `tab`).
 */
export function resolve(hash, { tab = 'kesfet', stacked = false, fromApp = false } = {}) {
  const { parts, query } = parse(hash);
  const head = parts[0] ?? '';
  if (head === 'oyun') return { kind: 'game', query };
  const to = REDIRECTS[parts.slice(0, 2).join('/')] ?? REDIRECTS[head];
  if (to) return { kind: 'redirect', to };
  if (TAB_OF[head]) return { kind: 'root', tab: TAB_OF[head], segment: parts[1], query };
  return { kind: 'page', tab: !fromApp && !stacked && PAGE_HOME[head] ? PAGE_HOME[head] : tab, page: head, arg: parts[1], query };
}
