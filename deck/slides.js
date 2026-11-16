/*
 * The deck's slides as data: copy, the phone message each slide sends when it opens, and its "canlı göster" steps.
 * The copy began as dossier ch. 10 part 5 (PROPOSED, the owner's to change) and was cut to a short deck at the owner's
 * request (2026-11-13: no step counter, no icon tiles, nothing that is there only to be shown). Ch. 14 §11 asked for
 * the opposite of a cut: one presentation that walks every tab, page and scenario of the app, start to finish, so the
 * slides follow a child's first day in order (first launch → a round → the tabs → the family's side → settings) and
 * the eyebrow over each title says which part of the walk it is.
 *
 * Its own module, apart from sunum.js (which draws and drives it), so tests/deck.test.mjs can import the slides and
 * hold every scripted step they ask for to the phone's script (app/data/script.js).
 */
import { ICONS } from '../app/lib/icons.js';

export const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}" fill-rule="evenodd"/></svg>`;
/* Bir slayt: bölüm adı, kısa başlık, bir cümle, en çok iki satır. */
const step = (sec, title, lead, feats = [], pre = '') => `
  ${sec ? `<span class="eyebrow">${sec}</span>` : ''}
  <h1 class="title tour">${title}</h1>
  <p class="lead">${lead}</p>${pre}
  ${feats.length ? `<ul class="feats">${feats.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}`;
export const go = hash => ({ type: 'go', hash });
export const act = (name, args = {}) => ({ type: 'act', name, ...args });
export const batch = (...msgs) => ({ type: 'batch', msgs });
export const at = step => ({ type: 'act', name: 'goto', step });           // the phone's scripted story, app/data/script.js
export const play = step => ({ type: 'act', name: 'goto', step, play: true });
// The dock as a small picture for the map slide (dossier ch. 11 NR-02).
const dockPic = `<div class="dockpic">${[['IconCards', 'Oyna'], ['IconBook', 'Öğren'], null, ['IconEye', 'İzle'], ['IconNote', 'Çal']].map(t => t
  ? `<span class="dp">${icon(t[0])}<b>${t[1]}</b></span>` : '<span class="dp logo"><img src="assets/brand/logo.png" alt="Doremimi"></span>').join('')}</div>`;

/*
 * Every phone message from the map slide on is a step of the phone's script, asked for in rising order, so walking the
 * deck with → (or auto-play) plays the script once, front to back, and the phone never starts over in front of the
 * audience. The cover's reset is the one exception: it is the fresh start.
 */
export const SLIDES = [
  {
    id: 'kapak', label: 'Kapak', theme: 'dark', phone: { type: 'reset', hash: '#/' },
    html: `
      <h1 class="title">Müziği oynayarak<br><em>öğren.</em></h1>
      <p class="lead">Dore Mimi Yetenek ve Eğitim Vakfı için: Dore ve Mimi'nin şarkıları, çalgıları ve videoları, tek bir müzik kart oyunuyla.</p>`,
    notes: `<p><b>“Doremimi'yi bir çocuğun ilk gününü izleyerek baştan sona gezeceğiz.”</b> Sağdaki telefon gerçek gibi çalışır; → her slaytın canlı gösterimini sırayla oynatır.</p><p>Önce sağ üstteki <b>Sesi aç</b>'a bir kez tıklayın. <b>A</b> ya da alttaki <b>Otomatik</b> düğmesi sunumu kendi kendine oynatır; herhangi bir tuş ya da tıklama durdurur. Bu slayta dönünce telefon sıfırlanır.</p>`,
  },
  {
    id: 'gezinme', label: 'Harita', theme: 'light', phone: at(0),
    html: step('Uygulamanın haritası', 'Beş yer, tek alt menü',
      'Oyna · Öğren · İzle · Çal ve ortada logo: Dore Mimi Vakfı. Çocuğun profili sağ üstte.',
      ['Oyna oyunun kendisi; Öğren yalnızca bilgi', 'Her sayfaya tek bir yerden gidilir'],
      dockPic),
    notes: `<p>Testçiler uygulamada dolaşmayı karışık bulmuştu. Artık her yer tek bir yerden açılır: <b>Oyna · Öğren · logo · İzle · Çal.</b></p><p>Sunum bu sırayla ilerliyor: önce ilk açılış ve bir oyun turu, sonra sekmeler tek tek, sonra ailenin tarafı (profil, ebeveyn kilidi, ayarlar).</p>`,
  },
  {
    id: 'ilk', label: 'İlk açılış', theme: 'light', phone: at(0),
    html: step('1 · İlk açılış', 'İlk oyun seviyeyi sorar',
      'Çocuk ortadaki büyük Şimdi Oyna düğmesine dokunur. İlk oyun tek bir şey sorar: hangi seviyeden başlayalım?',
      ['Başlangıç, Orta, İleri: sorular bu seviyeye kadar gelir', 'Sonra üç kısa sayfa: kartı gör, cevabı bul, yıldız topla']),
    acts: [['Şimdi Oyna', play(1)], ['Başlangıç', play(2)]],
    notes: `<p>Yuvarlak düğmenin içindeki küçük kart döner, dört cevap çubuğu belirir, harfler yazılır: oyunun yollarını isim vermeden gösterir.</p><ol><li><b>Şimdi Oyna</b>: ilk oyun seviyeyi sorar. Bir kez sorulur; sonra Ayarlar › Zorluk'tan değişir.</li><li><b>Başlangıç</b>: tanıtımın üç sayfası geçer, tur başlar.</li></ol><p>İşaret kartlarının seviyesini içerik ekibi verene kadar biz koyduk; değiştirilebilir.</p>`,
  },
  {
    id: 'oyun', label: 'Yazarak', theme: 'light', phone: at(2),
    html: step('2 · Oyna turu', 'Cevabı kendisi yazar',
      'Kart bir işaret ya da bir çalgı gösterir; çocuk cevabı yazar. Bilemezse cevap harf kutularına döner ve bazı harfler hazır gelir.',
      ['Oyna’dan girilen her tur yazarak başlar', 'Laptop klavyesiyle de yazılabilir']),
    acts: [['Yanlış yaz: “sol”', play(3)], ['Harfleri tamamla', play(4)]],
    notes: `<p>Asıl beceri cevabı hatırlayıp yazmak; tur bu yüzden yazarak başlar.</p><ol><li><b>Yanlış yaz</b>: “sol” olmadı; cevap harf kutularına döner, kartın renginde gelen harfler yardım eder.</li><li><b>Harfleri tamamla</b>: eksik harfler yazılır, kart doğru sayılır.</li></ol><p>Telefon yazma aşamasındayken laptop klavyesindeki harfler doğrudan telefona gider.</p>`,
  },
  {
    id: 'secenek', label: 'Seçenekler', theme: 'light', phone: at(4),
    html: step('2 · Oyna turu', 'Bilemezse dört seçenek',
      'İki yazma denemesi de tutmazsa dört seçenek gelir. Yanlış seçimde kart döner ve doğru cevabı anlatır.',
      ['Yanlış cevap hiçbir şey kaybettirmez', 'Bilemediği kart iki kart sonra yeniden gelir']),
    acts: [['Diyez: iki deneme yanlış', play(5)], ['Yanlış seç', play(6)]],
    notes: `<ol><li><b>Diyez</b>: önce “bemol”, sonra harf kutularında yine yanlış. Dört seçenek açılır.</li><li><b>Yanlış seç</b>: kart dönüp doğru cevabı ve kısa açıklamasını gösterir.</li></ol><p>Bu kart turun içinde iki kart sonra yeniden gelir; çocuk bir şey kaybetmez, yalnızca yıldızı azalır.</p>`,
  },
  {
    id: 'yardim', label: 'Yardım', theme: 'light', phone: at(6),
    html: step('2 · Oyna turu', 'Zorlanınca oyun yardım eder',
      'Üst üste dört zorlanmadan sonra kartlar dört seçenekle gelir. Dört zorlanma daha olursa kart çevrilip okunur. Bildikçe yeniden yazmaya çıkar.',
      ['Tek bir yanlış oyunu kolaylaştırmaz', 'Ekranda seviye adı yok; yalnızca arka planın rengi değişir']),
    acts: [['Üç kez “Bilmiyorum”', play(7)], ['Dört zorlanma daha', play(8)], ['Kartı çevir: Bildim', play(9)]],
    notes: `<p>Testçilere göre oyun çok çabuk kolaylaşıyordu. Artık ancak <b>üst üste dört</b> zorlanmada bir adım iner.</p><ol><li><b>Üç kez Bilmiyorum</b>: az önceki yanlış seçimle dört oldu. Sıradaki kart doğrudan dört seçenekle açılır.</li><li><b>Dört zorlanma daha</b>: bir yanlış seçim, üç Bilmiyorum. Sıradaki kart kapalı gelir: “Kartı çevir”.</li><li><b>Kartı çevir</b>: çocuk cevabı okur ve “Bildim” der. İki Bildim'de seçeneklere, üç doğruda yeniden yazmaya çıkar.</li></ol><p>Kart çevirmek artık yalnızca burada, zorlanan çocuğa yardım olarak gelir; Öğren'de oyun yok.</p>`,
  },
  {
    id: 'sonuc', label: 'Tur sonu', theme: 'light', phone: at(9),
    html: step('2 · Oyna turu', 'Tur sonu ve rozetler',
      'Yıldızlar, XP ve kaç kartı bildiği. Sonuçta seviye adı değil, doğru sayısı yazar; yeni rozetler burada açılır.',
      ['Yıldız ve XP hiçbir şey ödemez', 'Zorlandığı konu önce gelir']),
    acts: [['Turu bitir', play(10)], ['Rozetler', play(11)]],
    notes: `<p>Yıldızlar yalnızca turun notu; para ya da ödül yok. Asıl önemli kısım <b>Müzik bilgin</b>: çocuk hangi konuda zorlandıysa önce o gelir, ilerleme çubuğuyla.</p><p>Rozetler bir içerik dosyası; panelde rozet tablosu henüz yok (planlanan).</p>`,
  },
  {
    id: 'kategoriler', label: 'Kategoriler', theme: 'light', phone: at(12),
    html: step('3 · Oyna sekmesi', 'Kategoriler ve Bugünün kartı',
      'Şimdi Oyna’nın altında 12 kategori, her biri kendi renginde: 7 müzik işareti ve 5 çalgı ailesi. Oynanan kategoride ilerleme çubuğu çıkar.',
      ['Bir kategoriye dokununca o konunun turu, yine yazarak', 'Bugünün kartı her gün başka: bir çalgı, bir soru ya da bir işaret']),
    acts: [['Kategoriler', play(13)], ['Telli Çalgılar', play(14)], ['Bugünün kartı', play(15)]],
    notes: `<ol><li><b>Kategoriler</b>: işaretler ve aileler ayrı başlıklar değil, tek ızgara. Az önceki turun kategorileri ilerleme çubuğunu gösterir.</li><li><b>Telli Çalgılar</b>: kategoriye dokununca o konunun turu açılır; seviye sorusu bir daha gelmez.</li><li><b>Bugünün kartı</b>: sayfanın en altında. Soruysa dokununca cevabı açılır, çalgı ya da işaretse sayfasına gider.</li></ol><p>Ayrı bir “Tekrar” satırı yok: tekrarı gelen kartlar her turda önce gelir.</p>`,
  },
  {
    id: 'ogren', label: 'Öğren', theme: 'light', phone: at(16),
    html: step('4 · Öğren', 'Öğren: okur ve bakar',
      'Dört sekme: İşaretler, Çalgılar, Aileler, Değerler. Burada oyun başlamaz; çocuk okur, kartları çevirip bakar.',
      ['Bir işaretin kartı: önce anlamı, sonra kendi sayfası', 'Oynatma düğmesi yok; oyun Oyna sekmesinde']),
    acts: [['Diyez kartını çevir', play(17)], ['Diyez sayfası', play(18)]],
    notes: `<p>Öğren bilgi içindir. Bilmeceler İzle'de, notalar Çal'da; burada dört sekme kaldı.</p><ol><li><b>Kartı çevir</b>: işaretin arkasında anlamı yazar.</li><li><b>Diyez sayfası</b>: “Aç” işaretin kategorisini, oradan işaretin kendi sayfasını açar: adı, sembolü ve tanımı.</li></ol>`,
  },
  {
    id: 'ogren-calgi', label: 'Aileler', theme: 'light', phone: at(19),
    html: step('4 · Öğren', 'Aileler, çalgılar, değerler',
      'Bir aileye dokununca Çalgılar o ailenin süzgeciyle açılır. 41 çalgının her birinin fotoğrafı ve kendi sayfası var.',
      ['Ailenin kartı kaç çalgısı olduğunu söyler', 'Değerler: vakfın Müzikle Değerler Eğitimi']),
    acts: [['Yaylı Çalgılar', play(20)], ['Keman', play(21)], ['Değerler', play(22)]],
    notes: `<ol><li><b>Yaylı Çalgılar</b>: Çalgılar sekmesi bu ailenin süzgeciyle açılır.</li><li><b>Keman</b>: çalgının sayfası; videoları ve şarkısı. Oynatma düğmesi yok.</li><li><b>Değerler</b>: Dore Mimi Müzikle Değerler Eğitimi. Uygulamada henüz olmayan parçalar “Hazırlanıyor” der.</li></ol>`,
  },
  {
    id: 'izle', label: 'İzle', theme: 'light', phone: at(23),
    html: step('5 · İzle', 'İzle: videolar ve bilmeceler',
      '23 bilmece videosu en üstte; sonra klipler, söyleşiler, karaoke ve jenerikler. Videolar YouTube’dan açıldığı için önce ebeveyn PIN’i istenir.',
      ['Bilmeceler Öğren’den buraya taşındı, hepsi burada', 'Demo PIN’i 135790, yalnızca bu demoya ait']),
    acts: [['Bir bilmece', play(24)], ['PIN’i gir', play(25)]],
    notes: `<ol><li><b>Bir bilmece</b>: dokununca ebeveyn kilidi açılır; çocuk tek başına YouTube'a gidemez.</li><li><b>PIN</b>: 135790. Demo videoyu çevrimdışı gösteremez; uygulamada YouTube açılır.</li></ol>`,
  },
  {
    id: 'cal', label: 'Çal', theme: 'light', phone: at(26),
    html: step('6 · Çal', 'Çal: piyano ve şarkılar',
      'Çocuk piyanoda serbestçe çalar, çaldıkları Melodim’e eklenir. Her çalgının şarkısı karaoke sözleriyle çalar.',
      ['Şarkılar şimdilik aynı piyano sesiyle']),
    acts: [['Piyanoda çal', play(27)], ['Keman şarkısı', play(28)]],
    notes: `<p>Nota çalan her şey burada.</p><ol><li><b>Piyano</b>: çalınanlar Melodim'e eklenir.</li><li><b>Keman şarkısı</b>: karaoke satırı ilerler, tuşlar yanar.</li></ol><p>Her şarkı aynı piyano sesiyle çalar; gerçek çalgı sesleri vakfın kararı.</p>`,
  },
  {
    id: 'cal-oyun', label: 'Şarkıdan oyuna', theme: 'light', phone: at(29),
    html: step('6 · Çal', 'Şarkıdan oyuna: dört seçenek',
      'Şarkı sayfasındaki “Bu çalgıyla oyna” turu dört seçenekle açar ve tur boyunca öyle kalır.',
      ['Hangi yoldan girildiyse oyun öyle oynanır', 'Çocuğa nasıl oynamak istediği sorulmaz']),
    acts: [['Bu çalgıyla oyna', play(30)], ['Turu bitir', play(31)]],
    notes: `<p>Oyun hangi yoldan girildiğine göre oynanır: Oyna'dan yazarak, Çal'dan seçerek. Çocuğa “nasıl oynamak istersin” diye sorulmaz.</p><ol><li><b>Bu çalgıyla oyna</b>: tur dört seçenekle açılır.</li><li><b>Turu bitir</b>: yıldızlar ve XP profile eklenir.</li></ol>`,
  },
  {
    id: 'doremimi', label: 'Vakıf', theme: 'light', phone: at(32),
    html: step('7 · Dore Mimi Vakfı', 'Logo: vakfın sekmesi',
      'Ortadaki logo Dore Mimi Vakfı’nı açar. En üstte duyurular döner: oyun, Dore ve Mimi, bilmeceler, vakıf, kitaplar.',
      ['“Vakfımız kuruldu!” vakfın kendi sayfasına götürür']),
    acts: [['Vakfımız kuruldu!', play(33)], ['Vakfın sayfası', play(34)]],
    notes: `<p>Sekmenin başlığı artık vakfın kendisi; eskiden en üstte duran vakıf kartının yerinde duyurular döner.</p><ol><li><b>Vakfımız kuruldu!</b>: dördüncü duyuru.</li><li><b>Vakfın sayfası</b>: duyuruya dokununca vakfın vizyonu ve kurulları.</li></ol>`,
  },
  {
    id: 'vakif', label: 'Faaliyetler', theme: 'light', phone: at(35),
    html: step('7 · Dore Mimi Vakfı', 'Faaliyetler, Katıl, Tanış',
      'Her bağlantı bir kez: Faaliyetler, Katıl, Tanış, Bize ulaş, Uygulama. Henüz olmayan sayfalar “Hazırlanıyor” der.',
      ['Burslar: Si Bemol ve Mi Bemol', 'Dışarı giden her bağlantı ebeveyn PIN’i ister']),
    acts: [['Burslar', play(36)], ['Etkinlikler', play(37)], ['Dore ve Mimi', play(38)]],
    notes: `<p>Eskiden İletişim iki satırdan, Dore ve Mimi ile kitaplar hem duyurudan hem satırdan açılıyordu. Artık her yer bir kez.</p><ol><li><b>Burslar</b>: Si Bemol ve Mi Bemol.</li><li><b>Etkinlikler</b>: konserler, bilmeceler, eğitici materyaller; konser takvimi hazırlanıyor.</li><li><b>Dore ve Mimi</b>: karakterler.</li></ol>`,
  },
  {
    id: 'profil', label: 'Profilim', theme: 'light', phone: at(39),
    html: step('8 · Aile', 'Profilim',
      'Sağ üstteki avatar çocuğun profilini açar: seviye, yıldızlar, rozetler ve hangi konuda ne kadar ilerlediği.',
      ['Az önceki iki turun yıldızları ve rozetleri burada', 'Kardeşler “Kim oynuyor?” ile geçer']),
    acts: [['İstatistik ve rozetler', play(40)], ['Kim oynuyor?', play(41)]],
    notes: `<p>Bu profil sunumda oynanan iki turun sonucunu gösterir; hiçbir sayı elle konmadı.</p><ol><li><b>İstatistik</b>: tur sayısı, en iyi seri, cevaplanan kart; kazanılan rozetler.</li><li><b>Kim oynuyor?</b>: kardeşler arasında geçiş.</li></ol>`,
  },
  {
    id: 'pin', label: 'Ebeveyn', theme: 'light', phone: at(42),
    html: step('8 · Aile', 'Ebeveyn kilidi',
      'Hesabım, Ebeveyn paneli ve dışarı giden her bağlantı altı haneli PIN ister. Üç yanlışta 30 saniye kilit.',
      ['Reklam yok, sohbet yok, ücretli ödül yok']),
    acts: [['Hesabım', play(43)], ['PIN: 135790', play(44)]],
    notes: `<ol><li><b>Hesabım</b>: PIN ekranı açılır.</li><li><b>135790</b>: Hesabım açılır (yalnızca bu demonun PIN'i).</li></ol><p>İçerik kodda değil, tablolarda: vakıf ekibi panelden düzenler, yayından önce hatalar satır satır gösterilir. Bugün içerik değişikliği yeni bir sürümle telefona ulaşır.</p>`,
  },
  {
    id: 'ayarlar', label: 'Zorluk', theme: 'light', phone: at(45),
    html: step('9 · Ayarlar', 'Ayarlar: Zorluk',
      'İlk oyunda seçilen seviye burada değişir. Sorular bu seviyeye kadar gelir; yetmezse bir üst seviyeden tamamlanır.',
      ['Azaltılmış hareket, buton sesleri, müzik ve bildirimler de burada']),
    acts: [['Zorluk: Orta', play(46)]],
    notes: `<p>Her sorunun bir zorluğu var: Başlangıç, Orta, İleri. Çocuğun seviyesi bir tavan: önce kendi seviyesi, sonra altındakiler; havuz yetmezse bir üstten tamamlanır, aynı kart tekrar edilmez.</p>`,
  },
  {
    id: 'dil', label: 'Dil', theme: 'light', phone: at(46),
    html: step('9 · Ayarlar', 'Üç dil: Türkçe, English, Français',
      'Dil değişince her şey hemen değişir: menüler, sorular, cevaplar, işaret ve aile adları. Şarkı sözleri, video adları ve vakfın uzun metinleri Türkçe kalır.',
      ['İngilizce ve Fransızca taslak; anadili olan biri okumalı', 'Cevaplar her dilde kendi yazımıyla kabul edilir']),
    acts: [['English', play(47)], ['Français', play(48)], ['Türkçe', play(49)]],
    notes: `<ol><li><b>English</b>: Ayarlar İngilizceye döner, sonra Oyna sekmesi İngilizce.</li><li><b>Français</b>: Öğren › Aileler Fransızca.</li><li><b>Türkçe</b>: geri.</li></ol><p>Uygulama cihazın dilini bu üçünden biriyse onunla açılır, değilse Türkçe. Çeviriler taslaktır ve tablolarında öyle işaretli.</p>`,
  },
  {
    id: 'platform', label: 'Platformlar', theme: 'dark', layout: 'full', cls: 'platforms',
    // No build numbers: they went stale within days (this slide said 0.1.73 long after newer builds were with testers).
    html: `
      <span class="eyebrow">10 · Her cihaz</span>
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
    id: 'kapanis', label: 'Kapanış', theme: 'dark', layout: 'center', phone: at(50),
    html: `<div class="closing"><span class="cl-l">Dore ve Mimi</span><span class="cl-r">artık <em>cebinizde.</em></span></div>`,
    notes: `<p>Telefonda vakfın sekmesi açık: duyurular, faaliyetler, gönüllülük ve iletişim. Sorularınız ve değiştirmek istedikleriniz bizim için yol haritası.</p>`,
  },
];

/**
 * How long auto-play leaves a slide on screen before its first step: time to read its eyebrow, title, lead and lines
 * at a presenter's pace (about 200 words a minute, 300 ms a word) plus a beat to find the phone. The notes are left
 * out: they are the presenter's, not the audience's.
 */
export function readMs(slide) {
  const text = slide.html.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.min(14000, 2500 + words * 300);
}
