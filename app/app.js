/*
 * Doremimi, recreated for the presentation (dossier ch. 10). The rules live in ./lib and are the app's, ported; this
 * file only draws what they decide, the way Doremimi/ViewModels/ShellViewModel.cs and MusicCardGameViewModel.cs do.
 *
 * Since dossier ch. 14 §11 the phone speaks Türkçe, English and Français: every word it shows comes from t(key)
 * (./i18n/ui.js) and the game's content from L (./data/localise.js), so this file holds no player-facing text of its
 * own; tests/i18n.test.mjs fails when it does. Copy written for the demo itself is marked PROPOSED in the tables.
 */
import { LEARNING, SUNUM_DECK, SIGN_CARDS as SIGN_CARDS_TR, SIGN_CATEGORIES as SIGN_CATEGORIES_TR, INSTRUMENTS as INSTRUMENTS_TR } from './data/content.js';
import { localise } from './data/localise.js';
import { QuestionDeck, LearningRound, Stage, isRight } from './lib/round.js';
import { Move } from './lib/ladder.js';
import { RoundOrigin, ORIGIN_OF_LEVEL, ladderFor, rulesOf, dealRound, kesfetCategories } from './lib/modes.js';
import { HUB, BANNER_GO, FAMILY_GROUP } from './data/hub.js';
import { SCRIPT } from './data/script.js';
import { Mastery, addXp, stars as starsOf, pickConcepts, newlyEarned, today } from './lib/progress.js';
import { seeded, fromClock } from './lib/rng.js';
import { Backdrop } from './lib/backdrop.js';
import { pageAccentOf } from './lib/canvas.js';
import { icon } from './lib/icons.js';
import { TABS, OGREN_TABS, resolve } from './lib/nav.js';
import { pick as pickDaily } from './lib/daily.js';
// mixHex: the instrument page's header has called it since 1ff003b without the import, so every instrument page threw.
import { accentSet, INK_SET, darken, edge as edgeOf, mix as mixHex } from './lib/accent.js';
import { normalise, isLetterOrDigit } from './lib/answers.js';
import { slug, songFor, sequence, length, keyboardBase, karaokeLines, indexAt, render as renderSong, safeTheme, fromKeys, keyIndex, Sound, ButtonMelody } from './lib/music.js';
import { DIRECTORY as DIRECTORY_TR, SONGS, GROUPS, GROUP_COLORS, MANIFESTO, VISION, NEWS, CHARACTERS, BOARD, FOUNDERS, TEAM, ADVISORS, PARTNERS, CONTACTS, LEGAL, DRAFT_NOTE } from './data/site.js';
import { LANGS, pickLang, translator, percent, upper } from './i18n/index.js';
import { KEYBOARDS } from './i18n/keyboards.js';

// The site's three lists are the app's own JSON files, unchanged (Assets/Content/site; ch. 10 AS-18).
const [VIDEOS, LYRICS, LIBRARY] = await Promise.all(['videos', 'lyrics', 'library'].map(n => fetch(`data/site/${n}.json`).then(r => r.json()).catch(() => [])));

// ───────────────────────── switches (dossier ch. 10 W-06)
const params = new URLSearchParams(location.search);
const EMBED = params.has('embed');
const SUNUM = EMBED || params.has('sunum');      // fixed deck and seeded random inside the slides (G-05)
const STILL = params.has('still');
const DAY_SHIFT = parseInt((params.get('gun') || '0').replace('+', ''), 10) || 0;
const REDUCED = STILL || matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────────────────────── state, kept in one versioned key (W-05); every access may throw in a private window
const KEY = 'doremimi-demo-v1';
const store = {
  load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* the demo works without storage */ } },
  wipe() { try { localStorage.removeItem(KEY); } catch { /* nothing to wipe */ } },
};
if (params.has('reset')) store.wipe();
// `ladder` is still saved after every card but no longer read for a round's start (dossier ch. 14 §3: Keşfet starts at
// Yaz every time). `difficulty` is the child's Zorluk, null until the first game asks it (§4). `settings.lang` is null
// until the Dil row is used: null follows the device (i18n/index.js pickLang).
const freshProfile = () => ({ xp: 0, level: 1, mastery: {}, badges: [], ladder: 'Yaz', difficulty: null, seenIntro: false, keyboard: 'auto', days: [],
  child: null, melodim: [], seen: [], rounds: 0, best: 0, answered: 0, stars: 0,
  settings: { motion: false, buttons: true, music: true, notify: false, lang: null } });   // Ayarlar's switches (ch. 03 §13)
let profile = Object.assign(freshProfile(), store.load()?.profile);
profile.settings = Object.assign(freshProfile().settings, profile.settings);
let mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT);
const save = () => store.save({ profile });

// ───────────────────────── language (dossier ch. 14 §11): the strings, the content and the deck the game deals from
let lang, t, L, deck;
const langNow = () => pickLang({ query: params.get('dil'), saved: profile.settings.lang, languages: navigator.languages ?? [navigator.language], embed: EMBED });
/** Switches everything at once: the tables, the content, the deck (mastery is keyed by question id, so it carries). */
function setLang(next) {
  lang = next; t = translator(lang); L = localise(lang);
  deck = new QuestionDeck(L.QUESTIONS);
  document.documentElement.lang = lang;
  document.title = t('app.name');
}
setLang(langNow());

// ───────────────────────── helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// FAST: the deck's fast-forward replays the script with no pauses and no pressed-button flashes.
let FAST = false;
const sleep = ms => FAST ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
/** Readable.UnderWhite and Motion.Edge, toward the app's ink #16182C (lib/accent.js). */
const readable = h => darken(h);
const edge = h => edgeOf(h);
/** A screen's primary as CSS variables: the card's AccentSet in the game, ink elsewhere (Accent.cs Tone). */
const toneVars = t => `--pface:${t.face};--plabel:${t.label};--pedge:${t.edge};--ptext:${t.text}`;
const up = s => upper(lang, s);
const pct = v => percent(lang, Math.min(1, v));
const levelName = l => ['Cevir', 'Sec', 'Yaz'][l];
const moodOf = l => ['cevir', 'sec', 'yaz'][l];

const app = $('#app'), topbar = $('#topbar'), page = $('#page'), dock = $('#dock'), gameEl = $('#game'), toastHost = $('#toast');
if (EMBED) app.classList.add('embed');
if (STILL) app.classList.add('still');
const safeTop = () => parseFloat(getComputedStyle(app).getPropertyValue('--safe-top')) || 0;
const shellBg = new Backdrop($('#bg'), { seed: 5, mood: 'kesfet', clearTop: safeTop(), reduced: REDUCED, tabs: true });
shellBg.start();
$('#dock').setAttribute('aria-label', t('dock.aria'));

if (EMBED) {
  const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 10_000);
}

/** The reward toast (ch. 01 M-06): a headline and a reason, popping and fading over 1.5 s. */
function toast(headline, reason = '', bad = false) {
  toastHost.innerHTML = `<div class="toast${bad ? ' bad' : ''}"><b>${esc(headline)}</b>${reason ? `<small>${esc(reason)}</small>` : ''}</div>`;
}
/** A tap that leads to a page the demo has not recreated yet (ch. 10 A-00). */
const notYet = () => toast(t('soon.title'), t('soon.line'));

// Sprite loops from the site (Assets/Content/site/sprites): Dore drums at 12 fps, Mimi speaks at 8.
const SPRITES = { 'dore-drum': { n: 25, fps: 12 }, 'mimi-wave': { n: 48, fps: 8 } };
const frame = (name, i) => `../assets/site/sprites/${name}/${String(i).padStart(2, '0')}.webp`;
for (const [name, s] of Object.entries(SPRITES)) for (let i = 0; i < s.n; i++) new Image().src = frame(name, i);
if (!REDUCED) {
  for (const [name, s] of Object.entries(SPRITES)) {
    let i = 0;
    setInterval(() => { i = (i + 1) % s.n; document.querySelectorAll(`img[data-sprite="${name}"]`).forEach(img => { img.src = frame(name, i); }); }, 1000 / s.fps);
  }
}

// ───────────────────────── router (ch. 10 W-01, revised by ch. 11 NR-91): tab roots clear the stack, pages push, the
// game is a layer. The dock is Oyna · Öğren · logo · İzle · Çal (ch. 14 §10: Keşfet is named Oyna; its key stays).
let route = { tab: 'kesfet', page: null };
let stack = [];
let inApp = false;   // set by a tap just before it changes the hash, so navigate() knows the page is pushed, not linked

function navigate() {
  const fromApp = inApp; inApp = false;
  const r = resolve(location.hash, { tab: route.tab, stacked: stack.length > 0, fromApp });
  if (r.kind === 'game') {
    // The game is a layer over the page it was opened from (A-02), so the hash goes back to that page.
    history.replaceState(null, '', stack.at(-1) ?? TABS.find(x => x.key === route.tab).hash);
    // ?yer=kesfet|cal names the way in; the older ?seviye= names it by its level (lib/modes.js ORIGIN_OF_LEVEL).
    const yer = Object.values(RoundOrigin).includes(r.query.get('yer')) ? r.query.get('yer') : null;
    openGame({ concept: r.query.get('deste'), origin: yer, level: r.query.get('seviye'), intro: r.query.has('tanitim') ? true : undefined });
    return;
  }
  if (r.kind === 'redirect') { history.replaceState(null, '', r.to); return navigate(); }
  if (r.kind === 'root') { route = { tab: r.tab, page: null, segment: r.segment, query: r.query }; stack = []; }
  else {
    route = { tab: r.tab, page: r.page, arg: r.arg, query: r.query };
    if (stack.at(-1) !== location.hash) stack.push(location.hash);
  }
  render();
}
addEventListener('hashchange', navigate);
/** A tap that opens a page: pushed on the current tab's stack. */
function push(hash) { inApp = true; if (location.hash === hash) { inApp = false; navigate(); } else location.hash = hash; }
/** Switches tab and opens a page there, back returning to that tab's root (OC-13: Şarkısını çal lands in Çal). */
function openIn(tabKey, hash) { leavePage(); route = { tab: tabKey, page: null }; stack = []; push(hash); }

function back() {
  if (gate.open) return closeGate();
  if (overlay.kind) return closeOverlay();
  if (!gameEl.hidden) { if (G.intro && profile.difficulty) closeIntro(); else exitGame(); return; }
  if (stack.length) { stack.pop(); location.hash = stack.at(-1) ?? TABS.find(x => x.key === route.tab).hash; return; }
  if (route.tab !== 'kesfet') location.hash = '#/';   // back on any other root, the logo's included, goes to Oyna (OC-24)
}

// ───────────────────────── shell
function render() {
  leavePage();
  app.className = app.className.replace(/\btab-\w+/g, '').trim() + ' tab-' + route.tab;
  shellBg.setMood(route.tab, { accent: pageAccent() });
  renderTopbar();
  renderDock();
  const view = route.page ? PAGES[route.page] : null;
  page.innerHTML = `<div class="page-in">${route.page ? (view ? view.html(route.arg, route.query) : missing(route.page)) : ROOTS[route.tab]()}</div>`;
  page.scrollTop = 0;
  // The banner carousel lives on the Doremimi tab since ch. 14 §10, where the foundation card was.
  if (route.tab === 'doremimi' && !route.page) startCarousel(); else stopCarousel();
  afterRender();
}

/** The category colour this page's backdrop takes, or null for the tab's own wash (lib/canvas.js says which and why). */
const pageAccent = () => pageAccentOf(route, { SIGN_CATEGORIES: SIGN_CATEGORIES_TR, SIGN_CARDS: SIGN_CARDS_TR, DIRECTORY: DIRECTORY_TR, GROUPS, GROUP_COLORS, slug });

const childOf = () => CHILDREN.find(c => c.id === profile.child) ?? GUEST;
const tabTitle = tab => t(`tab.${tab.key}.title`);
function renderTopbar() {
  const tab = TABS.find(x => x.key === route.tab);
  const view = route.page ? PAGES[route.page] : null;
  const title = view ? (typeof view.title === 'function' ? view.title(route.arg, route.query) : t(view.title)) : tabTitle(tab);
  const kid = childOf();
  // NR-05: [back][title][avatar]. No logo here any more (it is in the dock) and no level chip (ch. 14 §14: the level
  // it showed was the XP level, which is never on screen); the avatar, top right, opens Profilim (OC-05).
  topbar.innerHTML = `
    ${stack.length ? `<button class="chunky white round backbtn" data-do="back" title="${esc(t('back'))}" aria-label="${esc(t('back'))}"><span class="face">${icon('IconBack')}</span></button>` : ''}
    <div class="title"><h1>${esc(title)}</h1></div>
    <button class="tile" data-go="#/profil" data-do="avatar" title="${esc(t('page.profil'))}" aria-label="${esc(t('page.profil'))}"><span class="avatar who"><img src="../assets/site/characters/${kid.image}" alt=""></span></button>`;
  fitTitle();
}
/*
 * The page title fits its room: 28 px, else 22, else two lines at 18. Beside the back button and the avatar a title has
 * 248 px on a 390 px phone (176 while the level chip sat there, until ch. 14 §14), and "Etkinlikler ve materyaller"
 * needs 324 at 28 (French and English run longer still); cut with an ellipsis, the title of the page you are on read as
 * "Etkinlikler ve…". Measured again
 * when a font finishes loading and when the bar changes width: document.fonts.ready alone was not enough, because it
 * can resolve before the first render has asked for Inter at all, and the English hub title stayed cut at 430 px.
 */
function fitTitle() {
  const h1 = topbar.querySelector('h1');
  if (!h1) return;
  h1.classList.remove('fit1', 'fit2');
  if (h1.scrollWidth > h1.clientWidth + 1) h1.classList.add('fit1');
  if (h1.scrollWidth > h1.clientWidth + 1) { h1.classList.remove('fit1'); h1.classList.add('fit2'); }
}
document.fonts?.addEventListener('loadingdone', fitTitle);
try { new ResizeObserver(fitTitle).observe(topbar); } catch { /* fitted on every render anyway */ }

function renderDock() {
  dock.innerHTML = TABS.map(x => x.logo
    ? `<button class="tab logo${x.key === route.tab ? ' active' : ''}" data-go="${x.hash}" title="${esc(t('tab.doremimi.aria'))}" aria-label="${esc(t('tab.doremimi.aria'))}"><span class="plate"><img src="../assets/brand/logo.png" alt=""></span></button>`
    : `<button class="tab${x.key === route.tab ? ' active' : ''}" data-go="${x.hash}"><span class="pill">${icon(x.icon)}</span><span>${esc(t(`tab.${x.key}`))}</span></button>`).join('');
}

/** A route the demo does not know: an honest card, not a fake screen. */
function missing(name) {
  return `<div class="stack soon"><div class="card"><span class="ribbon"><h2>${esc(t('soon.title'))}</h2></span>
    <p class="p">${esc(t('soon.page'))}</p><span class="caption">#/${esc(name)}</span></div></div>`;
}

// ───────────────────────── shared pieces
const photoOf = name => `../assets/site/instruments/${slug(name) === 'viyolonsel' ? 'cello' : slug(name)}.jpg`;
/** MusicLibrary.Art: the song's slug, then its instrument's, then cello.jpg for the cello song. */
const songArt = s => `../assets/site/instruments/${s.slug.startsWith('cello') ? 'cello' : s.slug === 'kontrabass' ? 'kontrabas' : s.slug}.jpg`;
const entryOfSong = s => DIRECTORY_TR.find(d => songFor(d.name, SONGS) === s);
const note = text => `<div class="card note"><p class="p strong">${esc(text)}</p></div>`;
/*
 * lang="tr" on what stays Turkish in every language (ch. 14 §11: lyrics, video titles, the foundation's site texts), so
 * a screen reader reads it in Turkish, and tools/phone-e2e.mjs can tell it from a string someone forgot to translate.
 */
const TRL = () => (lang === 'tr' ? '' : ' lang="tr"');
const ribbon = (text, extra = '') => `<span class="ribbon${extra}"><h2>${esc(text)}</h2></span>`;
// Since ch. 12 every row icon is ink on a sunken square (ShellViewModel.cs MenuItem passes #EDEFF3 for all of them);
// colour belongs to the cards. A row that leaves the app ends in ↗, not ›.
const menuRow = (ic, title, sub, attrs) => `<button class="mrow" ${attrs}><span class="sq">${icon(ic)}</span><span class="mt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${icon(/data-ext=/.test(attrs) ? 'IconExternal' : 'IconChevronRight', 'chev')}</button>`;
/** A hub group: its title inside its white card, as the app draws MenuGroupViewModel. */
const group = (title, rows) => `<div class="card menu"><h3 class="group-title">${esc(title)}</h3>${rows.join('')}</div>`;
const menu = rows => `<div class="card menu">${rows.join('')}</div>`;
const chips = (list, on, attr, extra = '') => `<div class="chips${extra}">${list.map(([v, x]) => `<button class="chip-btn${v === on ? ' on' : ''}" ${attr}="${esc(v)}">${esc(x)}</button>`).join('')}</div>`;
const groupChips = (on, attr) => chips([['', t('filter.all')], ...GROUPS.map(g => [slug(g), L.groupName(g)])], on, attr, ' scroll');
const videoCard = (v, wide = false) => `<button class="tile video${wide ? ' grid' : ''}" data-video="${esc(v.id)}"><div class="card flush">
  <div class="thumb"><img src="../assets/site/${esc(v.thumb)}" alt="" loading="lazy"><span class="play">${icon('IconPlay')}</span></div>
  <div class="meta"><b${TRL()}>${esc(v.title)}</b>${wide ? '' : `<small>${esc(t(`kind.${v.kind}`))}</small>`}</div></div></button>`;
/** An instrument's name in the current language; the routes keep the Turkish slug. */
const instName = trName => L.instName(trName);

// ───────────────────────── Oyna (dossier ch. 14 §1 and §10): Şimdi Oyna, the categories and Bugünün kartı, nothing
// else. The owner: the tab "still didn't feel like it includes the main game", so the whole tab is the game's, and it is
// named Oyna; the banner carousel moved to the Doremimi tab.
let banner = 0, carouselTimer = null;

function bannerHtml(b, cls = '') {
  return `<button class="tile banner ${cls}" data-banner="${b.index}" style="--accent:${readable(b.accent)}">
    <div class="hero"><div class="txt"><b>${esc(b.title)}</b><small>${esc(b.subtitle)}</small></div>
      <img src="../assets/site/banners/${b.image}" alt=""></div></button>`;
}

/*
 * Şimdi Oyna as a circle. The little card inside loops through the three ways the game can ask (it turns over; four
 * answer bars come and one lights; letters type into a line) without naming any of them: as names they read as three
 * games (ch. 14 §2). One loop is 4.5 s. Under reduced motion every animation stops and what is left is the card with
 * its ♭, which is why the ♭ face is the card's resting side and the other states only exist inside the keyframes. The
 * typed word is the ♭'s name in the child's language, so the loop spells a real answer.
 */
function oynaHtml() {
  const letters = [...up(t('oyna.typed'))].map((c, i) => `<i style="--i:${i}">${esc(c)}</i>`).join('');
  return `<div class="oyna-sec">
    <button class="chunky oyna circle" data-do="play" data-origin="kesfet" aria-label="${esc(t('oyna.button'))}"><span class="face">
      <span class="mini" aria-hidden="true"><span class="flipper"><span class="side front music">♭</span><span class="side back">?</span></span>
        <span class="bars"><i></i><i></i><i></i><i></i></span><span class="typed">${letters}</span></span>
      <b class="word">${esc(t('oyna.button'))}</b></span></button>
    <p class="oyna-cap">${esc(t('oyna.caption'))}</p>
    <button class="quiet link howto" data-do="howto">${esc(t('oyna.howto'))}</button>
  </div>`;
}

/*
 * One category card (ch. 14 §1): a toy card in the category's own colour, its symbol or family portrait, its name and
 * "N kart"; a bar only once the category has been played. Signs and families sit in one grid with no İşaretler /
 * Çalgılar split: to the child they are all categories of the one game.
 */
function categoryCard(id) {
  const info = L.CONCEPTS[id];
  const tone = accentSet(info.color);
  const cards = deck.forConcept(id).length;
  const m = Math.min(1, Math.max(0, mastery.conceptMastery(id, deck)));
  const played = deck.forConcept(id).some(q => mastery.of(q.id));
  const art = info.family ? `<img src="../assets/cards/portrait-${L.FAMILIES[info.family].art}.png" alt="">` : `<span class="music">${esc(info.symbol)}</span>`;
  return `<button class="kat" data-play="${id}" data-origin="kesfet" aria-label="${esc(`${info.name}, ${t('cards', { n: cards })}`)}" style="--kf:${tone.face};--kl:${tone.label};--ke:${tone.edge}">
    <span class="kface"><span class="kart-art">${art}</span><b>${esc(info.name)}</b><small class="num">${esc(t('cards', { n: cards }))}${played ? ` · ${esc(pct(m))}` : ''}</small>
    ${played ? `<span class="ktrack"><i style="width:${Math.round(m * 100)}%"></i></span>` : ''}</span></button>`;
}

// No "Tekrar zamanı" row (ch. 14 §1): every round deals the cards that are due first (QuestionDeck.Deal), so the review
// happens inside Şimdi Oyna. The deck's Oyna slide scrolls to `.kats-sec`.
function home() {
  return `<div class="stack home">
    ${oynaHtml()}
    <div class="kats-sec"><h2 class="h2 khead">${esc(t('kesfet.categories'))}</h2>
      <div class="kats">${kesfetCategories(deck, L.CONCEPTS).map(categoryCard).join('')}</div></div>
    ${todayHtml()}
  </div>`;
}

/*
 * Bugünün kartı (DailyCardViewModel.For): the kind turns daily by DailyCard's rule (lib/daily.js), from the same
 * three pools as the app: the site's instruments, the instrument questions and the signs that are not samples.
 * ?gun=+N shifts the day like the rest of the demo, so the presenter can show tomorrow's card.
 */
const DAILY_POOLS = () => [L.DIRECTORY, L.QUESTIONS.filter(q => q.kind !== 'sign'), L.SIGN_CARDS.filter(c => !c.isSample)];
const todayShown = { key: null, answer: false };
function todayCard() {
  const date = new Date(); date.setDate(date.getDate() + DAY_SHIFT);
  const pools = DAILY_POOLS();
  const p = pickDaily(date, pools.map(x => x.length));
  if (!p) return null;
  const item = pools[p.kind][p.item];
  const key = `${p.kind}:${p.item}`;
  if (todayShown.key !== key) { todayShown.key = key; todayShown.answer = false; }
  if (p.kind === 0) return { key, kind: t('today.instrument', { group: L.groupName(item.group) }), title: item.label, body: item.about, color: GROUP_COLORS[item.group], photo: photoOf(item.name), go: `#/calgi/${slug(item.name)}` };
  if (p.kind === 1) {
    const instKey = item.conceptIds.find(id => id.startsWith('instrument:'))?.slice(11);
    const inst = L.INSTRUMENTS[instKey];
    const entry = inst && DIRECTORY_TR.find(d => quizKeyOf(d.name) === instKey);
    const answer = item.explanation?.tip ? `${item.answer.replace(/[. ]+$/, '')}. ${item.explanation.tip}` : item.answer;
    return { key, kind: t('today.question', { name: inst?.name ?? t('today.instruments') }), title: item.prompt, body: t('today.tap'), answer,
      color: entry ? GROUP_COLORS[entry.group] : '#6B6E85', photo: entry ? photoOf(entry.name) : null, go: entry ? `#/calgi/${slug(entry.name)}` : null };
  }
  const cat = L.SIGN_CATEGORIES.find(c => c.key === item.category);
  return { key, kind: t('today.sign', { name: cat.name }), title: item.name, body: item.definition, color: cat.color, symbol: item.symbol, go: `#/isaret/${item.id}` };
}
function todayHtml() {
  const c = todayCard();
  if (!c) return '';
  const tone = accentSet(c.color);
  const art = c.photo ? `<img src="${c.photo}" alt="">` : c.symbol ? `<span class="music">${esc(c.symbol)}</span>` : icon('IconNote');
  const shown = c.answer && todayShown.answer;
  // A plain white card (ch. 13 §4): the colour is only the art window and a 3 px bar down its left edge. The eyebrow
  // names it, so there is no separate heading.
  return `<button class="tile today" data-today="1" style="--acc:${c.color}"><div class="tface">
    <span class="tart" style="background:${tone.face};color:${tone.label}">${art}</span>
    <span class="ttxt"><span class="eyebrow">${esc(t('today.eyebrow'))}</span><small>${esc(c.kind)}</small><b>${esc(c.title)}</b>${shown ? `<span class="p reply">${esc(c.answer)}</span>` : `<span class="p">${esc(c.body)}</span>`}</span>
  </div></button>`;
}
function tapToday() {
  const c = todayCard();
  if (!c) return;
  if (c.answer && !todayShown.answer) { todayShown.answer = true; const el = $('.today'); if (el) el.outerHTML = todayHtml(); return; }
  if (c.go) push(c.go);
}

/** The carousel rotates every 5 s and slides 380 ms (ShellViewModel.cs:318-320); it cannot be swiped (ch. 01 X-07). */
function setBanner(i) {
  const slot = $('#bslot');
  if (!slot || i === banner) return;
  banner = (i + L.BANNERS.length) % L.BANNERS.length;
  const old = slot.firstElementChild;
  slot.insertAdjacentHTML('beforeend', bannerHtml(L.BANNERS[banner]));
  const neu = slot.lastElementChild;
  if (REDUCED) { old.remove(); } else {
    neu.style.transform = 'translateX(110%)';
    requestAnimationFrame(() => requestAnimationFrame(() => { old.classList.add('out'); old.style.transform = 'translateX(-110%)'; neu.style.transform = ''; }));
    setTimeout(() => old.remove(), 420);
  }
  document.querySelectorAll('.carousel .dots .dot').forEach((d, k) => d.classList.toggle('on', k === banner));
}
function startCarousel() { stopCarousel(); if (!STILL) carouselTimer = setInterval(() => setBanner(banner + 1), 5000); }
function stopCarousel() { clearInterval(carouselTimer); carouselTimer = null; }
const carouselHtml = () => `<div class="carousel">
    <div class="banner-slot" id="bslot">${bannerHtml(L.BANNERS[banner])}</div>
    <div class="dots">${L.BANNERS.map((b, i) => `<span class="dot${i === banner ? ' on' : ''}"></span>`).join('')}</div>
  </div>`;

// ───────────────────────── Öğren (dossier ch. 14 §10): information only, four tabs, İşaretler · Çalgılar · Aileler ·
// Değerler. No page reached from here starts a round: the cards turned over to read now come only as the help inside
// an Oyna round (the ladder), and the riddles live in İzle, the scores in Çal.
const flipped = new Set();
function learn() {
  const seg = OGREN_TABS.some(x => x.key === route.segment) ? route.segment : 'isaretler';
  const tabs = `<div class="otabs" role="tablist">${OGREN_TABS.map(x => `<button class="otab${seg === x.key ? ' on' : ''}" role="tab" data-go="#/ogren/${x.key}" aria-selected="${seg === x.key}">${esc(t(`ogren.${x.key}`))}</button>`).join('')}</div>`;
  return `<div class="stack learn">${tabs}${LEARN_TABS[seg]()}</div>`;
}
const LEARN_TABS = {
  isaretler: () => `${note(t('ogren.isaretler.note'))}
    <div class="signs">${L.SIGN_CATEGORIES.map(c => signTile(c)).join('')}</div>`,
  // A grid of photos (ch. 14 §5): the 41-row list was the screen testers called hardest to use. The bar under each
  // name is the instrument's group colour, the only colour on the tile, so the photo stays the thing that is read.
  calgilar: () => {
    const filter = route.query?.get('aile') ?? '';
    const list = L.DIRECTORY.filter(d => !filter || slug(d.group) === filter);
    return `${groupChips(filter, 'data-aile')}
      <div class="igrid">${list.map(d => `<button class="itile" data-push="#/calgi/${slug(d.name)}"><span class="iph"><img src="${photoOf(d.name)}" alt="" loading="lazy"></span>
        <span class="imeta"><b>${esc(d.label)}</b><small>${esc(L.groupName(d.group))}</small></span><span class="ibar" style="background:${GROUP_COLORS[d.group]}"></span></button>`).join('')}</div>`;
  },
  aileler: () => `${note(t('ogren.aileler.note'))}
    <div class="fams">${Object.keys(L.FAMILIES).map(k => familyCard(k)).join('')}</div>`,
  degerler: () => valuesTab(),
};

/*
 * An Aileler card: the family's portrait on its colour, its name, its first sentence and how many of its instruments
 * the directory holds. A tap shows those instruments (Çalgılar under the family's filter): Öğren is information only
 * (ch. 14 §10), so the card no longer opens the cards to turn over, and its count is of instruments, not of game cards.
 */
function familyCard(key) {
  const f = L.FAMILIES[key], tone = accentSet(f.color), g = FAMILY_GROUP[key];
  const n = L.DIRECTORY.filter(d => d.group === g).length;
  return `<button class="fam" data-fam="${key}" data-go="#/ogren/calgilar?aile=${slug(g)}" style="--kf:${tone.face};--kl:${tone.label};--ke:${tone.edge}"><span class="fface">
    <span class="fart"><img src="../assets/cards/portrait-${f.art}.png" alt=""></span>
    <span class="ftxt"><b>${esc(f.name)}</b><small>${esc(L.CONCEPTS['family:' + key].fact)}</small><em class="num">${esc(t('instruments', { n }))}</em></span></span></button>`;
}

/*
 * Değerler (ch. 14 §5): the foundation's Dore Mimi Müzikle Değerler Eğitimi. What it is comes from the site's own
 * vision text (Turkish in every language, as the foundation's site texts are); the parts the app already has open
 * them, and the part it does not have yet says so ("Hazırlanıyor"), rather than a page that pretends. The games part
 * goes to the Oyna tab: Öğren has no play button (ch. 14 §10).
 */
function valuesTab() {
  const part = (ic, title, line, attrs) => `<button class="vpart${attrs ? '' : ' wait'}" ${attrs ?? 'disabled'}><span class="sq">${icon(ic)}</span>
    <span class="mt"><b>${esc(title)}</b><small>${esc(line)}</small></span>${attrs ? icon('IconChevronRight', 'chev') : `<span class="badge soonb">${esc(t('preparing'))}</span>`}</button>`;
  return `<div class="card values"><span class="eyebrow">${esc(t('values.eyebrow'))}</span><p class="p ink"${TRL()}>${esc(VISION)}</p></div>
    ${ribbon(t('values.parts'), ' small')}
    <div class="card menu">${[
      part('IconNote', t('values.songs'), t('values.songs.line'), 'data-go="#/cal"'),
      part('IconCards', t('values.games'), t('values.games.line'), 'data-go="#/"'),
      part('IconBook', t('values.books'), t('values.books.line'), null),
    ].join('')}</div>`;
}
const SIGN_GLYPH = { bemol: '♭', diyez: '♯', fa: '𝄢', sol: '𝄞', naturel: '♮', porte: '𝄚', cizgi: '𝄂' };
function signTile(c) {
  if (flipped.has(c.key)) {
    return `<button class="sign-tile back" data-flip="${c.key}" style="--c:${c.color}"><span class="m">${esc(c.meaning)}</span><span class="chunky indigo small open" data-push="#/isaret-kategori/${c.key}"><span class="face">${esc(t('open'))}</span></span></button>`;
  }
  return `<button class="sign-tile" data-flip="${c.key}" style="--c:${c.color};--e:${edge(c.color)}"><span class="g music">${SIGN_GLYPH[c.key]}</span><b>${esc(c.name)}</b></button>`;
}

function signCategory(key) {
  const c = L.SIGN_CATEGORIES.find(x => x.key === key);
  if (!c) return missing('isaret-kategori/' + key);
  const cards = L.SIGN_CARDS.filter(x => x.category === key);
  return `<div class="stack">
    <div class="sign-hero" style="--c:${c.color};--e:${edge(c.color)}"><span class="g music">${SIGN_GLYPH[key]}</span><div><b>${esc(c.name)}</b><small>${esc(c.meaning)}</small></div></div>
    ${note(t('sign.category.note'))}
    <div class="card list">${cards.map(k => `<button class="lrow" data-push="#/isaret/${k.id}"><span class="sq letter music" style="background:${c.color}">${esc(k.symbol)}</span><span class="mt"><b>${esc(k.name)}</b><small>${esc(k.definition)}</small></span>${icon('IconChevronRight', 'chev')}</button>`).join('')}</div>
  </div>`;
}

let signTab = 1;
function signCard(id) {
  const q = deck.find('sign:' + id);
  if (!q) return missing('isaret/' + id);
  const c = L.SIGN_CATEGORIES.find(x => x.key === L.SIGN_CARDS.find(k => k.id === id).category);
  return `<div class="stack">
    <div class="face-card big" style="--accent:${q.accent};--accent-deep:${readable(q.accent)}"><span class="chip">${esc(q.answer)}</span><div class="symbol">${esc(q.symbol)}</div></div>
    <div class="card ans" style="--accent-deep:${readable(q.accent)}"><span class="s">${esc(q.symbol)}</span><div><small>${esc(t('sign.name'))}</small><b>${esc(q.answer)}</b><small>${esc(c.name)}</small></div></div>
    ${explainHtml(q, signTab, 'data-sekme')}</div>`;
}

/** The sign's Tanım / Çocuk anlatımı block, shared by the sign card page and the game's information card. */
function explainHtml(q, tab, attr) {
  const ex = q.explanation;
  const concept = L.CONCEPTS[q.conceptIds[0]]?.name ?? '';
  const tabs = `<div class="tabs2"><button class="chunky tabbtn${tab === 0 ? ' active' : ''}" ${attr}="0"><span class="face">${esc(t('explain.definition'))}</span></button>
    <button class="chunky tabbtn${tab === 1 ? ' active' : ''}" ${attr}="1"><span class="face">${esc(t('explain.kids'))}</span></button></div>`;
  if (tab === 0) {
    return `${tabs}<div class="card def page-in" style="--accent-deep:${readable(q.accent)}"><div class="row"><span class="avatar av">${esc(q.symbol)}</span><div><div class="h2">${esc(q.answer)}</div>
      <div class="caption" style="color:${readable(q.accent)}">${esc(concept)}</div></div></div><p class="p">${esc(ex.definition)}</p></div>`;
  }
  let visual = `<div class="card"><div class="big-sym" style="color:${q.accent}">${esc(q.symbol)}</div></div>`;
  if (ex.kidsVisual?.startsWith('piano')) visual = `<div class="card piano-card"><span class="caption">${esc(t('piano.tap'))}</span>${pianoHtml(ex.kidsVisual)}</div>`;
  if (ex.kidsVisual?.startsWith('clef-face')) visual = clefHtml(q, ex.kidsVisual === 'clef-face-fa');
  return `${tabs}<div class="page-in" style="display:flex;flex-direction:column;gap:12px;--accent:${q.accent};--accent-deep:${readable(q.accent)};--accent-read:${readable(q.accent)}">
    <div class="kids"><img class="mimi" data-sprite="mimi-wave" src="${frame('mimi-wave', 0)}" alt="Mimi"><div class="say">${esc(ex.kids ?? ex.definition)}</div></div>${visual}</div>`;
}

/** InstrumentPageViewModel.InstrumentFor: the quiz deck's instrument with the same name (Klarinet is "Klarnet" there). */
const quizKeyOf = name => Object.keys(INSTRUMENTS_TR).find(k => slug(INSTRUMENTS_TR[k].name) === slug(name) || (slug(name) === 'klarinet' && k === 'clarinet'));
const videosFor = d => VIDEOS.filter(v => v.page === d.riddle || slug(v.page ?? '').endsWith(slug(d.name)) || slug(v.title).startsWith(slug(d.name)));
/*
 * An instrument's page, information only (ch. 14 §10): no "Bu çalgıyla oyna" and no "Kendini dene" cards to turn over.
 * Those were the game's Çevir cards under another name, and the owner wants those only as the help inside an Oyna
 * round. The song keeps its row: the song page in Çal has its own round.
 */
function instrumentPage(key) {
  const d = L.DIRECTORY.find(x => slug(x.name) === key);
  if (!d) return missing('calgi/' + key);
  const vids = videosFor(d);
  const s = songFor(d.name, SONGS);
  const accent = GROUP_COLORS[d.group];
  return `<div class="stack">
    <div class="inst-hero" style="--accent:${mixHex(accent, '#14107A', 0.35)}">
      <div class="ph"><img src="${photoOf(d.name)}" alt=""></div><div class="mt"><b>${esc(d.label)}</b><small>${esc(t(`family.${slug(d.group)}`))}</small></div></div>
    <div class="card"><p class="p strong">${esc(d.about)}</p></div>
    ${d.riddle ? `<button class="chunky purple" data-do="riddle"><span class="face">${icon('IconPlay')}${esc(t('instrument.riddle'))}</span></button>` : ''}
    <button class="chunky white" data-ext="doremimi.org"><span class="face">${icon('IconBook')}${esc(t('instrument.more'))}</span></button>
    ${vids.length ? `${ribbon(t('instrument.videos'))}<div class="vgrid">${vids.map(v => videoCard(v, true)).join('')}</div>` : ''}
    ${s ? `<button class="tile" data-song-in-cal="${s.slug}"><div class="card due-row song-card"><span class="sq">${icon('IconNote')}</span><span class="mt"><b>${esc(t('instrument.song'))}</b><small${TRL()}>${esc(s.title)}</small></span><span class="go">${icon('IconPlay')}</span></div></button>` : ''}
  </div>`;
}

// ───────────────────────── İzle (NR-40): every video, the riddles first (they left Öğren in ch. 14 §10)
const WATCH_KINDS = ['riddle', 'clip', 'interview', 'karaoke', 'intro'];
function watch() {
  return `<div class="stack">${note(t('izle.note'))}
    ${WATCH_KINDS.map(k => { const list = VIDEOS.filter(v => v.kind === k); return `${ribbon(t(`kind.${k}`))}<div class="vgrid">${list.map(v => videoCard(v, true)).join('')}</div>`; }).join('')}
    ${menu([menuRow('IconPlay', t('izle.youtube'), t('izle.youtube.line'), 'data-ext="youtube.com"')])}</div>`;
}

// ───────────────────────── Çal (NR-50): piano, Melodim, the 41 songs, the lyrics
function keyboardHtml2(base, id) {
  // Two octaves from `base` (a C): 14 white keys, 10 black (PianoKeyboard, MusicSongView.axaml:60-80).
  const whites = [], blacks = [];
  let w = 0;
  for (let m = base; m < base + 24; m++) {
    const pc = m % 12;
    if ([1, 3, 6, 8, 10].includes(pc)) blacks.push(`<span class="bk" data-key="${m}" style="left:calc(${w} * 100% / 14 - 3.2%)"></span>`);
    else { whites.push(`<span class="wk" data-key="${m}"></span>`); w++; }
  }
  return `<div class="keys" id="${id}" data-base="${base}"><div class="whites">${whites.join('')}</div>${blacks.join('')}</div>`;
}
let calFilter = '';
const songName = s => s.slug === 'ana-tema' ? t('song.allInstruments') : instName(s.instrument);
function playRoot() {
  const melodim = profile.melodim ?? [];
  const songs = SONGS.filter(s => s.slug !== 'ana-tema').sort((a, b) => songName(a).localeCompare(songName(b), lang))
    .filter(s => !calFilter || slug(entryOfSong(s)?.group ?? 'Diğer') === calFilter);
  return `<div class="stack">
    ${note(t('cal.note'))}
    ${ribbon(t('cal.free'))}
    <div class="card kb-card">${keyboardHtml2(60, 'free-keys')}<span class="caption c">${esc(t('cal.keys'))}</span></div>
    <button class="tile" ${melodim.length ? 'data-push="#/melodim"' : ''} id="melodim-card"><div class="card due-row"><span class="sq">${icon('IconNote')}</span><span class="mt"><b>${esc(t('page.melodim'))}</b><small class="num">${esc(melodim.length ? t('notes', { n: melodim.length }) : t('melodim.empty'))}</small></span>${melodim.length ? icon('IconChevronRight', 'chev') : ''}</div></button>
    ${ribbon(t('cal.songs'))}
    ${groupChips(calFilter, 'data-calf')}
    <div class="songs">${songs.map(s => `<button class="tile" data-push="#/sarki/${s.slug}"><div class="song-tile"><span class="ph"><img src="${songArt(s)}" alt="" loading="lazy"></span><b>${esc(songName(s))}</b></div></button>`).join('')}</div>
    ${ribbon(t('cal.lyrics'))}
    <div class="hscroll lyr">${LYRICS.map(l => `<button class="tile" data-push="#/sozler/${slug(l.instrument)}"><div class="card lyric"><b>${esc(instName(l.instrument))}</b><small${TRL()}>${esc(l.lines[0])}</small></div></button>`).join('')}</div>
  </div>`;
}

// The song page (MusicSongView.axaml; ch. 06 §10), on Çal's stack.
const songCache = new Map();
async function loadSong(slugName) {
  if (!songCache.has(slugName)) songCache.set(slugName, fetch(`data/songs/${slugName}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));
  return songCache.get(slugName);
}
const P = { events: null, render: null, lines: [], base: 60, playing: false, t0: 0, from: 0, idx: -1, raf: 0, label: '', concept: null, slug: null };
function songPage(slugName, melodim = false) {
  const s = melodim ? null : SONGS.find(x => x.slug === slugName);
  if (!melodim && !s) return missing('sarki/' + slugName);
  const entry = s && entryOfSong(s);
  const qk = entry && quizKeyOf(entry.name);
  const lyric = s && LYRICS.find(l => slug(l.instrument) === slug(s.instrument));
  P.concept = qk ? 'instrument:' + qk : null;
  return `<div class="stack">
    <div class="song-head"><span class="ph">${s ? `<img src="${songArt(s)}" alt="">` : icon('IconNote')}</span>
      <div class="mt"><span class="eyebrow">${esc(melodim ? t('page.melodim') : t('song.eyebrow'))}</span><b>${esc(s ? songName(s) : t('page.melodim'))}</b><small${s ? TRL() : ''}>${esc(s ? s.title : t('melodim.line'))}</small></div>
      <span class="eq" id="eq">${'<i></i>'.repeat(7)}</span></div>
    <div class="card karaoke" id="karaoke"${TRL()}><div class="now">♪ ♪ ♪</div><div class="next"></div></div>
    <div class="card kb-card">${keyboardHtml2(60, 'song-keys')}<span class="prog"><i id="prog"></i></span><span class="caption c">${esc(t('cal.keys'))}</span></div>
    <div class="two-btn"><button class="chunky primary large" data-song="toggle" id="song-toggle"><span class="face">${icon('IconPlay')}<span>${esc(t('song.play'))}</span></span></button>
      <button class="chunky white large sq-btn" data-song="stop" aria-label="${esc(t('song.stop'))}"><span class="face"><i class="stopsq"></i></span></button></div>
    ${lyric ? `<button class="chunky white" data-push="#/sozler/${slug(lyric.instrument)}"><span class="face">${icon('IconMic')}${esc(t('song.lyrics'))}</span></button>` : ''}
    ${/* No way into the game from a song (owner, 2026-11-16): the round belongs to Oyna. */''}
  </div>`;
}
async function setupSong(slugName, melodim = false) {
  stopSong();
  const token = P.token = {};
  let events;
  if (melodim) events = fromKeys(profile.melodim ?? []);
  else { try { events = sequence(await loadSong(slugName)); } catch { toast(t('song.failed'), '', true); return; } }
  if (P.token !== token) return;
  P.events = events; P.render = null; P.slug = slugName; P.from = 0; P.idx = -1;
  P.lines = karaokeLines(events);
  P.base = keyboardBase(events);
  const keys = $('#song-keys');
  if (keys) keys.outerHTML = keyboardHtml2(P.base, 'song-keys');
  showLine(-1);
}
function showLine(index) {
  const el = $('#karaoke');
  if (!el || !P.events) return;
  const lineNo = index >= 0 ? P.events[index].line : 0;
  const cur = P.lines.find(l => l.number === lineNo) ?? P.lines[0];
  const next = cur ? P.lines.find(l => l.number > cur.number && l.syllables.length) : null;
  const words = l => l.syllables.map(s => `<span class="${s.index < index ? 'sung' : s.index === index ? 'on' : ''}">${esc(s.text)}</span>`).join(' ');
  el.querySelector('.now').innerHTML = cur && cur.syllables.length ? words(cur) : '♪ ♪ ♪';
  el.querySelector('.next').innerHTML = next ? esc(next.syllables.map(s => s.text).join(' ')) : '';
}
function lightKey(midi, on) {
  const kb = $('#song-keys');
  if (!kb) return;
  kb.querySelectorAll('.lit').forEach(k => k.classList.remove('lit'));
  if (!on || midi < 0) return;
  const base = +kb.dataset.base;
  let m = midi; while (m < base) m += 12; while (m >= base + 24) m -= 12;
  kb.querySelector(`[data-key="${m}"]`)?.classList.add('lit');
}
function toggleSong() { if (P.playing) pauseSong(); else playSong(); }
function playSong() {
  if (!P.events || !P.events.length || P.playing) return;
  const from = P.from >= length(P.events) ? 0 : P.from;
  const isTheme = P.slug === 'ana-tema';
  const samples = renderSong(isTheme ? safeTheme(P.events) : P.events, from, from <= 0 ? 1.5 : 0.05);
  stopTheme();
  P.playing = true; P.from = from;
  sound.play(samples, t0 => { P.t0 = t0 ?? sound.now(); tick(); });
  setToggle();
}
function tick() {
  if (!P.playing) return;
  const time = P.from + (sound.now() - P.t0);
  if (time >= length(P.events) + 0.4) { stopSong(); return; }
  const i = indexAt(P.events, time);
  const n = i >= 0 ? P.events[i] : null;
  const sounding = n && n.midi >= 0 && time < n.start + n.duration;
  lightKey(n?.midi ?? -1, sounding);
  if (i !== P.idx) { P.idx = i; showLine(i); }
  const prog = $('#prog'); if (prog) prog.style.width = `${Math.min(100, time / length(P.events) * 100)}%`;
  P.raf = requestAnimationFrame(tick);
}
function pauseSong() {
  if (!P.playing) return;
  P.from = Math.min(length(P.events), P.from + (sound.now() - P.t0));
  P.playing = false; sound.stop(); cancelAnimationFrame(P.raf); lightKey(-1, false); setToggle();
}
function stopSong() {
  P.playing = false; sound.stop(); cancelAnimationFrame(P.raf);
  P.from = 0; P.idx = -1; lightKey(-1, false); showLine(-1); setToggle();
  const prog = $('#prog'); if (prog) prog.style.width = '0';
}
function setToggle() {
  const b = $('#song-toggle'); if (!b) return;
  b.querySelector('.face').innerHTML = `${icon(P.playing ? 'IconPause' : 'IconPlay')}<span>${esc(P.playing ? t('song.pause') : t('song.play'))}</span>`;
  $('#eq')?.classList.toggle('on', P.playing);
}
/** Leaving a page stops its song (ch. 06 §9.8): a song must not play on under another page. */
function leavePage() { if (P.playing || P.events) { stopSong(); P.events = null; P.token = null; } }

function lyricsPage(key) {
  const l = LYRICS.find(x => slug(x.instrument) === key);
  if (!l) return missing('sozler/' + key);
  return `<div class="stack"><div class="card lyric-page"><span class="eyebrow">${esc(t('lyrics.eyebrow'))}</span><b class="h2"${TRL()}>${esc(l.title)}</b>
    ${l.lines.map(x => `<p${TRL()}>${esc(x)}</p>`).join('')}</div></div>`;
}

/** A key tap on any keyboard: its note, lit 220 ms, and one more note in Melodim (MelodyMemory, 16 at most). */
function tapKey(el) {
  const midi = +el.dataset.key;
  const k = keyIndex(midi);
  sound.key(k);
  el.classList.add('lit'); setTimeout(() => el.classList.remove('lit'), 220);
  profile.melodim = [...(profile.melodim ?? []), k].slice(-16);
  save();
  const card = $('#melodim-card');
  if (card) { card.dataset.push = '#/melodim'; card.querySelector('small').textContent = t('notes', { n: profile.melodim.length }); }
}

// ───────────────────────── the logo's tab, Dore Mimi Vakfı (dossier ch. 14 §6, §10; the rows are data/hub.js)
const whereAttr = w => w.push ? `data-push="${w.push}"` : w.go ? `data-go="${w.go}"` : `data-ext="${w.ext}"`;
/*
 * The banner carousel opens the tab, where the foundation's card with its one-line vision was (ch. 14 §10): the
 * foundation is the tab's title, so the card said it twice. Faaliyetler's three cards, then the grouped lists.
 */
function hub() {
  const rows = g => g.rows.map(([ic, k, w]) => menuRow(ic, t(`hub.${k}`), t(`hub.${k}.line`), whereAttr(w)));
  const cards = g => `<h3 class="group-title on-canvas">${esc(t(`hub.group.${g.key}`))}</h3><div class="acts3">${g.rows.map(([ic, k, w]) => `<button class="tile act-card" ${whereAttr(w)}><div class="card">
    <span class="sq">${icon(ic)}</span><span class="mt"><b>${esc(t(`hub.${k}`))}</b><small>${esc(t(`hub.${k}.line`))}</small></span>${icon('IconChevronRight', 'chev')}</div></button>`).join('')}</div>`;
  return `<div class="stack hub">
    ${carouselHtml()}
    ${HUB.map(g => g.cards ? cards(g) : group(t(`hub.group.${g.key}`), rows(g))).join('')}
  </div>`;
}

function whatIs() {
  const rows = [['IconCards', 'tab.kesfet', 'whatis.oyna', 'data-go="#/"'],
    ['IconBook', 'tab.ogren', 'whatis.ogren', 'data-go="#/ogren/isaretler"'],
    ['IconEye', 'tab.izle', 'whatis.izle', 'data-go="#/izle"'],
    ['IconNote', 'tab.cal', 'whatis.cal', 'data-go="#/cal"']];
  return `<div class="stack">
    <div class="toy nedir"><div class="in"><div class="head"><img src="../assets/brand/logo.png" alt=""><div><div class="eyebrow">${esc(t('whatis.eyebrow'))}</div><b>${esc(t('whatis.title'))}</b></div></div>
      <p class="lead">${esc(t('whatis.lead'))}</p></div></div>
    ${ribbon(t('whatis.inside'))}${menu(rows.map(([ic, k, line, a]) => menuRow(ic, t(k), t(line), a)))}
    ${ribbon(t('whatis.because'))}<div class="card"${TRL()}><ul class="mani">${MANIFESTO.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></div>`;
}

function booksPage() {
  return `<div class="stack">${note(t('books.note'))}
    ${menu(LIBRARY.map(l => menuRow('IconBook', l.title, l.subtitle, `data-ext="doremimi.org"${TRL()}`)))}</div>`;
}
function characters() {
  return `<div class="stack">${note(t('chars.note'))}
    ${CHARACTERS.map(c => `<div class="card char" style="--c:${c.color}"><img src="../assets/site/characters/${c.image}" alt="${esc(c.name)}"><div>
      <b class="h2"${TRL()}>${esc(c.greeting)}</b><p class="p"${TRL()}>${esc(c.bio)}</p>
      <dl><dt>${esc(t('chars.instruments'))}</dt><dd${TRL()}>${esc(c.instruments)}</dd><dt>${esc(t('chars.trait'))}</dt><dd${TRL()}>${esc(c.trait)}</dd></dl></div></div>`).join('')}</div>`;
}
const pills = list => `<div class="pills"${TRL()}>${list.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
const people = list => `<div class="card list"${TRL()}>${list.map(([n, r]) => `<div class="lrow static"><span class="sq letter" style="background:var(--indigo)">${esc(n[0])}</span><span class="mt"><b>${esc(n)}</b><small>${esc(r)}</small></span></div>`).join('')}</div>`;
/** The foundation's own texts stay Turkish in every language (ch. 14 §11); a line says so where they start. */
const trOnly = () => lang === 'tr' ? '' : `<span class="caption on-canvas tr-only">${esc(t('trOnly'))}</span>`;
function foundation() {
  return `<div class="stack">${trOnly()}
    <div class="card"><span class="eyebrow">${esc(t('vakif.news'))}</span><b class="h2"${TRL()}>${esc(NEWS)}</b></div>
    <div class="card"><span class="eyebrow">${esc(t('vakif.vision'))}</span><p class="p ink"${TRL()}>${esc(VISION)}</p></div>
    ${ribbon(t('vakif.board'))}${people(BOARD)}
    ${ribbon(t('vakif.founders'))}${pills(FOUNDERS)}</div>`;
}
const teamPage = () => `<div class="stack">${note(t('ekip.note'))}${people(TEAM)}${ribbon(t('ekip.advisors'))}${pills(ADVISORS)}</div>`;
const scholarships = () => `<div class="stack">${note(t('burs.note'))}
  ${[['burs.si', 'burs.si.line'], ['burs.mi', 'burs.mi.line']].map(([k, x]) => `<div class="card"><span class="badge soonb">${esc(t('preparing'))}</span><b class="h2">${esc(t(k))}</b><p class="p">${esc(t(x))}</p></div>`).join('')}
  <button class="chunky blue" data-ext="e-posta"><span class="face">${icon('IconBell')}${esc(t('burs.notify'))}</span></button></div>`;
const field = (ph, tall = false) => tall ? `<textarea class="field" placeholder="${esc(ph)}" rows="4"></textarea>` : `<input class="field" placeholder="${esc(ph)}">`;
const volunteer = () => `<div class="stack">${note(t('gonullu.note'))}
  <div class="card form"><div class="two-btn eq2">${field(t('form.name'))}${field(t('form.surname'))}</div>${field(t('form.email'))}${field(t('form.phone'))}${field(t('gonullu.letter'), true)}
  <button class="chunky blue" data-ext="e-posta"><span class="face">${esc(t('gonullu.send'))}</span></button></div></div>`;
function contact() {
  return `<div class="stack">
    <div class="card list">${CONTACTS.map(([title, p, mail]) => `<div class="lrow static"${TRL()}><span class="sq" style="background:var(--navy)">${icon('IconPhone')}</span><span class="mt"><small>${esc(title)}</small><b>${esc(p)}</b>${mail ? `<small>${esc(mail)}</small>` : ''}</span>
      <button class="chunky white small" data-ext="e-posta" aria-label="${esc(t('form.email'))}"><span class="face">${icon('IconMail')}</span></button></div>`).join('')}</div>
    ${ribbon(t('iletisim.write'))}<div class="card form">${field(t('form.email'))}${field(t('iletisim.message'), true)}<button class="chunky indigo" data-ext="e-posta"><span class="face">${esc(t('iletisim.send'))}</span></button></div></div>`;
}
// The hub's pages of ch. 14 §6. Where the foundation has nothing to show yet the page says it is being prepared
// ("Hazırlanıyor"), never a made-up date or amount.
const newsletter = () => `<div class="stack"><div class="card news"><b class="h3">${esc(t('hub.bulten'))}</b><p class="p">${esc(t('bulten.line'))}</p>
  <div class="sub">${field(t('bulten.email'))}<button class="chunky yellow" data-ext="e-posta"><span class="face">${esc(t('bulten.subscribe'))}</span></button></div></div></div>`;
const waiting = (title, text) => `<div class="card wait-card"><span class="badge soonb">${esc(t('preparing'))}</span><b class="h3">${esc(title)}</b><p class="p">${esc(text)}</p></div>`;
const support = () => `<div class="stack">${waiting(t('hub.destek'), t('destek.wait'))}
  <button class="chunky white" data-push="#/iletisim"><span class="face">${icon('IconPhone')}${esc(t('destek.contact'))}</span></button></div>`;
const partners = () => `<div class="stack">${note(t('destekciler.note'))}${pills(PARTNERS)}</div>`;
// The riddles and the scores moved out of Öğren (ch. 14 §10): İzle lists every riddle, the books page the materials.
const events = () => `<div class="stack">${note(t('etkinlik.note'))}
  ${waiting(t('etkinlik.concerts'), t('etkinlik.concerts.wait'))}
  ${menu([menuRow('IconPlay', t('kind.riddle'), t('etkinlik.riddles.line'), 'data-go="#/izle"'),
    menuRow('IconBook', t('etkinlik.materials'), t('etkinlik.materials.line'), 'data-push="#/kitaplar"')])}</div>`;
const legalList = () => `<div class="stack">${menu([['IconLock', 'gizlilik'], ['IconBook', 'kosullar'], ['IconInfo', 'kvkk']].map(([ic, k]) => menuRow(ic, t(`legal.${k}`), t('legal.draft'), `data-push="#/metin/${k}"`)))}</div>`;
/** The legal drafts are the foundation's lawyers' to word and stay Turkish; the help page is the app's own and is not. */
function legalPage(key) {
  if (key === 'yardim') return `<div class="stack">${L.FAQ.map(([h, b]) => `<div class="card"><b class="h3">${esc(h)}</b><p class="p">${esc(b)}</p></div>`).join('')}</div>`;
  const doc = LEGAL[key];
  if (!doc) return missing('metin/' + key);
  return `<div class="stack">${trOnly()}${doc.draft ? `<div class="card note"${TRL()}><p class="p strong" style="color:var(--text-gold)">${esc(DRAFT_NOTE)}</p></div>` : ''}
    ${doc.sections.map(([h, b]) => `<div class="card"${TRL()}><b class="h3">${esc(h)}</b><p class="p">${esc(b)}</p></div>`).join('')}</div>`;
}
const about = () => `<div class="stack"><div class="card about"><img src="../assets/brand/logo.png" alt=""><b class="h1">doremimi</b><span class="caption num">${esc(t('about.version', { v: '0.1.73' }))}</span></div>
  <div class="card"><b class="h3">${esc(t('about.licences'))}</b><p class="p">${esc(t('about.licences.text'))}</p></div></div>`;
// The app's Tasarım sistemi page (ch. 03 §18.8) is a long component gallery; the demo shows its palette and buttons only.
const design = () => `<div class="stack">${note(t('design.note'))}
  <div class="card"><div class="swatches">${[['Navy', '#0A0A3C'], ['Indigo', '#14107A'], ['Steel', '#1C6FAA'], ['Blue', '#2B9BFF'], ['Cyan', '#3FDAFF'], ['Yellow', '#FFCC00'], ['Orange', '#FF4D00'], ['Orchid', '#E85BE6'], ['Magenta', '#E0109E'], ['Mint', '#38E08C']].map(([n, c]) => `<span><i style="background:${c}"></i>${n}<small>${c}</small></span>`).join('')}</div></div>
  <div class="card" style="display:flex;flex-direction:column;gap:12px"><p class="p">${esc(t('design.line'))}</p>
    <button class="chunky primary"><span class="face">${esc(t('design.primary'))}</span></button><button class="chunky white"><span class="face">${esc(t('design.secondary'))}</span></button><button class="chunky giant oyna"><span class="face">${esc(t('oyna.button'))}</span></button></div></div>`;

// ───────────────────────── Profilim (NR-60): the child header, progress, and the family's rows
const GUEST = { id: null, nameKey: 'guest', age: '', image: 'mimi.png' };
// The two children of the app's snapshot preset (54-who-is-playing.png); their names are the owner's call (ch. 10 O-18).
const CHILDREN = [{ id: 'ada', name: 'Ada', age: '6-7', image: 'mimi.png' }, { id: 'can', name: 'Can', age: '8-9', image: 'dore.png' }];
const kidName = k => k.nameKey ? t(k.nameKey) : k.name;
const kidAge = k => k.age ? t('age', { range: k.age }) : '';
function profilePage() {
  const kid = childOf();
  const totalStars = profile.stars ?? 0;
  const instr = DIRECTORY_TR.length, riddles = DIRECTORY_TR.filter(d => d.riddle).length;
  const general = deck.concepts.length ? deck.concepts.reduce((a, c) => a + mastery.conceptMastery(c, deck), 0) / deck.concepts.length : 0;
  const seen = (profile.seen ?? []).length;
  // Slim rows on white (ch. 13): the old slate panels put white labels on grey at about 1.4:1.
  const bar = (label, v, text) => `<div class="prow"><span>${esc(label)}</span><em class="num">${esc(text)}</em><span class="slim"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></span></div>`;
  const earned = L.BADGES.filter(b => profile.badges.includes(b.id));
  return `<div class="stack">
    <div class="card child-head"><div class="who-line"><span class="avatar big"><img src="../assets/site/characters/${kid.image}" alt=""></span><div class="mt"><b class="h2">${esc(kidName(kid))}</b>${kid.age ? `<small>${esc(kidAge(kid))}</small>` : ''}</div></div>
      <button class="chunky white" data-do="switcher"><span class="face">${icon('IconSmile')}${esc(t('who.title'))}</span></button></div>
    <div class="card prof-counts"><span><b class="num">${profile.badges.length}</b>${esc(t('profile.badges', { n: profile.badges.length }))}</span><span><b class="num">${profile.rounds ?? 0}</b>${esc(t('profile.rounds', { n: profile.rounds ?? 0 }))}</span><span><b class="num">${totalStars}</b>${esc(t('profile.stars', { n: totalStars }))}</span></div>
    ${ribbon(t('profile.progress'))}<div class="card plist">${bar(t('profile.general'), general, pct(general))}${bar(t('profile.instruments'), seen / instr, `${pct(seen / instr)} (${seen}/${instr})`)}${bar(t('profile.riddles'), 0, `${pct(0)} (0/${riddles})`)}</div>
    ${ribbon(t('profile.stats'))}<div class="card plist stats">${[['stats.rounds', profile.rounds ?? 0], ['stats.best', profile.best ?? 0], ['stats.answered', profile.answered ?? 0]].map(([k, v]) => `<div class="srow"><span>${esc(t(k))}</span><b class="num">${v}</b></div>`).join('')}</div>
    ${earned.length ? `${ribbon(t('profile.badgeList'))}<div class="card badges">${earned.map(b => `<span class="bdg">${medalHtml(b)}<small>${esc(b.name)}</small></span>`).join('')}</div>` : ''}
    ${group(t('profile.family'), [
      menuRow('IconGrid', t('page.ayarlar'), t('profile.settings.line'), 'data-push="#/ayarlar"'),
      menuRow('IconLock', t('page.hesabim'), t('profile.account.line'), 'data-do="hesabim"'),
      menuRow('IconStar', t('page.ebeveyn-paneli'), t('profile.panel.line'), 'data-do="panel"')])}
  </div>`;
}
const SETTINGS = ['motion', 'buttons', 'music', 'notify'];
/** A segmented choice on a white card: Zorluk and Dil draw the same way. */
const segmented = (key, options, on, attr) => `<div class="card zorluk"><span class="mt"><b>${esc(t(`settings.${key}`))}</b><small>${esc(t(`settings.${key}.line`))}</small></span>
    <div class="ztrack" role="radiogroup" aria-label="${esc(t(`settings.${key}`))}">${options.map(([v, x]) => `<button class="zopt${on === v ? ' on' : ''}" role="radio" aria-checked="${on === v}" ${attr}="${v}">${esc(x)}</button>`).join('')}</div></div>`;
function settingsPage() {
  const s = profile.settings;
  // Zorluk (ch. 14 §4): the level the first game asked, changeable here; it sets the ceiling of what is dealt. Dil
  // (ch. 14 §11): each language under its own name, so a child who cannot read the current one still finds theirs.
  return `<div class="stack">${ribbon(t('settings.game'), ' small')}${segmented('zorluk', L.DIFFICULTIES.map(d => [d.key, d.name]), profile.difficulty, 'data-zorluk')}
    ${segmented('dil', LANGS.map(l => [l.key, l.name]), lang, 'data-dil')}
    ${SETTINGS.map(k => `<button class="tile" data-set="${k}"><div class="card toggle"><span class="mt"><b>${esc(t(`settings.${k}`))}</b><small>${esc(t(`settings.${k}.line`))}</small></span><span class="sw${s[k] ? ' on' : ''}"><i></i></span></div></button>`).join('')}
    ${ribbon(t('settings.texts'), ' small')}<div class="card menu plain">${[['legal.gizlilik', '#/metin/gizlilik'], ['legal.kosullar', '#/metin/kosullar'], ['legal.kvkk', '#/metin/kvkk'], ['page.yardim', '#/yardim'], ['page.hakkinda', '#/hakkinda']].map(([k, h]) => `<button class="mrow" data-push="${h}"><span class="mt"><b>${esc(t(k))}</b></span></button>`).join('')}</div></div>`;
}
const account = () => `<div class="stack"><div class="card who-card"><b class="h3">${esc(t('guest'))}</b><small class="caption">${esc(t('account.none'))}</small></div>
  <button class="chunky green" data-do="soon"><span class="face">${esc(t('account.create'))}</span></button>
  ${ribbon(t('account.children'), ' small')}<button class="chunky blue" data-do="soon"><span class="face">${esc(t('who.add'))}</span></button>
  ${ribbon(t('account.lock'), ' small')}<button class="chunky white" data-do="soon"><span class="face">${esc(t('account.pin'))}</span></button>
  <button class="chunky indigo" data-do="soon"><span class="face">${esc(t('account.signout'))}</span></button><span class="caption on-canvas">${esc(t('account.signout.line'))}</span>
  <button class="chunky orange" data-do="wipe"><span class="face">${esc(t('account.wipe'))}</span></button></div>`;
const parentPanel = () => { const kid = childOf(); return `<div class="stack"><div class="card child-head"><span class="avatar big"><img src="../assets/site/characters/${kid.image}" alt=""></span><div class="mt">
  <b class="h3">${esc(kidName(kid))}</b><span class="p num">${esc(t('panel.line1', { cards: profile.answered ?? 0, days: profile.days.length, seen: Object.keys(profile.mastery).length }))}</span>
  <small class="num">${esc(t('panel.line2', { instruments: (profile.seen ?? []).length, badges: profile.badges.length }))}</small></div></div>
  <span class="caption on-canvas">${esc(t('panel.local'))}</span><button class="chunky white" data-do="soon"><span class="face">${esc(t('account.pin'))}</span></button></div>`; };

/** Each pushed page: its title (a key, or a function of its argument) and its body. */
const PAGES = {
  'isaret-kategori': { title: k => L.SIGN_CATEGORIES.find(c => c.key === k)?.name ?? '', html: signCategory },
  isaret: { title: id => L.SIGN_CARDS.find(c => c.id === id)?.name ?? '', html: signCard },
  calgi: { title: k => L.DIRECTORY.find(d => slug(d.name) === k)?.label ?? '', html: instrumentPage },
  sarki: { title: s => { const x = SONGS.find(y => y.slug === s); return x ? songName(x) : ''; }, html: s => songPage(s) },
  sozler: { title: k => { const l = LYRICS.find(x => slug(x.instrument) === k); return l ? instName(l.instrument) : ''; }, html: lyricsPage },
  melodim: { title: 'page.melodim', html: () => songPage(null, true) },
  'doremimi-nedir': { title: 'page.doremimi-nedir', html: whatIs },
  kitaplar: { title: 'page.kitaplar', html: booksPage },
  'dore-ve-mimi': { title: 'hub.dore-ve-mimi', html: characters },
  vakif: { title: 'page.vakif', html: foundation },
  ekip: { title: 'hub.ekip', html: teamPage },
  burslar: { title: 'hub.burslar', html: scholarships },
  gonullu: { title: 'hub.gonullu', html: volunteer },
  iletisim: { title: 'hub.iletisim', html: contact },
  yardim: { title: 'page.yardim', html: () => legalPage('yardim') },
  metin: { title: k => (LEGAL[k] ? t(`legal.${k}`) : ''), html: legalPage },
  hakkinda: { title: 'page.hakkinda', html: about },
  etkinlikler: { title: 'hub.etkinlikler', html: events },
  bulten: { title: 'hub.bulten', html: newsletter },
  destek: { title: 'hub.destek', html: support },
  destekciler: { title: 'hub.destekciler', html: partners },
  yasal: { title: 'hub.yasal', html: legalList },
  tasarim: { title: 'page.tasarim', html: design },
  profil: { title: 'page.profil', html: profilePage },
  ayarlar: { title: 'page.ayarlar', html: settingsPage },
  hesabim: { title: 'page.hesabim', html: account },
  'ebeveyn-paneli': { title: 'page.ebeveyn-paneli', html: parentPanel },
};
const ROOTS = { kesfet: home, ogren: learn, doremimi: hub, izle: watch, cal: playRoot };

/** Work a page needs after its HTML is in: the song page loads its notes; an instrument page counts as seen. */
function afterRender() {
  if (route.page === 'sarki') setupSong(route.arg);
  if (route.page === 'melodim') setupSong(null, true);
  if (route.page === 'calgi') {
    const seen = new Set(profile.seen ?? []);
    const d = L.DIRECTORY.find(x => slug(x.name) === route.arg);
    if (!seen.has(route.arg) && d) {
      seen.add(route.arg); profile.seen = [...seen];
      // Opening an instrument for the first time is recorded as before (learning.json seenInstrument; ch. 02 §3.6):
      // the number is the backend's record of progress and is never drawn (ch. 14 §14), so the toast only names it.
      const lv = addXp(LEARNING, profile.level, profile.xp, LEARNING.xp.seenInstrument);
      profile.level = lv.level; profile.xp = lv.xp; save();
      toast(t('instrument.discovered', { name: d.label }));
    }
  }
  // Öğren's tab row scrolls; the current tab is brought into view, or a tab opened from a link would be off screen.
  const row = $('.otabs'), on = row?.querySelector('.on');
  if (on) { row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2; row.classList.toggle('end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 2); }
  updatePill();
}
document.addEventListener('scroll', e => { const r = e.target; if (r.classList?.contains('otabs')) r.classList.toggle('end', r.scrollLeft + r.clientWidth >= r.scrollWidth - 2); }, true);

// ───────────────────────── overlays: Ebeveyn kilidi (A-30), Kim oynuyor? (A-31), the video player
const overlayHost = document.createElement('div');
overlayHost.className = 'overlay-host';
app.appendChild(overlayHost);
const overlay = { kind: null };
// The demo's own PIN, never the app's default (ch. 10 G-06): the snapshot tool uses the same one.
const DEMO_PIN = '135790';
const gate = { open: false, typed: '', wrong: 0, lockedUntil: 0, reason: '', then: null };
function openGate(reason, then) {
  Object.assign(gate, { open: true, typed: '', reason, then, msg: null });
  renderGate();
}
function closeGate() { gate.open = false; gate.then = null; renderOverlay(); }
function gateDigit(d) {
  if (Date.now() < gate.lockedUntil) return;
  if (d === 'x') { gate.typed = gate.typed.slice(0, -1); return renderGate(); }
  if (d === 'ok') { if (gate.typed.length < 6) return; }
  else if (gate.typed.length < 6) gate.typed += d;
  if (gate.typed.length === 6) {
    if (gate.typed === DEMO_PIN) { const then = gate.then; gate.wrong = 0; closeGate(); then?.(); return; }
    gate.wrong++; gate.typed = '';
    // Three wrong in a row lock the keys for 30 s (ParentGate.cs:60-68).
    if (gate.wrong >= 3) { gate.lockedUntil = Date.now() + 30_000; gate.wrong = 0; setTimeout(renderGate, 30_100); }
    gate.msg = 'wrong';
  }
  renderGate();
}
function renderGate() {
  if (!gate.open) return;
  const locked = Date.now() < gate.lockedUntil;
  const line = gate.reason === 'parent' ? t('gate.parent') : t('gate.leave');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'ok'];
  overlayHost.innerHTML = `<div class="overlay scrim"><div class="gate"><span class="pop-ribbon">${icon('IconLock')}${esc(t('gate.title'))}</span>
    <button class="chunky white close x" data-do="gate-close" aria-label="${esc(t('close'))}"><span class="face">${icon('IconCross')}</span></button>
    <p class="p ink c">${esc(line)}</p>${gate.reason !== 'parent' ? `<span class="host">${icon('IconExternal')}${esc(gate.reason)}</span>` : ''}
    <div class="pin-dots${gate.msg === 'wrong' ? ' bad' : ''}">${Array.from({ length: 6 }, (_, i) => `<i class="${i < gate.typed.length ? 'on' : ''}"></i>`).join('')}</div>
    ${locked ? `<p class="p c wrong">${esc(t('gate.locked'))}</p>` : gate.msg === 'wrong' ? `<p class="p c wrong">${esc(t('gate.wrong'))}</p>` : ''}
    <div class="pad">${keys.map(k => `<button class="chunky ${k === 'x' ? 'orange' : k === 'ok' ? 'green' : 'white'}" data-pin="${k}"${locked ? ' disabled' : ''}${k === 'x' ? ` aria-label="${esc(t('erase'))}"` : k === 'ok' ? ` aria-label="${esc(t('ok'))}"` : ''}><span class="face">${k === 'x' ? icon('IconErase') : k === 'ok' ? icon('IconCheck') : k}</span></button>`).join('')}</div>
    <button class="chunky indigo" data-do="gate-close"><span class="face">${esc(t('cancel'))}</span></button></div></div>`;
}

function openOverlay(kind, data) { overlay.kind = kind; overlay.data = data; renderOverlay(); }
function closeOverlay() { overlay.kind = null; renderOverlay(); }
function renderOverlay() {
  if (gate.open) return renderGate();
  if (overlay.kind === 'switcher') {
    // A list of rows on the canvas (AccountsOverlay, ch. 13): the Navy sheet made every title ink-on-Navy, and the
    // 96 px portraits fit two children on a small phone, not four.
    overlayHost.innerHTML = `<div class="overlay who-ov"><button class="chunky white close x" data-do="ov-close" aria-label="${esc(t('close'))}"><span class="face">${icon('IconCross')}</span></button>
      <b class="ttl">${esc(t('who.title'))}</b><div class="card list kids2">${CHILDREN.map(c => `<button class="lrow kid${profile.child === c.id ? ' on' : ''}" data-child="${c.id}"><span class="avatar"><img src="../assets/site/characters/${c.image}" alt=""></span><span class="mt"><b>${esc(kidName(c))}</b><small>${esc(kidAge(c))}</small></span>${profile.child === c.id ? icon('IconCheck', 'chev') : icon('IconChevronRight', 'chev')}</button>`).join('')}</div>
      <button class="chunky white" data-do="soon"><span class="face">${esc(t('who.add'))}</span></button></div>`;
  } else if (overlay.kind === 'player') {
    const v = VIDEOS.find(x => x.id === overlay.data);
    overlayHost.innerHTML = `<div class="overlay scrim player-ov"><div class="player"><div class="frame"><img src="../assets/site/${esc(v.thumb)}" alt=""><button class="big-play" data-do="vplay" aria-label="${esc(t('player.play'))}">${icon('IconPlay')}</button></div>
      <div class="pmeta"><b${TRL()}>${esc(v.title)}</b><small>${esc(t(`kind.${v.kind}`))} · YouTube</small></div>
      <p class="p c">${esc(t('player.offline'))}</p>
      <button class="chunky white" data-do="ov-close"><span class="face">${esc(t('close'))}</span></button></div></div>`;
  } else overlayHost.innerHTML = '';
}

// ───────────────────────── the startup theme and the Şimdi çalıyor pill (ch. 06 §7; OC-17: raised, body → Çal)
const theme = { played: false, playing: false, until: 0 };
async function playTheme() {
  if (theme.playing || !profile.settings.music) return;
  let events;
  try { events = safeTheme(sequence(await loadSong('ana-tema'))); } catch { return; }
  theme.played = true; theme.playing = true;
  sound.play(renderSong(events), () => {});
  theme.until = performance.now() + length(events) * 1000 + 600;
  updatePill();
  setTimeout(() => { if (performance.now() >= theme.until - 50) { theme.playing = false; updatePill(); } }, length(events) * 1000 + 700);
}
function stopTheme() { if (!theme.playing) return; theme.playing = false; sound.stop(); updatePill(); }
function updatePill() {
  let pill = $('#pill');
  const show = theme.playing && gameEl.hidden;
  if (!show) { pill?.remove(); return; }
  if (pill) return;
  app.insertAdjacentHTML('beforeend', `<div class="theme-pill" id="pill"><button class="tile body" data-do="pill" aria-label="${esc(t('pill.open'))}"><span class="eqs on"><i></i><i></i><i></i><i></i></span><span class="mt"><small>${esc(t('pill.now'))}</small><b>${esc(t('pill.theme'))}</b></span></button>
    <button class="chunky white close" data-do="pill-x" aria-label="${esc(t('song.stop'))}"><span class="face">${icon('IconCross')}</span></button></div>`);
}

// ───────────────────────── sound: the deck's context, the button notes
const sound = new Sound();
const melody = new ButtonMelody();
// Button notes on pointerdown, not click (D23), and only once something was tapped by a person.
document.addEventListener('pointerdown', e => {
  if (!e.isTrusted) return;
  const b = e.target.closest('button, .tile');
  if (!b || b.closest('.keys') || STILL) return;
  // A button's note is also the child's: Melodim keeps button presses as well as keyboard taps (MelodyMemory).
  if (profile.settings.buttons) { const k = melody.next(); sound.key(k); profile.melodim = [...(profile.melodim ?? []), k].slice(-16); save(); }
  // The theme plays once per launch when Oyna first shows; on the web it starts at the first tap (ch. 06 §7.7).
  if (!theme.played && route.tab === 'kesfet' && !route.page && profile.settings.music) { theme.played = true; playTheme(); }
}, true);

// ───────────────────────── the game (MusicCardGameViewModel.cs)
const G = { round: null, q: null, stage: null, answer: '', feedback: '', bad: false, outcome: null, outcomeSeq: 0, origin: null, roundId: 0,
  revealTab: 1, wrongPick: null, results: null, intro: null, cardSeq: 0, renderedSeq: -1, roundBadges: [], masteryBefore: {}, concept: null, fx: null };
let gameBg = null;

/*
 * A round. `origin` is the way in (lib/modes.js RoundOrigin) and decides the level and whether it may move; the
 * default is Oyna's, the one way in that is not a page of its own. `level` is the old `?seviye=` and the deck's
 * game.start, mapped to the origin that starts at that level, so old links still land.
 */
function openGame({ concept = null, origin = null, level = null, intro } = {}) {
  closeOverlaysOfShell();
  G.concept = concept;
  G.origin = origin ?? ORIGIN_OF_LEVEL[level] ?? RoundOrigin.Kesfet;
  rulesOf(G.origin);
  G.roundId = (G.roundId ?? 0) + 1;
  G.results = null; G.roundBadges = []; G.outcome = null;
  // The first game asks the child's level before anything else (ch. 14 §4), whatever the way in.
  const pages = [...(profile.difficulty ? [] : ['level']), ...L.INTRO_STEPS.map(x => x.key)];
  // `only`: a child who has seen the intro before but has no level yet (a profile from before ch. 14) is asked the
  // level and goes straight to the round.
  G.intro = (intro === true || (intro !== false && !profile.seenIntro) || !profile.difficulty)
    ? { step: 0, pages, only: intro !== true && profile.seenIntro } : null;
  deal();
  gameEl.hidden = false;
  gameEl.innerHTML = `<canvas class="backdrop" id="gbg" aria-hidden="true"></canvas><div class="g-head" id="ghead"></div><div class="g-body" id="gbody"></div><div id="gover"></div>`;
  gameEl.setAttribute('aria-label', t('game.title'));
  gameBg = new Backdrop($('#gbg'), { seed: 3, mood: moodOf(G.round.ladder.level), clearTop: safeTop(), reduced: REDUCED });
  gameBg.start();
  shellBg.stop();
  stopCarousel();
  leavePage(); stopTheme();
  showCard();
}

/** Deals the round for G's origin and concept under the child's level; again when the first game's level is chosen. */
function deal() {
  G.random = SUNUM ? seeded(11) : fromClock();
  const cards = G.concept === 'sunum' ? SUNUM_DECK.map(id => deck.find(id))
    : dealRound({ deck, origin: G.origin, concept: G.concept === 'karisik' ? null : G.concept, level: profile.difficulty, mastery, random: G.random, count: LEARNING.cardsPerRound });
  G.round = new LearningRound(cards, deck, ladderFor(G.origin, LEARNING.ladder), LEARNING, G.random);
  G.masteryBefore = Object.fromEntries(deck.concepts.map(c => [c, mastery.conceptMastery(c, deck)]));
}

function exitGame() {
  G.results = null; G.round = null;
  gameEl.hidden = true; gameEl.innerHTML = '';
  gameBg?.stop(); gameBg = null;
  shellBg.start();
  typing(false);
  // A round changes what the shell shows (a category's %, Profilim's counts), so the page under the game is rebuilt when the game
  // closes (OC-29: no stale hub).
  render();
}

function showCard() {
  const r = G.round;
  if (!r || r.isOver) return;
  G.q = r.current; G.stage = r.stage; G.answer = ''; G.feedback = ''; G.bad = false; G.outcome = null; G.revealTab = 1; G.wrongPick = null;
  G.cardSeq++;
  renderGame();
}

const isTypingStage = () => G.stage === Stage.Typing || G.stage === Stage.Tiles;
const canSend = () => G.stage === Stage.Typing ? G.answer.trim().length > 0 : G.stage === Stage.Tiles && G.round.tiles?.isFull;
const MAX_ANSWER = 32;  // MusicCardGameViewModel.cs:303

function pressKey(text) {
  if (G.stage === Stage.Typing) { const room = MAX_ANSWER - G.answer.length; if (room > 0) G.answer += text.slice(0, room); }
  else if (G.stage === Stage.Tiles) G.round.tiles.type(text);
  else return;
  renderSheet();
}
function pressBackspace() {
  if (G.stage === Stage.Typing) G.answer = G.answer.slice(0, -1);
  else if (G.stage === Stage.Tiles) G.round.tiles.backspace();
  else return;
  renderSheet();
}
function pressSend() { if (G.stage === Stage.Typing) submit(); else if (G.stage === Stage.Tiles) submitTiles(); }

function submit() {
  const typed = G.answer.trim();
  const res = G.round.submit(G.answer);
  if (res.verdict === 'Blank') return;
  if (res.verdict === 'Right' || res.verdict === 'Close') return solved(res);
  G.answer = '';
  G.feedback = t('game.wrongTyped', { typed });   // :243
  G.bad = true; G.stage = Stage.Tiles; G.fx = 'wrong';
  renderGame();
}

function submitTiles() {
  const res = G.round.submitTiles();
  if (res.verdict === 'Blank') return;
  if (res.verdict === 'Right' || res.verdict === 'Close') return solved(res);
  G.feedback = t('game.wrongTiles');   // :268
  G.bad = true; G.stage = Stage.Choices; G.fx = 'wrong';
  renderGame();
}

function pick(choice) {
  if (G.stage !== Stage.Choices) return;
  const right = G.round.choose(choice);
  if (right) return solved({ verdict: 'Right', answer: choice });
  G.fx = 'wrong';
  revealed(choice);
}

function dontKnow() { if (![Stage.Typing, Stage.Tiles, Stage.Choices].includes(G.stage)) return; G.round.dontKnow(); revealed(null); }
function flip() { if (G.stage !== Stage.Question) return; G.round.flip(); G.stage = Stage.Flipped; renderGame(); }

function grade(knew) {
  if (G.stage !== Stage.Flipped) return;
  G.round.grade(knew);
  endCard();
  // "A self-graded card has nothing left to show: the answer is already up" (:409-412): straight on.
  next();
  if (knew) { G.outcome = { praise: t('game.knewBadge') }; G.outcomeSeq++; renderGame(); }
}

function next() {
  if (!G.round) return;
  if (G.round.isOver) finish(); else showCard();
}

function solved(res) {
  const q = G.q;
  const o = endCard();
  G.feedback = res.verdict === 'Close' ? t('game.close', { answer: res.answer ?? q.answer }) : t('game.right');   // :453
  G.bad = false;
  G.outcome = { praise: t({ TypedFirstTry: 'game.firstTry', TypedWithTiles: 'game.withTiles' }[o.resolution] ?? 'game.rightPick') };
  G.outcomeSeq++; G.fx = 'right';
  renderGame();
}

function revealed(wrongPick) {
  endCard();
  G.wrongPick = wrongPick; G.feedback = ''; G.bad = false; G.outcome = null; G.revealTab = 1;
  renderGame();
}

/**
 * The card is over (:478-490): the round records it and deals the next one (which waits for Devam), the profile saves
 * it with its mastery and its progress number, the ladder shows any move, and badges are checked. The stage stays on
 * the card's end. The progress number (profile.xp, profile.level) is kept for the backend and never drawn (ch. 14 §14):
 * no chip, no bar, and no popup when it crosses a level.
 */
function endCard() {
  const ended = G.round.stage;
  const o = G.round.next();
  const lv = addXp(LEARNING, profile.level, profile.xp, o.xp);
  profile.level = lv.level; profile.xp = lv.xp;
  mastery.record(o.questionId, o.evidence);
  profile.ladder = levelName(o.levelAfter);   // saved for the app's snapshot shape; no round starts from it (ch. 14 §3)
  const day = today(DAY_SHIFT);
  if (!profile.days.includes(day)) profile.days.push(day);
  profile.answered = (profile.answered ?? 0) + 1;   // Profilim › İstatistikler › Cevaplanan soru
  G.stage = ended;
  // A move is silent in words (ch. 14 §2): the toast that named the new level went; the backdrop's mood still changes.
  if (o.move !== Move.None) gameBg?.setMood(moodOf(o.levelAfter), { celebrate: true, up: o.move === Move.Up });
  const earned = newlyEarned(L.BADGES, { mastery, deck, round: G.round.outcomes, days: profile.days }, profile.badges);
  profile.badges.push(...earned.map(b => b.id));
  G.roundBadges.push(...earned);
  save();
  return o;
}

function finish() {
  const r = G.round;
  const facts = pickConcepts(r.outcomes, deck, c => mastery.conceptMastery(c, deck), G.random, LEARNING.resultConcepts)
    .filter(id => L.CONCEPTS[id])
    .map(id => ({ id, info: L.CONCEPTS[id], before: G.masteryBefore[id] ?? 0, after: mastery.conceptMastery(id, deck) }));
  G.results = { stars: starsOf(r.outcomes, LEARNING.roundStars), right: r.outcomes.filter(o => isRight(o.resolution)).length, count: r.outcomes.length,
    facts, badges: G.roundBadges.slice() };
  // Profilim's counts: rounds played, the best round (cards known) and the stars (ch. 03 §16.2-16.4).
  profile.rounds = (profile.rounds ?? 0) + 1; profile.best = Math.max(profile.best ?? 0, G.results.right); profile.stars = (profile.stars ?? 0) + G.results.stars;
  save();
  renderGame();
}

function closeIntro() { if (!profile.difficulty) return; profile.seenIntro = true; save(); G.intro = null; renderGame(); }
/** The first game's level page: the answer is saved and, nothing played yet, the round is dealt again under it. */
function chooseLevel(key) {
  if (!G.intro || !L.DIFFICULTIES.some(d => d.key === key)) return;
  profile.difficulty = key; save();
  if (G.round && !G.round.outcomes.length) { deal(); showCard(); }
  G.intro.pages = G.intro.pages.filter(p => p !== 'level');
  G.intro.step = 0;
  if (G.intro.only) return closeIntro();
  renderGame();
}

function typing(on) {
  if (typing.last === on) return;
  typing.last = on;
  if (EMBED && parent !== window) parent.postMessage({ type: 'dm-typing', on }, '*');
}

// ───────────────────────── game drawing
function renderGame() {
  if (gameEl.hidden || !G.round) return;
  const r = G.round;
  const playing = !G.results;
  const done = r.outcomes.length;
  const ended = [Stage.Solved, Stage.Revealed, Stage.Graded].includes(G.stage);
  const current = Math.min(done + (ended ? 0 : 1), r.count);
  $('#ghead').innerHTML = `
    <button class="chunky white close" data-g="exit" title="${esc(t('game.exit'))}" aria-label="${esc(t('close'))}"><span class="face">${icon('IconCross')}</span></button>
    <div class="t"><b>${esc(t('game.title'))}</b>${playing ? `<small class="num">${esc(t('game.card', { i: Math.max(current, 1), n: r.count }))}</small>` : ''}</div>`;
  // The card owns the game screen, so its colour is the one accent (Accent.cs); the popups over it reset to ink.
  gameEl.style.cssText = toneVars(playing && G.q ? accentSet(G.q.accent) : INK_SET);
  const body = $('#gbody');
  body.style.visibility = playing ? '' : 'hidden';
  if (playing) {
    body.innerHTML = `<div class="card-area" id="carea">${cardAreaHtml()}</div><div class="answer-area" id="aarea">${answerHtml()}</div>`;
    if (G.renderedSeq !== G.cardSeq) G.renderedSeq = G.cardSeq;
    afterCardRender();
  }
  const head = $('#ghead');
  gameEl.style.setProperty('--below', `${head.offsetTop + head.offsetHeight + 10}px`);
  $('#gover').innerHTML = (G.results ? resultsHtml() : '') + (G.intro ? introHtml() : '');
  typing(playing && !G.intro && isTypingStage());
  G.fx = null;
}

// No ladder strip (ch. 14 §2): its three segments named the levels.

const accentVars = q => `--accent:${q.accent};--accent-deep:${readable(q.accent)};--accent-read:${readable(q.accent)};--edge:${edge(q.accent)}`;

/** QuestionCardViewModel (:580-607): the chip never names the answer. */
function chipOf(q) {
  if (q.kind === 'sign') return t('game.chip.sign');
  const inst = q.conceptIds.find(id => id.startsWith('instrument:'));
  const name = inst ? L.CONCEPTS[inst]?.name : null;
  return name && !normalise(q.answer).includes(normalise(name)) ? up(name) : t('game.chip.quiz');
}

function cardAreaHtml() {
  const q = G.q;
  const back = G.stage === Stage.Revealed || G.stage === Stage.Flipped;
  // The chip is the praise line alone (ch. 14 §14: it used to lead with "+N XP"). It plays once: a later redraw (a tab
  // on the information card) must not replay it.
  const chip = G.outcome && G.shownOutcome !== G.outcomeSeq ? `<div class="praise-chip" data-seq="${G.outcomeSeq}"><span class="toastb">${esc(G.outcome.praise)}</span></div>` : '';
  G.shownOutcome = G.outcomeSeq;
  if (back) return `<div class="back-scroll"><div class="back" style="${accentVars(q)}">${revealHtml(q)}</div></div>${chip}`;
  const dealt = G.renderedSeq !== G.cardSeq ? ' deal' : '';
  const solvedNow = G.stage === Stage.Solved;
  return `<div class="qcard${dealt}" style="${accentVars(q)}"><div class="face-card">
      <span class="chip">${esc(chipOf(q))}</span>
      <div class="symbol">${q.symbol ? esc(q.symbol) : `<span class="note-box">${icon('IconNote')}</span>`}</div>
      <div class="prompt">${esc(q.prompt)}</div>
      ${solvedNow ? `<div class="solved"><b>${esc(q.answer)}</b><small>${esc(G.feedback)}</small></div>` : ''}
    </div></div>${chip}`;
}

/** RevealCardView.axaml: the answer said kindly, then Tanım / Çocuk anlatımı for a sign, the facts for a question. */
function revealHtml(q) {
  const concept = L.CONCEPTS[q.conceptIds[0]]?.name ?? '';
  const head = `<div class="card ans">${q.symbol ? `<span class="s">${esc(q.symbol)}</span>` : '<span></span>'}<div>
    <small>${esc(t('game.reveal'))}</small><b>${esc(q.answer)}</b><small>${esc(concept)}</small>
    ${G.wrongPick ? `<small>${esc(t('game.yourPick', { pick: G.wrongPick }))}</small>` : ''}</div></div>`;
  if (q.kind !== 'sign') {
    const ex = q.explanation;
    const instKey = q.conceptIds.find(id => id.startsWith('instrument:'))?.slice(11);
    const inst = L.INSTRUMENTS[instKey];
    const fam = L.FAMILIES[inst.family];
    const facts = [[t('game.remember'), ex.tip], [t('game.about', { name: inst.name }), ex.instrumentSummary], [fam.name, ex.familyDescription]].filter(([, x]) => x);
    // A riddle video exists for the instrument when the site lists one for its page (InstrumentPageViewModel.VideosFor).
    const entry = DIRECTORY_TR.find(d => quizKeyOf(d.name) === instKey);
    const video = entry ? videosFor(entry)[0] : null;
    G.links = { video: video?.id ?? null, instrument: entry ? slug(entry.name) : null };
    return `${head}<div class="card"><div class="caption">${esc(t('game.question'))}</div><p class="p" style="color:var(--ink);font-weight:700">${esc(q.prompt)}</p></div>
      ${facts.map(([x, y]) => `<div class="card fact"><h3 class="h3">${esc(x)}</h3><p class="p">${esc(y)}</p></div>`).join('')}
      <div class="links2">${video ? `<button class="chunky white" data-g="video"><span class="face">${icon('IconPlay')}${esc(t('game.video'))}</span></button>` : '<span></span>'}
        ${G.links.instrument ? `<button class="chunky white" data-g="instrument">` : '<span hidden>'}<span class="face">${icon('IconBook')}${esc(t('game.instrumentPage'))}</span>${G.links.instrument ? '</button>' : '</span>'}</div>`;
  }
  return `${head}${explainHtml(q, G.revealTab, 'data-gtab')}`;
}

// Controls/PianoVisual.cs: a white key lights the black key after it (diyez) or before it (bemol); idle 4 s, it plays itself.
const HAS_BLACK_AFTER = [true, true, false, true, true, true, false];
const piano = { sel: -1, mode: 'sharp', idleSince: 0 };
const blackFor = (w, mode) => mode === 'sharp' ? (HAS_BLACK_AFTER[w] ? w : -1) : mode === 'flat' ? (w > 0 && HAS_BLACK_AFTER[w - 1] ? w - 1 : -1) : -1;
function pianoHtml(kind) {
  const mode = { 'piano-sharp': 'sharp', 'piano-flat': 'flat', 'piano-natural': 'natural' }[kind];
  if (piano.mode !== mode || piano.sel < 0) { piano.mode = mode; piano.sel = [0, 1, 2, 3, 4, 5, 6].find(w => mode === 'natural' || blackFor(w, mode) >= 0); }
  piano.idleSince = performance.now();
  return `<div class="piano" data-piano>${pianoInner()}</div>`;
}
function pianoInner() {
  const { sel, mode } = piano;
  const NAMES = t('piano.notes').split(' ');   // Do Re Mi … in tr and fr, C D E … in en
  const lit = blackFor(sel, mode);
  const blacks = HAS_BLACK_AFTER.map((has, i) => has && i < 6 ? `<span class="b${i === lit ? ' lit' : ''}" style="left:calc(8px + (100% - 16px) * ${(i + 1) / 7} - 4.5%)"></span>` : '').join('');
  const x = mode === 'natural' ? (sel + 0.5) / 7 : (lit + 1) / 7;
  const label = mode === 'natural' ? NAMES[sel] + '♮' : NAMES[sel] + (mode === 'flat' ? '♭' : '♯');
  return `<span class="lbl" style="left:calc(8px + (100% - 16px) * ${x})"><span>${label.slice(0, -1)}<span class="music">${label.slice(-1)}</span></span><i></i></span>
    <div class="bed"><div class="whites">${NAMES.map((n, i) => `<span class="w${i === sel ? ' sel' : ''}${mode === 'natural' ? ' nat' : ''}" data-w="${i}">${n}</span>`).join('')}</div>${blacks}</div>`;
}
setInterval(() => {
  const el = document.querySelector('[data-piano]');
  if (!el || REDUCED || performance.now() - piano.idleSince < 4000) return;
  do { piano.sel = (piano.sel + 1) % 7; } while (piano.mode !== 'natural' && blackFor(piano.sel, piano.mode) < 0);
  el.innerHTML = pianoInner();
}, 1600);

function clefHtml(q, fa) {
  return `<div class="card clef-card"><div class="clef-face">${esc(q.symbol)}<svg viewBox="0 0 150 170" aria-hidden="true">
      <circle cx="51" cy="57" r="13" fill="#fff" stroke="#1D1E2C" stroke-width="2.5"/><circle cx="85" cy="53" r="13" fill="#fff" stroke="#1D1E2C" stroke-width="2.5"/>
      <circle cx="51" cy="57" r="5" fill="#1D1E2C"/><circle cx="85" cy="53" r="5" fill="#1D1E2C"/>
      ${fa ? '<path transform="translate(34 76)" d="M34,6 C26,-2 10,0 2,10 C12,8 20,12 30,14 C32,14 34,12 34,10 C34,12 36,14 38,14 C48,12 56,8 66,10 C58,0 42,-2 34,6 Z" fill="#1D1E2C"/>'
        : '<ellipse cx="68" cy="92" rx="8" ry="10" fill="#1D1E2C"/><ellipse cx="35" cy="82" rx="7" ry="4" fill="#FF8FB1" opacity=".8"/><ellipse cx="103" cy="78" rx="7" ry="4" fill="#FF8FB1" opacity=".8"/>'}
    </svg></div><div class="voices"><span class="voice${fa ? '' : ' on'}">${esc(t('clef.high'))}</span><span class="voice">${esc(t('clef.mid'))}</span><span class="voice${fa ? ' on' : ''}">${esc(t('clef.low'))}</span></div></div>`;
}

function answerHtml() {
  switch (G.stage) {
    case Stage.Typing: case Stage.Tiles:
      // One sunken deck holds the answer sheet and the keys (MusicCardGameView.axaml:226).
      return `<div class="deck"><div class="sheet" id="sheet">${sheetInner()}</div>${keyboardHtml()}</div>`;
    case Stage.Choices:
      return `<div class="choices-wrap">
        ${G.bad ? `<div class="card note fbnote">${esc(G.feedback)}</div>` : ''}
        <div class="choices">${G.round.choices.map((c, i) => `<button class="chunky white" data-choice="${i}"><span class="face">${esc(c)}</span></button>`).join('')}</div>
        <button class="quiet dontknow" data-g="dontknow">${esc(t('game.dontKnow'))}</button></div>`;
    case Stage.Question:
      return `<button class="chunky primary large wide" data-g="flip"><span class="face">${icon('IconReplay')}${esc(t('game.flip'))}</span></button>`;
    case Stage.Flipped:
      return `<div class="grade"><b class="gq">${esc(t('game.didYouKnow'))}</b><div class="two">
        <button class="chunky white large" data-g="didnot"><span class="face">${icon('IconCross')}${esc(t('game.didNot'))}</span></button>
        <button class="chunky white large" data-g="knew"><span class="face">${icon('IconCheck')}${esc(t('game.knew'))}</span></button></div></div>`;
    case Stage.Solved:
      return `<button class="chunky primary large wide" data-g="next"><span class="face">${esc(t('game.next'))}${icon('IconArrow')}</span></button>`;
    case Stage.Revealed:
      return `<button class="chunky primary large" data-g="next"><span class="face">${icon('IconCheck')}${esc(t('game.gotIt'))}</span></button>`;
    default: return '';
  }
}

function sheetInner() {
  if (G.stage === Stage.Typing) {
    return `<span class="hint">${esc(t('game.typeHint'))}</span>
      <div class="field" aria-label="${esc(t('game.answer'))}">${G.answer ? `<span class="txt">${esc(up(G.answer))}</span><span class="caret"></span>` : `<span class="caret"></span><span class="ph">${esc(t('game.typePlaceholder'))}</span>`}</div>`;
  }
  const tl = G.round.tiles;
  const caret = tl.caret;
  const words = [];
  tl.tiles.forEach((tile, i) => {
    if (tile.kind === 'Gap') return;
    (words[tile.word] ??= []).push(`<span class="tl${tile.prefilled ? ' free' : ''}${tile.typed != null ? ' typed' : ''}${i === caret ? ' caret' : ''}${tile.kind === 'Mark' ? ' mark' : ''}">${esc(up(tile.prefilled || tile.kind === 'Mark' ? tile.letter : tile.typed ?? ''))}</span>`);
  });
  const shape = t('game.shape', { n: tl.wordLengths.length, letters: tl.wordLengths.join(' + ') });   // :141
  return `<div class="row2"><span class="fb">${esc(G.feedback)}</span><span class="shape num">${esc(shape)}</span></div>
    <div class="tiles" id="tiles">${words.filter(Boolean).map(w => `<span class="tword">${w.join('')}</span>`).join('')}</div>`;
}

function renderSheet() {
  const sheet = $('#sheet');
  if (!sheet) return;
  sheet.innerHTML = sheetInner();
  fitTiles();
  const send = $('#kb-send');
  if (send) send.disabled = !canSend();
}

/** FitBox: a long answer stays on one line, a little smaller. */
function fitTiles() {
  const el = $('#tiles');
  if (!el) return;
  el.style.transform = '';
  const s = Math.min(1, (el.parentElement.clientWidth - 4) / el.scrollWidth);
  if (s < 1) el.style.transform = `scale(${Math.max(0.3, s)})`;
}

// Controls/GameKeyboard.axaml(.cs): an 11-key grid, ⌫ three keys wide. Each language has its own letters
// (i18n/keyboards.js): Turkish Q without Q, W and X, as the app; QWERTY for English, AZERTY for French.
const kb = { digits: false };
const kbSize = () => profile.keyboard !== 'auto' ? profile.keyboard : innerHeight < 780 ? 'small' : 'medium';   // Resolve, .cs:37-40
function keyboardHtml() {
  const k = (label, col, span, cls = '', data = '') => `<button class="key ${cls}" style="grid-column:${col} / span ${span}" ${data}><span>${label}</span></button>`;
  // Each row is centred on the 22 half-key grid, so a short row (QWERTY's nine) does not hug the left edge.
  const offset = (row, extra = 0) => Math.floor((22 - row.length * 2 - extra) / 2);
  const letters = (row, extra = 0) => [...row].map((c, i) => k(c, 1 + offset(row, extra) + i * 2, 2, '', `data-k="${c}"`)).join('');
  const layout = KEYBOARDS[lang];
  const size = kbSize();
  return `<div class="kb ${size === 'medium' ? '' : size}" id="kb">
    <div class="bar"><button class="quiet dk" data-g="dontknow">${esc(t('game.dontKnow'))}</button>
      <div class="handle" id="kb-handle" aria-label="${esc(t('kb.size'))}"><i></i></div>
      <div class="sizes">${[['small', 's'], ['medium', 'm'], ['large', 'l']].map(([v, c]) => `<button class="size ${c}${size === v ? ' on' : ''}" data-size="${v}" aria-label="${esc(t(`kb.${v}.aria`))}"><span>${esc(t(`kb.${v}`))}</span></button>`).join('')}</div></div>
    <div class="rows">
      <div class="krow">${letters(kb.digits ? layout.digits : layout.rows[0])}</div>
      <div class="krow">${letters(layout.rows[1])}</div>
      <div class="krow">${letters(layout.rows[2], 6)}${k(icon('IconErase'), 1 + offset(layout.rows[2], 6) + layout.rows[2].length * 2, 6, 'erase', `data-kb="erase" aria-label="${esc(t('erase'))}"`)}</div>
      <div class="krow">${k(esc(kb.digits ? t('kb.letters') : t('kb.digits')), 1, 4, 'mode word', `data-kb="mode" aria-label="${esc(t('kb.digits.aria'))}"`)}${k(esc(t('kb.space')), 5, 10, 'space word', `data-k=" " aria-label="${esc(t('kb.space'))}"`)}${k(icon('IconCheck') + esc(t('kb.send')), 15, 8, 'send word', `id="kb-send" data-kb="send"${canSend() ? '' : ' disabled'}`)}</div>
    </div></div>`;
}

function afterCardRender() {
  fitTiles();
  const card = $('#carea .qcard, #carea .back');
  if (G.fx === 'wrong' && card) {
    if (card.classList.contains('qcard')) { card.classList.remove('deal'); card.classList.add('shake'); }
    card.insertAdjacentHTML('beforeend', '<span class="wrong-tint"></span>');
    // Removed by a timer, not by the fade: with reduced motion (and in ?still) the fade never runs, and the card stayed
    // coral until the next render. The app's flash ends after 320 ms either way.
    setTimeout(() => card.querySelector('.wrong-tint')?.remove(), 320);
  }
  if (G.fx === 'right' && card && !REDUCED) {
    card.insertAdjacentHTML('beforeend', '<span class="burst-ring"></span>');
    const colors = ['#FFCC00', '#FF4D00', '#2B9BFF', '#38E08C', '#E85BE6', '#3FDAFF'];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, d = 120 + 60 * Math.random();
      card.insertAdjacentHTML('beforeend', `<span class="spark" style="left:50%;top:50%;background:${colors[i % 6]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 40}px;--rot:${Math.random() * 720 - 360}deg"></span>`);
    }
  }
}

function resultsHtml() {
  const R = G.results;
  const title = t(R.stars === 3 ? 'results.three' : R.stars === 2 ? 'results.two' : 'results.one');   // :906
  // A neutral line (ch. 14 §2): the three it replaces named the level the child had reached.
  const info = t('results.info', { right: R.right, n: R.count });
  const star = (i, mid) => `<span class="star${mid ? ' mid' : ''}"><svg viewBox="0 0 24 24"><path class="sock" d="${STAR}"/>${i < R.stars ? `<path class="gold" d="${STAR}"/>` : ''}</svg></span>`;
  const art = info => info.symbol ? `<span class="music">${esc(info.symbol)}</span>` : info.family ? `<img src="../assets/cards/portrait-${L.FAMILIES[info.family].art}.png" alt="">` : icon('IconNote');
  const facts = R.facts.map(f => {
    const delta = f.after - f.before;
    return `<div class="rrow fact-row" style="--accent:${f.info.color};--accent-deep:${readable(f.info.color)}"><span class="art">${art(f.info)}</span><div>
      <div class="top"><b>${esc(f.info.name)}</b>${delta > 0.004 ? `<span class="grew num">+${esc(pct(delta))}</span>` : ''}</div>
      <p>${esc(f.info.fact)}</p><div class="bar"><span class="thin"><i style="width:${Math.round(Math.min(1, f.after) * 100)}%"></i></span><small class="num">${esc(pct(f.after))}</small></div></div></div>`;
  }).join('');
  const badges = R.badges.map(b => `<div class="rrow badge-row" id="${b === R.badges[0] ? 'first-badge' : ''}">${medalHtml(b)}<div><b>${esc(b.name)}</b><small>${esc(b.description)}</small></div></div>`).join('');
  return `<div class="overlay below" id="results"><div class="pop-wrap">
    <div class="pop-card"><div class="pop-face">
      <h2 class="r-head">${esc(t('results.head'))}</h2>
      <div class="stars">${star(0)}${star(1, true)}${star(2)}</div>
      <div class="r-title">${esc(title)}</div>
      <p class="p r-info">${esc(info)}</p>
      <div class="stats2 num"><div class="rrow"><small>${esc(t('results.right'))}</small><b>${R.right}/${R.count}</b></div><div class="rrow"><small>${esc(t('results.stars'))}</small><b>${R.stars}/3</b></div></div>
      ${facts ? `<h3 class="group-title r-group">${esc(t('results.facts'))}</h3>${facts}` : ''}
      ${badges ? `<h3 class="group-title r-group" id="new-badges">${esc(t('results.badges', { n: R.badges.length }))}</h3>${badges}` : ''}
      <div class="r-btns"><button class="chunky white" data-g="exit"><span class="face">${esc(t('results.exit'))}</span></button>
        <button class="chunky primary" data-g="replay"><span class="face">${icon('IconReplay')}${esc(t('results.replay'))}</span></button></div>
    </div></div>
    <button class="chunky white close x" data-g="exit" title="${esc(t('close'))}" aria-label="${esc(t('close'))}"><span class="face">${icon('IconCross')}</span></button>
  </div></div>`;
}
/** A badge's medal (BadgeArt): an icon, a sign's glyph or a family portrait on the badge's colour. */
function medalHtml(b) {
  const [kind, key] = b.artKey.split(':');
  const inner = kind === 'icon' ? icon(key) : kind === 'sign' ? `<span class="music">${esc(L.SIGN_CARDS.find(c => c.id === key)?.symbol)}</span>` : `<img src="../assets/cards/portrait-${L.FAMILIES[key].art}.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
  return `<span class="medal" style="--accent:${b.color}"><span>${inner}</span></span>`;
}
const STAR = 'M12,1.5 L15.1,8.3 L22.5,9.1 L17,14.1 L18.5,21.5 L12,17.8 L5.5,21.5 L7,14.1 L1.5,9.1 L8.9,8.3 Z';

/*
 * "Nasıl oynanır?" (ch. 14 §4): the child's level first when it is not known yet, then three pages that never name a
 * level. The pictures show the game's moves without words. Until the level is chosen there is no ✕: the round is
 * dealt under it.
 */
function introHtml() {
  const { step, pages } = G.intro, key = pages[step], last = step === pages.length - 1;
  const dots = `<div class="stepdots">${pages.map((_, k) => `<span class="dot${k === step ? ' on' : ''}"></span>`).join('')}</div>`;
  const shell = inner => `<div class="overlay intro"><div class="pop-wrap"><div class="pop-card"><div class="pop-face">${inner}</div></div>
    ${profile.difficulty ? `<button class="chunky white close x" data-g="intro-close" title="${esc(t('close'))}" aria-label="${esc(t('close'))}"><span class="face">${icon('IconCross')}</span></button>` : ''}</div></div>`;
  if (key === 'level') {
    return shell(`<h2 class="r-head">${esc(L.LEVEL_QUESTION)}</h2>
      <div class="levels">${L.DIFFICULTIES.map((d, k) => `<button class="chunky white large lvl" data-level="${d.key}"><span class="face"><span class="lstars">${'★'.repeat(k + 1)}</span><span class="ltxt"><b>${esc(d.name)}</b><small>${esc(d.line)}</small></span></span></button>`).join('')}</div>
      ${dots}`);
  }
  const s = L.INTRO_STEPS.find(x => x.key === key);
  const pic = key === 'see' ? '<div class="see"><span class="m">♭</span></div>'
    : key === 'find' ? `<div class="tiles5">${[...up(t('oyna.typed')).padEnd(5, ' ').slice(0, 5)].map((c, i) => `<span${i % 2 ? ' class="free"' : ''}>${i < 4 ? esc(c.trim()) : ''}</span>`).join('')}</div>`
      : '<div class="stars3"><span>★</span><span class="mid">★</span><span>★</span></div>';
  return shell(`<h2 class="r-head">${esc(t('oyna.howto'))}</h2>
    <div class="pic" style="--accent:${s.accent}">${pic}</div>
    <div class="tt">${esc(s.title)}</div><p class="p">${esc(s.text)}</p>${dots}
    <div class="btns"><button class="chunky white" data-g="intro-prev"${step === 0 ? ' disabled' : ''}><span class="face">${esc(t('intro.prev'))}</span></button>
      <button class="chunky primary" data-g="intro-next"><span class="face">${esc(last ? t('intro.go') : t('intro.next'))}</span></button></div>`);
}

function closeOverlaysOfShell() { toastHost.innerHTML = ''; }

// ───────────────────────── taps
/** A link out of the app: the gate first, as in the app (ch. 01 G-06); the demo then says it stays offline (G-09). */
const leaveApp = host => openGate(host, () => toast(t('offline.link'), host));
const openVideo = id => openGate('youtube.com', () => openOverlay('player', id));
/** Rebuilds everything that shows words after the language changed, keeping the page and its scroll. */
function rerender() { const y = page.scrollTop; render(); page.scrollTop = y; $('#dock').setAttribute('aria-label', t('dock.aria')); }
document.addEventListener('click', e => {
  const el = e.target.closest('[data-push], button, [data-w], [data-key]');
  if (!el) return;
  const d = el.dataset;
  if (d.key && el.closest('.keys')) return tapKey(el);
  if (d.pin) return gateDigit(d.pin);
  if (d.do === 'gate-close') return closeGate();
  if (d.push) { e.stopPropagation(); return push(d.push); }
  if (d.go) { if (d.go === location.hash) return render(); inApp = true; location.hash = d.go; return; }
  if (d.w) { piano.sel = +d.w; piano.idleSince = performance.now(); const p = $('[data-piano]'); if (p) p.innerHTML = pianoInner(); return; }
  if (d.today) return tapToday();
  if (d.banner) { const go = BANNER_GO[+d.banner]; return go === 'game' ? openGame({ origin: RoundOrigin.Kesfet }) : go === '#/izle' ? (location.hash = go) : push(go); }
  if (d.flip) { flipped.has(d.flip) ? flipped.delete(d.flip) : flipped.add(d.flip); el.outerHTML = signTile(L.SIGN_CATEGORIES.find(c => c.key === d.flip)); return; }
  if (d.aile !== undefined) { location.hash = '#/ogren/calgilar' + (d.aile ? `?aile=${d.aile}` : ''); return; }
  if (d.calf !== undefined) { calFilter = d.calf; return rerender(); }
  if (d.sekme) { signTab = +d.sekme; return rerender(); }
  if (d.gtab) { G.revealTab = +d.gtab; return renderGame(); }
  if (d.play) return openGame({ concept: d.play, origin: d.origin });
  if (d.level) return chooseLevel(d.level);
  if (d.zorluk) { profile.difficulty = d.zorluk; save(); return rerender(); }
  // Dil applies at once (ch. 14 §11): the tables, the content and the deck switch, and the page redraws where it was.
  if (d.dil) { profile.settings.lang = d.dil; save(); setLang(d.dil); return rerender(); }
  if (d.video) return openVideo(d.video);
  if (d.ext) return leaveApp(d.ext);
  if (d.songInCal) return openIn('cal', `#/sarki/${d.songInCal}`);
  if (d.song === 'toggle') return toggleSong();
  if (d.song === 'stop') return stopSong();
  if (d.set) { profile.settings[d.set] = !profile.settings[d.set]; save(); applySettings(); if (d.set === 'music' && !profile.settings.music) stopTheme(); return render(); }
  if (d.child) { profile.child = d.child; save(); closeOverlay(); return render(); }
  if (d.choice) return pick(G.round.choices[+d.choice]);
  if (d.k) return pressKey(d.k.toLocaleLowerCase(lang));
  if (d.size) { profile.keyboard = d.size; save(); return renderGame(); }
  if (d.kb === 'send') return pressSend();
  if (d.kb === 'mode') { kb.digits = !kb.digits; return renderGame(); }
  switch (d.do) {
    case 'back': return back();
    case 'play': return openGame({ origin: d.origin });
    case 'howto': return openGame({ origin: RoundOrigin.Kesfet, intro: true });
    case 'switcher': return openOverlay('switcher');
    case 'ov-close': return closeOverlay();
    case 'vplay': return toast(t('offline.video'), t('offline.video.line'));
    case 'riddle': { const x = DIRECTORY_TR.find(y => slug(y.name) === route.arg); const v = x && videosFor(x)[0]; return v ? openVideo(v.id) : leaveApp('doremimi.org'); }
    case 'hesabim': return openGate('parent', () => push('#/hesabim'));
    case 'panel': return openGate('parent', () => push('#/ebeveyn-paneli'));
    case 'pill': return location.hash = '#/cal';
    case 'pill-x': return stopTheme();
    case 'wipe': store.wipe(); profile = freshProfile(); mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT); setLang(langNow()); toast(t('wiped'), t('wiped.line')); return go('#/');
    case 'soon': return notYet();
  }
  switch (d.g) {
    case 'exit': return exitGame();
    case 'dontknow': return dontKnow();
    case 'flip': return flip();
    case 'knew': return grade(true);
    case 'didnot': return grade(false);
    case 'next': return next();
    case 'video': return G.links?.video ? openVideo(G.links.video) : null;
    // Çalgı sayfası closes the game, switches to Öğren and pushes the instrument (ch. 01 B-08).
    case 'instrument': { const k = G.links?.instrument; if (!k) return; exitGame(); return openIn('ogren', `#/calgi/${k}`); }
    // Tekrar oyna: the same way in and the same category (ch. 14 §3).
    case 'replay': { const c = G.concept === 'sunum' ? null : G.concept; return openGame({ concept: c, origin: G.origin, intro: false }); }
    case 'intro-prev': G.intro.step = Math.max(0, G.intro.step - 1); return renderGame();
    case 'intro-next': if (G.intro.step < G.intro.pages.length - 1) { G.intro.step++; return renderGame(); } return closeIntro();
    case 'intro-close': return closeIntro();
  }
});
/** Azaltılmış hareket stops the CSS motion and the canvas (ch. 03 §13); the deck's `still` switch does the same. */
function applySettings() {
  const calm = STILL || REDUCED || profile.settings.motion;
  app.classList.toggle('still', calm);
  shellBg.reduced = calm;
  sound.muted = false;
}
applySettings();

// ⌫ held keeps erasing: the first repeat waits 450 ms, then every 110 ms (GameKeyboard.axaml.cs).
let eraseTimer = null;
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-kb="erase"]');
  if (!el) return;
  pressBackspace();
  eraseTimer = setTimeout(function rep() { pressBackspace(); eraseTimer = setTimeout(rep, 110); }, 450);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => document.addEventListener(n, () => { clearTimeout(eraseTimer); eraseTimer = null; }));

// The handle steps one size per 28 px of drag (GameKeyboard.axaml.cs:40).
let drag = null;
document.addEventListener('pointerdown', e => { if (e.target.closest('#kb-handle')) { drag = e.clientY; e.preventDefault(); } });
document.addEventListener('pointermove', e => {
  if (drag == null) return;
  const order = ['small', 'medium', 'large'], dy = drag - e.clientY;
  if (Math.abs(dy) < 28) return;
  const i = Math.max(0, Math.min(2, order.indexOf(kbSize()) + Math.sign(dy)));
  drag = e.clientY;
  if (order[i] !== kbSize()) { profile.keyboard = order[i]; save(); renderGame(); }
});
document.addEventListener('pointerup', () => { drag = null; });

// ───────────────────────── a hardware keyboard types in the game (ch. 04 §8.4); the deck's keys go back to the deck
const DECK_KEYS = ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End'];
function hardwareKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (!gameEl.hidden && G.round && !G.results && !G.intro && isTypingStage()) {
    if (e.key === 'Backspace') { pressBackspace(); flashKey('erase'); return true; }
    if (e.key === 'Enter') { pressSend(); flashKey('send'); return true; }
    if (e.key === ' ' || (e.key.length === 1 && isLetterOrDigit(e.key))) { const c = e.key.toLocaleLowerCase(lang); pressKey(c); flashKey(c); return true; }
  }
  if (e.key === 'Escape') { back(); return true; }
  return false;
}
document.addEventListener('keydown', e => {
  if (hardwareKey(e)) { e.preventDefault(); return; }
  // The deck's shortcuts, forwarded while the phone has the focus (ch. 10 R-08, K-02).
  if (EMBED && parent !== window && !e.metaKey && !e.ctrlKey && !e.altKey && (DECK_KEYS.includes(e.key) || [' ', 'n', 'N', 'f', 'F', 'r', 'R'].includes(e.key))) {
    e.preventDefault();
    parent.postMessage({ type: 'dm-key', key: e.key }, '*');
  }
});

function flashKey(c) {
  const sel = c === 'erase' || c === 'send' ? `[data-kb="${c}"]` : `[data-k="${c === ' ' ? ' ' : up(c)}"]`;
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 110);
}
const flashButton = async el => { if (!el || FAST) return; el.classList.add('down'); await sleep(140); el.classList.remove('down'); await sleep(120); };

// ───────────────────────── the deck drives the phone (ch. 10 W-02, W-03); every action presses what a child would
let queue = Promise.resolve();
function receive(m) {
  if (!m || typeof m !== 'object' || !m.type) return;
  queue = queue.then(() => run(m)).catch(err => console.warn('[demo]', m, err))
    .then(() => (m.id != null ? done(m.id) : null));
}

/*
 * The deck's lock (deck/flow.js) waits for this: a message with an id is answered once its presses have run AND the
 * screen has stopped moving, so the presenter cannot move on while the audience is still watching the phone act.
 * Answered after a failure too: a step that threw must not leave the deck locked until its watchdog.
 */
async function done(id) {
  if (!(EMBED && parent !== window)) return;
  // Wait for finite CSS/Web animations (page slide-in, card deal, flips, scroll). Infinite ones (the backdrop's
  // notes) never finish, so they are left out; 1.5 s caps an animation that runs longer than anything here should.
  const moving = document.getAnimations().filter(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming?.().endTime));
  if (moving.length) await Promise.race([Promise.all(moving.map(a => a.finished.catch(() => {}))), sleep(1500)]);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  parent.postMessage({ type: 'dm-done', id }, '*');
}
addEventListener('message', e => { if (e.source === parent || e.source === window) receive(e.data); });
try { new BroadcastChannel('doremimi-demo').onmessage = e => receive(e.data); } catch { /* no second-tab mirroring */ }

/** A fresh child, as on the cover slide: the level question and the badges are new again, the language the default. */
function freshChild() { store.wipe(); profile = freshProfile(); mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT); setLang(langNow()); }

async function run(m) {
  if (m.type === 'reset') {
    freshChild();
    closeLayers(); stopTheme(); theme.played = false;
    stack = []; banner = 0; flipped.clear(); calFilter = ''; signTab = 1;
    applySettings();
    go(m.hash ?? '#/');
    return;
  }
  if (m.type === 'go') { closeLayers(); flipped.clear(); go(m.hash ?? '#/'); return; }
  if (m.type === 'sound') { sound.context(); sound.key(15); return; }   // the deck's Sesi aç: one middle C says it works
  if (m.type === 'batch') { for (const [i, x] of m.msgs.entries()) { if (i) await sleep(m.gap ?? 900); await run(x); } return; }
  if (m.type === 'key') { script.dirty = true; hardwareKey(new KeyboardEvent('keydown', { key: m.key })); return; }
  if (m.type !== 'act') return;
  const a = ACTS[m.name];
  if (!a) { notYet(); return; }
  await a(m);
}

/** The deck's go: everything that sits over the page closes first (W-02). The page under it is a deep link. */
function go(hash) { stack = []; if (location.hash === hash) navigate(); else location.hash = hash; }
/** go, drawn before it returns: a scripted step presses on the new page at once, even with FAST's zero waits. */
function goNow(hash) { closeLayers(); stack = []; history.replaceState(null, '', hash); navigate(); }
function closeLayers() { gate.open = false; overlay.kind = null; renderOverlay(); if (!gameEl.hidden) exitGame(); }

const pressG = async name => { const el = document.querySelector(`[data-g="${name}"]`); await flashButton(el); };
const pressDo = async sel => { const el = document.querySelector(sel); await flashButton(el?.closest('button') ?? el); el?.click(); };
const ACTS = {
  'theme.play': () => playTheme(),
  'banner.show': m => setBanner(m.index ?? 0),
  /** Taps a sign's tile on Öğren › İşaretler, so it turns over (W-03 sign.flip). */
  'sign.flip': async m => { if (!flipped.has(m.key)) await pressDo(`[data-flip="${m.key}"]`); },
  'song.play': async () => { for (let i = 0; i < 40 && !P.events; i++) await sleep(50); await pressDo('[data-song="toggle"]'); },
  'song.stop': () => stopSong(),
  'keys.play': async m => { for (const k of m.keys) { const el = document.querySelector(`.keys [data-key="${k}"]`); if (el) tapKey(el); await sleep(m.gap ?? 320); } },
  'switcher.open': async () => { await pressDo('[data-do="switcher"]'); },
  'child.pick': async m => { await pressDo(`[data-child="${m.id}"]`); },
  'video.open': async m => { await pressDo(m.id ? `[data-video="${m.id}"]` : '[data-video]'); },
  'gate.open': async m => { await pressDo(`[data-do="${m.row}"]`); },
  /** Types the demo PIN (G-06), or the one given, on the gate's pad. */
  'gate.type': async m => { for (const d of (m.pin ?? DEMO_PIN)) { await pressDo(`[data-pin="${d}"]`); await sleep(160); } },
  // A smooth scroll is not a Web Animation, so done() cannot see it: the step waits out its own ~0.6 s here, or the
  // deck would unlock while the page is still sliding to the section being shown.
  'scroll': async m => { const el = m.to ? document.querySelector(m.to) : null; if (el) el.scrollIntoView({ behavior: REDUCED || FAST ? 'auto' : 'smooth', block: 'start' }); else page.scrollTo({ top: m.y ?? 0, behavior: REDUCED ? 'auto' : 'smooth' }); await sleep(REDUCED ? 0 : 700); },
  'game.start': m => openGame({ concept: m.deck ?? null, origin: m.origin ?? null, level: m.level ?? null, intro: m.intro }),
  /** Pages through the intro; on the level page it taps `m.level` (default Başlangıç), as a child would. */
  'intro.finish': async m => {
    while (G.intro) {
      await sleep(800);
      const pg = G.intro.pages[G.intro.step];
      if (pg === 'level') { const k = m?.level ?? 'baslangic'; await flashButton(document.querySelector(`[data-level="${k}"]`)); chooseLevel(k); continue; }
      await pressG('intro-next');
      if (G.intro.step < G.intro.pages.length - 1) { G.intro.step++; renderGame(); } else closeIntro();
    }
  },
  'game.type': async m => {
    for (const c of m.text) { flashKey(c); pressKey(c); await sleep(150); }
    if (m.send) { await sleep(350); flashKey('send'); pressSend(); }
  },
  /** Types the letters the tiles are missing, computed from the tiles, never stored (ch. 10 S06). */
  'game.fill': async m => {
    if (G.stage !== Stage.Tiles) throw new Error(`game.fill at ${G.stage}`);
    const missingLetters = G.round.tiles.tiles.filter(x => x.kind === 'Letter' && !x.prefilled && x.typed == null).map(x => x.letter.toLocaleLowerCase(lang)).join('');
    await ACTS['game.type']({ text: missingLetters, send: m.send });
  },
  'game.choose': async m => {
    if (G.stage !== Stage.Choices) throw new Error(`game.choose at ${G.stage}`);
    const choices = G.round.choices;
    const i = m.right ? choices.indexOf(G.q.answer) : choices.findIndex(c => c !== G.q.answer);
    await flashButton(document.querySelector(`[data-choice="${i}"]`));
    pick(choices[i]);
  },
  'game.dontknow': async () => { await pressG('dontknow'); dontKnow(); },
  'game.flip': async () => { await pressG('flip'); flip(); },
  'game.grade': async m => { await pressG(m.knew ? 'knew' : 'didnot'); grade(!!m.knew); },
  'game.next': async () => { await pressG('next'); next(); },
  /** Plays the round to its end with right answers: a pick at the choices, Bildim on a turned card, typed at Yaz. */
  'game.finish': async m => {
    for (let guard = 0; G.round && !G.round.isOver && guard < 40; guard++) {
      if (G.stage === Stage.Choices) await ACTS['game.choose']({ right: true });
      else if (G.stage === Stage.Question) { await ACTS['game.flip'](); await sleep(m.gap ?? 600); await ACTS['game.grade']({ knew: true }); continue; }
      else if (G.stage === Stage.Typing) await ACTS['game.type']({ text: normalise(G.q.answer), send: true });
      if ([Stage.Solved, Stage.Revealed].includes(G.stage)) { await sleep(m.gap ?? 600); await ACTS['game.next'](); }
      await sleep(m.gap ?? 600);
    }
  },
  /** A slide that opens on a tab, as a script step, so the script still knows where the phone is (data/script.js). */
  'page': async m => { goNow(m.hash); await sleep(300); },
  /** A page, then a tap on it as a child would (Öğren's family card, an instrument in the grid). */
  'open': async m => { goNow(m.hash); await sleep(300); if (m.tap) await pressDo(m.tap); },
  /** Çal: a song's "Bu çalgıyla oyna", which opens its round at the choices. */
  'results.scroll': async () => { const el = $('#new-badges'); el?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); await sleep(REDUCED ? 0 : 700); },
  /** A sequence with a visible pause between presses (0.8–1.2 s, W-03), for slides that play several steps at once. */
  'seq': async m => { for (const step of m.steps) { await run({ type: 'act', ...step }); await sleep(m.gap ?? 900); } },
};

/*
 * The deck's script (app/data/script.js): a slide or a button asks for a step, and the phone plays the steps between
 * where it is and there. Going back, jumping to a slide, or a phone the presenter touched by hand starts over from a
 * fresh child and replays fast to the step before, then plays the asked step. The rules are the real ones and every
 * round is seeded (G-05), so a replay lands on the same cards every time.
 */
const script = { pos: -1, dirty: false, at: null };
/** Where the phone is, as the script left it: the round on screen (if any) and the page. */
const scriptPlace = () => [gameEl.hidden ? '' : G.roundId, location.hash].join('|');

async function playStep(k) {
  for (const a of SCRIPT[k]) { await ACTS[a.name](a); await sleep(900); }
  script.pos = k; script.at = scriptPlace();
}

ACTS.goto = async m => {
  const want = m.step;
  const onScript = !script.dirty && script.pos >= 0 && script.pos <= want && script.at === scriptPlace();
  if (!onScript) {
    // Start over: a fresh child, as on the cover slide, so the level question and the badges are new again.
    freshChild();
    closeLayers();
    script.pos = -1; script.dirty = false;
  }
  const playLast = m.play && want > script.pos;
  FAST = true;
  try { for (let k = script.pos + 1; k < (playLast ? want : want + 1); k++) await playStep(k); }
  finally { FAST = false; }
  if (playLast) await playStep(want);
};

// A tap or a key from a person, not the script, makes the round unknown to the script.
for (const type of ['click', 'keydown']) document.addEventListener(type, e => { if (e.isTrusted && script.pos >= 0) script.dirty = true; }, true);

// ───────────────────────── start
navigate();
if (EMBED && parent !== window) document.fonts.ready.then(() => parent.postMessage({ type: 'dm-ready' }, '*'));
