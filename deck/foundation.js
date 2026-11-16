/*
 * "Dore Mimi, bugüne kadar": the deck's opening section, right after the cover and before the app is shown (owner,
 * 2026-11-16; dossier ch. 14 §13). It states what the Dore Mimi foundation has already done, to the foundation.
 *
 * The rules of this file come from the research the facts were taken from (doremimi-superapp
 * content/doremimi-research: DEMO-INTEGRATION.md, CAVEATS.md):
 *
 *   - Achievements only. No praise, no thanks, no adjective about the work: the audience is the people who did it.
 *   - Every number comes from deck/foundation-facts.js (generated from facts.json), never from memory.
 *   - A concert date is a listing, a poster or a season announcement, so the slides give the date and the hall and
 *     never say it took place; the 2020 dates were postponed and are in the notes only.
 *   - The channel's subscriber, view and video counts move daily: they are not here.
 *   - No publisher on the books slide (only the study's table names one), no founding date (the site gives none), no
 *     partner's role, nothing from the study but that it exists, no phone number, no e-mail address.
 *   - Where each fact comes from is in the presenter notes ("Kaynak: …"), one line per fact, not on the slide.
 *
 * tests/foundation.test.mjs holds them: every integer against the snapshot, the banned words, the section's place,
 * the step's route, each listing's time and hall inside its fact's sentence. What it cannot hold is judgement (a new
 * sentence that implies a concert took place, a partner's role): read CAVEATS.md before adding a line.
 *
 * It imports nothing from ../app and nothing from slides.js (which imports this), so it can be read on its own.
 */
import { FACTS } from './foundation-facts.js';

const num = key => FACTS.numbers.find(n => n.key === key);
const N = Object.fromEntries(FACTS.numbers.map(n => [n.key, n.value]));
const when = date => FACTS.timeline.find(t => t.date === date);

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
/** A facts.json date as the slides print it: "2021-12-26", "2023-03-22/24" (a span of days) or a bare "2021". */
export function parts(date) {
  const [, y, m, d, to] = /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:\/(\d{2}))?)?)?$/.exec(date);
  return { year: y, month: m ? MONTHS[Number(m) - 1] : null, day: d ? (to ? `${Number(d)}–${Number(to)}` : String(Number(d))) : null };
}
const full = (date, { day = true } = {}) => { const p = parts(date); return [day ? p.day : null, p.month, p.year].filter(Boolean).join(' '); };

/*
 * What a source is called in the notes. Names only: a date typed here would be a number no fact carries. The ids are
 * the research's (sources.json); deck/foundation-facts.js has each one's URL for whoever asks.
 */
export const SOURCE_TR = {
  S7: 'CSO Ada Ankara etkinlik sayfası',
  S8: 'Biletinial etkinlik sayfası',
  S9: 'Hürriyet',
  S10: 'Sanattan Yansımalar',
  S11: 'Mavi Nota’da yayımlanan CSO sezon duyurusu',
  S12: 'DHA',
  S13: 'Ticari Hayat',
  S14: `Polat ve Sever, ${FACTS.research.study.journalTr}`,
  S15: 'idefix ürün sayfası',
  S16: `YouTube, @DoreMimi kanal sayfası (${full(FACTS.asOf)} tarihinde okundu)`,
  // The counts are of the site as it was mirrored; that day is inside the research's own wording of "computed".
  S17: `doremimi.org sayfalarından sayıldı (${full(/\d{4}-\d{2}-\d{2}/.exec(FACTS.statuses.computed)[0])} kopyası)`,
  A2: 'afişin üzerindeki tarih ve salon',
};
const kaynak = ids => `<i>Kaynak: ${ids.map(id => SOURCE_TR[id]).join('; ')}.</i>`;
const line = (head, body, ids) => `<p><b>${head}</b> ${body ? body + ' ' : ''}${kaynak(ids)}</p>`;

/*
 * The timeline's markers: which facts.json `timeline` entries the first slide shows, and the few words each gets.
 * Two entries are left out on purpose: the November 2020 concerts (postponed, so not something that was done) and the
 * Hürriyet report of February 2021 (a report of plans). Both are in the CSO slide's notes for the presenter.
 */
export const MARKERS = [
  { date: '2019-01-22', text: 'YouTube kanalı açıldı' },
  // The date is the report's (18 November), not the day the section went up, so only the month is shown.
  { date: '2020-11-18', day: false, text: 'CSO’nun sitesinde “CSO Çocuk” bölümü' },
  { date: '2021', text: `${N.books} kitaplık seri basıldı` },
  { date: '2021-12-26', text: '“Dore Mimi CSO’da”, CSO Ada Ankara' },
  { date: '2022-02-21', text: '“Dore Mimi CSO’da”, CSO Tarihi Salon' },
  { date: '2023-03-22/24', text: 'CSO Çocuk Konserleri' },
  { date: '2024', text: 'Seri, Buca Eğitim Fakültesi Dergisi’nde incelendi' },
  { date: '2026-01-19', text: 'Dore Mimi Ritim Atölyesi, CSO Ada Ankara' },
];
const years = [...new Set(MARKERS.map(m => parts(m.date).year))];
const dayMonth = m => { const p = parts(m.date); return [m.day === false ? null : p.day, p.month].filter(Boolean).join(' '); };
const timeline = `<ol class="fnd-line">${years.map(y => `<li><b class="fnd-y">${y}</b>${MARKERS.filter(m => parts(m.date).year === y).map(m =>
  `<span class="fnd-ev">${dayMonth(m) ? `<i>${dayMonth(m)}</i>` : ''}${m.text}</span>`).join('')}</li>`).join('')}</ol>`;

/*
 * The CSO slide's rows. `time` and `where` are typed here because facts.json has them only inside each entry's
 * sentence (tests/foundation.test.mjs checks the same words are there). The March 2023 row names no hall: the source gives
 * one for the 22nd and 23rd only.
 */
export const LISTINGS = [
  { date: '2021-12-26', time: '15.00', where: ['CSO Ada Ankara', 'Ziraat Bankası Ana Salon'] },
  { date: '2022-02-21', time: '14.30', where: ['CSO Tarihi Salon'] },
  { date: '2023-03-22/24', where: ['CSO Çocuk Konserleri'] },
  { date: '2026-01-19', where: ['Dore Mimi Ritim Atölyesi', 'CSO Ada Ankara'] },
];
const listings = `<ul class="fnd-rows">${LISTINGS.map(l => `<li><b>${full(l.date)}</b><span>${[l.time, ...l.where].filter(Boolean).join(' · ')}</span></li>`).join('')}</ul>`;

const SECTION = 'Dore Mimi, bugüne kadar';
const head = (eyebrow, title, lead, wide = false) => `
  <span class="fnd-eyebrow">${eyebrow}</span>
  <h1 class="title tour">${title}</h1>
  <p class="lead${wide ? ' fnd-wide' : ''}">${lead}</p>`;
// A third-party picture carries its credit beside it, small: the repo is public and the picture is not ours.
const figure = (cls, file, alt, credit) => `<figure class="fnd-fig ${cls}"><img src="assets/foundation/${file}" alt="${alt}"><figcaption>${credit}</figcaption></figure>`;
const ages = FACTS.concerts.ages.replace('-', '–');

export const FOUNDATION_SLIDES = [
  {
    id: 'bugune-kadar', label: 'Bugüne kadar', theme: 'dark', layout: 'full',
    html: `${head(FACTS.foundation.nameTr, 'Dore Mimi, <em>bugüne kadar</em>',
      `${N.books} kitaplık seri, ${FACTS.concerts.orchestraTr} ile interaktif eğitim konserleri, ${N.riddles} çalgı için bilmece ve sitede ${N.siteVideos} video.`, true)}
      ${timeline}`,
    notes: `<p><b>Uygulamadan önce: vakfın bugüne kadar yaptıkları.</b> Slayttaki her tarih ve sayı bir kaynağa dayanıyor; kaynaklar aşağıda, satır satır.</p>
      ${MARKERS.map(m => line(full(m.date, { day: m.day !== false }) + ':', m.text + '.', when(m.date).src)).join('')}
      <p>Vakfın kuruluş tarihi slaytta yok: sitede “kuruldu” yazıyor, tarih verilmiyor.</p>`,
  },
  {
    id: 'bugune-kitaplar', label: 'Kitap serisi', theme: 'dark', layout: 'full',
    html: `<div class="fnd-two"><div>${head(SECTION, `${N.books} kitap,<br><em>${FACTS.books.titlesTr.length} çalgı.</em>`,
      `${FACTS.books.seriesTr} (${FACTS.books.author}, ${FACTS.books.year}): okul öncesi ve 1. sınıf için; karekodlar çalgıya özel etkinliklere ve bestelere götürür.`)}
      <ul class="fnd-books">${FACTS.books.titlesTr.map(([, instrument, subtitle]) => `<li><b>${instrument}</b><span>${subtitle}</span></li>`).join('')}</ul></div>
      ${figure('fnd-set', 'kitap-seti.jpg', 'Serinin on kitabının kapakları', 'Görsel: idefix.com')}</div>`,
    notes: `${line(`${num('books').tr}.`, `Yazar ${FACTS.books.author}, basım ${FACTS.books.year}.`, ['S14', 'S15'])}
      ${line('Kitap adları:', 'çalışmanın tablosundaki yazımla, her kitap bir çalgı.', ['S14'])}
      ${line(`${FACTS.books.audienceTr}:`, 'karekodlar çalgıya özel etkinliklere ve çalgılar için hazırlanan bestelere götürür.', ['S15'])}
      <p><b>Görsel:</b> on kapağın idefix.com’daki ürün fotoğrafı. Vakıf kendi kapak görsellerini gönderirse değiştirilecek.</p>
      <p>Slaytta yayınevi yok: yalnızca çalışmanın tablosunda geçiyor, vakfa sorulacak. Çalışmanın bulgularından söz etmeyin; yalnızca serinin incelendiği söylenir.</p>`,
  },
  {
    id: 'bugune-cso', label: 'CSO', theme: 'dark', layout: 'full',
    html: `<div class="fnd-two"><div>${head(SECTION, 'Dore Mimi <em>CSO’da</em>',
      `${FACTS.concerts.orchestraTr} ile ${ages} yaş için ${FACTS.concerts.kindTr.toLocaleLowerCase('tr')}.`)}
      ${listings}</div>
      ${figure('fnd-poster', 'cso-afis-2022.jpg', '“Dore Mimi CSO’da” afişi', 'Afiş: CSO, Biletinial')}</div>`,
    notes: `<p><b>Tarihler ilan, afiş ve sezon duyurusundan.</b> “Yapıldı” demeyin; “programda” ya da yalnızca tarih ve salon.</p>
      ${LISTINGS.map(l => line(full(l.date) + ':', when(l.date).tr, when(l.date).src)).join('')}
      ${line(`${ages} yaş:`, `${num('agesConcert').tr}.`, num('agesConcert').src)}
      <p>Sorulursa:</p>
      ${['2020-11-20/22', '2021-02-19'].map(d => line(full(d) + ':', when(d).tr, when(d).src)).join('')}
      <p><b>Afiş:</b> ${full('2022-02-21')} konserinin Biletinial sayfasındaki afişi (CSO).</p>`,
  },
  {
    // Light, unlike the three before it: the lines and the step button are the deck's own (.feats, .act), which are
    // drawn for a light slide only (navy on navy on a dark one), and this file adds no rule to the deck's classes.
    id: 'bugune-kutuphane', label: 'Kütüphane', theme: 'light', phone: { type: 'go', hash: '#/doremimi' },
    html: `${head(SECTION, `Sitede <em>${N.siteVideos} video</em>`, FACTS.contentLibrary.tr)}
      <ul class="feats"><li>${num('riddles').tr}</li><li>${num('guestAnswerers').tr}</li></ul>`,
    // #/izle and not #/kitaplar or #/etkinlikler: the first lists school-book rows that are not this series, the
    // second shows concerts as "Hazırlanıyor" right after a slide of dated ones.
    acts: [['İzle: bilmeceler', { type: 'go', hash: '#/izle' }]],
    notes: `${line(`${num('siteVideos').tr}.`, '', num('siteVideos').src)}
      ${line(`${num('riddles').tr}.`, '', num('riddles').src)}
      ${line(`${num('guestAnswerers').tr}.`, 'Konukların adları video başlıklarında.', num('guestAnswerers').src)}
      <ol><li><b>İzle</b>: aynı bilmece videoları uygulamada, İzle sekmesinin başında.</li></ol>
      <p>Kanalın abone ve izlenme sayıları slaytta yok: her gün değişiyor. Buradan sonra uygulamaya geçiyoruz.</p>`,
  },
];
