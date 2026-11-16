/*
 * The logo's page, Doremimi (dossier ch. 14 §6), as data so tests/ch14.test.mjs checks the page app.js draws.
 *
 * One page and every destination once. Testers called walking around the app confusing, and the old hub was part of
 * it: İletişim was reached by two rows ("Bültene abone ol" opened it too), and the characters, the foundation and the
 * books by both a banner and a row. The foundation is the header itself; the books stay on their banner and in Öğren ›
 * Notalar. The Tasarım sistemi row went with the old groups: its page text is still the pre-ch. 13 one and waits on
 * the owner (the page itself is kept at #/tasarim).
 *
 * A row is [icon, title, line, where]: `push` a page on this tab, `go` to a tab root, `ext` a site behind the gate.
 */
export const HUB_HEADER = { title: 'Dore Mimi Yetenek ve Eğitim Vakfı', push: '#/vakif' };

export const HUB = [
  { title: 'Faaliyetler', cards: true, rows: [
    ['IconHeart', 'Müzikle Değerler Eğitimi', 'Kitaplar, şarkılar ve oyunlarla değerler', { go: '#/ogren/degerler' }],
    ['IconBolt', 'Burslar', 'Si Bemol ve Mi Bemol', { push: '#/burslar' }],
    ['IconStar', 'Etkinlikler ve materyaller', 'Konserler, bilmeceler, eğitici materyaller', { push: '#/etkinlikler' }],
  ] },
  { title: 'Katıl', rows: [
    ['IconHand', 'Gönüllü ol', 'D. M. Gönüllüleri başvurusu', { push: '#/gonullu' }],
    ['IconMail', 'Bültene abone ol', 'Yeniliklerden ilk sen haberdar ol', { push: '#/bulten' }],
    ['IconHeart', 'Destek ol', 'Bağış ve destek', { push: '#/destek' }],
  ] },
  { title: 'Tanış', rows: [
    ['IconSmile', 'Dore ve Mimi', 'Karakterlerle tanış', { push: '#/dore-ve-mimi' }],
    ['IconUsers', 'Ekip', 'Projeyi hayata geçirenler', { push: '#/ekip' }],
    ['IconStar', 'Destekçiler', 'Yanımızda olan kurumlar', { push: '#/destekciler' }],
  ] },
  { title: 'Bize ulaş', rows: [
    ['IconPhone', 'İletişim', 'Telefon, e-posta ve mesaj formu', { push: '#/iletisim' }],
    ['IconPlay', 'YouTube', 'Tüm klipler ve bilmeceler', { ext: 'youtube.com' }],
    ['IconCamera', 'Instagram', '@dore_mimi_music', { ext: 'instagram.com' }],
    ['IconUsers', 'Facebook', 'doremimitv', { ext: 'facebook.com' }],
    ['IconGlobe', 'Web sitesi', 'doremimi.org', { ext: 'doremimi.org' }],
  ] },
  { title: 'Uygulama', rows: [
    ['IconHelp', 'Yardım ve SSS', 'Sık sorulan sorular', { push: '#/yardim' }],
    ['IconLock', 'Yasal metinler', 'Gizlilik, kullanım koşulları, KVKK', { push: '#/yasal' }],
    ['IconInfo', 'Uygulama bilgisi', 'Sürüm ve lisanslar', { push: '#/hakkinda' }],
  ] },
];

/** Every place the hub leads, header included, as one list (what the duplicate guard reads). */
export const hubDestinations = () => [HUB_HEADER.push, ...HUB.flatMap(g => g.rows.map(r => Object.values(r[3])[0]))];
