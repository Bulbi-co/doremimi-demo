/*
 * The deck's live demo as one script (dossier ch. 10 part 5, re-told by ch. 14 §9 and §11). A slide or a "canlı
 * göster" button asks the phone for a step by its index (sunum's at(k) and play(k), deck/slides.js), and the phone
 * plays the steps between where it is and there (ACTS.goto in app.js). Each step is a list of the phone's ACTS,
 * played in order.
 *
 * It is data in its own module, not a constant inside app.js, so tests/deck.test.mjs can import the very list the
 * phone plays and hold the deck's slides to it. After ch. 14 the steps were renumbered while sunum.js still asked for
 * the old ones, and slide 5 opened Öğren's round under the title "Tur sonu"; nothing failed.
 *
 * Since §11 the deck walks the whole app, and every phone message on it is a step here, tabs and pages included. A
 * plain go() between two scripted slides would leave the phone off the script, and the next at(k) would start over
 * from a fresh child and replay everything before it; as steps, a forward walk never starts over, and a jump to any
 * slide replays to exactly the phone the audience would have seen by walking there (Profilim shows the stars and
 * badges the two rounds earned, Ayarlar the level the first game asked).
 *
 * The struggles in 7 and 8 are measured, not chosen for drama: Oyna's round moves down one level after four struggles
 * in a row (learning.json downAfterStruggles), so the cards turned over to read come only on the ninth card after a
 * right answer: one wrong pick in 6, three "Bilmiyorum" in 7 (the next card opens at the four choices), one wrong pick
 * and three more in 8 (the next card is turned over). The seeded round has the comebacks to reach it (11 cards).
 *
 * Step 10's gap is 400 ms, not game.finish's 600: at 600 the deck stayed locked for 10.8 s in headless Chrome
 * (2026-11-16), long enough in front of an audience to look stuck.
 */
const struggle = [{ name: 'game.dontknow' }, { name: 'game.next' }];

export const SCRIPT = [
  // İlk açılış
  [{ name: 'page', hash: '#/' }],                                                                       // 0  Oyna, a fresh child
  [{ name: 'game.start', deck: 'sunum', origin: 'kesfet', intro: true }],                               // 1  Şimdi Oyna: the level question
  [{ name: 'intro.finish' }],                                                                           // 2  Başlangıç, then the intro's pages
  // Oyna's round: the child writes
  [{ name: 'game.type', text: 'sol', send: true }],                                                     // 3  Yanlış yaz: "sol", harf kutuları
  [{ name: 'game.fill', send: true }],                                                                  // 4  Kutuları doldur: a right answer
  [{ name: 'game.next' }, { name: 'game.type', text: 'bemol', send: true }, { name: 'game.type', text: 'solm', send: true }],  // 5  Diyez: both tries wrong, four choices
  [{ name: 'game.choose', right: false }],                                                              // 6  Yanlış seç: the card explains (struggle 1)
  [{ name: 'game.next' }, ...struggle, ...struggle, ...struggle],                                       // 7  Bilmiyorum ×3 (2-4): the next card opens at the choices
  [{ name: 'game.choose', right: false }, { name: 'game.next' }, ...struggle, ...struggle, ...struggle], // 8  four more (5-8): the next card is turned over
  [{ name: 'game.flip' }, { name: 'game.grade', knew: true }],                                          // 9  Kartı çevir, Bildim
  [{ name: 'game.next' }, { name: 'game.finish', gap: 400 }],                                           // 10 Turu bitir: sonuçlar
  [{ name: 'results.scroll', to: 'badges' }],                                                           // 11 Rozetler
  // The Oyna tab
  [{ name: 'page', hash: '#/' }],                                                                       // 12 Oyna, after the round
  [{ name: 'scroll', to: '.kats-sec' }],                                                                // 13 Kategoriler
  [{ name: 'tap', sel: '[data-play="family:TelliCalgilar"]' }],                                         // 14 a category: its round, written
  [{ name: 'page', hash: '#/' }, { name: 'scroll', to: '.today' }, { name: 'tap', sel: '[data-today]' }], // 15 Bugünün kartı
  // Öğren, information only (ch. 14 §10)
  [{ name: 'page', hash: '#/ogren/isaretler' }],                                                        // 16 İşaretler
  [{ name: 'sign.flip', key: 'diyez' }],                                                                // 17 a tile turns over
  [{ name: 'tap', sel: '[data-push="#/isaret-kategori/diyez"]' }, { name: 'tap', sel: '[data-push="#/isaret/diyez"]' }], // 18 its category, its sign
  [{ name: 'page', hash: '#/ogren/aileler' }],                                                          // 19 Aileler
  [{ name: 'tap', sel: '[data-fam="YayliCalgilar"]' }],                                                 // 20 Yaylı Çalgılar: the family's instruments
  [{ name: 'tap', sel: '[data-push="#/calgi/keman"]' }],                                                // 21 Keman: its page, nothing to play
  [{ name: 'page', hash: '#/ogren/degerler' }],                                                         // 22 Değerler
  // İzle
  [{ name: 'page', hash: '#/izle' }],                                                                   // 23 İzle: the riddles first
  [{ name: 'video.open' }],                                                                             // 24 a riddle: the parent gate
  [{ name: 'gate.type' }],                                                                              // 25 the PIN: the player
  // Çal
  [{ name: 'page', hash: '#/cal' }],                                                                    // 26 Çal
  [{ name: 'keys.play', keys: [60, 62, 64, 65, 67, 67, 69, 67] }],                                      // 27 the piano
  [{ name: 'tap', sel: '[data-push="#/sarki/keman"]' }, { name: 'song.play' }],                         // 28 Keman's song, karaoke
  [{ name: 'song.stop' }],                                                                              // 29 the song stops
  [{ name: 'song.game', hash: '#/sarki/keman' }, { name: 'game.choose', right: true }],                 // 30 Bu çalgıyla oyna: the four choices
  [{ name: 'game.next' }, { name: 'game.finish', gap: 400 }],                                           // 31 its end
  // The logo's tab: Dore Mimi Vakfı
  [{ name: 'page', hash: '#/doremimi' }],                                                               // 32 the banners
  [{ name: 'banner.show', index: 3 }],                                                                  // 33 "Vakfımız kuruldu!"
  [{ name: 'tap', sel: '[data-banner="3"]' }],                                                          // 34 the foundation's page
  [{ name: 'page', hash: '#/doremimi' }, { name: 'scroll', to: '.hub .acts3' }],                       // 35 Faaliyetler and below
  [{ name: 'tap', sel: '[data-push="#/burslar"]' }],                                                    // 36 Burslar
  [{ name: 'open', hash: '#/doremimi', tap: '[data-push="#/etkinlikler"]' }],                           // 37 Etkinlikler
  [{ name: 'open', hash: '#/doremimi', tap: '[data-push="#/dore-ve-mimi"]' }],                          // 38 Dore ve Mimi
  // The family
  [{ name: 'page', hash: '#/profil' }],                                                                 // 39 Profilim
  [{ name: 'scroll', to: '.plist.stats' }],                                                             // 40 the stats and the badges
  [{ name: 'switcher.open' }],                                                                          // 41 Kim oynuyor?
  [{ name: 'page', hash: '#/profil' }],                                                                 // 42 Profilim again, for the gate
  [{ name: 'gate.open', row: 'hesabim' }],                                                              // 43 Hesabım asks the PIN
  [{ name: 'gate.type' }],                                                                              // 44 the PIN: Hesabım
  [{ name: 'page', hash: '#/ayarlar' }],                                                                // 45 Ayarlar
  [{ name: 'tap', sel: '[data-zorluk="orta"]' }],                                                       // 46 Zorluk: Orta
  [{ name: 'tap', sel: '[data-dil="en"]' }, { name: 'page', hash: '#/' }],                              // 47 English, then the Oyna tab in it
  [{ name: 'page', hash: '#/ayarlar' }, { name: 'tap', sel: '[data-dil="fr"]' }, { name: 'page', hash: '#/ogren/aileler' }], // 48 Français, then Öğren › Aileler
  [{ name: 'page', hash: '#/ayarlar' }, { name: 'tap', sel: '[data-dil="tr"]' }],                       // 49 back to Türkçe
  [{ name: 'page', hash: '#/doremimi' }],                                                               // 50 the closing: the foundation's tab
];
