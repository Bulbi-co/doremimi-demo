/*
 * The logo's tab, Dore Mimi Vakfı (dossier ch. 14 §6 and §10), as data so tests/ch14.test.mjs checks the page app.js
 * draws.
 *
 * One page and every destination once. Testers called walking around the app confusing, and the old hub was part of
 * it: İletişim was reached by two rows ("Bültene abone ol" opened it too), and the characters, the foundation and the
 * books by both a banner and a row. Since revision 2 the banner carousel opens the tab where the foundation's card was
 * (the foundation is the tab's title now), and the foundation's page is the "Vakfımız kuruldu!" banner's.
 *
 * A row is [icon, key, where]: its title is t(`hub.<key>`) and its line t(`hub.<key>.line`) (i18n/ui.js); `push` a page
 * on this tab, `go` to a tab root, `ext` a site behind the gate.
 */
export const HUB = [
  { key: 'faaliyetler', cards: true, rows: [
    ['IconHeart', 'degerler', { go: '#/ogren/degerler' }],
    ['IconBolt', 'burslar', { push: '#/burslar' }],
    ['IconStar', 'etkinlikler', { push: '#/etkinlikler' }],
  ] },
  { key: 'katil', rows: [
    ['IconHand', 'gonullu', { push: '#/gonullu' }],
    ['IconMail', 'bulten', { push: '#/bulten' }],
    ['IconHeart', 'destek', { push: '#/destek' }],
  ] },
  { key: 'tanis', rows: [
    ['IconSmile', 'dore-ve-mimi', { push: '#/dore-ve-mimi' }],
    ['IconUsers', 'ekip', { push: '#/ekip' }],
    ['IconStar', 'destekciler', { push: '#/destekciler' }],
  ] },
  { key: 'ulas', rows: [
    ['IconPhone', 'iletisim', { push: '#/iletisim' }],
    ['IconPlay', 'youtube', { ext: 'youtube.com' }],
    ['IconCamera', 'instagram', { ext: 'instagram.com' }],
    ['IconUsers', 'facebook', { ext: 'facebook.com' }],
    ['IconGlobe', 'web', { ext: 'doremimi.org' }],
  ] },
  { key: 'uygulama', rows: [
    ['IconHelp', 'yardim', { push: '#/yardim' }],
    ['IconLock', 'yasal', { push: '#/yasal' }],
    ['IconInfo', 'hakkinda', { push: '#/hakkinda' }],
  ] },
];

/** Every place the rows lead, as one list (what the duplicate guard reads). */
export const hubDestinations = () => HUB.flatMap(g => g.rows.map(r => Object.values(r[2])[0]));

/*
 * Where each banner leads, by its place in content.js BANNERS (NR-10, OC-21): the game, the characters, İzle, the
 * foundation's page, the books. The characters banner and the Tanış row both open Dore ve Mimi: the banner is an
 * announcement that rotates away, the row is where a parent finds the page again, and ch. 14 keeps both (§6 lists
 * the row under Tanış; §10 moves the carousel here unchanged).
 */
export const BANNER_GO = ['game', '#/dore-ve-mimi', '#/izle', '#/vakif', '#/kitaplar'];

/** The directory group each family's instruments are filed under (Öğren › Aileler opens Çalgılar under it). */
export const FAMILY_GROUP = { TelliCalgilar: 'Telli', YayliCalgilar: 'Yaylı', VurmaliCalgilar: 'Vurmalı', TusluCalgilar: 'Tuşlu', NefesliUflemeliCalgilar: 'Nefesli' };
