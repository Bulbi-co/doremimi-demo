/*
 * Doremimi — tanıtım sunumu. The deck's mechanics follow the Eylül demo (eylul-fuarcilik/sunum.js; dossier ch. 10
 * R-02 to R-12); the slide list, copy and notes are dossier ch. 10 part 5 (all PROPOSED copy, the owner's to change).
 * Slides are data; each may send the phone a message when it opens, and its "canlı göster" buttons play in order on →.
 */
import { ICONS } from './app/lib/icons.js';
import { Backdrop } from './app/lib/backdrop.js';

const $ = s => document.querySelector(s);
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}" fill-rule="evenodd"/></svg>`;
const TOUR_TOTAL = 12;
// Buton: [başlık, telefona gidecek mesaj, ikon]
const actions = list => list.length ? `<div class="acts">${list.map(([t, msg, ic], k) => `<button class="act${k ? ' ghost' : ''}" data-msg='${JSON.stringify(msg).replace(/'/g, '&#39;')}'><span class="a-ico">${icon(ic)}</span><b>${t}</b><span class="a-go">${icon('IconPlay')}</span></button>`).join('')}</div>` : '';
// Adım: başlık, bir iki cümle, üç kısa özellik, canlı gösterimler
const step = (n, name, title, lead, feats, acts = [], extra = '', pre = '') => `
  <div class="stepbar"><span class="sb-n">Adım ${String(n).padStart(2, '0')}<em>/ ${TOUR_TOTAL}</em></span><span class="sb-name">${name}</span><span class="sb-track"><b style="width:${n / TOUR_TOTAL * 100}%"></b></span></div>
  <h1 class="title tour">${title}</h1>
  <p class="lead">${lead}</p>${pre}
  <ul class="feats">${feats.map(([ic, t]) => `<li><span class="f-ico">${icon(ic)}</span>${t}</li>`).join('')}</ul>
  ${actions(acts)}${extra}`;
const go = hash => ({ type: 'go', hash });
const act = (name, args = {}) => ({ type: 'act', name, ...args });
/*
 * A "canlı göster" step outside the game is a whole state, not a delta: it goes to its screen, then presses. So ←
 * (which resends the step before) and R always land on the same screen, whatever was tapped in between.
 */
const batch = (...msgs) => ({ type: 'batch', msgs });
const at = step => ({ type: 'act', name: 'goto', step });           // the phone's scripted round, app/app.js SCRIPT
const play = step => ({ type: 'act', name: 'goto', step, play: true });
const planned = '<span class="tag">PLANLANAN</span>';
// The new dock as a small picture for the navigation slide (dossier ch. 11 NR-02).
const dockPic = `<div class="dockpic">${[['IconHome', 'Keşfet'], ['IconBook', 'Öğren'], null, ['IconEye', 'İzle'], ['IconNote', 'Çal']].map(t => t
  ? `<span class="dp">${icon(t[0])}<b>${t[1]}</b></span>` : '<span class="dp logo"><img src="assets/brand/logo.png" alt="Doremimi"></span>').join('')}</div>`;

const SLIDES = [
  {
    id: 'kapak', label: 'Kapak', theme: 'dark', phone: { type: 'reset', hash: '#/' },
    html: `
      <span class="kicker">Dore Mimi Yetenek ve Eğitim Vakfı için</span>
      <h1 class="title">Müziği oynayarak<br><em>öğren.</em></h1>
      <p class="lead">Dore ve Mimi'nin şarkıları, çalgıları ve videoları, tek bir müzik kart oyunuyla birlikte. Şimdi uygulamayı baştan sona gezelim.</p>
      <div class="stats">
        <div><b>41</b><small>çalgı</small></div>
        <div><b>41</b><small>şarkı, piyanoda</small></div>
        <div><b>74</b><small>video</small></div>
      </div>
      <p class="src">Kaynak: uygulamanın içerik dosyaları.</p>`,
    notes: `<p><b>“Doremimi'yi uygulamayı açmadan, baştan sona birlikte gezeceğiz.”</b> Sağdaki telefon gerçek gibi çalışır, istediğiniz an dokunabilirsiniz. → tuşu her slayttaki canlı gösterimleri sırayla oynatır.</p><p>Ses için önce sağ üstteki <b>Sesi aç</b>'a bir kez tıklayın. Bu slayta dönünce telefon sıfırlanır; demo baştan oynatılabilir.</p>`,
  },
  {
    id: 'hedef', label: 'Vakfın hedefi', theme: 'dark', layout: 'full',
    html: `
      <span class="kicker">Neden Doremimi?</span>
      <h1 class="title">Çocukları müzikle <em>tanıştırmak.</em></h1>
      <div class="cards3">
        <div class="gcard"><h3>Vizyon</h3><p>Çocuklarımızı ve gençlerimizi müzikle tanıştırmak için etkinlik ve dikkat kitapları, konserler, oyunlar ve oyuncaklar hazırlıyoruz. Dore Mimi Gönüllüleri ile büyüyen bu yolculuk, “Si Bemol” ve “Mi Bemol” burslarıyla Dore Mimi Müzikle Değerler Eğitimi projesini destekleyecek.</p><small>Vakfın kendi metni, uygulamadan</small></div>
        <div class="gcard"><h3>Çünkü…</h3><ul class="mani">${['Müzik bir sanattır.', 'Müzik bir yöntemdir.', 'Müzik matematiktir.', 'Müzik kültürdür.', 'Müzik tarihtir.', 'Müzik iletişimdir.', 'Müzik bir ifade biçimidir.', 'Müzik insanları birleştirir.'].map(l => `<li>${l}</li>`).join('')}</ul><small>Vakfın manifestosu, uygulamadan (DoremimiDirectory.Manifesto)</small></div>
        <div class="gcard"><h3>Çocuk için güvenli</h3><ul><li>İnternetsiz çalışır, hiçbir şey dışarı gönderilmez</li><li>Reklam yok, sohbet yok, ücretli ödül yok</li><li>Altın yok, seri yok</li><li>Dışarı giden her bağlantı ebeveyn PIN'inin arkasında</li></ul><small>Uygulamanın kuralları</small></div>
      </div>`,
    notes: `<p>Vakfın kendi cümlesiyle başlıyoruz: <b>çocukları müzikle tanıştırmak.</b> Uygulama bunu oyunla yapıyor, ama çocuk için güvenli bir oyunla: reklam yok, sohbet yok, para yok; internet olmadan da çalışıyor.</p>`,
  },
  {
    id: 'gezinme', label: 'Yeni gezinme', theme: 'light', phone: go('#/'),
    html: step(1, 'Gezinme', 'Dört sekme, ortada Doremimi',
      'Alt menü artık Keşfet, Öğren, İzle ve Çal. Ortada vakfın resmî logosu durur: uygulamanın ve vakfın bütün bilgileri ona dokununca açılır. Çocuğun profili sağ üst köşede.',
      [],
      [['Logoya dokun', go('#/doremimi'), 'IconInfo'], ['İzle', go('#/izle'), 'IconEye'], ['Çal', go('#/cal'), 'IconNote'], ['Profil', go('#/profil'), 'IconSmile']],
      '', dockPic),
    notes: `<p>Vakıfla konuştuğumuz yeni düzen bu: <b>Keşfet · Öğren · logo · İzle · Çal.</b> “Oyunlar” ve “Daha fazla” sekmeleri kalktı.</p><ol><li><b>Logo</b>: vakıf, ekip, burslar, gönüllülük, iletişim, kitaplar, yardım ve yasal metinler burada.</li><li><b>İzle</b>: bilmeceler, klipler, röportajlar, karaoke ve jenerikler.</li><li><b>Çal</b>: nota çalan her şey: serbest piyano, her çalgının kendi şarkısı karaoke sözleriyle, Melodim.</li><li><b>Profil</b>: sağ üstteki karakter; aile ve ayarlar da orada.</li></ol><p>Not: uygulamanın kendisi bu düzene göre güncelleniyor; telefondaki ekranların içi uygulamayla birebir, yalnızca yerleri yeni.</p>`,
  },
  {
    id: 'kesfet', label: 'Keşfet', theme: 'light', phone: go('#/'),
    html: step(2, 'Keşfet', 'Keşfet',
      'Uygulama açılınca çocuğu tek büyük düğme karşılar: OYNA. Üstte yenilikler ve vakfın duyuruları döner; Dore ve Mimi dokununca konuşur.',
      [['IconPlay', 'Tek büyük eylem: OYNA'], ['IconBell', "Vakfın duyuruları banner'da"], ['IconNote', 'Açılışta Doremimi teması bir kez çalar']],
      [['Duyuruyu göster', batch(go('#/'), act('banner.show', { index: 3 })), 'IconBell'], ['Temayı çal', batch(go('#/'), act('theme.play')), 'IconNote'], ['Konu seç', go('#/oyun-merkezi'), 'IconCards']]),
    notes: `<p>Ana ekranda tek bir büyük eylem var: <b>OYNA.</b> Çocuk okumadan da ne yapacağını bilir.</p><ol><li><b>Duyuruyu göster</b>: vakfın haberleri burada döner.</li><li><b>Temayı çal</b>: açılış teması bir kez çalar, altta “Şimdi çalıyor” görünür; ona dokununca Çal açılır. Tema şimdilik <b>yedek bir tema</b>; vakfın gerçek jenerik müziği gelince değişecek.</li><li><b>Konu seç</b>: oyunun eski “Oyunlar” sayfası artık buradan açılıyor: işaretler ve çalgı aileleri, ustalık yüzdeleriyle.</li></ol>`,
  },
  {
    id: 'isaretler', label: 'İşaretler', theme: 'light', phone: go('#/ogren/isaretler'),
    html: step(3, 'Öğren', 'İşaretler',
      'Her müzik işaretinin bir rengi var. Çocuk bir renge dokunur, kart döner ve anlamını okur; işaretin sayfasında hem tanımı hem çocuk anlatımı vardır.',
      [['IconPalette', 'Her işaretin kendi rengi'], ['IconReplay', 'Dokununca dönen kartlar'], ['IconSmile', 'Tanım ve çocuk anlatımı']],
      [['Diyez kartını çevir', batch(go('#/ogren/isaretler'), act('sign.flip', { key: 'diyez' })), 'IconReplay'], ['Diyez sayfası', go('#/isaret/diyez'), 'IconSmile']]),
    notes: `<p>Öğren'de artık yalnızca iki bölüm var: <b>İşaretler</b> ve <b>Çalgılar</b>. Her işaretin bir rengi var; oyunda da aynı renk.</p><ol><li><b>Diyez kartını çevir</b>: kart dönüyor, anlamı yazıyor.</li><li><b>Diyez sayfası</b>: çocuk anlatımında Mimi anlatıyor, oyuncak piyanoda diyezin nereye düştüğü görülüyor; beyaz tuşlara dokunabilirsiniz.</li></ol><p><b>Bemol</b>'ü canlı açmayın: kategori anlamı yanlış yazıyor (düzeltilecek). Sol, Natürel, Porte ve Bitiş çizgisi örnek içerik.</p>`,
  },
  {
    id: 'calgilar', label: 'Çalgılar', theme: 'light', phone: go('#/ogren/calgilar'),
    html: step(4, 'Öğren', 'Çalgılar',
      '41 çalgı ailelerine göre sıralı. Her çalgının sayfasında kısa bilgisi, bilmece videosu ve kendini dene kartları var; şarkısına tek dokunuşla Çal\'da ulaşılır.',
      [['IconNote', 'Aileye göre süzülen 41 çalgı'], ['IconPlay', 'Video bilmece, ebeveyn kilidinin arkasında'], ['IconCards', 'Bu çalgıyla oyna']],
      [['Piyano', go('#/calgi/piyano'), 'IconBook'], ['Video bilmeceyi izle', batch(go('#/calgi/piyano'), act('video.open'), act('gate.type')), 'IconPlay']]),
    notes: `<p>Vakfın 41 çalgısı burada, ailelerine göre. Bir çalgıyı ilk açışta 10 XP gelir.</p><ol><li><b>Piyano</b>: bilgi, bilmece videosu, “Şarkısını çal” ve “Kendini dene” kartları.</li><li><b>Video bilmeceyi izle</b>: dışarı giden her bağlantı ebeveyn PIN'i ister; demo PIN'i <b>135790</b>. Uygulamada video YouTube'da açılır; sunum internetsiz olduğu için burada kapağı görünür.</li></ol>`,
  },
  {
    id: 'cal', label: 'Çal', theme: 'light', phone: go('#/cal'),
    html: step(5, 'Çal', 'Çal: piyano ve şarkılar',
      'Nota çalan her şey tek sekmede. Çocuk piyanoda serbestçe çalar, çaldıkları Melodim\'e eklenir; bir çalgı seçince o çalgının Dore Mimi şarkısı karaoke sözleriyle çalar ve tuşlar yanar.',
      [['IconNote', 'İki oktavlık piyano, Melodim'], ['IconMic', '41 şarkı, karaoke sözleriyle'], ['IconCards', 'Şarkıdan oyuna tek dokunuş']],
      [['Piyanoda çal', batch(go('#/cal'), act('keys.play', { keys: [60, 62, 64, 65, 67, 67, 69, 67] })), 'IconNote'], ['Akordeon şarkısı', batch(go('#/sarki/akordeon'), act('song.play')), 'IconPlay'], ['Keman şarkısı', batch(go('#/sarki/keman'), act('song.play')), 'IconPlay']]),
    notes: `<p>Çal sekmesi “çal” demek: uygulamanın içinde ses çıkaran her şey burada.</p><ol><li><b>Piyanoda çal</b>: tuşlar uygulamanın kendi sentezlediği 44 piyano notası; çalınanlar Melodim'e eklenir.</li><li><b>Akordeon şarkısı</b>: şarkı çalar, karaoke satırı ilerler, tuşlar yanar.</li><li><b>Keman şarkısı</b>: her çalgının kendi şarkısı var.</li></ol><p>Dürüst olalım: her şarkı aynı piyano sesiyle çalar; kayıtlı çalgı sesi yok, bu yüzden indirme boyutu büyümüyor. Gerçek çalgı sesleri vakfın kararı.</p>`,
  },
  {
    id: 'yaz', label: 'Oyun: Yaz', theme: 'light', phone: at(0),
    html: step(6, 'Oyun', 'Tek oyun: Müzik Kart Oyunu',
      'Çocuk kartı görür ve cevabı kendisi yazar. Bilemezse cevap harf kutularına dönüşür: yeşil harfler yardım, boş kutuları o doldurur.',
      [['IconPencil', 'Önce yazarak hatırlar'], ['IconGrid', 'Sonra harf kutuları, adam asmaca gibi'], ['IconCheck', 'Yazım hatasını affeder']],
      [['Hadi oynayalım!', play(1), 'IconPlay'], ['Yanlış yaz: “sol”', play(2), 'IconPencil'], ['Kutuları doldur', play(3), 'IconGrid']]),
    notes: `<p>Uygulamada tek bir oyun var. Çocuk kartı görüyor, <b>cevabı kendisi yazıyor</b>; oyunun asıl becerisi bu.</p><ol><li><b>Hadi oynayalım!</b>: üç adımlı tanıtım.</li><li><b>Yanlış yaz</b>: “sol” yazdık, olmadı; cevap harf kutularına dönüştü: iki kelime, iki ve sekiz harf, yeşiller yardım.</li><li><b>Kutuları doldur</b>: doğru! Harflerle bulduğu için 6 XP.</li></ol><p>İsterseniz bilgisayarın klavyesiyle de yazabilirsiniz; klavye boyutu Küçük / Orta / Büyük.</p>`,
  },
  {
    id: 'secenek', label: 'Oyun: seçenekler', theme: 'light', phone: at(4),
    html: step(7, 'Oyun', 'Seçenekler ve bilgi kartı',
      'İki yazma denemesi de olmazsa kart dört seçenek sunar. Yanlış seçimde ya da “Bilmiyorum”da kart döner ve cevabı anlatır: ceza yok, öğrenme var.',
      [['IconCards', 'Ancak iki denemeden sonra seçenek'], ['IconBook', 'Kart dönüp anlatır'], ['IconHeart', 'Yanlış cevap hiçbir şey kaybettirmez']],
      [['İki deneme de yanlış', play(5), 'IconPencil'], ['Yanlış seç', play(6), 'IconCards'], ['Sıradaki kart', play(7), 'IconArrow']]),
    notes: `<p>İkinci kartta çocuk iki kez yanılıyor; <b>ancak o zaman</b> dört seçenek geliyor.</p><ol><li><b>İki deneme de yanlış</b>: “bemol”, sonra kutulara “solm”.</li><li><b>Yanlış seç</b>: kart dönüyor; doğru cevap, çocuğun seçtiği, tanım ve çocuk anlatımı, oyuncak piyanoda diyez.</li><li><b>Sıradaki kart</b>: Bemol.</li></ol><p>Yanlış cevap XP kaybettirmez. Yanlış kartlar iki kart sonra bir kez daha gelir.</p>`,
  },
  {
    id: 'merdiven', label: 'Oyun: merdiven', theme: 'light', phone: at(7),
    html: step(8, 'Oyun', 'Oyun seviyeni kendisi ayarlar',
      "Zorlanan çocuk Seç'e, gerekirse Çevir'e iner; doğru bildikçe yukarı çıkar. Arka plan seviyeyle birlikte rengini ve hızını değiştirir.",
      [['IconCards', 'Yaz → Seç → Çevir, düğmeyle seçilmez'], ['IconStar', 'Yukarı adımlar görünür, düşüş gösterilmez'], ['IconNote', 'Yaz hızlı ve altın, Çevir yavaş ve lila']],
      [["Bilmiyorum: Seç'e in", play(8), 'IconArrow'], ["Çevir'e in", play(9), 'IconReplay'], ['Çevir, “Bildim”', play(10), 'IconCheck']]),
    notes: `<p>Burada oyunun kalbi var: <b>merdiven.</b> Üstte Çevir · Seç · Yaz şeridi. Çocuk üst üste iki kez zorlanınca bir basamak iner; düğmeyle seçilmez, oyun kendisi ayarlar.</p><ol><li><b>Bilmiyorum</b>: ikinci zorlanma; şerit Seç'e iniyor, arka plan altından maviye döndü, yavaşladı.</li><li><b>Çevir'e in</b>: yanlış seçim ve geri gelen kartta “Bilmiyorum”; en alt basamak, kart çevrilip birlikte okunur.</li><li><b>Bildim</b>: iki kez “Bildim” deyince yeniden Seç'e çıkıyor.</li></ol><p>Şerit yalnızca yukarı çıkmaya kalan adımları gösterir; düşmeye ne kaldığını asla göstermez.</p>`,
  },
  {
    id: 'sonuc', label: 'Tur sonu', theme: 'light', phone: at(10),
    html: step(9, 'Oyun', 'Tur tamamlandı',
      'Tur sonunda çocuk yıldızlarını, XP\'sini ve hangi müzik konusunda ne kadar ilerlediğini görür; yeni rozetler burada açılır.',
      [['IconStar', '1–3 yıldız, hiçbir şey ödemez'], ['IconBulb', 'Müzik bilgin: konular ve ilerleme'], ['IconCheck', `Rozetler vakfın panelinden düzenlenir ${planned}`]],
      [['Turu bitir', play(11), 'IconStar'], ['Rozetler', play(12), 'IconCheck']]),
    notes: `<p>Tur bitti. Yıldızlar yalnızca turun notu; para ya da ödül yok. Asıl önemli kısım <b>Müzik bilgin</b>: çocuk hangi konuda zorlandıysa önce o geliyor, kısa bir bilgiyle ve ilerleme çubuğuyla.</p><p><b>Rozetler</b>: “İlk Nota”, “Baba Sesler Bilgini”. Rozetler bir içerik dosyası; panelde rozet tablosu henüz yok (planlanan).</p><p>Sol alttaki düğme artık <b>Çık</b>: “Oyunlar” sekmesi kalktığı için.</p>`,
  },
  {
    id: 'profil', label: 'Profil', theme: 'light', phone: go('#/profil'),
    html: step(10, 'Profil', 'Profil sağ üstte',
      'Sağ üstteki karaktere dokununca çocuğun kendi sayfası açılır: seviye, XP, ilerleme ve rozetler. Kardeşler arasında geçiş, ayarlar ve ebeveyn sayfaları da burada.',
      [['IconStar', 'XP ve seviye, altın yok'], ['IconUsers', 'Kim oynuyor?: her çocuğa ayrı profil'], ['IconReplay', 'Tekrar zamanı: unutulmaya başlayan kartlar']],
      [['Kim oynuyor?', batch(go('#/profil'), act('switcher.open')), 'IconUsers'], ['Ada oynasın', batch(go('#/profil'), act('switcher.open'), act('child.pick', { id: 'ada' })), 'IconSmile'], ['Konu seç sayfası', go('#/oyun-merkezi'), 'IconCards']]),
    notes: `<p>Profil artık “Daha fazla”nın içinde değil, <b>sağ üst köşede</b>. Tur sonrası XP ve rozetler burada görünüyor.</p><ol><li><b>Kim oynuyor?</b>: profilin ilk düğmesi; kardeşler arasında geçilir.</li><li><b>Ada oynasın</b>: sağ üstteki karakter değişir.</li><li><b>Konu seç sayfası</b>: işaretlerin ve çalgı ailelerinin ustalık yüzdeleri; tur oynandıysa yüzdeler artmış olur.</li></ol><p>Arka planda her soru için bir ustalık kutusu tutuluyor: ilk denemede yazılan cevap kutuyu yükseltir, kaçırılan indirir.</p>`,
  },
  {
    id: 'hesap', label: 'Hesaplar ve kilit', theme: 'light', phone: go('#/profil'),
    html: step(11, 'Aile', 'Aile hesabı ve ebeveyn kilidi',
      "Ebeveyn hesabı açar, her çocuğa ayrı profil ekler; ilerleme her çocuğun kendinde. Uygulamadan dışarı çıkan her bağlantı ve ebeveyn sayfaları altı haneli ebeveyn PIN'i ister.",
      [['IconUsers', 'Her çocuğa ayrı profil'], ['IconLock', 'Dışarı giden her bağlantı kilitli'], ['IconCheck', 'Her şey cihazda kalır']],
      [['Hesabım', batch(go('#/profil'), act('scroll', { to: '[data-do="hesabim"]' }), act('gate.open', { row: 'hesabim' })), 'IconLock'], ["PIN'i gir", batch(go('#/profil'), act('gate.open', { row: 'hesabim' }), act('gate.type')), 'IconCheck']]),
    notes: `<p>Ebeveyn sayfaları profilin altında, <b>Aile ve ayarlar</b> bölümünde. Ebeveyn sayfaları ve dışarı giden her bağlantı (YouTube, Instagram, web sitesi) altı haneli PIN ister; üç yanlışta tuşlar 30 saniye kilitlenir.</p><p>Demo PIN'i: <b>135790</b>. Uygulamanın kendi PIN'i değil, yalnızca bu demoya ait.</p>`,
  },
  {
    id: 'panel', label: 'İçerik paneli', theme: 'light', layout: 'panel', phone: go('#/doremimi'),
    html: step(12, 'İçerik', 'İçerik vakfın elinde',
      "İşaretler, sorular, çalgılar, videolar ve şarkılar bir içerik panelinden düzenlenir; tablolar Excel'de açılan CSV olarak dışa ve içe aktarılır.",
      []),
    notes: `<p>Yedi içerik tablosu · Excel'de açılan CSV · yayınlamadan önce doğrulama.</p><p>İçerik kodda değil, tablolarda. Vakıf ekibi işaretleri, soruları, çalgıları, videoları bu panelden düzenler; her tablo Excel'de açılan bir CSV. Yayınlamadan önce hatalar satır satır gösterilir.</p><p>Telefonların yayınlanan içeriği indirmesi, rozet tablosu ve gelişmiş panel sıradaki işler; bugün içerik değişikliği yeni bir sürümle telefona ulaşır.</p><p>(Panelin görünümü henüz çizilmedi: önce çalışan panelden bir ekran görüntüsü alınacak.)</p>`,
  },
  {
    id: 'platform', label: 'Platformlar', theme: 'dark', layout: 'full', cls: 'platforms',
    html: `
      <span class="kicker">Tek kod, her cihaz</span>
      <h1 class="title">iPhone'dan tarayıcıya,<br><em>aynı uygulama.</em></h1>
      <ul class="plat">
        <li><b>iPhone · iPad</b><span>TestFlight, sürüm 0.1.73 (73); iOS 15 ve üstü</span></li>
        <li><b>Android</b><span>APK 0.1.73; Android 6 ve üstü, 64 bit; Google Play'de değil</span></li>
        <li><b>Mac · Windows</b><span>.dmg ve .zip; henüz imzasız</span></li>
        <li><b>Tarayıcı</b><span>WebAssembly, 15,51 MB indirme bütçesi içinde</span></li>
        <li><b>Tek kod tabanı</b><span>Avalonia 12, .NET 10</span></li>
      </ul>`,
    notes: `<p>Tek bir kod tabanı: iPhone ve iPad'de TestFlight ile, Android'de APK ile, Mac, Windows ve tarayıcıda çalışıyor. Mağazaya çıkış için imzalar ve vakfın onayı gerekiyor.</p>`,
  },
  {
    id: 'kapanis', label: 'Kapanış', theme: 'dark', layout: 'center', phone: go('#/doremimi'),
    html: `<div class="closing"><span class="cl-l">Dore ve Mimi</span><span class="cl-r">artık <em>cebinizde.</em></span></div>`,
    notes: `<p>Telefonda vakfın kendi yeri açık: logo, uygulamanın ortasında. Telefonu bırakın; istediğiniz ekranı birlikte açabiliriz. Sorularınız ve değiştirmek istedikleriniz bizim için yol haritası.</p>`,
  },
];

/* ---------- ses (S-04): the deck owns the AudioContext; the phone borrows it through window.__dmAudio */
let audioCtx = null;
window.__dmAudio = () => { if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C(); } return audioCtx; };
function unlockAudio() { const c = window.__dmAudio(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, unlockAudio, true));

/* ---------- kurulum */
const stage = $('#stage'), slidesEl = $('#slides'), phone = $('#phone'), device = $('#device'), browser = $('#browser');
slidesEl.innerHTML = SLIDES.map((s, i) => `<section class="slide ${s.layout === 'full' ? 'wide' : ''}" data-i="${i}"><div class="col">${s.html}</div></section>`).join('');
$('#dots').innerHTML = SLIDES.map((s, i) => `<button data-dot="${i}" aria-label="${i + 1}. ${s.label}" title="${s.label}"></button>`).join('');

// The light slides carry the app's own slow note field, quietly (S-01).
const notes = new Backdrop($('#deck-notes'), { seed: 9, mood: 'kesfet', clearTop: 40, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
notes.start();

/* ---------- ölçek (R-02) */
function fit() { const s = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `translate(-50%, -50%) scale(${s})`; }
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();
let swipe = null;
slidesEl.addEventListener('touchstart', e => { const t = e.touches[0]; swipe = { x: t.clientX, y: t.clientY }; }, { passive: true });
slidesEl.addEventListener('touchend', e => {
  if (!swipe) return; const t = e.changedTouches[0]; const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y; swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
}, { passive: true });

/* ---------- telefonla konuşma (R-07, W-02, W-04) */
let phoneReady = false; const queue = [];
const ready = () => { if (phoneReady) return; phoneReady = true; queue.splice(0).forEach(sendPhone); };
phone.addEventListener('load', () => setTimeout(ready, 1500));   // dm-ready normally comes first; this is the fallback
function sendPhone(msg) { if (!phoneReady) return queue.push(msg); phone.contentWindow.postMessage(msg, '*'); }
let phoneTyping = false;
addEventListener('message', e => {
  if (e.source !== phone.contentWindow) return;
  const m = e.data || {};
  if (m.type === 'dm-ready') ready();
  if (m.type === 'dm-key') key(m.key);
  if (m.type === 'dm-typing') phoneTyping = !!m.on;
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-msg]');
  if (b) { sendPhone(JSON.parse(b.dataset.msg)); const acts = slideActs(); const k = acts.indexOf(b); if (k >= 0) { sub = k + 1; markActs(); } }
  const d = e.target.closest('[data-dot]');
  if (d) show(Number(d.dataset.dot));
});

/* ---------- gezinme (R-05) */
let cur = -1, sub = 0;
const slideActs = () => [...document.querySelectorAll('.slide.on .act')];
function markActs() { slideActs().forEach((a, k) => { a.classList.toggle('done', k < sub); a.classList.toggle('upnext', k === sub); }); }
function next() {
  const acts = slideActs();
  if (sub < acts.length) { sendPhone(JSON.parse(acts[sub].dataset.msg)); sub++; markActs(); return; }
  show(cur + 1);
}
function prev() {
  if (sub > 0) {
    // Undo one button: the phone goes back to the state before it (the scripted round replays to there; ch. 10 O-12).
    sub--;
    const acts = slideActs(), s = SLIDES[cur];
    const msg = sub > 0 ? JSON.parse(acts[sub - 1].dataset.msg) : s.phone;
    if (msg) sendPhone({ ...msg, play: false });
    markActs(); return;
  }
  show(cur - 1);
}
function show(i) {
  i = Math.max(0, Math.min(SLIDES.length - 1, i));
  if (i === cur) return;
  const s = SLIDES[i];
  document.querySelectorAll('.slide').forEach((el, k) => { el.classList.toggle('on', k === i); el.classList.toggle('leave', k === cur && k !== i); });
  stage.className = 'stage ' + (s.theme === 'dark' ? 'dark ' : '') + (s.layout === 'full' ? 'full ' : '') + (s.cls || '');
  document.body.classList.toggle('light', s.theme !== 'dark');
  device.classList.toggle('away', s.layout === 'full');
  device.classList.toggle('side', s.layout === 'panel');
  device.classList.toggle('center', s.layout === 'center');
  browser.classList.toggle('on', s.layout === 'panel');
  if (s.layout === 'panel') { const p = $('#panel'); if (!p.src) p.src = p.dataset.src; }
  if (s.phone) sendPhone(s.phone);
  document.querySelectorAll('[data-dot]').forEach((d, k) => d.classList.toggle('on', k === i));
  $('#count').textContent = String(i + 1).padStart(2, '0') + ' / ' + SLIDES.length;
  $('#bar').style.width = ((i + 1) / SLIDES.length * 100) + '%';
  $('#notes-body').innerHTML = s.notes || '';
  $('#notes-step').textContent = (i + 1) + '. slayt';
  cur = i; sub = 0; markActs();
  history.replaceState(null, '', location.search + '#' + (i + 1));
}

/* ---------- tuşlar (R-09, K-01, K-02) */
function key(k) {
  if (['ArrowRight', 'PageDown'].includes(k) || (k === ' ' && !phoneTyping)) next();
  if (['ArrowLeft', 'PageUp'].includes(k)) prev();
  if (k === 'Home') show(0);
  if (k === 'End') show(SLIDES.length - 1);
  if (phoneTyping) return;   // while the game takes letters, N, F and R are letters, not shortcuts
  if (k === 'n' || k === 'N') $('#notes').hidden = !$('#notes').hidden;
  if (k === 'f' || k === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
  if (k === 'r' || k === 'R') { const s = SLIDES[cur]; if (s.phone) sendPhone({ ...s.phone, play: false }); sub = 0; markActs(); }
}
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // K-02: while the phone's game is at a typing stage, letters, digits, Space, Backspace and Enter go to the phone
  // even when the deck has the focus, so the presenter can type on the laptop without clicking into the phone.
  if (phoneTyping && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) { e.preventDefault(); sendPhone({ type: 'key', key: e.key }); return; }
  if (e.key === ' ') e.preventDefault();
  key(e.key);
});
$('#next').onclick = next;
$('#sound').onclick = () => { unlockAudio(); sendPhone({ type: 'sound' }); $('#sound').classList.add('on'); $('#sound-t').textContent = 'Ses açık'; $('#sound-s').textContent = 'Piyano ve şarkılar'; };
$('#prev').onclick = prev;
$('#notes-close').onclick = () => { $('#notes').hidden = true; };

addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if (Number.isFinite(n)) show(n - 1); });
const start = parseInt(location.hash.slice(1), 10);
show(Number.isFinite(start) ? start - 1 : 0);
if (new URLSearchParams(location.search).has('notlar')) $('#notes').hidden = false;
