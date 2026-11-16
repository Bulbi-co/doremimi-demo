/*
 * The content the phone runs with, copied from the app at c33d9ff. Every string is verbatim from its source; the
 * source is named above each block. This is a hand copy until the exporter of dossier ch. 10 O-13 / AS-20 exists:
 * when it does, replace this file with its output and keep the shape.
 */
import { acceptedFor, clean, distinctByFold } from '../lib/answers.js';
import { DIFFICULTY } from './site.js';

/**
 * Doremimi.Core/Config/learning.json. downAfterStruggles is 4 since dossier ch. 14 (was 2): the owner found the game
 * moving the child down "too rapidly"; it now takes four struggles in a row in Keşfet's round, the only one that moves.
 */
export const LEARNING = {
  cardsPerRound: 6, choiceCount: 4, tilePrefillFraction: 0.2, comebackAfterCards: 2,
  ladder: { downAfterStruggles: 4, upFromSecAfterRight: 3, upFromCevirAfterBildim: 2 },
  xp: { typedFirstTry: 10, typedWithTiles: 6, pickedAfterTyping: 3, pickedFirstTry: 4, flippedKnew: 1, studiedCard: 3, watchedRiddle: 3, seenInstrument: 10 },
  levelBaseXp: 80, levelStepXp: 40, masteryMax: 3, masteredRecallDays: 2, dueAfterDays: [0, 1, 3, 7],
  roundStars: { twoAt: 0.5, threeAt: 0.85 }, resultConcepts: 3,
};

/** Doremimi/Assets/Content/catalog/signs.json: the categories that have a card (the "Ayrıldı" placeholders have none). */
export const SIGN_CATEGORIES = [
  { key: 'bemol', name: 'Bemol işareti', color: '#E8443A', meaning: 'SUS İŞARETİ / ES İŞARETİ' },
  { key: 'diyez', name: 'Diyez işareti', color: '#B8763E', meaning: 'Yarım ses tizleştirir (inceltir)' },
  { key: 'fa', name: 'Fa anahtarı', color: '#FF8A1E', meaning: 'Bas sesler · BABA SESLER' },
  { key: 'sol', name: 'Sol anahtarı', color: '#3DBE5C', meaning: 'İnce sesler', isSample: true },
  { key: 'naturel', name: 'Natürel işareti', color: '#2F8CFF', meaning: 'Notayı doğal hâline döndürür', isSample: true },
  { key: 'porte', name: 'Porte (dizek)', color: '#8A4FE0', meaning: 'Notaların yazıldığı beş çizgi', isSample: true },
  { key: 'cizgi', name: 'Bitiş çizgisi', color: '#4A4E57', meaning: 'Parçanın sonu', isSample: true },
];

/*
 * Doremimi/Assets/Content/catalog/signs.json cards. `difficulty` is ours (dossier ch. 14 §4, owner: "ours to decide"),
 * a content default the content team may change; the sign cards had none. `accepted` is what AcceptedAnswers.ForSigns derives (the name, the
 * team's list, then each form's key word when no other card could claim it), worked out by hand from
 * AcceptedAnswers.cs:85-98 because ForSigns needs every card at once and is not ported (ch. 10 P-03). UNVERIFIED
 * against the real export until O-13 exists.
 */
export const SIGN_CARDS = [
  { difficulty: 'orta', id: 'bemol', category: 'bemol', symbol: '♭', name: 'Bemol', accepted: ['Bemol', 'bemol işareti'], prompt: 'Bu işaretin adı ne?',
    definition: 'Bemol, yanına geldiği notayı yarım ses pesleştiren (kalınlaştıran) işarettir.',
    kids: 'Piyanodaki siyah tuşlar TAM SES notaların BEMOL ve DİYEZleridir. Notanın gerisinde yer alan siyah tuş o notanın BEMOL\'üdür.', kidsVisual: 'piano-flat' },
  { difficulty: 'orta', id: 'diyez', category: 'diyez', symbol: '♯', name: 'Diyez', accepted: ['Diyez', 'diyez işareti', 'diez'], prompt: 'Bu işaretin adı ne?',
    definition: 'Diyez, yanına geldiği notayı yarım ses tizleştiren (incelten) işarettir.',
    kids: 'Piyanodaki siyah tuşlar TAM SES notaların BEMOL ve DİYEZleridir. Notadan sonra yer alan siyah tuş o notanın DİYEZ\'idir.', kidsVisual: 'piano-sharp' },
  { difficulty: 'ileri', id: 'fa-anahtari', category: 'fa', symbol: '𝄢', name: 'Fa anahtarı', accepted: ['Fa anahtarı', 'fa'], prompt: 'Bu anahtarın adı ne?',
    definition: '5 çizgili portenin (dizek) 4. çizgisi üzerine konulan ve çizgiye adını veren anahtardır. Bas sesleri göstermeye yarar.',
    kids: 'Anne sesler vardır, baba sesler vardır. Bir de orta sesler vardır. Fa anahtarı BABA SESLERİ temsil eder.', kidsVisual: 'clef-face-fa' },
  { difficulty: 'baslangic', id: 'sol-anahtari', category: 'sol', symbol: '𝄞', name: 'Sol anahtarı', isSample: true, accepted: ['Sol anahtarı', 'sol'], prompt: 'Bu anahtarın adı ne?',
    definition: '5 çizgili portenin 2. çizgisi üzerine konulan ve çizgiye adını veren anahtardır. İnce (tiz) sesleri göstermeye yarar.',
    kids: 'Fa anahtarı baba sesleri gösterir; Sol anahtarı ise ANNE SESLERİ ve çocuk seslerini, yani ince sesleri temsil eder.', kidsVisual: 'clef-face-sol' },
  { difficulty: 'ileri', id: 'naturel', category: 'naturel', symbol: '♮', name: 'Natürel', isSample: true, accepted: ['Natürel', 'natürel işareti', 'bekar'], prompt: 'Bu işaretin adı ne?',
    definition: 'Natürel, diyez ya da bemolün etkisini kaldırarak notayı doğal hâline döndüren işarettir.',
    kids: 'Natürel bir silgi gibidir: diyezi ya da bemolü siler, nota kendi beyaz tuşuna geri döner.', kidsVisual: 'piano-natural' },
  { difficulty: 'baslangic', id: 'porte', category: 'porte', symbol: '𝄚', name: 'Porte', isSample: true, accepted: ['Porte', 'dizek'], prompt: 'Notaların yazıldığı bu beş çizginin adı ne?',
    definition: 'Porte (dizek), notaların yazıldığı beş çizgi ve dört aralıktan oluşan yapıdır.',
    kids: 'Porte notaların merdivenidir: notalar basamaklarda yukarı çıktıkça sesleri incelir, aşağı indikçe kalınlaşır.', kidsVisual: 'staff' },
  { difficulty: 'baslangic', id: 'bitis-cizgisi', category: 'cizgi', symbol: '𝄂', name: 'Bitiş çizgisi', isSample: true,
    accepted: ['Bitiş çizgisi', 'son çizgisi', 'çift çizgi', 'Bitiş', 'son', 'çift'], prompt: 'Parçanın sonunda görülen bu çizginin adı ne?',
    definition: 'Bitiş çizgisi, müzik parçasının sona erdiğini gösteren biri ince biri kalın iki dikey çizgidir.',
    kids: 'Bitiş çizgisi şarkının “son” yazısıdır: burada durur, alkışı bekleriz!', kidsVisual: 'barline' },
];

/*
 * Doremimi.Core/Domain/FamilyProfile.cs:20-40 and the family colours of Doremimi.Core/Config/tokens.json:10-16.
 *
 * Four family colours moved in dossier ch. 14 §1: Keşfet now shows the 7 sign categories and the 5 families in one
 * grid, and Telli sat on Bemol's red (CIEDE2000 ΔE 6.7), Vurmalı on Fa's orange (5.6), Yaylı on Porte's purple (8.4) and
 * Nefesli on Natürel's blue (5.8). Sign colours are content and stay; the families took the palette's free colours
 * (signs.json "Ayrıldı": magenta-mor, lacivert-mor, koyu yeşil, füme kahve). Which family wears which is the app's
 * (tokens.json at 08f8cd3: Telli magenta, Yaylı indigo, Nefesli green, Vurmalı brown). The demo first gave the same
 * four to the wrong families (Telli green, Yaylı magenta, Nefesli indigo), so the phone in the deck disagreed with
 * the phone in the testers' hands; tests/app-parity.test.mjs now reads the app's files and fails on that.
 * Measured with tests/ch14.test.mjs: every family against every other Keşfet category ≥ 16.4 (Yaylı–Porte), the
 * 7 directory groups ≥ 20.4 (Vurmalı–Diğer), the same as the app's FamilyColourTests. Diyez–Fa is 14.6, a sign pair,
 * content, out of this change's reach. Keep GROUP_COLORS (data/site.js) and the family badges below in step.
 */
export const FAMILIES = {
  TelliCalgilar: { name: 'Telli Çalgılar', color: '#C2379B', art: 'strings', description: 'Parmak ya da mızrap teli titreştirir, ses gövdede büyür. Bağlamanın ezgisinden gitarın akorlarına kadar sahnenin en tanıdık sesleri bu ailede.' },
  YayliCalgilar: { name: 'Yaylı Çalgılar', color: '#3E3A9E', art: 'bowed', description: 'Yay tele sürtündükçe ses uzar, büyür, incelir. Bir notayı istediği kadar taşıyabilen bu aile, orkestranın şarkı söyleyen kalbidir.' },
  VurmaliCalgilar: { name: 'Vurmalı Çalgılar', color: '#7A5C4E', art: 'percussion', description: 'Tokmak, baget ya da el vurur; ritim doğar. Bu aile oyunun temposunu belirler ve herkesi aynı adımda buluşturur.' },
  TusluCalgilar: { name: 'Tuşlu Çalgılar', color: '#12B5C9', art: 'keys', description: 'Bir tuşa basmak içeride koca bir mekanizmayı uyandırır. Aynı anda birçok nota çalabilen bu aile, akorlarla sahneyi inşa eder.' },
  NefesliUflemeliCalgilar: { name: 'Nefesli Çalgılar', color: '#1E7A4C', art: 'wind', description: 'Nefes; kamış, ağızlık ya da bir delikle şekillenir ve havada şarkıya dönüşür. Bu aile en hafif fısıltıdan en parlak çağrıya kadar uzanır.' },
};

/*
 * Doremimi.Core/Content/InMemoryContentCatalog.cs:51-58, with the summary DoremimiDirectory.cs gives the same name
 * (QuestionDeck.SummaryOf); Davul, Marimba and Klarnet have none there, so their row is left out, as in the app.
 */
export const INSTRUMENTS = {
  guitar: { name: 'Gitar', family: 'TelliCalgilar', summary: 'Altı telli, perdeli bir çalgı. Parmakla ya da penayla çalınır; hem akor hem melodi çalabilir.' },
  baglama: { name: 'Bağlama', family: 'TelliCalgilar', summary: 'Türk halk müziğinin temel çalgısı. Uzun sapı ve mızrapla çalınan telleriyle tanınır.' },
  violin: { name: 'Keman', family: 'YayliCalgilar', summary: 'Yaylı çalgı ailesinin en küçük ve en ince sesli üyesi. Dört teli vardır ve çenenin altında tutularak yayla çalınır.' },
  cello: { name: 'Viyolonsel', family: 'YayliCalgilar', summary: 'Çello olarak da bilinir. Oturarak, iki diz arasında ve yere dayanan bir uç üzerinde çalınır.' },
  davul: { name: 'Davul', family: 'VurmaliCalgilar', summary: null },
  marimba: { name: 'Marimba', family: 'VurmaliCalgilar', summary: null },
  piano: { name: 'Piyano', family: 'TusluCalgilar', summary: 'Tuşa basınca keçeli çekiçler tellere vurur. Standart bir piyanoda 88 tuş vardır.' },
  accordion: { name: 'Akordeon', family: 'TusluCalgilar', summary: 'Körükle hava pompalanarak çalınır. Bir tarafta tuşlar, diğer tarafta bas düğmeleri bulunur.' },
  flute: { name: 'Flüt', family: 'NefesliUflemeliCalgilar', summary: 'Yandan tutularak çalınan, metal gövdeli bir nefesli. Ses, ağızlık deliğine üflenen havayla oluşur.' },
  clarinet: { name: 'Klarnet', family: 'NefesliUflemeliCalgilar', summary: null },
  ney: { name: 'Ney', family: 'NefesliUflemeliCalgilar', summary: 'Kamıştan yapılan, Türk müziğinin en eski nefeslilerinden. Ney çalınmaz, üflenir.' },
};

/** Doremimi.Core/Content/InMemoryContentCatalog.cs:72-110: [key, question, tip, answer, archetype, instrument]. */
export const QUIZ = [
  ['guitar-family', 'Gitar hangi çalgı ailesindedir?', 'Sesi, titreşen teller üretir.', 'Telli çalgılar.', 'InstrumentFamily', 'guitar'],
  ['guitar-strings', 'Klasik bir gitarda kaç tel bulunur?', 'Bir elin parmak sayısından bir fazla.', 'Altı tel.', 'InstrumentAnatomy', 'guitar'],
  ['baglama-cura', 'Bağlama ailesinin en küçük ve en ince sesli üyesinin adı nedir?', 'Adı “c” harfiyle başlar, dört harflidir.', 'Cura.', 'InstrumentIdentity', 'baglama'],
  ['guitar-frets', 'Gitarın sapındaki ince metal çizgilere ne ad verilir?', 'Notayı değiştirmek için parmağını bunların arasına basarsın.', 'Perde.', 'InstrumentAnatomy', 'guitar'],
  ['baglama-technique', 'Bağlamada mızrabın görevi nedir?', 'Telin titreşmesini o başlatır.', 'Telleri kontrollü biçimde titreştirmek.', 'PlayingTechnique', 'baglama'],
  ['guitar-composer', 'Bir besteci gitar için yazarken hangi sınırları düşünmelidir?', 'Her telin ulaşabildiği notalar farklıdır.', 'Tel düzenini, elin erişebildiği aralığı ve aynı anda çalınabilecek ses sayısını.', 'ComposerConnection', 'guitar'],
  ['violin-family', 'Keman hangi çalgı ailesindedir?', 'Ses çoğunlukla bir yayla elde edilir.', 'Yaylı çalgılar.', 'InstrumentFamily', 'violin'],
  ['violin-strings', 'Kemanın kaç teli vardır?', 'Gitardan iki eksik.', 'Dört tel.', 'InstrumentAnatomy', 'violin'],
  ['cello-posture', 'Viyolonsel çalınırken nasıl tutulur?', 'Omuza sığmayacak kadar büyüktür.', 'Oturarak, iki dizin arasında; ucundaki metal çubuk yere dayanır.', 'PlayingTechnique', 'cello'],
  ['bow-rosin', 'Yayın kıllarına sürülen reçine ne işe yarar?', 'Kıllar kaygan olursa tel titreşmez.', 'Kılların tele tutunmasını sağlar, böylece tel titreşip ses verir.', 'InstrumentCare', 'violin'],
  ['pizzicato', 'Yaylı çalgılarda teli yay yerine parmakla çekerek çalmaya ne denir?', 'İtalyanca bir terimdir, “p” harfiyle başlar.', 'Pizzicato.', 'PlayingTechnique', 'violin'],
  ['cello-role', 'Viyolonsel bir toplulukta hangi ses alanını destekler?', 'Kemandan daha kalın sesli olduğunu düşün.', 'Orta-kalın ve kalın sesleri; armonik temeli destekler.', 'EnsembleRole', 'cello'],
  ['violin-history', 'Keman ailesinin orkestrada gelişmesi müziğe ne kazandırdı?', 'Yaylıların geniş ses aralığını düşün.', 'Melodik ifadeyi ve çok sesli yazım olanaklarını genişletti.', 'InstrumentHistory', 'violin'],
  ['davul-tokmak', 'Davul çalarken kullanılan kalın, başı yuvarlak sopaya ne ad verilir?', 'Diğer elde ince bir çubuk bulunur.', 'Tokmak.', 'InstrumentAnatomy', 'davul'],
  ['davul-zurna', 'Davul geleneksel olarak hangi nefesli çalgıyla birlikte çalınır?', 'Düğünlerde ve şenliklerde bu ikili hep birlikte duyulur.', 'Zurna.', 'MusicalCulture', 'davul'],
  ['tempo', 'Bir şarkının hızına müzikte ne ad verilir?', '“T” harfiyle başlar; metronom bunu ölçer.', 'Tempo.', 'Rhythm', 'davul'],
  ['marimba-bars', 'Marimbanın ses çubukları hangi malzemeden yapılır?', 'Ağaçtan gelir.', 'Ahşaptan; altlarındaki borular sesi güçlendirir.', 'InstrumentAnatomy', 'marimba'],
  ['marimba-rhythm', 'Marimbada net bir ritim için hangi beceri gerekir?', 'Vuruşların eşit olmasını düşün.', 'Tutarlı vuruş yüksekliği ve zamanlama.', 'Rhythm', 'marimba'],
  ['davul-culture', 'Davulun görevi neden topluluktan topluluğa değişebilir?', 'Müzik, yaşandığı ortamla anlam kazanır.', 'Tören, dans, haberleşme ve kutlama gibi işlevler kültüre göre değişir.', 'MusicalCulture', 'davul'],
  ['piano-colors', 'Piyanoda hangi renklerde tuşlar vardır?', 'Bir zebrayı düşün.', 'Beyaz ve siyah tuşlar.', 'InstrumentIdentity', 'piano'],
  ['piano-keys', 'Piyanoda ses nasıl çıkar?', 'Tuşa basınca içeride bir mekanizma hareket eder.', 'Tuşun harekete geçirdiği küçük çekiçler tellere vurur.', 'InstrumentAnatomy', 'piano'],
  ['accordion-bellows', 'Akordeonda sesi çıkaran havayı hangi parça pompalar?', 'Açılıp kapanan bir akciğer gibidir.', 'Körük.', 'InstrumentAnatomy', 'accordion'],
  ['piano-count', 'Standart bir piyanoda kaç tuş bulunur?', '80’den fazla, 90’dan az.', '88 tuş.', 'InstrumentAnatomy', 'piano'],
  ['piano-pedal', 'Piyanonun sağ pedalına basınca ne olur?', 'Sesler hemen susmaz.', 'Teller serbest kalır; sesler uzayıp birbirine karışır.', 'PlayingTechnique', 'piano'],
  ['accordion-compare', 'Akordeon ile piyano arasındaki temel ses farkı nedir?', 'Birinde körük vardır.', 'Akordeon körükle hava akışı kullanır; piyanoda çekiçler tellere vurur.', 'CompareAndContrast', 'accordion'],
  ['flute-air', 'Flütte sesi başlatan temel şey nedir?', 'Nefesin yolunu düşün.', 'Kontrollü hava akışı ve doğru dudak konumu.', 'PlayingTechnique', 'flute'],
  ['clarinet-reed', 'Klarnetin ağızlığına bağlı, titreşen ince parçaya ne denir?', 'Bir bitkiden yapılır.', 'Kamış.', 'InstrumentAnatomy', 'clarinet'],
  ['ney-identity', 'Kamıştan yapılan, Türk müziğinin en eski nefeslilerinden biri hangisidir?', 'Adı üç harflidir.', 'Ney.', 'InstrumentIdentity', 'ney'],
  ['clarinet-care', 'Klarnetin kamışı neden özen ister?', 'Titreşen parça kamıştır.', 'Sesin tepkisini ve ton kalitesini doğrudan etkiler.', 'InstrumentCare', 'clarinet'],
  ['flute-woodwind', 'Modern flüt metalden yapılır; yine de neden tahta nefesliler arasında sayılır?', 'İlk flütlere bak.', 'İlk flütler tahtadan yapıldığı ve sesi dudak titreşimiyle değil hava akışıyla oluştuğu için.', 'InstrumentHistory', 'flute'],
  ['flute-notation', 'Flütte uzun bir müzik cümlesinde nefes işaretleri neyi planlar?', 'Çalan kişinin nefesi tükenmemeli.', 'Nerede nefes alınacağını ve müzikal ifadenin nasıl süreceğini.', 'NoteReading', 'flute'],
];

/**
 * ConceptCatalog.FirstSentence: up to the first full stop that ends a sentence. A full stop after a digit is the Turkish
 * ordinal ("4." is "fourth"), not an end: cut there, Fa anahtarı's fact in Konu seç ended on "(dizek) 4.".
 */
export const firstSentence = t => {
  if (!t || !t.trim()) return null;
  const s = t.trim();
  for (let e = s.indexOf('. '); e >= 0; e = s.indexOf('. ', e + 1)) if (e === 0 || !/\d/.test(s[e - 1])) return s.slice(0, e + 1);
  return s;
};

/** The catalogue's labels (InMemoryContentCatalog.cs:65-67, data/site.js DIFFICULTY) as lib/modes.js DIFFICULTIES keys. */
export const LEVEL_OF = { 'Başlangıç Seviyesi': 'baslangic', 'Orta Seviye': 'orta', 'İleri Seviye': 'ileri' };

/**
 * QuestionDeck.From (QuestionDeck.cs:45-85): one list of questions, signs then instrument questions. A function of its
 * content so ./localise.js builds the English and French decks the same way; `acceptedOf` gives each instrument
 * question's accepted answers (Turkish derives them, AcceptedAnswers.For; the other languages list theirs).
 */
export function questionsOf({ signCards, signCategories, quiz, instruments, families, acceptedOf }) {
  return [
    ...signCards.map(card => {
      const category = signCategories.find(c => c.key === card.category);
      return {
        id: 'sign:' + card.id, kind: 'sign', conceptIds: ['signcat:' + category.key], prompt: card.prompt, symbol: card.symbol,
        answer: card.name, accepted: distinctByFold(card.accepted), distractorGroup: 'sign', fallbackGroup: null,
        explanation: { definition: card.definition, kids: card.kids, kidsVisual: card.kidsVisual }, accent: category.color,
        difficulty: card.difficulty,
      };
    }),
    ...quiz.map(([key, question, tip, answer, archetype, instrumentKey]) => {
      const instrument = instruments[instrumentKey];
      const family = families[instrument.family];
      return {
        id: 'q:' + key, kind: 'quiz', conceptIds: ['family:' + instrument.family, 'instrument:' + instrumentKey], prompt: question, symbol: null,
        answer: clean(answer), accepted: acceptedOf(key, answer), distractorGroup: 'archetype:' + archetype, fallbackGroup: 'family:' + instrument.family,
        explanation: { tip, instrumentSummary: instrument.summary, familyDescription: family.description }, accent: family.color,
        difficulty: LEVEL_OF[DIFFICULTY[key]],
      };
    }),
  ];
}
export const QUESTIONS = questionsOf({ signCards: SIGN_CARDS, signCategories: SIGN_CATEGORIES, quiz: QUIZ, instruments: INSTRUMENTS, families: FAMILIES, acceptedOf: (key, answer) => acceptedFor(answer) });

/** ConceptCatalog.From (ConceptCatalog.cs): name, one-line fact and colour of every concept. */
export function conceptsOf({ signCategories, signCards, families, instruments }) {
  return Object.fromEntries([
    ...signCategories.map(c => { const card = signCards.find(k => k.category === c.key); return ['signcat:' + c.key, { name: c.name, fact: firstSentence(card.definition) ?? c.meaning, color: c.color, symbol: card.symbol }]; }),
    ...Object.entries(families).map(([k, f]) => ['family:' + k, { name: f.name, fact: firstSentence(f.description), color: f.color, family: k }]),
    ...Object.entries(instruments).map(([k, i]) => ['instrument:' + k, { name: i.name, fact: firstSentence(i.summary) ?? firstSentence(families[i.family].description), color: families[i.family].color, family: i.family }]),
  ]);
}
export const CONCEPTS = conceptsOf({ signCategories: SIGN_CATEGORIES, signCards: SIGN_CARDS, families: FAMILIES, instruments: INSTRUMENTS });

/**
 * Doremimi/Assets/Content/catalog/badges.json. Two names changed in dossier ch. 14 §2 because they named a level
 * ("Yazma Zirvesi", "Çevir Kahramanı"); their ids did not, so a badge already earned stays earned.
 */
export const BADGES = [
  { id: 'ilk-nota', name: 'İlk Nota', description: 'İlk kartını oynadın. Müzik yolculuğun başladı!', artKey: 'icon:IconNote', color: '#1C6FAA', rule: { kind: 'CardsPlayed', count: 1 }, sortOrder: 1 },
  { id: 'bemol-avcisi', name: 'Bemol Avcısı', description: 'Bemolü tanıdın: notayı yarım ses kalınlaştıran işaret.', artKey: 'sign:bemol', color: '#E8443A', rule: { kind: 'LearnQuestions', count: 1 }, conceptId: 'signcat:bemol', sortOrder: 2 },
  { id: 'diyez-dedektifi', name: 'Diyez Dedektifi', description: 'Diyezi buldun: notayı yarım ses incelten işaret.', artKey: 'sign:diyez', color: '#B8763E', rule: { kind: 'LearnQuestions', count: 1 }, conceptId: 'signcat:diyez', sortOrder: 3 },
  { id: 'baba-sesler', name: 'Baba Sesler Bilgini', description: 'Fa anahtarını tanıdın: kalın, baba sesleri gösterir.', artKey: 'sign:fa-anahtari', color: '#FF8A1E', rule: { kind: 'LearnQuestions', count: 1 }, conceptId: 'signcat:fa', sortOrder: 4 },
  { id: 'sol-anahtari-ustasi', name: 'Sol Anahtarı Ustası', description: 'Sol anahtarını iki farklı günde ilk denemede yazdın.', artKey: 'sign:sol-anahtari', color: '#3DBE5C', rule: { kind: 'MasterQuestions', count: 1 }, conceptId: 'signcat:sol', sortOrder: 5 },
  { id: 'telli-kasif', name: 'Telli Kaşif', description: 'Telli çalgılarla ilgili 3 soruyu öğrendin.', artKey: 'family:TelliCalgilar', color: '#C2379B', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:TelliCalgilar', sortOrder: 6 },
  { id: 'yayli-sarkici', name: 'Yaylı Şarkıcı', description: 'Yaylı çalgılarla ilgili 3 soruyu öğrendin.', artKey: 'family:YayliCalgilar', color: '#3E3A9E', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:YayliCalgilar', sortOrder: 7 },
  { id: 'vurmali-ritimci', name: 'Vurmalı Ritimci', description: 'Vurmalı çalgılarla ilgili 3 soruyu öğrendin.', artKey: 'family:VurmaliCalgilar', color: '#7A5C4E', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:VurmaliCalgilar', sortOrder: 8 },
  { id: 'tuslu-mimar', name: 'Tuşlu Mimar', description: 'Tuşlu çalgılarla ilgili 3 soruyu öğrendin.', artKey: 'family:TusluCalgilar', color: '#12B5C9', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:TusluCalgilar', sortOrder: 9 },
  { id: 'nefes-gezgini', name: 'Nefes Gezgini', description: 'Nefesli çalgılarla ilgili 3 soruyu öğrendin.', artKey: 'family:NefesliUflemeliCalgilar', color: '#1E7A4C', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:NefesliUflemeliCalgilar', sortOrder: 10 },
  { id: 'aile-gezgini', name: 'Orkestra Gezgini', description: 'Beş çalgı ailesinin hepsinden bir soru oynadın.', artKey: 'icon:IconCards', color: '#14107A', rule: { kind: 'TryEveryFamily', count: 0 }, sortOrder: 11 },
  { id: 'harf-ustasi', name: 'Harf Ustası', description: 'Bir turda 5 cevabı ilk denemede yazdın.', artKey: 'icon:IconPencil', color: '#2B9BFF', rule: { kind: 'TypedFirstTryInRound', count: 5 }, sortOrder: 12 },
  { id: 'yazma-zirvesi', name: 'Zirve', description: 'Zorlandın ama yine en üste tırmandın!', artKey: 'icon:IconStar', color: '#E0109E', rule: { kind: 'ClimbToLevel', level: 'Yaz' }, sortOrder: 13 },
  { id: 'cevir-kahramani', name: 'Kart Kahramanı', description: 'Kartları çevirip üç kez "Bildim" dedin.', artKey: 'icon:IconReplay', color: '#1C6FAA', rule: { kind: 'FlipKnew', count: 3 }, sortOrder: 14 },
  { id: 'uc-gun-muzik', name: 'Müzik Dostu', description: 'Üç farklı günde müzik oynadın.', artKey: 'icon:IconHeart', color: '#E85BE6', rule: { kind: 'PlayDays', count: 3 }, sortOrder: 15 },
];

/** Doremimi/ViewModels/ShellViewModel.cs:311-315 */
export const BANNERS = [
  { title: 'Müzik Kart Oyunu', subtitle: 'Bemol mü, diyez mi? Kartı gör, cevabı yaz!', badge: 'YENİ OYUN', accent: '#E0109E', image: 'game.png', action: 'game' },
  { title: 'Dore ve Mimi', subtitle: 'Müziğin içine doğan Mimi ve ayaklı perküsyon Dore ile tanış.', badge: 'KARAKTERLER', accent: '#1C6FAA', image: 'characters.png', action: 'page' },
  { title: 'Bilmece videoları', subtitle: 'Dore soruyor: bu hangi çalgı? 23 video bilmece seni bekliyor.', badge: 'İZLE', accent: '#14107A', image: 'riddles.png', action: 'videos' },
  { title: 'Vakfımız kuruldu!', subtitle: 'Dore Mimi Yetenek ve Eğitim Vakfı: burslar, gönüllüler ve daha fazlası.', badge: 'DUYURU', accent: '#2B9BFF', image: 'foundation.png', action: 'page' },
  // Navigation revision (dossier ch. 11 OC-21, PROPOSED): the banner now opens the hub's Kitaplar ve notalar page,
  // and the lyrics live in Çal, so the subtitle drops "şarkı sözleri". The targets are BANNER_GO in app.js.
  { title: 'Kitaplar ve notalar', subtitle: 'İlkokul ve ortaokul kitapları, metodlar ve notalar.', badge: 'KİTAPLIK', accent: '#FF4D00', image: 'books.png', action: 'library' },
];

/** Doremimi/Controls/CharacterStage.cs:24-25 */
export const LINES = {
  dore: ['Ritim bende!', 'Davulum hazır!', 'Hadi oynayalım!', 'Bir nota daha?', 'Bemol mü diyez mi?'],
  mimi: ['Merhaba, ben Mimi!', 'Müzik her yerde!', 'Cevabı yazalım!', 'Sen harikasın!', 'Şarkı söyleyelim mi?'],
};

/*
 * "Nasıl oynanır?", rewritten in dossier ch. 14 §4 without the three level names (it was "1 · YAZ", "2 · SEÇ",
 * "3 · ÇEVİR"). The first game puts one more page before these: the child's level (lib/modes.js DIFFICULTIES).
 */
export const LEVEL_QUESTION = 'Hangi seviyeden başlayalım?';
export const INTRO_STEPS = [
  { key: 'see', title: 'Kartı gör', text: 'Kartta bir müzik işareti ya da bir çalgı sorusu var.', accent: '#2B9BFF' },
  { key: 'find', title: 'Cevabı bul', text: 'Cevabı yazarsın, seçersin ya da kartı çevirip okursun: kart sana nasıl yapacağını gösterir.', accent: '#E0109E' },
  { key: 'stars', title: 'Yıldız topla', text: 'Doğru cevaplar XP ve yıldız getirir. Yanlış cevap hiçbir şey kaybettirmez.', accent: '#FFCC00' },
];

/**
 * The fixed "Sunum destesi" of dossier ch. 10 part 5 (G-05): six real questions in a fixed order, so the deck's
 * scripted presses meet the card they expect. Only the order is fixed; the rules that follow are the real ones.
 */
export const SUNUM_DECK = ['sign:fa-anahtari', 'sign:diyez', 'sign:bemol', 'q:guitar-family', 'q:violin-family', 'q:guitar-strings'];
