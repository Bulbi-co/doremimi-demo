/*
 * The deck's slides as data: copy, the phone message each slide sends when it opens, and its "canlı göster" steps.
 * The copy began as dossier ch. 10 part 5 (PROPOSED, the owner's to change) and was cut to a short deck at the owner's
 * request (2026-11-13: no step counter, no icon tiles, nothing that is there only to be shown). Ch. 14 §9 re-tells
 * it: Keşfet is the game → a Keşfet round, written → Öğren, the Hazırlan sheet and a card turned over → Çal, a round
 * at the choices → results → family and the foundation.
 *
 * Its own module, apart from sunum.js (which draws and drives it), so tests/deck.test.mjs can import the slides and
 * hold every scripted step they ask for to the phone's script (app/data/script.js).
 */
import { ICONS } from '../app/lib/icons.js';

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
// The new dock as a small picture for the navigation slide (dossier ch. 11 NR-02).
const dockPic = `<div class="dockpic">${[['IconHome', 'Keşfet'], ['IconBook', 'Öğren'], null, ['IconEye', 'İzle'], ['IconNote', 'Çal']].map(t => t
  ? `<span class="dp">${icon(t[0])}<b>${t[1]}</b></span>` : '<span class="dp logo"><img src="assets/brand/logo.png" alt="Doremimi"></span>').join('')}</div>`;

/*
 * The scripted slides (kesfet to sonuc) ask for steps in rising order, and the two 'page' steps of the script open
 * Öğren and Çal, so walking the deck with → plays the story once, front to back, and the phone never starts over.
 * The Çal slide's piano step is not a script step, but it stays on the page step 12 opened (#/cal), so the script
 * still knows where the phone is and the Keman step that follows carries on from there.
 */
export const SLIDES = [
  {
    id: 'kapak', label: 'Kapak', theme: 'dark', phone: { type: 'reset', hash: '#/' },
    html: `
      <h1 class="title">Müziği oynayarak<br><em>öğren.</em></h1>
      <p class="lead">Dore Mimi Yetenek ve Eğitim Vakfı için: Dore ve Mimi'nin şarkıları, çalgıları ve videoları, tek bir müzik kart oyunuyla.</p>`,
    notes: `<p><b>“Doremimi'yi baştan sona birlikte gezeceğiz.”</b> Sağdaki telefon gerçek gibi çalışır; → her slaytın canlı gösterimini sırayla oynatır.</p><p>Önce sağ üstteki <b>Sesi aç</b>'a bir kez tıklayın. Bu slayta dönünce telefon sıfırlanır.</p>`,
  },
  {
    id: 'gezinme', label: 'Gezinme', theme: 'light', phone: go('#/'),
    html: step('Dört sekme, ortada vakıf',
      'Keşfet · Öğren · İzle · Çal. Ortadaki logo vakfın sayfasını açar; çocuğun profili sağ üstte.',
      [],
      dockPic),
    acts: [['Logoya dokun', go('#/doremimi')], ['Öğren', go('#/ogren/isaretler')]],
    notes: `<p>Vakıfla konuştuğumuz düzen: <b>Keşfet · Öğren · logo · İzle · Çal.</b> Testçiler uygulamada dolaşmayı karışık bulmuştu; her yer artık tek bir yerden açılır.</p><ol><li><b>Logo</b>: vakfın tek sayfası. Faaliyetler, Katıl, Tanış, Bize ulaş ve Uygulama; her bağlantı bir kez.</li><li><b>Öğren</b>: altı sekme. İşaretler, Çalgılar, Aileler, Bilmeceler, Değerler, Notalar.</li></ol><p>İzle'de videolar, Çal'da nota çalan her şey.</p>`,
  },
  {
    id: 'kesfet', label: 'Keşfet', theme: 'light', phone: go('#/'),
    html: step('Keşfet: oyunun kendisi',
      'Açılış ekranı oyundur: ortada büyük OYNA, altında her konu kendi renginde bir kart. Üstte vakfın duyuruları döner.',
      ['12 kategori tek ızgarada: 7 işaret, 5 çalgı ailesi', 'İlk oyun çocuğun seviyesini sorar']),
    acts: [['Kategoriler', batch(go('#/'), act('scroll', { to: '.kats-sec' }))], ['OYNA', play(0)]],
    notes: `<p>Testçilere göre Keşfet oyunu içermiyor gibiydi. Artık Keşfet'in kendisi oyun.</p><ol><li><b>OYNA</b>: yuvarlak düğmenin içinde küçük bir kart döner, dört cevap çubuğu belirir, harfler yazılır. Oyunun yollarını isim vermeden gösterir. Dokununca tur her zaman yazarak başlar.</li><li><b>Kategoriler</b>: her işaret ve her çalgı ailesi kendi renginde bir kart, kaç kartı olduğu üstünde. Oynandıkça ilerleme çubuğu çıkar. Ayrı bir “Tekrar” satırı yok: tekrarı gelen kartlar her turda önce gelir.</li><li><b>OYNA</b> (canlı): ilk oyun seviyeyi sorar: Başlangıç, Orta, İleri. Sorular bu seviyeye göre gelir; Ayarlar › Zorluk'tan değişir.</li></ol><p>Bugünün kartı en altta, eskisi gibi.</p>`,
  },
  {
    id: 'oyun', label: 'Oyun', theme: 'light', phone: at(1),
    html: step('Keşfet turu: cevabı yazar',
      'Çocuk kartı görür, cevabı kendisi yazar. Bilemezse harf kutuları, sonra dört seçenek gelir; yanlışta kart dönüp anlatır.',
      ['Ancak üst üste dört zorlanmada kolaylaşır', 'Yanlış cevap hiçbir şey kaybettirmez']),
    acts: [['Yanlış yaz: “sol”', play(2)], ['Seçenekler, bilgi kartı', play(6)]],
    notes: `<p>Keşfet'ten (OYNA, bir kategori, oyun banner'ı) girilen her tur <b>yazarak</b> başlar; asıl beceri cevabı yazmak. Seviye sorusunda Başlangıç seçildi.</p><ol><li><b>Yanlış yaz</b>: “sol” olmadı; cevap harf kutularına döner, kartın renginde gelen harfler yardım eder.</li><li><b>Seçenekler</b>: iki yazma denemesi de yanlış olunca dört seçenek gelir; yanlış seçimde kart dönüp anlatır.</li></ol><p>Ekranda seviye adı ya da basamak şeridi yok. Oyun ancak üst üste dört zorlanmada bir adım kolaylaşır; çocuk bunu yalnızca arka planın değişen renginden görür. Laptop klavyesiyle de yazabilirsiniz.</p>`,
  },
  {
    id: 'ogren', label: 'Öğren', theme: 'light', phone: at(9),
    html: step('Öğren: hazırlan ve çevir',
      'Bir aileden ya da işaretten oyuna girince önce kaç kart olduğu söylenir. Kartlar çevrilerek okunur; burada çocuk öğreniyor.',
      ['Yalnızca o kategorinin kartları gelir', 'Burada oyun zorlaşmaz da kolaylaşmaz da']),
    acts: [['Yaylı Çalgılar', play(10)], ['Başla: kartı çevir', play(11)]],
    notes: `<p>Öğren'in altı sekmesi: <b>İşaretler, Çalgılar, Aileler, Bilmeceler, Değerler, Notalar.</b> Çalgılar artık fotoğraflı bir ızgara, üstünde aile süzgeci.</p><ol><li><b>Yaylı Çalgılar</b>: “Hazırlan” sayfası ailenin renginde açılır ve gerçek sayıyı söyler: “Bu kategoride 7 kart var”. Bir işaretin bugün tek kartı var; o da “1 kart” der.</li><li><b>Başla</b>: kart çevrilir, okunur, “Bildim” ya da “Bilemedim”.</li></ol><p>Değerler sekmesi vakfın Müzikle Değerler Eğitimi dizisini anlatır; uygulamada henüz olmayan parçalar “Hazırlanıyor” der.</p>`,
  },
  {
    id: 'cal', label: 'Çal', theme: 'light', phone: at(12),
    html: step('Çal: piyano, şarkı ve oyun',
      'Çocuk piyanoda serbestçe çalar; her çalgının şarkısı karaoke sözleriyle çalar. Bir şarkıdan oyuna girince cevap dört seçenekten seçilir.',
      []),
    acts: [['Piyanoda çal', batch(go('#/cal'), act('keys.play', { keys: [60, 62, 64, 65, 67, 67, 69, 67] }))], ['Keman: bu çalgıyla oyna', play(13)]],
    notes: `<p>Nota çalan her şey burada.</p><ol><li><b>Piyano</b>: çalınanlar Melodim'e eklenir.</li><li><b>Keman</b>: şarkı sayfasındaki “Bu çalgıyla oyna”. Tur dört seçenekle açılır ve tur boyunca öyle kalır; çalgının kendi sayfasındaki aynı düğme de böyle.</li></ol><p>41 çalgının her birinin şarkısı var; karaoke satırı ilerler, tuşlar yanar. Her şarkı aynı piyano sesiyle çalar; gerçek çalgı sesleri vakfın kararı.</p>`,
  },
  {
    id: 'sonuc', label: 'Tur sonu', theme: 'light', phone: at(13),
    html: step('Tur sonu ve ilerleme',
      'Yıldızlar, XP, kaç kartı bildiği ve hangi müzik konusunda ne kadar ilerlediği. Yeni rozetler burada açılır.',
      ['Yıldız ve XP hiçbir şey ödemez', 'Zorlandığı konu önce gelir']),
    acts: [['Turu bitir', play(14)], ['Rozetler', play(15)]],
    notes: `<p>Yıldızlar yalnızca turun notu; para ya da ödül yok. Sonuçta seviye değil, <b>kaç kartı bildiği</b> yazar. Asıl önemli kısım <b>Müzik bilgin</b>: çocuk hangi konuda zorlandıysa önce o gelir, ilerleme çubuğuyla.</p><p>Rozetler bir içerik dosyası; panelde rozet tablosu henüz yok (planlanan).</p>`,
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
