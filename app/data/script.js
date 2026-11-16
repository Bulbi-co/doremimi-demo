/*
 * The deck's live demo as one script (dossier ch. 10 part 5, re-told by ch. 14 §9). A slide or a "canlı göster"
 * button asks the phone for a step by its index (sunum's at(k) and play(k), deck/slides.js), and the phone plays the
 * steps between where it is and there (ACTS.goto in app.js). Each step is a list of the phone's ACTS, played in order.
 *
 * It is data in its own module, not a constant inside app.js, so tests/deck.test.mjs can import the very list the
 * phone plays and hold the deck's slides to it. After ch. 14 the steps were renumbered while sunum.js still asked for
 * the old ones, and slide 5 opened Öğren's round under the title "Tur sonu"; nothing failed.
 *
 * The story, in the order the slides tell it: Keşfet's round, where the child writes (0-8); Öğren, a family's
 * Hazırlan sheet and its cards turned over (9-11); Çal, a song's round at the choices, to its results (12-15).
 * Each way in plays the way it plays in the app; nothing here picks a level (ch. 14 §3). The 'page' steps (9, 12) are
 * where a slide opens on a tab: as script steps, a forward walk through the deck never leaves the script, so the
 * phone never has to start over and replay the round from the beginning in front of the audience.
 *
 * Step 14's gap is 400 ms, not game.finish's 600: it answers the last five cards, and at 600 the deck stayed locked
 * for 10.8 s in headless Chrome (2026-11-16), long enough in front of an audience to look stuck.
 */
export const SCRIPT = [
  [{ name: 'game.start', deck: 'sunum', origin: 'kesfet', intro: true }],                             // 0  Keşfet · OYNA: the level question
  [{ name: 'intro.finish' }],                                                                           // 1  Başlangıç, then the intro's pages
  [{ name: 'game.type', text: 'sol', send: true }],                                                     // 2  Yanlış yaz: "sol", harf kutuları
  [{ name: 'game.fill', send: true }],                                                                  // 3  Kutuları doldur
  [{ name: 'game.next' }],                                                                              // 4  Diyez
  [{ name: 'game.type', text: 'bemol', send: true }, { name: 'game.type', text: 'solm', send: true }],  // 5  İki deneme de yanlış: dört seçenek
  [{ name: 'game.choose', right: false }],                                                              // 6  Yanlış seç: kart anlatır
  [{ name: 'game.next' }],                                                                              // 7  Bemol, yine yazarak
  [{ name: 'game.type', text: 'bemol', send: true }],                                                   // 8  Doğru yaz: tek zorlanma oyunu indirmez
  [{ name: 'page', hash: '#/ogren/aileler' }],                                                          // 9  Öğren › Aileler
  [{ name: 'prep.open', hash: '#/ogren/aileler', concept: 'family:YayliCalgilar' }],                    // 10 Yaylı Çalgılar: Hazırlan, "7 kart"
  [{ name: 'prep.start' }, { name: 'game.flip' }, { name: 'game.grade', knew: true }],                  // 11 Başla: kartı çevir, Bildim
  [{ name: 'page', hash: '#/cal' }],                                                                    // 12 Çal
  [{ name: 'song.game', hash: '#/sarki/keman' }, { name: 'game.choose', right: true }],                 // 13 Keman: Bu çalgıyla oyna, seç
  [{ name: 'game.next' }, { name: 'game.finish', gap: 400 }],                                           // 14 Turu bitir: sonuçlar
  [{ name: 'results.scroll', to: 'badges' }],                                                           // 15 Rozetler
];
