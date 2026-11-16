/*
 * The deck's slides as data: copy, the phone message each slide sends when it opens, and its "canlı göster" steps.
 * The copy began as dossier ch. 10 part 5 and was re-told by ch. 14 §9 (Oyna is the game → Öğren, read, not played →
 * Çal → family and the foundation).
 *
 * Nine slides, and no more (owner, 2026-11-16, after presenting it: "all slide number should not exceed the 9"). The
 * deck had grown to 16: four on the foundation, a whole round played press by press on the Oyna slide, and a slide
 * each for İzle, the logo's tab, Ayarlar and the platforms. What the owner said of it: every → brought up a new feature
 * to talk about. So the foundation is one slide (deck/foundation.js), the Oyna slide only opens the game and the
 * presenters play it by hand, İzle and the logo's tab are the two steps of the navigation slide, and the platforms
 * are one line on the closing slide. tests/deck.test.mjs holds the count, and two steps a slide at most.
 *
 * Earlier the same day: no slide about XP or results (progress is tracked, never shown as XP), and no way into the
 * game from a song or an instrument.
 *
 * Its own module, apart from sunum.js (which draws and drives it), so tests/deck.test.mjs can import the very slides
 * the deck runs and hold the cut: the count, the steps, and that every hash and act is one the phone has.
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
/** A tap on the page the batch just opened, as a child would (app/app.js ACTS.tap; it throws if nothing matches). */
export const tap = sel => act('tap', { sel });
/*
 * How long auto-play lets Keman's song play before it moves on. The song opens with its tune alone, the karaoke line
 * showing note names; the words start at 19.2 s and a line lasts 4.8 s (the phone's own sequencer, app/lib/music.js,
 * on app/data/songs/keman.json). 24 s is the opening and the first sung line, whole. The song itself is 91 s, too
 * long to sit through. tests/deck.test.mjs holds this number to the song's data.
 */
export const SONG_HOLD = 24000;
// The new dock as a small picture for the navigation slide (dossier ch. 11 NR-02).
const dockPic = `<div class="dockpic">${[['IconCards', 'Oyna'], ['IconBook', 'Öğren'], null, ['IconEye', 'İzle'], ['IconNote', 'Çal']].map(t => t
  ? `<span class="dp">${icon(t[0])}<b>${t[1]}</b></span>` : '<span class="dp logo"><img src="assets/brand/logo.png" alt="Doremimi"></span>').join('')}</div>`;

/*
 * Every step is a whole state: it goes to its screen, then presses. Nothing is replayed to reach it, so ← and R land
 * on the same screen whatever the presenter tapped on the phone in between, and a slide opened after a round played
 * by hand never has to start the phone over. Until the nine-slide cut the Oyna, Öğren and Çal slides asked the phone
 * for steps of a script (app/data/script.js) instead, which is what replayed a round fast when a step was skipped.
 *
 * A step is [label, message] or [label, message, { hold }]: `hold` is how long auto-play rests after that step when
 * the usual pause (deck/flow.js AUTO_STEP) is not enough.
 */
export const SLIDES = [
  {
    id: 'kapak', label: 'Kapak', theme: 'dark', phone: { type: 'reset', hash: '#/' },
    html: `
      <h1 class="title">Müziği oynayarak<br><em>öğren.</em></h1>
      <p class="lead">Dore Mimi Yetenek ve Eğitim Vakfı için hazırlanan uygulama: müzik kart oyunu, çalgılar, şarkılar ve videolar tek yerde.</p>`,
    notes: `<p><b>“Önce vakfın bugüne kadar yaptıklarına, sonra uygulamaya bakacağız.”</b> Sağdaki telefon uygulama gibi çalışır; dokunulabilir.</p><p>Başlamadan sağ üstteki <b>Sesi aç</b>'a bir kez tıklayın. <b>→</b> slayttaki düğmeleri sırayla oynatır, bitince sonraki slayta geçer; <b>←</b> geri alır; <b>R</b> telefonu slaytın başına döndürür. Bu slayta dönünce telefon sıfırlanır.</p><p><b>A</b> ya da alttaki <b>Otomatik</b> sunumu kendi kendine yürütür; →, ← ya da telefona dokunmak durdurur.</p>`,
  },
  // What the foundation has done, before the app is shown (owner, 2026-11-16; dossier ch. 14 §13; deck/foundation.js).
  ...FOUNDATION_SLIDES,
  {
    id: 'gezinme', label: 'Gezinme', theme: 'light', phone: go('#/'),
    html: step('Dört sekme, ortada vakıf',
      "Altta dört sekme; ortadaki logo Dore Mimi Vakfı'nı, sağ üstteki resim çocuğun profilini açar.",
      [],
      dockPic),
    // The two tabs with no slide of their own; Oyna, Öğren and Çal each get the slide after this one.
    acts: [['Logo: Dore Mimi Vakfı', go('#/doremimi')], ['İzle', go('#/izle')]],
    notes: `<p>Alttaki sıra: <b>Oyna · Öğren · logo · İzle · Çal.</b> Her sayfaya tek bir yerden gidilir.</p><ol><li><b>Logo: Dore Mimi Vakfı</b>: en üstte duyurular döner; altında Faaliyetler, Katıl, Tanış, Bize ulaş ve Uygulama.</li><li><b>İzle</b>: bilmeceler, klipler ve söyleşiler, bütün videolar burada. Videolar YouTube'da olduğu için açılmadan önce ebeveyn PIN'i istenir (demo PIN'i <b>135790</b>).</li></ol><p>Oyna, Öğren ve Çal sıradaki üç slaytta.</p>`,
  },
  {
    /*
     * The slide opens the game and stops there (owner, 2026-11-16: "just open the game and we will demonstrate the
     * game on ourselves"). It used to play a whole round, one button a move, nine presses, and each press was one
     * more thing to explain. What the round does is on the slide as two lines and in the notes; the presenters show
     * it on the phone by hand.
     */
    id: 'kesfet', label: 'Oyna', theme: 'light', phone: go('#/'),
    html: step('Oyna: oyunun kendisi',
      'Uygulama oyunla açılır: ortada Şimdi Oyna, altında 12 kategori. Çocuk kartı görür, cevabı kendisi yazar.',
      ['Bilemezse harf kutuları, sonra dört seçenek gelir', 'Yanlış seçimde kart dönüp anlatır; yanlış cevap hiçbir şey kaybettirmez']),
    acts: [
      ['Kategoriler', batch(go('#/'), act('scroll', { to: '.kats-sec' }))],
      ['Şimdi Oyna', batch(go('#/'), act('oyna.press'))],
    ],
    notes: `<p>Uygulama Oyna sekmesiyle açılır; sekmenin kendisi oyundur.</p><ol><li><b>Kategoriler</b>: yedi müzik işareti ve beş çalgı ailesi, her biri kendi renginde bir kart; karta dokunmak o kategorinin turunu açar.</li><li><b>Şimdi Oyna</b>: Müzik Kart Oyunu açılır. İlk oyunda çocuğun seviyesi sorulur (Başlangıç, Orta, İleri).</li></ol><p><b>Buradan sonra telefonda siz oynayın.</b> Gösterilecekler: yanlış yazınca harf kutuları gelir; yine olmazsa dört seçenek; yanlış seçimde kart dönüp anlatır. Oyun ancak üst üste dört zorlanmada kolaylaşır.</p><p>Bitince <b>→</b>: oyunu kapatır ve sonraki slayta geçer. Cevap yazılırken klavyedeki harfler telefona gider (R ve A dahil); oyunu elle kapatmak için sol üstteki çarpı.</p>`,
  },
  {
    id: 'ogren', label: 'Öğren', theme: 'light', phone: go('#/ogren/aileler'),
    html: step('Öğren: yalnızca bilgi',
      'İşaretler, Çalgılar, Aileler ve Değerler: çocuk burada okur ve bakar; oyun buradan başlamaz.',
      ['Beş aile: birine dokununca o ailenin çalgıları açılır', '41 çalgı: her birinin fotoğrafı, bilgisi ve şarkısı var']),
    acts: [['Yaylı Çalgılar', batch(go('#/ogren/aileler'), tap('[data-fam="YayliCalgilar"]'))], ['Keman', batch(go('#/ogren/calgilar?aile=yayli'), tap('[data-push="#/calgi/keman"]'))]],
    notes: `<p>Öğren'in dört sekmesi: <b>İşaretler, Çalgılar, Aileler, Değerler.</b> Slayt Aileler'de açılır. Burada oyun düğmesi yok; bilmeceler İzle'de, şarkılar Çal'da.</p><ol><li><b>Yaylı Çalgılar</b>: aile kartına dokununca Çalgılar sekmesi o ailenin çalgılarıyla açılır; her çalgı fotoğrafıyla.</li><li><b>Keman</b>: çalgının sayfası: kısa bilgisi, bilmece videosu ve şarkısı.</li></ol><p>Değerler sekmesi vakfın Müzikle Değerler Eğitimi'ni anlatır; uygulamada henüz olmayan bölümü “Hazırlanıyor” der.</p>`,
  },
  {
    id: 'cal', label: 'Çal', theme: 'light', phone: go('#/cal'),
    html: step('Çal: piyano ve şarkılar',
      'Üstte çocuğun serbestçe çaldığı piyano, altında çalgıların şarkıları.',
      []),
    acts: [['Serbest çal', batch(go('#/cal'), act('keys.play', { keys: [60, 62, 64, 65, 67, 67, 69, 67] }))]],
    notes: `<p>Nota çalan her şey bu sekmede.</p><ol><li><b>Serbest çal</b>: telefon piyanoda kısa bir ezgi çalar; çalınanlar Melodim'e eklenir.</li></ol><p>Altta Şarkılar: 41 çalgının her birinin şarkısı var. Birini sıradaki slaytta dinleyeceğiz.</p>`,
  },
  {
    /*
     * A song of its own (owner, 2026-11-16): the deck said every instrument's song plays on the app's keyboard but
     * never showed one. Keman's song plays here, its notes lighting the keys; its karaoke line shows note names while the
     * tune opens and the words once they start (19 s in). The second step opens a lyric sheet, and it is Gitar's:
     * Keman has no lyric sheet (ten instruments do), only the words on its karaoke line.
     */
    id: 'sarki', label: 'Şarkı', theme: 'light', phone: go('#/sarki/keman'),
    html: step("Keman'ın şarkısı, uygulamanın piyanosunda",
      'Şarkı çalarken çalan tuş yanar; karaoke satırında önce nota adları, sonra sözler ilerler.',
      ['41 şarkının hepsi aynı piyanoda, nota nota çalar', 'Şarkı sözleri ayrı bir sayfada da okunur']),
    acts: [['Keman şarkısını çal', batch(go('#/sarki/keman'), act('song.play')), { hold: SONG_HOLD }], ['Gitar: şarkı sözleri', go('#/sozler/gitar')]],
    notes: `<p>Şarkılar uygulamanın piyanosunda nota nota çalar; ses kaydı yok.</p><ol><li><b>Keman şarkısını çal</b>: o an çalan tuş yanar. Karaoke satırında önce nota adları, yaklaşık 20. saniyeden sonra şarkının sözleri ilerler. Ses için sağ üstteki <b>Sesi aç</b>'a basılmış olmalı.</li><li><b>Gitar: şarkı sözleri</b>: on çalgının sözleri ayrı bir sayfada okunur; Keman'ınki olmadığı için burada Gitar'ınki.</li></ol><p>Her şarkı aynı piyano sesiyle çalar; gerçek çalgı sesleri vakfın kararı. Sonraki adıma geçince şarkı durur; otomatik oynatma şarkıyı 24 saniye dinletir.</p>`,
  },
  {
    id: 'aile', label: 'Aile ve içerik', theme: 'light', phone: go('#/profil'),
    html: step('Aile, kilit, içerik',
      "Her çocuğa ayrı profil. Dışarı giden her bağlantı ebeveyn PIN'i ister. İçeriği vakıf düzenler.",
      ['Reklam yok, sohbet yok, ücretli ödül yok', "İşaret, soru, çalgı, video: Excel'de açılan tablolar"]),
    acts: [['Kim oynuyor?', batch(go('#/profil'), act('switcher.open'))], ["Ebeveyn PIN'i", batch(go('#/profil'), act('gate.open', { row: 'hesabim' }), act('gate.type'))]],
    notes: `<p>Telefonda Profilim açık; uygulamada sağ üstteki resimden gelinir.</p><ol><li><b>Kim oynuyor?</b>: kardeşler profili buradan değiştirir.</li><li><b>Ebeveyn PIN'i</b>: telefon Hesabım'a dokunur, Ebeveyn kilidi çıkar, PIN yazılır ve Hesabım açılır. Ebeveyn sayfaları ve dışarı giden her bağlantı altı haneli PIN ister; üç yanlışta 30 saniye kilitlenir. Demo PIN'i <b>135790</b> (yalnızca bu demoya ait).</li></ol><p>İçerik tablolarda durur: vakıf ekibi içerik panelinden düzenler, yayından önce hatalar satır satır gösterilir. Her sorunun bir zorluğu var (Başlangıç, Orta, İleri); işaret kartlarınınkini biz koyduk, içerik ekibi değiştirebilir. Bugün içerik değişikliği uygulamanın yeni sürümüyle telefona ulaşır.</p>`,
  },
  {
    id: 'kapanis', label: 'Kapanış', theme: 'dark', layout: 'center', phone: go('#/doremimi'),
    // The platforms were a slide of their own, with three still frames; under the nine-slide cap they are this line.
    html: `<div class="closing"><span class="cl-l">Dore ve Mimi</span><span class="cl-r">artık <em>cebinizde.</em><small class="cl-plat">iPhone · iPad · Android<br>Mac · Windows · tarayıcı</small></span></div>`,
    notes: `<p>Telefonda Dore Mimi Vakfı sekmesi açık: duyurular, faaliyetler (Müzikle Değerler Eğitimi, burslar, etkinlikler), gönüllülük ve iletişim.</p><p><b>Aynı uygulama her cihazda:</b> iPhone, iPad, Android, Mac, Windows ve tarayıcı. Mağazalara çıkış için imzalar ve vakfın onayı gerekiyor.</p><p>Sorularınızı ve değiştirmek istediklerinizi dinleyelim.</p>`,
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
