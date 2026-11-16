/*
 * The foundation's own content, copied from the app at c33d9ff: Doremimi.Core/Content/DoremimiDirectory.cs (the 41
 * instruments, characters, people, contacts, manifesto) and the song files' own headers. The three site lists
 * (videos, lyrics, library) are the app's JSON files as they are, in ./site/, and the 42 songs are in ./songs/.
 */
export const WEBSITE = 'https://www.doremimi.org';

/** DoremimiDirectory.GroupName; the filter chips of Çalgılar and Çal use these, in this order. */
export const GROUPS = ['Yaylı', 'Telli', 'Tuşlu', 'Nefesli', 'Bakır nefesli', 'Vurmalı', 'Diğer'];

/** DoremimiDirectory.Instruments: [name, group, summary, riddle page or null]. Order is the site's, as in the app. */
export const DIRECTORY = [
  ['Keman', 'Yaylı', 'Yaylı çalgı ailesinin en küçük ve en ince sesli üyesi. Dört teli vardır ve çenenin altında tutularak yayla çalınır.', 'keman'],
  ['Viyola', 'Yaylı', 'Kemandan biraz büyük, sesi daha sıcak ve kalındır. Notaları çoğunlukla alto anahtarıyla yazılır.', 'viyola'],
  ['Viyolonsel', 'Yaylı', 'Çello olarak da bilinir. Oturarak, iki diz arasında ve yere dayanan bir uç üzerinde çalınır.', 'viyolonsel'],
  ['Kontrabas', 'Yaylı', 'Yaylı ailesinin en büyüğü ve en kalın seslisi. Senfonik müziğin ve cazın vazgeçilmez çalgısıdır.', 'kontrabas'],
  ['Kabak Kemane', 'Yaylı', 'Gövdesi su kabağından yapılan, dizde dik tutularak yayla çalınan geleneksel bir halk çalgısı.', 'kabakkemane'],
  ['Kemençe', 'Yaylı', 'Dizde dik tutulan, küçük gövdeli yaylı bir çalgı. Karadeniz kemençesi en bilinen türlerindendir.', null],
  ['Gitar', 'Telli', 'Altı telli, perdeli bir çalgı. Parmakla ya da penayla çalınır; hem akor hem melodi çalabilir.', null],
  ['Mandolin', 'Telli', 'Çift telli, küçük gövdeli bir çalgı. Müziğe yeni başlayanlar için uygun ve kolay öğrenilir.', 'mandolin'],
  ['Ukulele', 'Telli', 'Dört telli, küçük ve neşeli sesli bir çalgı. Hawaii müziğiyle tanınır.', null],
  ['Bağlama', 'Telli', 'Türk halk müziğinin temel çalgısı. Uzun sapı ve mızrapla çalınan telleriyle tanınır.', 'baglama'],
  ['Cura', 'Telli', 'Bağlama ailesinin en küçük ve en ince sesli üyesi.', null],
  ['Tar', 'Telli', 'Gövdesi ince bir zarla kaplı, mızrapla çalınan telli bir çalgı. Kafkasya ve İran müziğinde yaygındır.', null],
  ['Ut', 'Telli', 'Perdesiz sapı ve yuvarlak gövdesiyle Türk müziğinin köklü çalgılarından biri. Mızrapla çalınır.', null],
  ['Kanun', 'Telli', 'Dizlere ya da masaya yatırılarak, parmaklara takılan yüksüklerle çalınan çok telli bir çalgı.', null],
  ['Yaylı Tambur', 'Telli', 'Tambur ailesinden olup yayla çalınan, uzun saplı bir çalgı.', null],
  ['Lir', 'Telli', 'Antik çağlardan beri bilinen, telleri bir çerçeveye gerili bir çalgı.', null],
  ['Arp', 'Telli', 'Büyük bir çerçeveye dizilmiş onlarca telden oluşur. Teller parmaklarla çekilerek çalınır.', 'arp'],
  ['Piyano', 'Tuşlu', 'Tuşa basınca keçeli çekiçler tellere vurur. Standart bir piyanoda 88 tuş vardır.', 'piyano'],
  ['Org', 'Tuşlu', 'Borulardan geçen havayla ses üreten, birden çok klavyesi ve ayak pedalı olabilen büyük bir çalgı.', 'org'],
  ['Melodika', 'Tuşlu', 'Üflenerek çalınan küçük, tuşlu bir çalgı. Okullarda sıkça kullanılır.', null],
  ['Akordeon', 'Tuşlu', 'Körükle hava pompalanarak çalınır. Bir tarafta tuşlar, diğer tarafta bas düğmeleri bulunur.', null],
  ['Bandoneon', 'Tuşlu', 'Akordeona benzeyen, düğmeli ve körüklü bir çalgı. Arjantin tangosunun sesidir.', 'bandoneon'],
  ['Keytar', 'Tuşlu', 'Gitar gibi askıyla taşınan elektronik bir klavye. Sahnede hareket özgürlüğü sağlar.', null],
  ['Flüt', 'Nefesli', 'Yandan tutularak çalınan, metal gövdeli bir nefesli. Ses, ağızlık deliğine üflenen havayla oluşur.', 'fluet'],
  ['Blok Flüt', 'Nefesli', 'Düz tutulan, ağızlığı sayesinde kolayca ses veren bir flüt. Müziğe başlamak için idealdir.', null],
  ['Sipsi', 'Nefesli', 'Kamıştan yapılan, Ege yöresine özgü küçük ve tiz sesli bir halk çalgısı.', 'sipsi'],
  ['Klarinet', 'Nefesli', 'Tek kamışlı bir nefesli. Hem klasik müzikte hem Türk halk ve Roman müziğinde çok sevilir.', 'klarinet'],
  ['Obua', 'Nefesli', 'Çift kamışlı, parlak ve dokunaklı sesli bir nefesli. Orkestra akordunu genellikle obua verir.', 'obua'],
  ['Fagot', 'Nefesli', 'Çift kamışlı ve uzun borulu, kalın sesli bir nefesli. Orkestranın “dedesi” diye anılır.', 'fagot'],
  ['Zurna', 'Nefesli', 'Çift kamışlı, güçlü sesli bir halk çalgısı. Davulla birlikte düğün ve şenliklerin sesidir.', null],
  ['Tulum', 'Nefesli', 'Hava deposu deriden yapılan bir gayda türü. Karadeniz müziğinin simgelerindendir.', null],
  ['Ney', 'Nefesli', 'Kamıştan yapılan, Türk müziğinin en eski nefeslilerinden. Ney çalınmaz, üflenir.', null],
  ['Trompet', 'Bakır nefesli', 'Bakır nefeslilerin en parlak ve en tiz seslisi. Üç pistonla notalar değiştirilir.', 'trompet'],
  ['Trombon', 'Bakır nefesli', 'Pistonu yerine ileri geri kayan bir sürgüsü vardır; sesler bu sürgüyle değiştirilir.', 'trombon'],
  ['Korno', 'Bakır nefesli', 'Kıvrımlı borusu ve geniş kalağıyla yumuşak sesli bir bakır nefesli.', 'korno'],
  ['Tuba', 'Bakır nefesli', 'Bakır nefeslilerin en büyüğü ve en kalın seslisi.', 'tuba'],
  ['Timpani', 'Vurmalı', 'Kazan biçimli, akort edilebilen büyük orkestra davulları. Pedalla ses perdesi değiştirilir.', 'timpani'],
  ['Ksilofon', 'Vurmalı', 'Ahşap çubukların tokmaklarla vurularak çalındığı, melodi çalabilen bir vurmalı.', 'ksilofon'],
  ['Kudüm', 'Vurmalı', 'Türk müziğinde usul tutan, deriyle kaplı küçük ikili davul.', null],
  ['Tumba', 'Vurmalı', 'Elle çalınan uzun gövdeli davul. Latin müziğinin ritmini taşır.', null],
  ['Metronom', 'Diğer', 'Bir çalgı değil, tempoyu tik-tak sesleriyle gösteren bir alet. Ritim çalışmanın en iyi arkadaşı.', 'metronom'],
].map(([name, group, summary, riddle]) => ({ name, group, summary, riddle }));

/** The 42 song files' headers [slug, instrument, title]; the notes load from ./songs/{slug}.json when a page opens. */
export const SONGS = [
  ['akordeon', 'Akordeon', 'DORE MİMİ AKORDEON'],
  ['ana-tema', 'Tüm çalgılar', 'DORE MİMİ ANA TEMA (yedek, besteli)'],
  ['arp', 'Arp', 'DORE MİMİ ARP'],
  ['baglama', 'Bağlama', 'DORE MIMI BAĞLAMA'],
  ['bandoneon', 'Bandoneon', 'DORE MİMİ BANDONEON'],
  ['blok-flut', 'Blok Flüt', 'DORE MİMİ BLOK FLÜT'],
  ['cello-viyolonsel', 'Viyolonsel', 'DORE MİMİ VİYOLONSEL'],
  ['cura', 'Cura', 'DORE MİMİ CURA'],
  ['fagot', 'Fagot', 'DORE MİMİ FAGOT'],
  ['flut', 'Flüt', 'DORE MİMİ FLÜT'],
  ['gitar', 'Gitar', 'DORE MİMİ GİTAR'],
  ['kabak-kemane', 'Kabak Kemane', 'DORE MİMİ KABAK KEMANE'],
  ['kanun', 'Kanun', 'Kanun'],
  ['keman', 'Keman', 'DORE MİMİ KEMAN'],
  ['kemence', 'Kemençe', 'DORE MİMİ KEMENÇE'],
  ['keytar', 'Keytar', 'DORE MİMİ KEYTAR'],
  ['klarinet', 'Klarinet', 'DORE MİMİ KLARİNET'],
  ['kontrabass', 'Kontrabas', 'DORE MİMİ KONTRABAS'],
  ['korno', 'Korno', 'DORE MİMİ KORNO'],
  ['ksilofon', 'Ksilofon', 'DORE MİMİ KSİLOFON'],
  ['kudum', 'Kudüm', 'DORE MİMİ KUDÜM'],
  ['lir', 'Lir', 'DORE MİMİ LİR'],
  ['mandolin', 'Mandolin', 'DORE MİMİ MANDOLİN'],
  ['melodika', 'Melodika', 'DORE MİMİ MELODİKA'],
  ['metronom', 'Ses (mezzosoprano)', 'DORE MİMİ METRONOM'],
  ['ney', 'Ney', 'DORE MIMI NEY'],
  ['obua', 'Obua', 'DORE MİMİ OBUA'],
  ['org', 'Org', 'DORE MİMİ ORG'],
  ['piyano', 'Piyano', 'DORE MİMİ PİYANO'],
  ['sipsi', 'Sipsi', 'DORE MİMİ SİPSİ'],
  ['tar', 'Tar', 'DORE MİMİ TAR'],
  ['timpani', 'Timpani', 'DORE MİMİ TİMPANİ'],
  ['trombon', 'Trombon', 'DORE MİMİ TROMBONE'],
  ['trompet', 'Trompet', 'DORE MİMİ TROMPET'],
  ['tuba', 'Tuba', 'DORE MİMİ TUBA'],
  ['tulum', 'Tulum', 'DORE MİMİ TULUM'],
  ['tumba', 'Kalimba', 'DORE MİMİ TUMBA'],
  ['ukulele', 'Ukulele', 'DORE MİMİ UKULELE'],
  ['ut', 'Ud', 'DORE MİMİ UD'],
  ['viyola', 'Viyola', 'DORE MİMİ VİYOLA'],
  ['yayli-tambur', 'Yaylı Tambur', 'DORE MİMİ YAYLI TAMBUR'],
  ['zurna', 'Zurna', 'DORE MİMİ ZURNA'],
].map(([slug, instrument, title]) => ({ slug, instrument, title }));

export const MANIFESTO = ['Müzik bir sanattır.', 'Müzik bir yöntemdir.', 'Müzik matematiktir.', 'Müzik kültürdür.', 'Müzik tarihtir.', 'Müzik iletişimdir.', 'Müzik bir ifade biçimidir.', 'Müzik insanları birleştirir.'];
export const VISION = 'Çocuklarımızı ve gençlerimizi müzikle tanıştırmak için etkinlik ve dikkat kitapları, konserler, oyunlar ve oyuncaklar hazırlıyoruz. Dore Mimi Gönüllüleri ile büyüyen bu yolculuk, “Si Bemol” ve “Mi Bemol” burslarıyla Dore Mimi Müzikle Değerler Eğitimi projesini destekleyecek.';
export const NEWS = 'Dore Mimi Yetenek ve Eğitim Vakfı kuruldu!';

export const CHARACTERS = [
  { name: 'Mimi', greeting: 'Merhaba, ben Mimi!', bio: "Müziğin içine doğdum ve müziği çok seviyorum. Annemle babam bir müzik müzesi kuruyor. En iyi arkadaşım Dore ile şarkılar söylüyor, maceramızı seninle paylaşmak istiyoruz.", instruments: 'Ses, şarkı ve yeni denediği her çalgı', trait: 'Meraklı · Hevesli · Öğrenmeyi seviyor', color: '#E5487A', image: 'mimi.png' },
  { name: 'Dore', greeting: 'Merhaba, ben Dore!', bio: "Mimi'nin en yakın arkadaşıyım. Ben ayaklı bir perküsyonum! Şapkamdaki zillerim, göbeğimdeki trampetim ya da davulumla Mimi'ye eşlik ediyorum. Müzik benim her şeyim.", instruments: 'Ziller, trampet, davul', trait: 'Tutkulu · Oyunbaz · Öğretmeyi seviyor', color: '#F07A12', image: 'dore.png' },
];

export const BOARD = [['Funda Özyurt Argun', 'Başkan'], ['Gözde Bayram', 'Başkan Yardımcısı'], ['Öykü Naz Şahin', 'Muhasip Üye'], ['Fatih Özen', 'Yönetim Kurulu Üyesi'], ['Vildan Birincioğlu', 'Yönetim Kurulu Üyesi']];
export const FOUNDERS = ['Funda Özyurt Argun', 'Gözde Bayram', 'Öykü Naz Şahin', 'M. Fatih Özen', 'Vildan Birincioğlu', 'Bahadır Emir İnan', 'Türkan Özyurt', 'Veli Kargın', 'Zeynep Kul Kargın', 'Rıza Uçak', 'Elçin Tenteriz', 'H. Emrah Birincioğlu', 'Oğulcan Gökalp', 'F. Meltem Özen', 'Rüzgar Özen', 'Ümit Orcan', 'İbrahim Erdem', 'Eray Ertürk', 'Borahan Mavi', 'Güngör Bahçacı', 'Hülya Bahçacı'];
export const TEAM = [['Funda Özyurt Argun', 'Proje Sihirbazı · Yazar / Şarkı Sözü Yazarı'], ['Gözde Bayram', 'Proje Koordinatörü'], ['Fatih Özen', 'Yayınlar Sorumlusu'], ['A. Onur Cengiz', 'Besteci'], ['Mehmet Eti', 'Besteci · Kontrabas'], ['Özgün Aksüyek', 'Eser Aranjeleri'], ['Utar Artun', 'Senfonik Aranjeler'], ['Özgür Cengiz', 'Animasyon Sorumlusu'], ['Bora Öztürk', '3D Animatör'], ['Çağla Nur Genç', 'Kitap Tasarım ve 2D Uygulamalar'], ['Yağmur Candar', 'Kitap Tasarım ve 2D Uygulamalar'], ['Tan Ünsalan', 'Kurgu'], ['Rüzgar Özen', 'Kurgu'], ['Endo Tercüme', 'Şarkı Çevirileri'], ['Vildan Birincioğlu', 'İngilizce Kitap Çevirisi'], ['Gizem Mühürcü', 'Fransızca Kitap Çevirisi']];
export const ADVISORS = ['Birgül Ünal', "Cemi'i Can Deliorman", 'Dinçer Özer', 'Erkan Tatoğlu', 'Nurten Korkut', 'Türkan Özyurt'];
export const PARTNERS = ['Kültür Bakanlığı', 'CSO Bant', 'Çoksesli', 'Kolhis Bant', 'DSA', 'Argun Hukuk', 'ETA', 'Kargın Hukuk'];
/*
 * DoremimiDirectory.Contacts. The app shows the phone numbers too; the demo does not, on purpose: the deck is shared
 * as a link, and a private person's mobile number or personal address does not belong on a public page. The rows keep
 * the title and the person, and only the foundation's own address is printed; the buttons ask the gate as in the app.
 */
export const CONTACTS = [['Genel Yetkili', 'Funda Özyurt', 'doremimitv@gmail.com'], ['Yayın İşleri', 'Fatih Özen', null], ['Organizasyon', 'Funda Özyurt', 'doremimitv@gmail.com']];

/** InMemoryContentCatalog.cs:72-110, the difficulty of each instrument question (Difficulty.DisplayName). */
export const DIFFICULTY = { 'guitar-family': 'Başlangıç Seviyesi', 'guitar-strings': 'Başlangıç Seviyesi', 'baglama-cura': 'Başlangıç Seviyesi', 'guitar-frets': 'Orta Seviye', 'baglama-technique': 'Orta Seviye', 'guitar-composer': 'İleri Seviye', 'violin-family': 'Başlangıç Seviyesi', 'violin-strings': 'Başlangıç Seviyesi', 'cello-posture': 'Başlangıç Seviyesi', 'bow-rosin': 'Orta Seviye', 'pizzicato': 'Orta Seviye', 'cello-role': 'Orta Seviye', 'violin-history': 'İleri Seviye', 'davul-tokmak': 'Başlangıç Seviyesi', 'davul-zurna': 'Başlangıç Seviyesi', 'tempo': 'Başlangıç Seviyesi', 'marimba-bars': 'Orta Seviye', 'marimba-rhythm': 'Orta Seviye', 'davul-culture': 'İleri Seviye', 'piano-colors': 'Başlangıç Seviyesi', 'piano-keys': 'Başlangıç Seviyesi', 'accordion-bellows': 'Başlangıç Seviyesi', 'piano-count': 'Orta Seviye', 'piano-pedal': 'Orta Seviye', 'accordion-compare': 'İleri Seviye', 'flute-air': 'Başlangıç Seviyesi', 'clarinet-reed': 'Başlangıç Seviyesi', 'ney-identity': 'Orta Seviye', 'clarinet-care': 'Orta Seviye', 'flute-woodwind': 'İleri Seviye', 'flute-notation': 'İleri Seviye' };

/**
 * ShellViewModel.cs:22-31 (GroupAccent): each instrument's group colour. Four of them moved in dossier ch. 14 §1
 * (data/content.js FAMILIES says why and what was measured).
 */
export const GROUP_COLORS = { 'Yaylı': '#C2379B', 'Telli': '#1E7A4C', 'Tuşlu': '#12B5C9', 'Nefesli': '#3E3A9E', 'Bakır nefesli': '#F6B53A', 'Vurmalı': '#7A5C4E', 'Diğer': '#6B6E85' };

/*
 * Doremimi/Accounts/LegalTexts.cs. Three sentences name the old paths through Daha fazla; with the navigation
 * revision they would send a parent to a tab that no longer exists, so they carry the PROPOSED rewrite of
 * dossier ch. 11 OC-27 (marked below). Everything else is the app's text.
 */
export const DRAFT_NOTE = 'Taslak metin: vakfın hukuk ekibi onaylayacak.';
const LOCAL = ['Veriler nerede tutulur?', 'Hesap bilgileri, çocuk profilleri ve oyun ilerlemesi yalnızca bu cihazda saklanır. Uygulama bu bilgileri hiçbir sunucuya göndermez. Şifre açık metin olarak tutulmaz; yalnızca tuzlanmış bir özeti (PBKDF2) saklanır.'];
const LINKS = ['Dış bağlantılar', "Uygulamadan web sitesine, YouTube'a ya da e-postaya giden her bağlantı önce ebeveyn sorusunu sorar. Bu siteler kendi gizlilik kurallarına tabidir."];
const DELETE = ['Verileri silmek', 'Profilim > Hesabım > Hesabı ve verileri sil ile hesap, tüm çocuk profilleri ve ilerleme bu cihazdan silinir. Uygulamayı kaldırmak da bu verileri siler.'];   // OC-27 PROPOSED path
export const LEGAL = {
  gizlilik: { title: 'Gizlilik politikası', draft: true, sections: [['Kısaca', 'Doremimi, 6-9 yaş çocukların müzik öğrenmesi için hazırlanmış bir uygulamadır. Reklam göstermez ve kişisel veri toplamaz.'], LOCAL, ['Toplanan bilgiler', 'Ebeveynin adı ve e-posta adresi, çocuğun takma adı, yaş aralığı ve seçtiği karakter. Çocuğun gerçek adı istenmez. Bu bilgiler cihazdan çıkmaz.'], LINKS, DELETE] },
  kosullar: { title: 'Kullanım koşulları', draft: true, sections: [['Kullanım', 'Uygulama ücretsizdir ve kişisel, eğitim amaçlı kullanım içindir. Hesabı bir ebeveyn ya da yasal temsilci oluşturur.'], ['İçerik', "Kartlar, karakterler, şarkılar ve görseller Dore Mimi Yetenek ve Eğitim Vakfı'na aittir; izinsiz çoğaltılamaz."], LINKS] },
  kvkk: { title: 'KVKK aydınlatma metni', draft: true, sections: [['Veri sorumlusu', 'Dore Mimi Yetenek ve Eğitim Vakfı.'], ['İşlenen veriler', 'Ebeveynin adı ve e-posta adresi; çocuğun takma adı, yaş aralığı, karakteri ve oyun ilerlemesi.'], ['Amaç', 'Uygulamanın çalışması: giriş yapmak, profiller arasında geçmek ve ilerlemeyi hatırlamak.'], LOCAL, ['Aktarım', 'Veriler üçüncü kişilere ya da yurt dışına aktarılmaz; bu sürümde hiçbir sunucuya gönderilmez.'], ['Haklarınız', "KVKK'nın 11. maddesindeki haklarınızı kullanmak için vakıfla iletişime geçebilirsiniz. Verilerin tamamını Hesabım'dan kendiniz silebilirsiniz."]] },
  yardim: { title: 'Yardım ve SSS', draft: false, sections: [['Oyuna nasıl başlarım?', "Keşfet'teki büyük OYNA düğmesine dokun. Kartı gör, cevabını yaz."],
    ['Kardeşim de oynayabilir mi?', 'Evet. Sağ üstteki karaktere dokun, Profilim\'deki "Kim oynuyor?" düğmesiyle profil ekle. Her çocuğun ilerlemesi ayrı tutulur.'],   // OC-27 PROPOSED path
    ['İnternet gerekiyor mu?', 'Oyun internetsiz çalışır. Videolar ve web sayfaları için internet gerekir.'],
    ['Şifremi unuttum.', 'Hesap yalnızca bu cihazda olduğu için şifre e-postayla sıfırlanamaz. Hesabı ve verileri silip yeniden oluşturabilirsin.'],
    ['Bir sorun mu var?', "Doremimi > İletişim'den bize yazabilirsin."]] },   // OC-27 PROPOSED path
};
