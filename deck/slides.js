/*
 * The deck's slides as data: copy, the phone message each slide sends when it opens, and its "canlı göster" steps.
 * The copy began as dossier ch. 10 part 5 (PROPOSED, the owner's to change) and was cut to a short deck at the owner's
 * request (2026-11-13: no step counter, no icon tiles, nothing that is there only to be shown). Ch. 14 §9 re-tells
 * it: Oyna is the game (Keşfet until ch. 14 §10) and its whole round, one press per move → Öğren, read, not played →
 * Çal → family and the foundation. Owner, 2026-11-16: no slide about XP or results (progress is tracked, never shown as
 * XP), and no way into the game from a song or an instrument, so the "Tur sonu" slide and Çal's game step went.
 * Ch. 14 §11 asks for every tab and scenario, so after Çal and its song the walk goes on: İzle and a riddle behind
 * the parent PIN, the logo's tab and the foundation's page, the family, then Ayarlar with Zorluk and the three
 * languages.
 *
 * Its own module, apart from sunum.js (which draws and drives it), so tests/deck.test.mjs can import the slides and
 * hold every scripted step they ask for to the phone's script (app/data/script.js).
 */
import { ICONS } from '../app/lib/icons.js';
import { FOUNDATION_SLIDES } from './foundation.js';

export const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}" fill-rule="evenodd"/></svg>`;
/* Bir slayt: kısa başlık, bir cümle, en çok iki satır, en çok iki canlı gösterim. */
const step = (title, lead, feats = [], pre = '') => `
  <h1 class="title tour">${title}</h1>
  <p class="lead">${lead}</p>${pre}
  ${feats.length ? `<ul class="feats">${feats.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}`;
export const go = hash => ({ type: 'go', hash });
export const act = (name, args = {}) => ({ type: 'act', name, ...args });
/*
 * A "canlı göster" step outside the game is a whole state, not a delta: it goes to its screen, then presses. So ←
 * (which resends the step before) and R always land on the same screen, whatever was tapped in between.
 */
export const batch = (...msgs) => ({ type: 'batch', msgs });
export const at = step => ({ type: 'act', name: 'goto', step });           // the phone's scripted story, app/data/script.js
export const play = step => ({ type: 'act', name: 'goto', step, play: true });
/*
 * Ayarlar as a whole state too: the phone opens the page and presses Zorluk and Dil until they read as asked
 * (app/app.js ACTS.settings). `quiet` sets them without a press, for the slide's own entry, where a tap nobody asked
 * for would be shown; the flow machine's ← and R resend a step with play: false, which the phone treats the same way.
 * A null Zorluk or Dil is left as it is.
 */
/*
 * How long auto-play lets Keman's song play before it moves on. The song opens with its tune alone, the karaoke line
 * showing note names; the words start at 19.2 s and a line lasts 4.8 s (the phone's own sequencer, app/lib/music.js,
 * on app/data/songs/keman.json). 24 s is the opening and the first sung line, whole. The song itself is 91 s, too
 * long to sit through. tests/deck.test.mjs holds this number to the song's data.
 */
export const SONG_HOLD = 24000;
export const settings = (zorluk, dil, quiet = false) => ({ type: 'act', name: 'settings', zorluk, dil, ...(quiet ? { quiet } : {}) });
// The new dock as a small picture for the navigation slide (dossier ch. 11 NR-02).
const dockPic = `<div class="dockpic">${[['IconCards', 'Oyna'], ['IconBook', 'Öğren'], null, ['IconEye', 'İzle'], ['IconNote', 'Çal']].map(t => t
  ? `<span class="dp">${icon(t[0])}<b>${t[1]}</b></span>` : '<span class="dp logo"><img src="assets/brand/logo.png" alt="Doremimi"></span>').join('')}</div>`;

/*
 * The scripted slides (kesfet, ogren, cal) ask for steps in rising order, and the two 'page' steps of the script open
 * Öğren and Çal, so walking the deck with → plays the story once, front to back, and the phone never starts over.
 * The Çal slide's piano step is not a script step, but it stays on the page step 12 opened (#/cal).
 *
 * The slides after Çal (the song, İzle, the logo's tab, the family, Ayarlar) are off the script on purpose: each of
 * their steps is a whole state (go, batch, settings), so nothing has to be replayed to reach it.
 *
 * A step is [label, message] or [label, message, { hold }]: `hold` is how long auto-play rests after that step when
 * the usual pause (deck/flow.js AUTO_STEP) is not enough.
 */
export const SLIDES = [
  {
    id: 'kapak', label: 'Kapak', theme: 'dark', phone: { type: 'reset', hash: '#/' },
    html: `
      <h1 class="title">Müziği oynayarak<br><em>öğren.</em></h1>
      <p class="lead">Dore Mimi Yetenek ve Eğitim Vakfı için: Dore ve Mimi'nin şarkıları, çalgıları ve videoları, tek bir müzik kart oyunuyla.</p>`,
    notes: `<p><b>“Doremimi'yi baştan sona birlikte gezeceğiz.”</b> Sağdaki telefon gerçek gibi çalışır; → her slaytın canlı gösterimini sırayla oynatır.</p><p>Önce sağ üstteki <b>Sesi aç</b>'a bir kez tıklayın. Bu slayta dönünce telefon sıfırlanır.</p><p><b>A</b> ya da alttaki <b>Otomatik</b> sunumu kendi kendine yürütür; →, ← ya da telefona dokunmak durdurur.</p>`,
  },
  // What the foundation has done, before the app is shown (owner, 2026-11-16; dossier ch. 14 §13; deck/foundation.js).
  ...FOUNDATION_SLIDES,
  {
    id: 'gezinme', label: 'Gezinme', theme: 'light', phone: go('#/'),
    html: step('Dört sekme, ortada vakıf',
      'Oyna · Öğren · İzle · Çal. Ortadaki logo vakfın sayfasını açar; çocuğun profili sağ üstte.',
      [],
      dockPic),
    acts: [['Logoya dokun', go('#/doremimi')], ['Öğren', go('#/ogren/isaretler')]],
    notes: `<p>Vakıfla konuştuğumuz düzen: <b>Oyna · Öğren · logo · İzle · Çal.</b> Testçiler uygulamada dolaşmayı karışık bulmuştu; her yer artık tek bir yerden açılır.</p><ol><li><b>Logo</b>: Dore Mimi Vakfı. En üstte duyurular döner; altında Faaliyetler, Katıl, Tanış, Bize ulaş ve Uygulama, her bağlantı bir kez.</li><li><b>Öğren</b>: yalnızca bilgi, dört sekme. İşaretler, Çalgılar, Aileler, Değerler.</li></ol><p>İzle'de bilmeceler dahil bütün videolar, Çal'da nota çalan her şey.</p>`,
  },
  {
    /*
     * The whole round is played here, one press per move (owner, 2026-11-16): the deck used to jump from step 2 to
     * step 6 on one button, and the phone replayed the steps between with no pauses, so the retry, the card change
     * and both wrong typings flashed past. Every step is its own button now, so each plays at its own pace.
     */
    id: 'kesfet', label: 'Oyna', theme: 'light', phone: go('#/'),
    html: step('Oyna: oyunun kendisi',
      'Açılış ekranı oyundur: ortada büyük Şimdi Oyna, altında her konu kendi renginde bir kart. Çocuk kartı görür, cevabı kendisi yazar.',
      ['Bilemezse harf kutuları, sonra dört seçenek gelir', 'Yanlışta kart dönüp anlatır; yanlış cevap hiçbir şey kaybettirmez']),
    acts: [
      ['Kategoriler', batch(go('#/'), act('scroll', { to: '.kats-sec' }))],
      // Scrolled to, not tapped: the card turns daily (app/lib/daily.js), so a tap would open a different page each day.
      ['Bugünün kartı', batch(go('#/'), act('scroll', { to: '.today' }))],
      ['Şimdi Oyna', play(0)],
      ['Seviye: Başlangıç', play(1)],
      ['Yanlış yaz: “sol”', play(2)],
      ['Harf kutularını doldur', play(3)],
      ['Sıradaki kart', play(4)],
      ['İki deneme de yanlış', play(5)],
      ['Yanlış seçim: kart anlatır', play(6)],
      ['Anladım, devam', play(7)],
      ['Doğru yaz', play(8)],
    ],
    notes: `<p>Testçilere göre Keşfet oyunu içermiyor gibiydi. Artık sekmenin adı Oyna ve kendisi oyun; duyurular logonun sekmesine taşındı.</p><ol><li><b>Kategoriler</b>: her işaret ve her çalgı ailesi kendi renginde bir kart.</li><li><b>Bugünün kartı</b>: sayfanın en altında, her gün başka bir kart: bir çalgı, bir soru ya da bir işaret.</li><li><b>Şimdi Oyna</b>: ilk oyun çocuğun seviyesini sorar; Başlangıç seçilir.</li><li><b>Yanlış yaz</b>: “sol” olmadı; cevap harf kutularına döner, kartın renginde gelen harfler yardım eder.</li><li><b>Kutuları doldur</b>: çocuk kalan harfleri yazar.</li><li><b>Sıradaki kart</b>, <b>iki deneme de yanlış</b>: dört seçenek gelir.</li><li><b>Yanlış seçim</b>: kart dönüp anlatır; <b>Anladım, devam</b> ile sıradaki karta geçilir ve çocuk bu kez doğru yazar.</li></ol><p>Ekranda seviye adı ya da basamak şeridi yok. Oyun ancak üst üste dört zorlanmada bir adım kolaylaşır.</p>`,
  },
  {
    id: 'ogren', label: 'Öğren', theme: 'light', phone: at(9),
    html: step('Öğren: yalnızca bilgi',
      'İşaretler, çalgılar, aileler ve değerler: çocuk burada okur ve bakar, oyun başlamaz. Kartı çevirip okumak, oyunda zorlandığında yardım olarak gelir.',
      ['Çalgılar fotoğraflı bir ızgara, aile süzgeciyle', 'Bir aileye dokununca o ailenin çalgıları']),
    acts: [['Yaylı Çalgılar', play(10)], ['Keman', play(11)]],
    notes: `<p>Öğren'in dört sekmesi: <b>İşaretler, Çalgılar, Aileler, Değerler.</b> Burada oynatma düğmesi yok: Öğren bilgi içindir. Bilmeceler İzle'de, notalar Çal'da.</p><ol><li><b>Yaylı Çalgılar</b>: aile kartına dokununca Çalgılar o ailenin süzgeciyle açılır; her çalgı fotoğrafıyla.</li><li><b>Keman</b>: çalgının sayfası, videoları ve şarkısı. Kartları çevirip okumak artık yalnızca oyunda, çocuk üst üste zorlandığında yardım olarak gelir.</li></ol><p>Değerler sekmesi vakfın Müzikle Değerler Eğitimi dizisini anlatır; uygulamada henüz olmayan parçalar “Hazırlanıyor” der.</p>`,
  },
  {
    id: 'cal', label: 'Çal', theme: 'light', phone: at(12),
    html: step('Çal: piyano ve şarkılar',
      'Çocuk piyanoda serbestçe çalar; her çalgının şarkısı karaoke sözleriyle çalar.',
      []),
    acts: [['Piyanoda çal', batch(go('#/cal'), act('keys.play', { keys: [60, 62, 64, 65, 67, 67, 69, 67] }))]],
    notes: `<p>Nota çalan her şey burada.</p><ol><li><b>Piyano</b>: çalınanlar Melodim'e eklenir.</li></ol><p>41 çalgının her birinin şarkısı var; karaoke satırı ilerler, tuşlar yanar. Her şarkı aynı piyano sesiyle çalar; gerçek çalgı sesleri vakfın kararı.</p>`,
  },
  {
    /*
     * A song of its own (owner, 2026-11-16): the deck said every instrument's song plays on the app's keyboard but
     * never showed one. Keman's song plays here, its notes lighting the keys; its karaoke line shows note names while the
     * tune opens and the words once they start (19 s in). The second step opens a lyric sheet, and it is Gitar's:
     * Keman has no lyric sheet (ten instruments do), only the words on its karaoke line.
     */
    id: 'sarki', label: 'Şarkı', theme: 'light', phone: go('#/sarki/keman'),
    html: step("Keman'ın şarkısı, uygulamanın klavyesinde",
      'Her çalgının kendi şarkısı var: notalar klavyede sırayla yanar, karaoke satırında önce nota adları, sonra sözler ilerler.',
      ['41 şarkının hepsi aynı klavyede, nota nota çalar', 'Şarkı sözleri ayrı bir sayfada da okunur']),
    acts: [['Keman şarkısını çal', batch(go('#/sarki/keman'), act('song.play')), { hold: SONG_HOLD }], ['Gitar: şarkı sözleri', go('#/sozler/gitar')]],
    notes: `<p>Vakfın verdiği notalar uygulamanın kendi klavyesinde çalar: ayrı bir ses dosyası yok, her nota tek tek çalınır.</p><ol><li><b>Keman şarkısını çal</b>: klavyede o an çalan tuş yanar. Karaoke satırında önce nota adları, yaklaşık 20. saniyeden sonra şarkının sözleri ilerler. Önce sağ üstten <b>Sesi aç</b>'a basılmış olmalı.</li><li><b>Şarkı sözleri</b>: on çalgının sözleri ayrı bir sayfada okunur; burada Gitar'ınki.</li></ol><p>Her şarkı aynı piyano sesiyle çalar; gerçek çalgı sesleri vakfın kararı. Sonraki adıma geçince şarkı durur; otomatik oynatma şarkıyı 24 saniye dinletir.</p>`,
  },
  {
    id: 'izle', label: 'İzle', theme: 'light', phone: go('#/izle'),
    html: step('İzle: videolar ve bilmeceler',
      'Bilmeceler dahil bütün videolar tek sekmede; videolar YouTube’da olduğu için oynatmadan önce ebeveyn PIN’i istenir.',
      []),
    // The first card on İzle is a riddle: the page lists the kinds in WATCH_KINDS' order, riddles first (app/app.js).
    acts: [['Bir bilmece', batch(go('#/izle'), act('video.open'))], ["PIN'i gir", batch(go('#/izle'), act('video.open'), act('gate.type'))]],
    notes: `<p>Sırayla: bilmece videoları, klipler, “Dore soruyor, müzisyen cevaplıyor”, karaoke ve jenerikler. Öğren'deki bilmeceler de buraya taşındı.</p><ol><li><b>Bir bilmece</b>: videoya dokununca ebeveyn kilidi açılır; çocuk tek başına YouTube'a çıkamaz.</li><li><b>PIN'i gir</b>: demo PIN'i <b>135790</b>. Oynatıcı açılır; demo çevrimdışı olduğu için video burada oynamaz, uygulamada YouTube'dan oynar.</li></ol>`,
  },
  {
    id: 'vakif', label: 'Vakıf', theme: 'light', phone: go('#/doremimi'),
    html: step('Logo: Dore Mimi Vakfı',
      'Ortadaki logo vakfın sekmesini açar: en üstte duyurular döner, altında her bağlantı bir kez yer alır.',
      []),
    acts: [
      ['Duyuru: Vakfımız kuruldu!', batch(go('#/doremimi'), act('banner.show', { index: 3 }))],
      ['Vakfın sayfası', batch(go('#/doremimi'), act('banner.show', { index: 3 }), act('tap', { sel: '[data-banner="3"]' }))],
    ],
    notes: `<p>Sekmenin başlığı vakfın kendisi. Duyurular eskiden Oyna'nın üstündeydi; artık burada dönüyor.</p><ol><li><b>Duyuru</b>: “Vakfımız kuruldu!” duyurusu öne gelir.</li><li><b>Vakfın sayfası</b>: duyuruya dokununca vakfın kendi sayfası açılır: haber, vizyon, yönetim kurulu ve kurucular.</li></ol><p>Altta Faaliyetler, Katıl, Tanış, Bize ulaş ve Uygulama; henüz hazır olmayan sayfalar “Hazırlanıyor” der.</p>`,
  },
  {
    id: 'aile', label: 'Aile ve içerik', theme: 'light', phone: go('#/profil'),
    html: step('Aile, kilit, içerik',
      "Her çocuğa ayrı profil. Dışarı giden her bağlantı ebeveyn PIN'i ister. İçeriği vakıf düzenler.",
      ['Reklam yok, sohbet yok, ücretli ödül yok', "İşaret, soru, çalgı, video: Excel'de açılan tablolar"]),
    acts: [['Kim oynuyor?', batch(go('#/profil'), act('switcher.open'))], ["Ebeveyn PIN'i", batch(go('#/profil'), act('gate.open', { row: 'hesabim' }), act('gate.type'))]],
    notes: `<p>Profil sağ üstte; kardeşler <b>Kim oynuyor?</b> ile geçer. Ebeveyn sayfaları ve dışarı giden her bağlantı altı haneli PIN ister; üç yanlışta 30 saniye kilit. Demo PIN'i <b>135790</b> (yalnızca bu demoya ait).</p><p>İçerik kodda değil, tablolarda: vakıf ekibi panelden düzenler, yayından önce hatalar satır satır gösterilir. Her sorunun bir zorluğu var (Başlangıç, Orta, İleri); işaret kartlarınınkini biz koyduk, içerik ekibi değiştirebilir. Bugün içerik değişikliği yeni bir sürümle telefona ulaşır.</p>`,
  },
  {
    id: 'ayarlar', label: 'Ayarlar', theme: 'light', phone: settings('baslangic', 'tr', true),
    // Whichever way the deck leaves this slide, the phone goes back to Turkish first (deck/flow.js enter): the slides
    // around it are told in Turkish, and a dot pressed after "Français" used to show them in French.
    leave: settings(null, 'tr', true),
    html: step('Ayarlar: zorluk ve dil',
      'İlk oyunda seçilen seviye burada değişir; dil Türkçe, English ya da Français olur ve uygulama anında o dile geçer.',
      ['Şarkı sözleri, video adları ve vakfın uzun metinleri Türkçe kalır', 'İngilizce ve Fransızca taslak: anadili olan biri okuyacak']),
    acts: [['Zorluk: Orta', settings('orta', 'tr')], ['English', settings('orta', 'en')], ['Français', settings('orta', 'fr')], ['Türkçe', settings('orta', 'tr')]],
    notes: `<p>Ayarlar, Profilim'in altındaki “Aile ve ayarlar” bölümünden açılır.</p><ol><li><b>Zorluk: Orta</b>: sorular seçilen seviyeye kadar gelir. Seviye ilk oyunda bir kez sorulur, sonra buradan değişir.</li><li><b>English</b>, <b>Français</b>: menüler, sorular, cevaplar, işaret ve aile adları o dile geçer; alt menü de.</li><li><b>Türkçe</b>: geri döner. Sunuma devam etmeden önce bu adımı oynatın.</li></ol><p>Uygulama, cihazın dili bu üçünden biriyse o dille açılır; değilse Türkçe. Çeviriler taslak ve tablolarında öyle işaretli.</p>`,
  },
  {
    id: 'platform', label: 'Platformlar', theme: 'dark', layout: 'full', cls: 'platforms',
    // No build numbers: they went stale within days (this slide said 0.1.73 long after newer builds were with testers).
    html: `
      <h1 class="title">Tek kod,<br><em>her cihaz.</em></h1>
      <ul class="plat">
        <li><b>iPhone · iPad</b><span>TestFlight, iOS 15+</span></li>
        <li><b>Android</b><span>APK, Android 6+</span></li>
        <li><b>Mac · Windows</b><span>.dmg ve .zip, henüz imzasız</span></li>
        <li><b>Tarayıcı</b><span>WebAssembly</span></li>
      </ul>`,
    notes: `<p>Tek kod tabanı (Avalonia, .NET): iPhone ve iPad'de TestFlight, Android'de APK, Mac, Windows ve tarayıcı. Mağazaya çıkış için imzalar ve vakfın onayı gerekiyor.</p>`,
  },
  {
    id: 'kapanis', label: 'Kapanış', theme: 'dark', layout: 'center', phone: go('#/doremimi'),
    html: `<div class="closing"><span class="cl-l">Dore ve Mimi</span><span class="cl-r">artık <em>cebinizde.</em></span></div>`,
    notes: `<p>Telefonda vakfın kendi sayfası açık: faaliyetleri (Müzikle Değerler Eğitimi, burslar, etkinlikler), gönüllülük ve iletişim. Sorularınız ve değiştirmek istedikleriniz bizim için yol haritası.</p>`,
  },
];

/**
 * A slide as the flow machine takes it (deck/flow.js): its phone message, its steps' messages, and auto-play's pauses.
 * Here and not in sunum.js, so the guards hand the machine the very thing the deck does.
 */
export const asFlow = slide => ({
  phone: slide.phone ?? null,
  leave: slide.leave ?? null,
  acts: (slide.acts ?? []).map(a => a[1]),
  holds: (slide.acts ?? []).map(a => a[2]?.hold ?? null),
  read: readMs(slide),
});

/** The longest auto-play leaves any slide before its first step, however much it says. */
export const READ_MAX = 20000;
/**
 * How long auto-play leaves a slide on screen before it moves: time to read what the slide says at a presenter's pace
 * (about 200 words a minute, 300 ms a word) plus a beat to find the phone. It is why the foundation slides, which are
 * mostly text, stay longer than a tour slide with one sentence (dossier ch. 14 §13). The notes are not counted: they
 * are the presenter's, not the audience's.
 */
export function readMs(slide) {
  const words = slide.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.min(READ_MAX, 2500 + words * 300);
}
