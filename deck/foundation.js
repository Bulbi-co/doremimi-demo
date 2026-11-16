/*
 * "Dore Mimi, bugüne kadar": the deck's opening section, right after the cover and before the app is shown (owner,
 * 2026-11-16; dossier ch. 14 §13). It states what the Dore Mimi foundation has already done, to the foundation.
 *
 * The rules of this file come from the research the facts were taken from (doremimi-superapp
 * content/doremimi-research: DEMO-INTEGRATION.md, CAVEATS.md):
 *
 *   - Achievements only. No praise, no thanks, no adjective about the work: the audience is the people who did it.
 *     One sentence looks forward instead of back, at the owner's request (the last column, "Bugün"); it claims
 *     nothing about what was done.
 *   - Every number comes from deck/foundation-facts.js (generated from facts.json), never from memory.
 *   - A concert date is a listing, a poster or a season announcement, so the slides give the date and the hall and
 *     never say it took place; the 2020 dates were postponed and are in the notes only.
 *   - The channel's subscriber, view and video counts move daily: they are not here.
 *   - No publisher on the books slide (only the study's table names one), no founding date (the site gives none), no
 *     partner's role, nothing from the study but that it exists, no phone number, no e-mail address.
 *   - Where each fact comes from is in the presenter notes ("Kaynak: …"), one line per fact, not on the slide.
 *
 * tests/foundation.test.mjs holds them: every integer against the snapshot, the banned words, the section's place
 * and that it is one slide. What it cannot hold is judgement (a new
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
 * Hürriyet report of February 2021 (a report of plans). Both are in the slide's notes for the presenter.
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
const dayMonth = m => { const p = parts(m.date); return [m.day === false ? null : p.day, p.month].filter(Boolean).join(' '); };
const marker = date => MARKERS.find(m => m.date === date);

/*
 * What the slide draws: five columns, not one entry per date. Until the owner read it (2026-11-16) every dated fact
 * had its own place on the timeline, and five of the eight were the orchestra's: "CSO this time, CSO that time". Its
 * entries are one column now, under its name once, with their months as one small line (the days and halls are in the
 * notes). The last column is today, with the forward-looking words the owner asked for ("we are now here and we have
 * so many new ways to go"). MARKERS above stays the list of dated facts: the notes cite each, and every date a
 * column names must be one of them (tests/foundation.test.mjs).
 */
const ORCHESTRA = ['2020-11-18', '2021-12-26', '2022-02-21', '2023-03-22/24', '2026-01-19'];
export const COLUMNS = [
  { dates: ['2019-01-22'], eyebrow: dayMonth(marker('2019-01-22')), text: marker('2019-01-22').text },
  { dates: ORCHESTRA, wide: true, eyebrow: `${FACTS.concerts.orchestraTr} ile`, text: 'Sitesinde çocuk bölümü, eğitim konserleri, ritim atölyesi',
    small: ORCHESTRA.map(d => full(d, { day: false })).join(' · ') },
  { dates: ['2021'], text: marker('2021').text },
  { dates: ['2024'], text: marker('2024').text },
];
const span = dates => { const y = dates.map(d => parts(d).year); return y[0] === y.at(-1) ? y[0] : `${y[0]}–${y.at(-1)}`; };
const column = c => `<li${c.wide ? ' class="fnd-wide-col"' : ''}><b class="fnd-y">${span(c.dates)}</b><span class="fnd-ev">${c.eyebrow ? `<i>${c.eyebrow}</i>` : ''}${c.text}${c.small ? `<small>${c.small}</small>` : ''}</span></li>`;
// Today: not a fact with a source, and the only such thing on the slide. Short on purpose, and nothing about the past.
export const NOW = { label: 'Bugün', text: 'Buradayız.', next: 'Önümüzde yeni yollar, sayısız fırsat var.' };
const timeline = `<ol class="fnd-line">${COLUMNS.map(column).join('')}<li class="fnd-now"><b class="fnd-y">${NOW.label}</b><span class="fnd-ev">${NOW.text}<small>${NOW.next}</small></span></li></ol>`;

const head = (eyebrow, title, lead, wide = false) => `
  <span class="fnd-eyebrow">${eyebrow}</span>
  <h1 class="title tour">${title}</h1>
  <p class="lead${wide ? ' fnd-wide' : ''}">${lead}</p>`;
// A third-party picture carries its credit beside it, small: the repo is public and the picture is not ours.
const figure = (cls, file, alt, credit) => `<figure class="fnd-fig ${cls}"><img src="assets/foundation/${file}" alt="${alt}"><figcaption>${credit}</figcaption></figure>`;
const ages = FACTS.concerts.ages.replace('-', '–');

/*
 * The strip under the timeline: the books, the concerts and the site, one card each. They were three slides of their
 * own until the owner cut them (2026-11-16: "too unnecessary", fold them into this one, compactly; the whole deck is
 * at most nine slides). The timeline already dates the series and the concerts, so a card says only what a date
 * cannot: what the series is, who the concerts are for, what the site holds. The list of the ten titles and the
 * concert rows with their hours and halls went with their slides; each date's own sentence is in the notes.
 */
const strip = `<ul class="fnd-strip">
  <li>${figure('fnd-set', 'kitap-seti.jpg', 'Serinin on kitabının kapakları', 'Görsel: idefix.com')}
    <div><b>${N.books} kitap, ${FACTS.books.titlesTr.length} çalgı</b><span>${FACTS.books.seriesTr} (${FACTS.books.author}, ${FACTS.books.year}): okul öncesi ve 1. sınıf için.</span></div></li>
  <li>${figure('fnd-poster', 'cso-afis-2022.jpg', '“Dore Mimi CSO’da” afişi', 'Afiş: CSO, Biletinial')}
    <div><b>Eğitim konserleri</b><span>${ages} yaş için ${FACTS.concerts.kindTr.toLocaleLowerCase('tr')}.</span></div></li>
  <li><div><b>${num('siteVideos').tr}</b><span>${num('riddles').tr}; ${num('guestAnswerers').tr.replace(/^“Dore soruyor” serisinde /, '“Dore soruyor”da ')}.</span></div></li>
</ul>`;

export const FOUNDATION_SLIDES = [
  {
    id: 'bugune-kadar', label: 'Bugüne kadar', theme: 'dark', layout: 'full',
    html: `${head(FACTS.foundation.nameTr, 'Dore Mimi, <em>bugüne kadar</em>',
      `Bir YouTube kanalı, ${N.books} kitap, senfoni orkestrasıyla konserler. Şimdi de bir uygulama.`, true)}
      ${timeline}
      ${strip}`,
    notes: `<p><b>Uygulamadan önce, vakfın bugüne kadar yaptıkları.</b> Tarihleri tek tek okumayın; son sütunda durun: bugün buradayız, sırada uygulama var. Her tarih ve sayı bir kaynağa dayanıyor; kaynaklar aşağıda, satır satır.</p>
      ${MARKERS.map(m => line(full(m.date, { day: m.day !== false }) + ':', m.text + '.', when(m.date).src)).join('')}
      <p><b>Konser tarihleri ilan, afiş ve sezon duyurusundan.</b> “Yapıldı” demeyin; “programda” ya da yalnızca tarih ve salon. Sorulursa:</p>
      ${['2020-11-20/22', '2021-02-19'].map(d => line(full(d) + ':', when(d).tr, when(d).src)).join('')}
      ${line(`${ages} yaş:`, `${num('agesConcert').tr}.`, num('agesConcert').src)}
      ${line(`${num('books').tr}.`, `Yazar ${FACTS.books.author}, basım ${FACTS.books.year}; ${FACTS.books.audienceTr.toLocaleLowerCase('tr')} için. Karekodlar çalgıya özel etkinliklere ve bestelere götürür.`, ['S14', 'S15'])}
      ${line(`${num('siteVideos').tr}.`, `${num('riddles').tr}; ${num('guestAnswerers').tr}.`, num('siteVideos').src)}
      <p><b>Görseller:</b> on kapağın idefix.com’daki ürün fotoğrafı ve ${full('2022-02-21')} konserinin Biletinial sayfasındaki afişi (CSO). Vakıf kendi görsellerini gönderirse değiştirilecek.</p>
      <p>Slaytta yok: yayınevi (yalnızca çalışmanın tablosunda geçiyor), vakfın kuruluş tarihi (sitede “kuruldu” yazıyor, tarih verilmiyor), kanalın abone ve izlenme sayıları (her gün değişiyor). Çalışmanın bulgularından söz etmeyin; yalnızca serinin incelendiği söylenir.</p>`,
  },
];
