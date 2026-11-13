/*
 * Doremimi, recreated for the presentation (dossier ch. 10). The rules live in ./lib and are the app's, ported; this
 * file only draws what they decide, the way Doremimi/ViewModels/ShellViewModel.cs and MusicCardGameViewModel.cs do.
 * Every on-screen string is copied from the source line named next to it. Copy written for the demo itself (the
 * "yakında" notes) is marked PROPOSED.
 */
import { QUESTIONS, LEARNING, SUNUM_DECK, BADGES, BANNERS, LINES, INTRO_STEPS, CONCEPTS, SIGN_CARDS, SIGN_CATEGORIES, INSTRUMENTS, FAMILIES } from './data/content.js';
import { QuestionDeck, LearningRound, Stage, Resolution, isRight } from './lib/round.js';
import { LevelLadder, Level, Move } from './lib/ladder.js';
import { Mastery, addXp, toNextLevel, stars as starsOf, pickConcepts, newlyEarned, today } from './lib/progress.js';
import { seeded, fromClock } from './lib/rng.js';
import { Backdrop } from './lib/backdrop.js';
import { icon } from './lib/icons.js';
import { TABS, resolve } from './lib/nav.js';
import { normalise, isLetterOrDigit } from './lib/answers.js';
import { slug, songFor, sequence, length, keyboardBase, karaokeLines, indexAt, render as renderSong, safeTheme, fromKeys, keyIndex, Sound, ButtonMelody } from './lib/music.js';
import { DIRECTORY, SONGS, GROUPS, GROUP_COLORS, DIFFICULTY, MANIFESTO, VISION, NEWS, CHARACTERS, BOARD, FOUNDERS, TEAM, ADVISORS, PARTNERS, CONTACTS, LEGAL, DRAFT_NOTE } from './data/site.js';

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
const freshProfile = () => ({ xp: 0, level: 1, mastery: {}, badges: [], ladder: 'Yaz', seenIntro: false, keyboard: 'auto', days: [],
  child: null, melodim: [], seen: [], rounds: 0, best: 0, answered: 0, stars: 0,
  settings: { motion: false, buttons: true, music: true, notify: false } });   // Ayarlar's four switches (ch. 03 §13)
let profile = Object.assign(freshProfile(), store.load()?.profile);
let mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT);
const save = () => store.save({ profile });
const deck = new QuestionDeck(QUESTIONS);

// ───────────────────────── helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// FAST: the deck's fast-forward replays the script with no pauses and no pressed-button flashes.
let FAST = false;
const sleep = ms => FAST ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const lum = h => hex(h).map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
/** Controls/Readable.cs: darken toward #2B2440 in 5% steps until white text reads at 4.5:1 (and the colour reads on white). */
const readable = h => { for (let s = 0; s <= 20; s++) { const c = mixHex(h, '#2B2440', s / 20); if (contrast(c, '#FFFFFF') >= 4.5) return c; } return '#2B2440'; };
/** Controls/Motion.cs:80: a toy card's edge is its face 32% toward #2B2440. */
const edge = h => mixHex(h, '#2B2440', 0.32);
const upperTr = s => s.toLocaleUpperCase('tr');
const levelName = l => ['Cevir', 'Sec', 'Yaz'][l];
const levelLabel = l => ['Çevir', 'Seç', 'Yaz'][l];
const moodOf = l => ['cevir', 'sec', 'yaz'][l];

const app = $('#app'), topbar = $('#topbar'), page = $('#page'), dock = $('#dock'), gameEl = $('#game'), toastHost = $('#toast');
if (EMBED) app.classList.add('embed');
if (STILL) app.classList.add('still');
const safeTop = () => parseFloat(getComputedStyle(app).getPropertyValue('--safe-top')) || 0;
const shellBg = new Backdrop($('#bg'), { seed: 5, mood: 'kesfet', clearTop: safeTop(), reduced: REDUCED });
shellBg.start();

if (EMBED) {
  const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 10_000);
}

/** The reward toast (ch. 01 M-06): a headline and a reason, popping and fading over 1.5 s. */
function toast(headline, reason = '', bad = false) {
  toastHost.innerHTML = `<div class="toast${bad ? ' bad' : ''}"><b>${esc(headline)}</b>${reason ? `<small>${esc(reason)}</small>` : ''}</div>`;
}
/** A tap that leads to a page the demo has not recreated yet (ch. 10 A-00; PROPOSED copy). */
const notYet = () => toast('Yakında', 'Bu sayfa demoda yok');

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
// game is a layer. The dock is Keşfet · Öğren · logo · İzle · Çal (ch. 11 NR-02); Oyunlar and Daha fazla are gone.
let route = { tab: 'kesfet', page: null };
let stack = [];
let inApp = false;   // set by a tap just before it changes the hash, so navigate() knows the page is pushed, not linked

function navigate() {
  const fromApp = inApp; inApp = false;
  const r = resolve(location.hash, { tab: route.tab, stacked: stack.length > 0, fromApp });
  if (r.kind === 'game') {
    // The game is a layer over the page it was opened from (A-02), so the hash goes back to that page.
    history.replaceState(null, '', stack.at(-1) ?? TABS.find(t => t.key === route.tab).hash);
    openGame({ concept: r.query.get('deste'), level: r.query.get('seviye'), intro: r.query.has('tanitim') ? true : undefined });
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
  if (!gameEl.hidden) { if (G.levelUp) { G.levelUp = null; renderGame(); } else if (G.intro) closeIntro(); else exitGame(); return; }
  if (stack.length) { stack.pop(); location.hash = stack.at(-1) ?? TABS.find(t => t.key === route.tab).hash; return; }
  if (route.tab !== 'kesfet') location.hash = '#/';   // back on any other root, the logo's included, goes to Keşfet (OC-24)
}

// ───────────────────────── shell
function render() {
  leavePage();
  app.className = app.className.replace(/\btab-\w+/g, '').trim() + ' tab-' + route.tab;
  shellBg.setMood(route.tab);
  renderTopbar();
  renderDock();
  const view = route.page ? PAGES[route.page] : null;
  page.innerHTML = `<div class="page-in">${route.page ? (view ? view.html(route.arg, route.query) : missing(route.page)) : ROOTS[route.tab]()}</div>`;
  page.scrollTop = 0;
  if (route.tab === 'kesfet' && !route.page) startCarousel(); else stopCarousel();
  afterRender();
}

const childOf = () => CHILDREN.find(c => c.id === profile.child) ?? GUEST;
function renderTopbar() {
  const tab = TABS.find(t => t.key === route.tab);
  const view = route.page ? PAGES[route.page] : null;
  const title = view ? (typeof view.title === 'function' ? view.title(route.arg, route.query) : view.title) : tab.title;
  const ratio = profile.xp / toNextLevel(LEARNING, profile.level);
  const kid = childOf();
  // NR-05: [back][title][level chip][avatar]. No logo here any more (it is in the dock); the avatar, top right, opens
  // Profilim (OC-05), and so does the chip, as before.
  topbar.innerHTML = `
    ${stack.length ? `<button class="chunky white round backbtn" data-do="back" title="Geri" aria-label="Geri"><span class="face">${icon('IconBack')}</span></button>` : ''}
    <div class="title"><h1>${esc(title)}</h1></div>
    <button class="tile levelbtn" data-go="#/profil" title="Profilim" aria-label="Seviye ${profile.level}">
      <span class="lv"><b>Seviye ${profile.level}</b><span class="slim"><i style="width:${Math.round(Math.min(1, ratio) * 100)}%"></i></span></span>
      <span class="avatar gumdrop">${profile.level}</span>
    </button>
    <button class="tile" data-go="#/profil" data-do="avatar" title="Profilim" aria-label="Profilim"><span class="avatar who"><img src="../assets/site/characters/${kid.image}" alt=""></span></button>`;
}

function renderDock() {
  dock.innerHTML = TABS.map(t => t.logo
    ? `<button class="tab logo${t.key === route.tab ? ' active' : ''}" data-go="${t.hash}" title="Doremimi" aria-label="Doremimi"><span class="plate"><img src="../assets/brand/logo.png" alt=""></span></button>`
    : `<button class="tab${t.key === route.tab ? ' active' : ''}" data-go="${t.hash}"><span class="pill">${icon(t.icon)}</span><span>${t.label}</span></button>`).join('');
}

/** A route the demo does not know: an honest card, not a fake screen (PROPOSED copy). */
function missing(name) {
  return `<div class="stack soon"><div class="card"><span class="ribbon"><h2>Yakında</h2></span>
    <p class="p">Bu ekran sunumun bir sonraki sürümünde uygulamadaki gibi gelecek.</p><span class="caption">#/${esc(name)}</span></div></div>`;
}

// ───────────────────────── shared pieces
const photoOf = name => `../assets/site/instruments/${slug(name) === 'viyolonsel' ? 'cello' : slug(name)}.jpg`;
/** MusicLibrary.Art: the song's slug, then its instrument's, then cello.jpg for the cello song. */
const songArt = s => `../assets/site/instruments/${s.slug.startsWith('cello') ? 'cello' : s.slug === 'kontrabass' ? 'kontrabas' : s.slug}.jpg`;
const entryOfSong = s => DIRECTORY.find(d => songFor(d.name, SONGS) === s);
const note = text => `<div class="card note"><p class="p strong">${esc(text)}</p></div>`;
const ribbon = (text, extra = '') => `<span class="ribbon${extra}"><h2>${esc(text)}</h2></span>`;
const menuRow = (ic, color, title, sub, attrs) => `<button class="mrow" ${attrs}><span class="sq" style="background:${color}">${icon(ic)}</span><span class="mt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${icon('IconChevronRight', 'chev')}</button>`;
const menu = rows => `<div class="card menu">${rows.join('')}</div>`;
const chips = (list, on, attr) => `<div class="chips">${list.map(([v, t]) => `<button class="chip-btn${v === on ? ' on' : ''}" ${attr}="${esc(v)}">${esc(t)}</button>`).join('')}</div>`;
const pct = v => `%${Math.round(Math.min(1, v) * 100)}`;
const videoCard = (v, wide = false) => `<button class="tile video${wide ? ' grid' : ''}" data-video="${esc(v.id)}"><div class="card flush">
  <div class="thumb"><img src="../assets/site/${esc(v.thumb)}" alt="" loading="lazy"><span class="play">${icon('IconPlay')}</span></div>
  <div class="meta"><b>${esc(v.title)}</b>${wide ? '' : `<small>${esc(KIND_NAMES[v.kind] ?? '')}</small>`}</div></div></button>`;
const KIND_NAMES = { riddle: 'Bilmece videoları', clip: 'Klipler', interview: 'Dore soruyor, müzisyen cevaplıyor', karaoke: 'Karaoke', intro: 'Jenerikler' };

// ───────────────────────── Keşfet (ch. 11 NR-10; ShellView.axaml:20-213)
let banner = 0, carouselTimer = null;
const realCards = SIGN_CARDS.filter(c => !c.isSample);
const dayOfYear = d => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);
const todayCard = () => realCards[dayOfYear(new Date()) % realCards.length];
// Banner targets after the revision (NR-10): 3 opens İzle, 5 the hub's Kitaplar ve notalar page.
const BANNER_GO = ['game', '#/dore-ve-mimi', '#/izle', '#/vakif', '#/kitaplar'];
/** Cards the child has met that are due again: the Tekrar zamanı row, shown only when there are some (NR-80). */
const dueCards = () => deck.all.filter(q => mastery.of(q.id) && mastery.isDue(q.id));

function bannerHtml(b, cls = '') {
  return `<button class="tile banner ${cls}" data-banner="${BANNERS.indexOf(b)}" style="--accent:${readable(b.accent)}">
    <div class="hero"><span class="orb big"></span><span class="orb small"></span>
      <div class="txt"><span class="badge">${esc(b.badge)}</span><b>${esc(b.title)}</b><small>${esc(b.subtitle)}</small></div>
      <img src="../assets/site/banners/${b.image}" alt=""></div></button>`;
}

function home() {
  const card = todayCard();
  const cat = SIGN_CATEGORIES.find(c => c.key === card.category);
  const pillar = (cls, color, ic, title, sub, go) => `<button class="tile" data-go="${go}"><div class="toy pillar ${cls}" style="--edge:${edge(color)};--pc:${color}"><div class="pf"><span class="bub">${icon(ic)}</span><b>${title}</b><small>${sub}</small></div></div></button>`;
  const due = dueCards();
  return `<div class="stack home">
    <div class="carousel">
      <div class="banner-slot" id="bslot">${bannerHtml(BANNERS[banner])}</div>
      <div class="dots">${BANNERS.map((b, i) => `<span class="dot${i === banner ? ' on' : ''}" style="background:${b.accent}"></span>`).join('')}</div>
    </div>
    <button class="chunky giant yellow wiggle shine oyna" data-do="play"><span class="face">
      <span class="sym">♭</span><span class="words"><b>OYNA</b><small>Kartı gör, cevabı yaz!</small></span>${icon('IconPlay')}</span></button>
    ${due.length ? `<button class="tile" data-do="review"><div class="card due-row"><span class="sq" style="background:var(--orchid)">${icon('IconReplay')}</span><span class="mt"><b>Tekrar zamanı</b><small>${due.length} kart seni bekliyor</small></span>${icon('IconChevronRight', 'chev')}</div></button>` : ''}
    <button class="tile" data-go="#/oyun-merkezi"><div class="card due-row"><span class="sq" style="background:var(--blue)">${icon('IconCards')}</span><span class="mt"><b>Konu seç</b><small>Bir işaretle ya da çalgı ailesiyle oyna</small></span>${icon('IconChevronRight', 'chev')}</div></button>
    <div class="toy nedir"><div class="in">
      <div class="head"><img src="../assets/brand/logo.png" alt="Doremimi"><div><div class="eyebrow">DOREMİMİ NEDİR?</div><b>Dore ve Mimi ile müziği oynayarak öğren!</b></div></div>
      <p class="lead">Nota işaretlerini ve çalgıları tanı, cevabını kendin yaz, şarkı ve bilmece videolarıyla dinle.</p>
      <div class="stage-chars">
        <span class="hint">Dore ve Mimi'ye dokun!</span>
        <div class="actor" data-actor="mimi" style="left:28%"><img src="../assets/site/characters/mimi.png" alt="Mimi"></div>
        <div class="actor" data-actor="dore" style="left:72%"><img data-sprite="dore-drum" src="${frame('dore-drum', 0)}" alt="Dore"></div>
      </div>
      <div class="pillars">
        ${pillar('', '#1C6FAA', 'IconBook', 'Öğren', 'İşaretler ve çalgılar', '#/ogren/isaretler')}
        ${pillar('', '#D7109A', 'IconEye', 'İzle', 'Şarkı ve bilmece videoları', '#/izle')}
        ${pillar('ink', '#FF4D00', 'IconNote', 'Çal', 'Piyano, şarkılar ve Melodim', '#/cal')}
      </div>
    </div></div>
    <button class="tile today" data-push="#/isaret/${card.id}"><div class="card">
      <span class="sym" style="background:${cat.color}">${card.symbol}</span>
      <span class="txt"><span class="eyebrow" style="color:${readable(cat.color)}">BUGÜNÜN KARTI</span><span class="h2">${esc(card.name)}</span><span class="p">${esc(card.definition)}</span></span>
      ${icon('IconChevronRight', 'chev')}</div></button>
    <div class="quick">
      <button class="tile" data-go="#/ogren/isaretler"><span class="q" style="background:var(--yellow)">${icon('IconSharp')}<span>İşaretler</span></span></button>
      <button class="tile" data-go="#/ogren/calgilar"><span class="q" style="background:var(--cyan)">${icon('IconNote')}<span>Çalgılar</span></span></button>
      <button class="tile" data-go="#/izle"><span class="q" style="background:var(--orchid)">${icon('IconPlay')}<span>Videolar</span></span></button>
      <button class="tile" data-go="#/cal"><span class="q" style="background:var(--orange)">${icon('IconNote')}<span>Şarkılar</span></span></button>
    </div>
    <div class="section-head">${ribbon('Bilmece videoları')}<button class="tile" data-go="#/izle"><span class="ribbon small">Tümü ›</span></button></div>
    <div class="hscroll">${VIDEOS.slice(0, 8).map(v => videoCard(v)).join('')}</div>
  </div>`;
}

/** The carousel rotates every 5 s and slides 380 ms (ShellViewModel.cs:318-320); it cannot be swiped (ch. 01 X-07). */
function setBanner(i) {
  const slot = $('#bslot');
  if (!slot || i === banner) return;
  banner = (i + BANNERS.length) % BANNERS.length;
  const old = slot.firstElementChild;
  slot.insertAdjacentHTML('beforeend', bannerHtml(BANNERS[banner]));
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

// ───────────────────────── Öğren (NR-20): two segments, İşaretler · Çalgılar (OC-07)
const flipped = new Set();
function learn() {
  const seg = route.segment === 'calgilar' ? 'calgilar' : 'isaretler';
  const segs = `<div class="segs">${[['isaretler', 'İşaretler'], ['calgilar', 'Çalgılar']].map(([k, t]) => `<button class="chunky small ${seg === k ? 'indigo' : 'white'}" data-go="#/ogren/${k}"><span class="face">${t}</span></button>`).join('')}</div>`;
  if (seg === 'isaretler') {
    return `<div class="stack">${segs}${note('Her müzik işaretinin bir rengi var. Bir renge dokun, kart dönsün: anlamını oku, sonra kartları aç.')}
      <div class="signs">${SIGN_CATEGORIES.map(c => signTile(c)).join('')}</div></div>`;
  }
  const filter = route.query?.get('aile') ?? '';
  const list = DIRECTORY.filter(d => !filter || slug(d.group) === filter);
  return `<div class="stack">${segs}${note('41 çalgı, ailelerine göre. Birine dokun; hikâyesini, sorularını ve video bilmecesini aç.')}
    ${chips([['', 'Tümü'], ...GROUPS.map(g => [slug(g), g])], filter, 'data-aile')}
    <div class="card list">${list.map(d => `<button class="lrow" data-push="#/calgi/${slug(d.name)}">
      <span class="sq letter" style="background:${GROUP_COLORS[d.group]}">${esc(d.name[0])}</span>
      <span class="mt"><b>${esc(d.name)}</b><small>${esc(d.group)}</small></span>
      ${d.riddle ? '<span class="badge xpb">+3 XP BİLMECE</span>' : ''}${icon('IconChevronRight', 'chev')}</button>`).join('')}</div></div>`;
}
const SIGN_GLYPH = { bemol: '♭', diyez: '♯', fa: '𝄢', sol: '𝄞', naturel: '♮', porte: '𝄚', cizgi: '𝄂' };
function signTile(c, withPct = null) {
  const back = flipped.has(c.key);
  const color = c.color;
  if (back && withPct == null) {
    return `<button class="sign-tile back" data-flip="${c.key}" style="--c:${color}"><span class="m">${esc(c.meaning)}</span><span class="chunky indigo small open" data-push="#/isaret-kategori/${c.key}"><span class="face">Aç</span></span></button>`;
  }
  return `<button class="sign-tile" ${withPct == null ? `data-flip="${c.key}"` : `data-play="signcat:${c.key}"`} style="--c:${color};--e:${edge(color)}"><span class="g music">${SIGN_GLYPH[c.key]}</span><b>${esc(c.name)}</b>${withPct == null ? '' : `<small>${pct(withPct)}</small>`}</button>`;
}

const CATEGORY_INTRO = 'Bu işaretin kartları. Birine dokun, tanımını ve çocuk anlatımını oku.';   // PROPOSED
function signCategory(key) {
  const c = SIGN_CATEGORIES.find(x => x.key === key);
  if (!c) return missing('isaret-kategori/' + key);
  const cards = SIGN_CARDS.filter(x => x.category === key);
  return `<div class="stack">
    <div class="sign-hero" style="--c:${c.color};--e:${edge(c.color)}"><span class="g music">${SIGN_GLYPH[key]}</span><div><b>${esc(c.name)}</b><small>${esc(c.meaning)}</small></div></div>
    ${note(CATEGORY_INTRO)}
    <div class="card list">${cards.map(k => `<button class="lrow" data-push="#/isaret/${k.id}"><span class="sq letter music" style="background:${c.color}">${esc(k.symbol)}</span><span class="mt"><b>${esc(k.name)}</b><small>${esc(k.definition)}</small></span>${icon('IconChevronRight', 'chev')}</button>`).join('')}</div>
    <button class="chunky blue large" data-play="signcat:${key}"><span class="face">${icon('IconPlay')}Pratik yap</span></button></div>`;
}

let signTab = 1;
function signCard(id) {
  const q = deck.find('sign:' + id);
  if (!q) return missing('isaret/' + id);
  const c = SIGN_CATEGORIES.find(x => x.key === SIGN_CARDS.find(k => k.id === id).category);
  return `<div class="stack">
    <div class="face-card big" style="--accent:${q.accent};--accent-deep:${readable(q.accent)}"><span class="chip">${esc(q.answer)}</span><div class="symbol">${esc(q.symbol)}</div></div>
    <div class="card ans" style="--accent-deep:${readable(q.accent)}"><span class="s">${esc(q.symbol)}</span><div><small>Bu işaretin adı:</small><b>${esc(q.answer)}</b><small>${esc(c.name)}</small></div></div>
    ${explainHtml(q, signTab, 'data-sekme')}
    <button class="chunky blue large" data-play="signcat:${c.key}"><span class="face">${icon('IconPlay')}Kendini dene</span></button></div>`;
}

/** The sign's Tanım / Çocuk anlatımı block, shared by the sign card page and the game's information card. */
function explainHtml(q, tab, attr) {
  const ex = q.explanation;
  const concept = CONCEPTS[q.conceptIds[0]]?.name ?? '';
  const tabs = `<div class="tabs2"><button class="chunky tabbtn${tab === 0 ? ' active' : ''}" ${attr}="0"><span class="face">Tanım</span></button>
    <button class="chunky tabbtn${tab === 1 ? ' active' : ''}" ${attr}="1"><span class="face">Çocuk anlatımı</span></button></div>`;
  if (tab === 0) {
    return `${tabs}<div class="card def page-in" style="--accent-deep:${readable(q.accent)}"><div class="row"><span class="avatar av">${esc(q.symbol)}</span><div><div class="h2">${esc(q.answer)}</div>
      <div class="caption" style="color:${readable(q.accent)}">${esc(concept)}</div></div></div><p class="p">${esc(ex.definition)}</p></div>`;
  }
  let visual = `<div class="card"><div class="big-sym" style="color:${q.accent}">${esc(q.symbol)}</div></div>`;
  if (ex.kidsVisual?.startsWith('piano')) visual = `<div class="card piano-card"><span class="caption">Bir beyaz tuşa dokun ve izle!</span>${pianoHtml(ex.kidsVisual)}</div>`;
  if (ex.kidsVisual?.startsWith('clef-face')) visual = clefHtml(q, ex.kidsVisual === 'clef-face-fa');
  return `${tabs}<div class="page-in" style="display:flex;flex-direction:column;gap:12px;--accent:${q.accent};--accent-deep:${readable(q.accent)};--accent-read:${readable(q.accent)}">
    <div class="kids"><img class="mimi" data-sprite="mimi-wave" src="${frame('mimi-wave', 0)}" alt="Mimi"><div class="say">${esc(ex.kids ?? ex.definition)}</div></div>${visual}</div>`;
}

/** InstrumentPageViewModel.InstrumentFor: the quiz deck's instrument with the same name (Klarinet is "Klarnet" there). */
const quizKeyOf = name => Object.keys(INSTRUMENTS).find(k => slug(INSTRUMENTS[k].name) === slug(name) || (slug(name) === 'klarinet' && k === 'clarinet'));
const videosFor = d => VIDEOS.filter(v => v.page === d.riddle || slug(v.page ?? '').endsWith(slug(d.name)) || slug(v.title).startsWith(slug(d.name)));
const instrumentFlips = new Set();
function instrumentPage(key) {
  const d = DIRECTORY.find(x => slug(x.name) === key);
  if (!d) return missing('calgi/' + key);
  const qk = quizKeyOf(d.name);
  const qs = qk ? deck.all.filter(q => q.conceptIds.includes('instrument:' + qk)) : [];
  const vids = videosFor(d);
  const s = songFor(d.name, SONGS);
  const accent = GROUP_COLORS[d.group];
  return `<div class="stack">
    <div class="inst-hero" style="--accent:${mixHex(accent, '#14107A', 0.35)}"><span class="orb big"></span><span class="orb small"></span>
      <div class="ph"><img src="${photoOf(d.name)}" alt=""></div><b>${esc(d.name)}</b><small>${esc(FAMILY_OF_GROUP[d.group])}</small></div>
    <div class="card"><p class="p strong">${esc(d.summary)}</p></div>
    ${d.riddle ? `<button class="chunky purple" data-do="riddle"><span class="face">${icon('IconPlay')}Video bilmeceyi izle</span></button>` : ''}
    <button class="chunky white" data-ext="doremimi.org"><span class="face">${icon('IconBook')}Ayrıntılı çalgı bilgisi</span></button>
    ${vids.length ? `${ribbon('Videolar')}<div class="vgrid">${vids.map(v => videoCard(v, true)).join('')}</div>` : ''}
    ${s ? `<button class="tile" data-song-in-cal="${s.slug}"><div class="song-card"><span class="sq">${icon('IconNote')}</span><span class="mt"><b>Şarkısını çal</b><small>${esc(s.title)}</small></span>${icon('IconPlay', 'go')}</div></button>` : ''}
    ${qs.length ? `${ribbon('Kendini dene')}${qs.map(q => { const open = instrumentFlips.has(q.id); const id = q.id.slice(2); return `<button class="tile" data-iflip="${q.id}"><div class="card self${open ? ' open' : ''}">${open
      ? `<span class="caption" style="color:var(--cyan)">CEVAP</span><b class="ans-t">${esc(q.answer)}</b>`
      : `<span class="caption">${esc(DIFFICULTY[id] ?? '')}</span><b class="h3">${esc(q.prompt)}</b><span class="caption" style="color:var(--text-xp)">Cevap için kartı çevir</span>`}</div></button>`; }).join('')}
      <button class="chunky yellow" data-play="instrument:${qk}"><span class="face">${icon('IconCards')}Bu çalgıyla oyna</span></button>` : ''}
  </div>`;
}
const FAMILY_OF_GROUP = { 'Yaylı': 'Yaylı çalgılar', 'Telli': 'Telli çalgılar', 'Tuşlu': 'Tuşlu çalgılar', 'Nefesli': 'Nefesli çalgılar', 'Bakır nefesli': 'Bakır nefesli çalgılar', 'Vurmalı': 'Vurmalı çalgılar', 'Diğer': 'Diğer' };

// ───────────────────────── İzle (NR-40): Öğren's Videolar segment promoted to a tab
function watch() {
  const groups = ['riddle', 'clip', 'interview', 'karaoke', 'intro'];
  return `<div class="stack">${note("Doremimi'nin bilmece videoları, klipleri, karaokeleri ve jenerikleri.")}
    ${groups.map(k => { const list = VIDEOS.filter(v => v.kind === k); return `${ribbon(KIND_NAMES[k])}<div class="vgrid">${list.map(v => videoCard(v, true)).join('')}</div>`; }).join('')}
    ${menu([menuRow('IconPlay', 'var(--orange)', 'YouTube kanalı', 'Tüm klipler ve bilmeceler', 'data-ext="youtube.com"')])}</div>`;
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
function playRoot() {
  const melodim = profile.melodim ?? [];
  const songs = SONGS.filter(s => s.slug !== 'ana-tema').sort((a, b) => a.instrument.localeCompare(b.instrument, 'tr'))
    .filter(s => !calFilter || slug(entryOfSong(s)?.group ?? 'Diğer') === calFilter);
  return `<div class="stack">
    ${note('Piyanoda serbest çal ya da bir çalgının şarkısını dinle. Her şarkı uygulamanın piyanosuyla çalar.')}
    ${ribbon('Serbest çal')}
    <div class="card kb-card">${keyboardHtml2(60, 'free-keys')}<span class="caption c">Tuşlara dokun, sen de çal. Çaldıkların Melodim'e eklenir.</span></div>
    <button class="tile" ${melodim.length ? 'data-push="#/melodim"' : ''} id="melodim-card"><div class="card due-row"><span class="sq" style="background:var(--magenta)">${icon('IconNote')}</span><span class="mt"><b>Melodim</b><small>${melodim.length ? `${melodim.length} nota` : 'Butonlara dokun, melodin burada birikir'}</small></span>${melodim.length ? icon('IconChevronRight', 'chev') : ''}</div></button>
    ${ribbon('Şarkılar')}
    ${note('Bir çalgı seç, şarkısını dinle.')}
    ${chips([['', 'Tümü'], ...GROUPS.map(g => [slug(g), g])], calFilter, 'data-calf')}
    <div class="songs">${songs.map(s => `<button class="tile" data-push="#/sarki/${s.slug}"><div class="song-tile"><span class="ph"><img src="${songArt(s)}" alt="" loading="lazy"></span><b>${esc(s.instrument)}</b></div></button>`).join('')}</div>
    ${ribbon('Şarkı sözleri')}
    <div class="hscroll lyr">${LYRICS.map(l => `<button class="tile" data-push="#/sozler/${slug(l.instrument)}"><div class="card lyric"><b>${esc(l.instrument)}</b><small>${esc(l.lines[0])}</small></div></button>`).join('')}</div>
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
      <div class="mt"><span class="badge">${melodim ? 'MELODİM' : 'NOTALAR'}</span><b>${esc(s ? s.instrument : 'Melodim')}</b><small>${esc(s ? s.title : 'Senin çaldığın notalar')}</small></div>
      <span class="eq" id="eq">${'<i></i>'.repeat(7)}</span></div>
    <div class="card karaoke" id="karaoke"><div class="now">♪ ♪ ♪</div><div class="next"></div></div>
    <div class="card kb-card">${keyboardHtml2(60, 'song-keys')}<span class="prog"><i id="prog"></i></span><span class="caption c">Tuşlara dokun, sen de çal. Çaldıkların Melodim'e eklenir.</span></div>
    <div class="two-btn"><button class="chunky magenta large" data-song="toggle" id="song-toggle"><span class="face">${icon('IconPlay')}<span>Çal</span></span></button>
      <button class="chunky white large sq-btn" data-song="stop" aria-label="Durdur"><span class="face"><i class="stopsq"></i></span></button></div>
    ${lyric ? `<button class="chunky white" data-push="#/sozler/${slug(lyric.instrument)}"><span class="face">${icon('IconMic')}Sözleri</span></button>` : ''}
    <button class="chunky yellow" data-play="${P.concept ?? 'karisik'}"><span class="face">${icon('IconCards')}${P.concept ? 'Bu çalgıyla oyna' : 'Karışık oyna'}</span></button>
  </div>`;
}
async function setupSong(slugName, melodim = false) {
  stopSong();
  const token = P.token = {};
  let events;
  if (melodim) events = fromKeys(profile.melodim ?? []);
  else { try { events = sequence(await loadSong(slugName)); } catch { toast('Şarkı yüklenemedi', '', true); return; } }
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
  const t = P.from + (sound.now() - P.t0);
  if (t >= length(P.events) + 0.4) { stopSong(); return; }
  const i = indexAt(P.events, t);
  const n = i >= 0 ? P.events[i] : null;
  const sounding = n && n.midi >= 0 && t < n.start + n.duration;
  lightKey(n?.midi ?? -1, sounding);
  if (i !== P.idx) { P.idx = i; showLine(i); }
  const prog = $('#prog'); if (prog) prog.style.width = `${Math.min(100, t / length(P.events) * 100)}%`;
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
  b.querySelector('.face').innerHTML = `${icon(P.playing ? 'IconPause' : 'IconPlay')}<span>${P.playing ? 'Duraklat' : 'Çal'}</span>`;
  $('#eq')?.classList.toggle('on', P.playing);
}
/** Leaving a page stops its song (ch. 06 §9.8): a song must not play on under another page. */
function leavePage() { if (P.playing || P.events) { stopSong(); P.events = null; P.token = null; } }

function lyricsPage(key) {
  const l = LYRICS.find(x => slug(x.instrument) === key);
  if (!l) return missing('sozler/' + key);
  return `<div class="stack"><div class="card lyric-page"><span class="eyebrow">ŞARKI SÖZLERİ</span><b class="h2">${esc(l.title)}</b>
    ${l.lines.map(x => `<p>${esc(x)}</p>`).join('')}</div></div>`;
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
  if (card) { card.dataset.push = '#/melodim'; card.querySelector('small').textContent = `${profile.melodim.length} nota`; }
}

// ───────────────────────── the logo's hub, Doremimi (NR-30)
function hub() {
  return `<div class="stack">
    <div class="hub-hero"><span class="sq gold">${icon('IconNote')}</span><div><b>Dore Mimi Yetenek ve Eğitim Vakfı</b><small>Müziği çocuklarla buluşturuyoruz.</small></div></div>
    ${ribbon('Doremimi', ' small')}${menu([
      menuRow('IconInfo', 'var(--yellow-deep)', 'Doremimi nedir?', 'Uygulama ve vakıf hakkında', 'data-push="#/doremimi-nedir"'),
      menuRow('IconSmile', 'var(--magenta)', 'Dore ve Mimi', 'Karakterlerle tanış', 'data-push="#/dore-ve-mimi"')])}
    ${ribbon('Vakıf', ' small')}${menu([
      menuRow('IconHeart', 'var(--orange)', 'Vakıf', 'Yetenek ve Eğitim Vakfı', 'data-push="#/vakif"'),
      menuRow('IconUsers', 'var(--indigo)', 'Ekip', 'Projeyi hayata geçirenler', 'data-push="#/ekip"'),
      menuRow('IconBolt', 'var(--magenta)', 'Burslar', 'Si Bemol ve Mi Bemol', 'data-push="#/burslar"')])}
    ${ribbon('Katıl', ' small')}${menu([
      menuRow('IconHand', 'var(--steel)', 'Gönüllü ol', 'D. M. Gönüllüleri başvurusu', 'data-push="#/gonullu"'),
      menuRow('IconMail', 'var(--indigo)', 'Bültene abone ol', 'Yeniliklerden ilk sen haberdar ol', 'data-push="#/iletisim"')])}
    ${ribbon('Kitaplar', ' small')}${menu([
      menuRow('IconBook', 'var(--orange)', 'Kitaplar ve notalar', 'Kitaplar, metodlar, notalar ve satış noktaları', 'data-push="#/kitaplar"')])}
    ${ribbon('Bize ulaş', ' small')}${menu([
      menuRow('IconPhone', 'var(--navy)', 'İletişim', 'Telefon, e-posta ve mesaj formu', 'data-push="#/iletisim"'),
      menuRow('IconPlay', 'var(--orange)', 'YouTube', 'Tüm klipler ve bilmeceler', 'data-ext="youtube.com"'),
      menuRow('IconCamera', 'var(--magenta)', 'Instagram', '@dore_mimi_music', 'data-ext="instagram.com"'),
      menuRow('IconUsers', 'var(--steel)', 'Facebook', 'doremimitv', 'data-ext="facebook.com"'),
      menuRow('IconGlobe', 'var(--indigo)', 'Web sitesi', 'doremimi.org', 'data-ext="doremimi.org"')])}
    ${ribbon('Yardım', ' small')}${menu([
      menuRow('IconHelp', 'var(--orange)', 'Yardım ve SSS', 'Sık sorulan sorular', 'data-push="#/yardim"'),
      menuRow('IconLock', 'var(--slate)', 'Gizlilik politikası', 'Taslak', 'data-push="#/metin/gizlilik"'),
      menuRow('IconLock', 'var(--slate)', 'Kullanım koşulları', 'Taslak', 'data-push="#/metin/kosullar"'),
      menuRow('IconLock', 'var(--slate)', 'KVKK aydınlatma metni', 'Taslak', 'data-push="#/metin/kvkk"')])}
    ${ribbon('Uygulama', ' small')}${menu([
      menuRow('IconInfo', 'var(--steel)', 'Hakkında', 'Sürüm ve lisanslar', 'data-push="#/hakkinda"'),
      menuRow('IconPalette', 'var(--orchid)', 'Tasarım sistemi', 'Renkler, yazı tipleri ve bileşenler', 'data-push="#/tasarim"')])}
  </div>`;
}

function whatIs() {
  const rows = [['IconHome', 'var(--magenta)', 'Keşfet', 'OYNA, bugünün kartı ve duyurular', 'data-go="#/"'],
    ['IconBook', 'var(--cyan)', 'Öğren', 'Müzik işaretleri ve 41 çalgı', 'data-go="#/ogren/isaretler"'],
    ['IconEye', 'var(--orchid)', 'İzle', 'Bilmece videoları, klipler ve röportajlar', 'data-go="#/izle"'],
    ['IconNote', 'var(--blue)', 'Çal', 'Piyano, 41 şarkı ve Melodim', 'data-go="#/cal"'],
    ['IconCards', 'var(--yellow-deep)', 'Müzik Kart Oyunu', 'Kartı gör, cevabı yaz!', 'data-push="#/oyun-merkezi"']];
  return `<div class="stack">
    <div class="toy nedir"><div class="in"><div class="head"><img src="../assets/brand/logo.png" alt=""><div><div class="eyebrow">DOREMİMİ NEDİR?</div><b>Dore ve Mimi ile müziği oynayarak öğren!</b></div></div>
      <p class="lead">Nota işaretlerini ve çalgıları tanı, cevabını kendin yaz, şarkı ve bilmece videolarıyla dinle.</p></div></div>
    ${ribbon('Uygulamada neler var?')}${menu(rows.map(r => menuRow(...r)))}
    ${ribbon('Çünkü…')}<div class="card"><ul class="mani">${MANIFESTO.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></div>`;
}

function booksPage() {
  return `<div class="stack">${note('Kitaplar, metodlar, notalar ve şarkı sözleri. Her biri Doremimi kütüphanesinde.')}
    ${menu(LIBRARY.map(l => menuRow('IconBook', l.color, l.title, l.subtitle, 'data-ext="doremimi.org"')))}</div>`;
}
function characters() {
  return `<div class="stack">${note('Mimi ve en yakın arkadaşı Dore, müziğin dünyasında birlikte maceraya çıkıyor.')}
    ${CHARACTERS.map(c => `<div class="card char" style="--c:${c.color}"><img src="../assets/site/characters/${c.image}" alt="${esc(c.name)}"><div>
      <b class="h2">${esc(c.greeting)}</b><p class="p">${esc(c.bio)}</p>
      <dl><dt>Çalgıları</dt><dd>${esc(c.instruments)}</dd><dt>Kişiliği</dt><dd>${esc(c.trait)}</dd></dl></div></div>`).join('')}</div>`;
}
const pills = list => `<div class="pills">${list.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
const people = list => `<div class="card list">${list.map(([n, r]) => `<div class="lrow static"><span class="sq letter" style="background:var(--indigo)">${esc(n[0])}</span><span class="mt"><b>${esc(n)}</b><small>${esc(r)}</small></span></div>`).join('')}</div>`;
function foundation() {
  return `<div class="stack">
    <div class="card"><span class="eyebrow" style="color:var(--text-gold)">DUYURU</span><b class="h2">${esc(NEWS)}</b></div>
    <div class="card"><span class="eyebrow">GELECEK VİZYONU</span><p class="p ink">${esc(VISION)}</p></div>
    <div class="two-btn eq2"><button class="chunky blue" data-push="#/gonullu"><span class="face">Gönüllü ol</span></button><button class="chunky white" data-push="#/burslar"><span class="face">Burslar</span></button></div>
    ${ribbon('Yönetim Kurulu')}${people(BOARD)}
    ${ribbon('Kurucu Üyeler')}${pills(FOUNDERS)}
    ${ribbon('Destekçiler')}${pills(PARTNERS)}</div>`;
}
const teamPage = () => `<div class="stack">${note("Şarkılardan animasyonlara, kitaplardan çevirilere: Doremimi'yi birlikte üretiyoruz.")}${people(TEAM)}${ribbon('Danışmanlar')}${pills(ADVISORS)}</div>`;
const scholarships = () => `<div class="stack">${note('Dore Mimi Müzikle Değerler Eğitimi projesini destekleyen iki burs programı hazırlanıyor.')}
  ${[['Si Bemol Bursu', 'Müzik yeteneği olan çocuk ve gençlerin eğitim yolculuğunu desteklemek için.'], ['Mi Bemol Bursu', 'Müzikle değerler eğitimi projelerine katılan öğrenciler için.']].map(([t, x]) => `<div class="card"><span class="badge soonb">YAKINDA</span><b class="h2">${t}</b><p class="p">${x}</p></div>`).join('')}
  <button class="chunky blue" data-ext="e-posta"><span class="face">${icon('IconBell')}Başvurular açılınca haber ver</span></button></div>`;
const field = (ph, tall = false) => tall ? `<textarea class="field" placeholder="${ph}" rows="4"></textarea>` : `<input class="field" placeholder="${ph}">`;
const volunteer = () => `<div class="stack">${note('D. M. Gönüllüleri; konserlerde, atölyelerde ve yayınlarda çocuklarla müziği buluşturuyor. Başvurunu ilet, seninle iletişime geçelim.')}
  <div class="card form"><div class="two-btn eq2">${field('Adın')}${field('Soyadın')}</div>${field('E-posta')}${field('Telefon')}${field('Motivasyon mektubun: neden gönüllü olmak istiyorsun?', true)}
  <button class="chunky blue" data-ext="e-posta"><span class="face">Başvurumu gönder</span></button></div></div>`;
function contact() {
  return `<div class="stack">
    <div class="card list">${CONTACTS.map(([t, p, mail]) => `<div class="lrow static"><span class="sq" style="background:var(--navy)">${icon('IconPhone')}</span><span class="mt"><small>${esc(t)}</small><b>${esc(p)}</b>${mail ? `<small>${esc(mail)}</small>` : ''}</span>
      <button class="chunky white small" data-ext="e-posta"><span class="face">${icon('IconMail')}</span></button></div>`).join('')}</div>
    ${ribbon('Bize yaz')}<div class="card form">${field('E-posta')}${field('Mesajın', true)}<button class="chunky indigo" data-ext="e-posta"><span class="face">Gönder</span></button></div>
    <div class="card news"><b class="h3">Bültene abone ol</b><p class="p">Yeni klipler, oyunlar ve konserlerden ilk sen haberdar ol.</p>
      <div class="sub">${field('E-posta adresin')}<button class="chunky yellow" data-ext="e-posta"><span class="face">Abone ol</span></button></div></div></div>`;
}
function legalPage(key) {
  const t = LEGAL[key];
  if (!t) return missing('metin/' + key);
  return `<div class="stack">${t.draft ? `<div class="card note"><p class="p strong" style="color:var(--text-gold)">${esc(DRAFT_NOTE)}</p></div>` : ''}
    ${t.sections.map(([h, b]) => `<div class="card"><b class="h3">${esc(h)}</b><p class="p">${esc(b)}</p></div>`).join('')}</div>`;
}
const about = () => `<div class="stack"><div class="card about"><img src="../assets/brand/logo.png" alt=""><b class="h1">doremimi</b><span class="caption">Sürüm 0.1.73</span></div>
  <div class="card"><b class="h3">Lisanslar</b><p class="p">Yazı tipleri: Baloo 2, Nunito ve Noto Music (SIL Open Font License). Oyun görselleri Doremimi için özgün olarak üretilmiştir. İçerik © Dore Mimi Yetenek ve Eğitim Vakfı.</p></div></div>`;
// The app's Tasarım sistemi page (ch. 03 §18.8) is a long component gallery; the demo shows its palette and buttons only.
const design = () => `<div class="stack">${note('Renkler, yazı tipleri ve bileşenler.')}
  <div class="card"><div class="swatches">${[['Navy', '#0A0A3C'], ['Indigo', '#14107A'], ['Steel', '#1C6FAA'], ['Blue', '#2B9BFF'], ['Cyan', '#3FDAFF'], ['Yellow', '#FFCC00'], ['Orange', '#FF4D00'], ['Orchid', '#E85BE6'], ['Magenta', '#E0109E'], ['Mint', '#38E08C']].map(([n, c]) => `<span><i style="background:${c}"></i>${n}<small>${c}</small></span>`).join('')}</div></div>
  <div class="card" style="display:flex;flex-direction:column;gap:12px"><button class="chunky yellow"><span class="face">Sarı buton</span></button><button class="chunky blue"><span class="face">Mavi buton</span></button><button class="chunky white"><span class="face">Beyaz buton</span></button></div></div>`;

// ───────────────────────── the game's page, pushed from Keşfet's Konu seç (§4, OC-01 A)
const FAMILY_ART = { TelliCalgilar: 'strings', YayliCalgilar: 'bowed', VurmaliCalgilar: 'percussion', TusluCalgilar: 'keys', NefesliUflemeliCalgilar: 'wind' };
function gameHub() {
  const due = dueCards();
  return `<div class="stack">
    <div class="game-hero"><span class="eyebrow-pill">TEK OYUN · ÜÇ SEVİYE</span><b>Müzik Kart Oyunu</b>
      <p>Kartı gör, cevabı yaz; zorlanırsan oyun sana seçenek verir ya da kartı çevirip birlikte okursunuz.</p><small>${QUESTIONS.length} kart · işaretler ve çalgılar</small>
      <button class="chunky yellow large shine" data-do="play"><span class="face">${icon('IconPlay')}Oyna · Karışık deste</span></button>
      <button class="chunky white" data-do="howto"><span class="face">${icon('IconHelp')}Nasıl oynanır?</span></button></div>
    ${due.length ? `<button class="tile" data-do="review"><div class="card due-row"><span class="sq" style="background:var(--orchid)">${icon('IconReplay')}</span><span class="mt"><b>Tekrar zamanı</b><small>${due.length} kart seni bekliyor</small></span>${icon('IconChevronRight', 'chev')}</div></button>` : ''}
    ${ribbon('Müzik işaretleri')}${note('Bir işarete dokun, o konudan başlayarak oyna.')}
    <div class="signs">${SIGN_CATEGORIES.map(c => signTile(c, mastery.conceptMastery('signcat:' + c.key, deck))).join('')}</div>
    ${ribbon('Çalgı aileleri')}
    ${Object.entries(FAMILIES).map(([k, f]) => { const m = mastery.conceptMastery('family:' + k, deck); const n = deck.forConcept('family:' + k).length; return `<button class="tile" data-play="family:${k}"><div class="fam-row" style="--c:${f.color}">
      <img src="../assets/cards/portrait-${FAMILY_ART[k]}.png" alt=""><span class="mt"><b>${esc(f.name)}</b><span class="bar"><span class="thin"><i style="width:${Math.round(m * 100)}%"></i></span><small>${pct(m)}</small></span><small>${n} kart</small></span>${icon('IconChevronRight', 'chev')}</div></button>`; }).join('')}
  </div>`;
}

// ───────────────────────── Profilim (NR-60): the child header, progress, and the family's rows
const GUEST = { id: null, name: 'Misafir', age: '', image: 'mimi.png' };
// The two children of the app's snapshot preset (54-who-is-playing.png); their names are the owner's call (ch. 10 O-18).
const CHILDREN = [{ id: 'ada', name: 'Ada', age: '6-7 yaş', image: 'mimi.png' }, { id: 'can', name: 'Can', age: '8-9 yaş', image: 'dore.png' }];
function profilePage() {
  const kid = childOf();
  const goal = toNextLevel(LEARNING, profile.level);
  const totalStars = profile.stars ?? 0;
  const instr = DIRECTORY.length, riddles = DIRECTORY.filter(d => d.riddle).length;
  const general = deck.concepts.length ? deck.concepts.reduce((a, c) => a + mastery.conceptMastery(c, deck), 0) / deck.concepts.length : 0;
  const bar = (label, v, text) => `<div class="pbar"><span class="pl">${label}</span><span class="pv"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i><b>${text}</b></span></div>`;
  const earned = BADGES.filter(b => profile.badges.includes(b.id));
  return `<div class="stack">
    <div class="card child-head"><span class="avatar big"><img src="../assets/site/characters/${kid.image}" alt=""></span><div class="mt"><b class="h2">${esc(kid.name)}</b>${kid.age ? `<small>${esc(kid.age)}</small>` : ''}</div>
      <button class="chunky white small" data-do="switcher"><span class="face">${icon('IconSmile')}Kim oynuyor?</span></button></div>
    <div class="prof-hero"><span class="orb big"></span><span class="orb small"></span>
      <div class="top"><span class="lvbox"><small>SEVİYE</small><b>${profile.level}</b></span><div class="mt"><b>Müzik Kâşifi</b><span class="xpbar"><i style="width:${Math.round(profile.xp / goal * 100)}%"></i></span><small>${profile.xp} / ${goal} XP</small></div></div>
      <div class="three"><span><b>${profile.badges.length}</b>rozet</span><span><b>${profile.rounds ?? 0}</b>oynanan tur</span><span><b>${totalStars}</b>yıldız</span></div></div>
    ${ribbon('İlerleme')}<div class="dark-card">${bar('Genel', general, pct(general))}${bar('Çalgılar', (profile.seen ?? []).length / instr, `${pct((profile.seen ?? []).length / instr)} (${(profile.seen ?? []).length}/${instr})`)}${bar('Bilmeceler', 0, `%0 (0/${riddles})`)}</div>
    ${ribbon('İstatistikler')}<div class="dark-card stats">${[['Oynanan tur', profile.rounds ?? 0, 'var(--blue)'], ['En iyi tur', profile.best ?? 0, 'var(--orange)'], ['Cevaplanan soru', profile.answered ?? 0, 'var(--mint)']].map(([l, v, c]) => `<div><span class="pl">${l}</span><b style="color:${c}">${v}</b></div>`).join('')}</div>
    ${ribbon('Rozetler')}<div class="card badges">${earned.map(b => `<span class="bdg">${medalHtml(b)}<small>${esc(b.name)}</small></span>`).join('')}</div>
    <div class="card note"><p class="p strong c">Çalgıları keşfet, bilmece izle, soruları cevapla ve Müzik Kart Oyunu'nu oyna: her şey XP kazandırır.</p></div>
    ${ribbon('Aile ve ayarlar', ' small')}${menu([
      menuRow('IconGrid', 'var(--slate)', 'Ayarlar', 'Hareket, sesler, bildirimler ve metinler', 'data-push="#/ayarlar"'),
      menuRow('IconLock', 'var(--indigo)', 'Hesabım', 'Ebeveyn bilgileri, şifre, çocuklar', 'data-do="hesabim"'),
      menuRow('IconStar', 'var(--steel)', 'Ebeveyn paneli', 'Çocukların seviyesi ve pratiği', 'data-do="panel"')])}
  </div>`;
}
const SETTINGS = [['motion', 'Azaltılmış hareket', 'Kartlar ve arka plan sabit durur'], ['buttons', 'Buton sesleri', 'Her dokunuşta bir piyano notası çalar'], ['music', 'Müzik', 'Açılışta Doremimi teması bir kez çalar'], ['notify', 'Bildirimler', 'Yakında: günlük oyun hatırlatması']];
function settingsPage() {
  const s = profile.settings;
  return `<div class="stack">${ribbon('Oyun', ' small')}
    ${SETTINGS.map(([k, t, x]) => `<button class="tile" data-set="${k}"><div class="card toggle"><span class="mt"><b>${t}</b><small>${x}</small></span><span class="sw${s[k] ? ' on' : ''}"><i></i></span></div></button>`).join('')}
    ${ribbon('Metinler', ' small')}<div class="card menu plain">${[['Gizlilik politikası', '#/metin/gizlilik'], ['Kullanım koşulları', '#/metin/kosullar'], ['KVKK aydınlatma metni', '#/metin/kvkk'], ['Yardım ve SSS', '#/yardim'], ['Hakkında', '#/hakkinda']].map(([t, h]) => `<button class="mrow" data-push="${h}"><span class="mt"><b>${t}</b></span></button>`).join('')}</div></div>`;
}
const account = () => `<div class="stack"><div class="navy-card"><b>Misafir</b><small>Hesap oluşturulmadı</small></div>
  <button class="chunky green" data-do="soon"><span class="face">Hesap oluştur</span></button>
  ${ribbon('Çocuklar', ' small')}<button class="chunky blue" data-do="soon"><span class="face">Profil ekle</span></button>
  ${ribbon('Ebeveyn kilidi', ' small')}<button class="chunky white" data-do="soon"><span class="face">Ebeveyn PIN'ini değiştir</span></button>
  <button class="chunky indigo" data-do="soon"><span class="face">Çıkış yap</span></button><span class="caption on-canvas">Çıkış yapınca profiller ve ilerleme bu cihazda kalır.</span>
  <button class="chunky orange" data-do="wipe"><span class="face">Hesabı ve verileri sil</span></button></div>`;
const parentPanel = () => { const kid = childOf(); return `<div class="stack"><div class="card child-head"><span class="avatar big"><img src="../assets/site/characters/${kid.image}" alt=""></span><div class="mt">
  <b class="h3">${esc(kid.name)}</b><small style="color:var(--text-xp)">Seviye ${profile.level} · ${profile.xp} XP</small><span class="p">${profile.answered ?? 0} kart · ${profile.days.length} günde oynadı · ${Object.keys(profile.mastery).length} soru görüldü</span>
  <small>${(profile.seen ?? []).length} çalgı keşfetti · 0 bilmece izledi · ${profile.badges.length} rozet</small></div></div>
  <span class="caption on-canvas">Bu bilgiler yalnızca bu cihazda tutulur.</span><button class="chunky white" data-do="soon"><span class="face">Ebeveyn PIN'ini değiştir</span></button></div>`; };

/** Each pushed page: its title and its body. */
const PAGES = {
  'isaret-kategori': { title: k => SIGN_CATEGORIES.find(c => c.key === k)?.name ?? '', html: signCategory },
  isaret: { title: id => SIGN_CARDS.find(c => c.id === id)?.name ?? '', html: signCard },
  calgi: { title: k => DIRECTORY.find(d => slug(d.name) === k)?.name ?? '', html: instrumentPage },
  sarki: { title: s => SONGS.find(x => x.slug === s)?.instrument ?? '', html: s => songPage(s) },
  sozler: { title: k => LYRICS.find(l => slug(l.instrument) === k)?.instrument ?? '', html: lyricsPage },
  melodim: { title: 'Melodim', html: () => songPage(null, true) },
  'oyun-merkezi': { title: 'Müzik Kart Oyunu', html: gameHub },
  'doremimi-nedir': { title: 'Doremimi nedir?', html: whatIs },
  kitaplar: { title: 'Kitaplar ve notalar', html: booksPage },
  'dore-ve-mimi': { title: 'Dore ve Mimi', html: characters },
  vakif: { title: 'Vakıf', html: foundation },
  ekip: { title: 'Ekip', html: teamPage },
  burslar: { title: 'Burslar', html: scholarships },
  gonullu: { title: 'Gönüllü ol', html: volunteer },
  iletisim: { title: 'İletişim', html: contact },
  yardim: { title: 'Yardım ve SSS', html: () => legalPage('yardim') },
  metin: { title: k => LEGAL[k]?.title ?? '', html: legalPage },
  hakkinda: { title: 'Hakkında', html: about },
  tasarim: { title: 'Tasarım sistemi', html: design },
  profil: { title: 'Profilim', html: profilePage },
  ayarlar: { title: 'Ayarlar', html: settingsPage },
  hesabim: { title: 'Hesabım', html: account },
  'ebeveyn-paneli': { title: 'Ebeveyn paneli', html: parentPanel },
};
const ROOTS = { kesfet: home, ogren: learn, doremimi: hub, izle: watch, cal: playRoot };

/** Work a page needs after its HTML is in: the song page loads its notes; an instrument page counts as seen. */
function afterRender() {
  if (route.page === 'sarki') setupSong(route.arg);
  if (route.page === 'melodim') setupSong(null, true);
  if (route.page === 'calgi') {
    const seen = new Set(profile.seen ?? []);
    if (!seen.has(route.arg) && DIRECTORY.some(d => slug(d.name) === route.arg)) {
      seen.add(route.arg); profile.seen = [...seen];
      // Opening an instrument for the first time pays 10 XP (learning.json seenInstrument; ch. 02 §3.6).
      const lv = addXp(LEARNING, profile.level, profile.xp, LEARNING.xp.seenInstrument);
      profile.level = lv.level; profile.xp = lv.xp; save(); renderTopbar();
      toast(`+${LEARNING.xp.seenInstrument} XP`, `${DIRECTORY.find(d => slug(d.name) === route.arg).name} keşfedildi`);
    }
  }
  updatePill();
}

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
  const line = gate.reason === 'parent' ? "Bu sayfa ebeveynler için. Devam etmek için ebeveyn PIN'ini gir." : "Uygulamadan çıkmak üzeresin. Devam etmek için ebeveyn PIN'ini gir.";
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'ok'];
  overlayHost.innerHTML = `<div class="overlay scrim"><div class="gate"><span class="pop-ribbon">${icon('IconLock')}Ebeveyn kilidi</span>
    <button class="chunky white close x" data-do="gate-close" aria-label="Kapat"><span class="face">${icon('IconCross')}</span></button>
    <p class="p ink c">${line}</p>${gate.reason !== 'parent' ? `<span class="host">${icon('IconExternal')}${esc(gate.reason)}</span>` : ''}
    <div class="pin-dots${gate.msg === 'wrong' ? ' bad' : ''}">${Array.from({ length: 6 }, (_, i) => `<i class="${i < gate.typed.length ? 'on' : ''}"></i>`).join('')}</div>
    ${locked ? '<p class="p c wrong">Çok fazla deneme. Biraz bekle.</p>' : gate.msg === 'wrong' ? "<p class=\"p c wrong\">PIN yanlış. Tekrar dene.</p>" : ''}
    <div class="pad">${keys.map(k => `<button class="chunky ${k === 'x' ? 'orange' : k === 'ok' ? 'green' : 'white'}" data-pin="${k}"${locked ? ' disabled' : ''}><span class="face">${k === 'x' ? icon('IconErase') : k === 'ok' ? icon('IconCheck') : k}</span></button>`).join('')}</div>
    <button class="chunky indigo" data-do="gate-close"><span class="face">Vazgeç</span></button></div></div>`;
}
function openOverlay(kind, data) { overlay.kind = kind; overlay.data = data; renderOverlay(); }
function closeOverlay() { overlay.kind = null; renderOverlay(); }
function renderOverlay() {
  if (gate.open) return renderGate();
  if (overlay.kind === 'switcher') {
    overlayHost.innerHTML = `<div class="overlay who-ov"><button class="chunky white close x" data-do="ov-close" aria-label="Kapat"><span class="face">${icon('IconCross')}</span></button>
      <b class="ttl">Kim oynuyor?</b><div class="kids2">${CHILDREN.map(c => `<button class="tile" data-child="${c.id}"><div class="kid${profile.child === c.id ? ' on' : ''}"><img src="../assets/site/characters/${c.image}" alt=""><b>${c.name}</b><small>${c.age}</small></div></button>`).join('')}</div>
      <button class="chunky green large" data-do="soon"><span class="face">Profil ekle</span></button></div>`;
  } else if (overlay.kind === 'player') {
    const v = VIDEOS.find(x => x.id === overlay.data);
    overlayHost.innerHTML = `<div class="overlay scrim player-ov"><div class="player"><div class="frame"><img src="../assets/site/${esc(v.thumb)}" alt=""><button class="big-play" data-do="vplay" aria-label="Oynat">${icon('IconPlay')}</button></div>
      <div class="pmeta"><b>${esc(v.title)}</b><small>${esc(KIND_NAMES[v.kind])} · YouTube</small></div>
      <p class="p c">Uygulamada video YouTube'da açılır. Bu sunum internetsiz çalıştığı için burada yalnızca kapağını gösteriyoruz.</p>
      <button class="chunky white" data-do="ov-close"><span class="face">Kapat</span></button></div></div>`;
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
  app.insertAdjacentHTML('beforeend', `<div class="theme-pill" id="pill"><button class="tile body" data-do="pill" aria-label="Çal'ı aç"><span class="eqs on"><i></i><i></i><i></i><i></i></span><span class="mt"><small>Şimdi çalıyor</small><b>Doremimi teması</b></span></button>
    <button class="chunky white close" data-do="pill-x" aria-label="Durdur"><span class="face">${icon('IconCross')}</span></button></div>`);
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
  // The theme plays once per launch when Keşfet first shows; on the web it starts at the first tap (ch. 06 §7.7).
  if (!theme.played && route.tab === 'kesfet' && !route.page && profile.settings.music) { theme.played = true; playTheme(); }
}, true);

// ───────────────────────── the game (MusicCardGameViewModel.cs)
const G = { round: null, q: null, stage: null, answer: '', feedback: '', bad: false, outcome: null, outcomeSeq: 0, line: null, lineSeq: 0, moved: false,
  revealTab: 1, wrongPick: null, results: null, intro: null, levelUp: null, cardSeq: 0, renderedSeq: -1, roundBadges: [], masteryBefore: {}, concept: null, fx: null };
let gameBg = null;

function openGame({ concept = null, level = null, intro } = {}) {
  closeOverlaysOfShell();
  const sunumDeck = concept === 'sunum';
  G.concept = concept;
  G.random = SUNUM ? seeded(11) : fromClock();
  // `tekrar` is Tekrar zamanı: the cards met before that are due again (NR-80), at most a round's worth.
  const cards = sunumDeck ? SUNUM_DECK.map(id => deck.find(id)) : concept === 'tekrar' ? dueCards().slice(0, LEARNING.cardsPerRound)
    : dealFor(concept === 'karisik' ? null : concept, LEARNING.cardsPerRound);
  const startLevel = level ? Level[{ yaz: 'Yaz', sec: 'Sec', cevir: 'Cevir' }[level]] : Level[profile.ladder] ?? Level.Yaz;
  G.round = new LearningRound(cards, deck, new LevelLadder(LEARNING.ladder, startLevel), LEARNING, G.random);
  G.masteryBefore = Object.fromEntries(deck.concepts.map(c => [c, mastery.conceptMastery(c, deck)]));
  G.results = null; G.levelUp = null; G.roundBadges = []; G.line = null;
  G.intro = (intro === true || (intro !== false && !profile.seenIntro)) ? { step: 0 } : null;
  gameEl.hidden = false;
  gameEl.innerHTML = `<canvas class="backdrop" id="gbg" aria-hidden="true"></canvas><div class="g-head" id="ghead"></div><div class="g-body" id="gbody"></div><div id="gover"></div>`;
  gameBg = new Backdrop($('#gbg'), { seed: 3, mood: moodOf(startLevel), clearTop: safeTop(), reduced: REDUCED });
  gameBg.start();
  shellBg.stop();
  stopCarousel();
  leavePage(); stopTheme();
  showCard();
}

/** MusicCardGameViewModel.Deal (:201-216): a short concept is topped up from the whole deck, same kinds only. */
function dealFor(conceptId, count) {
  const cards = deck.deal(conceptId, count, mastery, G.random);
  if (cards.length < count && conceptId != null) {
    const kinds = new Set(cards.map(c => c.kind));
    cards.push(...deck.deal(null, deck.all.length, mastery, G.random).filter(c => kinds.has(c.kind) && !cards.includes(c)).slice(0, count - cards.length));
  }
  return cards;
}

function exitGame() {
  G.results = null; G.levelUp = null; G.round = null;
  gameEl.hidden = true; gameEl.innerHTML = '';
  gameBg?.stop(); gameBg = null;
  shellBg.start();
  typing(false);
  // A round changes what the shell shows (XP, Tekrar zamanı, the game page's %), so the page under the game is
  // rebuilt when the game closes (OC-29: no stale hub).
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
  G.feedback = `“${typed}” olmadı. Harfler yardıma geldi: boş kutuları doldur!`;   // :243
  G.bad = true; G.stage = Stage.Tiles; G.fx = 'wrong';
  renderGame();
}

function submitTiles() {
  const res = G.round.submitTiles();
  if (res.verdict === 'Blank') return;
  if (res.verdict === 'Right' || res.verdict === 'Close') return solved(res);
  G.feedback = 'Bu sefer olmadı. Dört cevaptan doğrusunu seç!';   // :268
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
  const o = endCard();
  // "A self-graded card has nothing left to show: the answer is already up" (:409-412): straight on.
  next();
  if (o.xp > 0) { G.outcome = { headline: `+${o.xp} XP`, detail: 'BİLDİM' }; G.outcomeSeq++; renderGame(); }
}

function next() {
  if (!G.round) return;
  if (G.round.isOver) finish(); else showCard();
}

function solved(res) {
  const q = G.q;
  const o = endCard();
  G.feedback = res.verdict === 'Close' ? `Çok yaklaştın! Doğrusu: ${res.answer ?? q.answer}` : 'Doğru bildin!';   // :453
  G.bad = false;
  G.outcome = { headline: `+${o.xp} XP`, detail: { TypedFirstTry: 'İLK DENEMEDE!', TypedWithTiles: 'HARFLERLE BULDUN!' }[o.resolution] ?? 'DOĞRU SEÇİM!' };
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
 * it with its XP and mastery, the ladder shows any move, and badges are checked. The stage stays on the card's end.
 */
function endCard() {
  const ended = G.round.stage;
  const o = G.round.next();
  const lv = addXp(LEARNING, profile.level, profile.xp, o.xp);
  profile.level = lv.level; profile.xp = lv.xp;
  mastery.record(o.questionId, o.evidence);
  profile.ladder = levelName(o.levelAfter);
  const day = today(DAY_SHIFT);
  if (!profile.days.includes(day)) profile.days.push(day);
  profile.answered = (profile.answered ?? 0) + 1;   // Profilim › İstatistikler › Cevaplanan soru
  G.stage = ended;
  if (o.move !== Move.None) {
    const l = o.levelAfter;
    // LadderViewModel.Show (:686-695): a line only when the game moved the child.
    G.line = o.move === Move.Up ? (l === Level.Yaz ? 'Harika! Yazma seviyesine çıktın' : 'Süper! Seçme seviyesine çıktın')
      : (l === Level.Sec ? 'Biraz seçerek ilerleyelim' : 'Şimdi kartları çevirip birlikte okuyalım');
    G.lineSeq++; G.moved = true;
    gameBg?.setMood(moodOf(l), { celebrate: true, up: o.move === Move.Up });
  }
  const earned = newlyEarned(BADGES, { mastery, deck, round: G.round.outcomes, days: profile.days }, profile.badges);
  profile.badges.push(...earned.map(b => b.id));
  G.roundBadges.push(...earned);
  if (lv.levelsGained > 0) G.levelUp = { level: profile.level, toNext: toNextLevel(LEARNING, profile.level) - profile.xp };
  save();
  renderTopbar();
  return o;
}

function finish() {
  const r = G.round;
  const facts = pickConcepts(r.outcomes, deck, c => mastery.conceptMastery(c, deck), G.random, LEARNING.resultConcepts)
    .filter(id => CONCEPTS[id])
    .map(id => ({ id, info: CONCEPTS[id], before: G.masteryBefore[id] ?? 0, after: mastery.conceptMastery(id, deck) }));
  G.results = { stars: starsOf(r.outcomes, LEARNING.roundStars), right: r.outcomes.filter(o => isRight(o.resolution)).length, count: r.outcomes.length,
    xp: r.xpEarned, level: r.ladder.level, facts, badges: G.roundBadges.slice() };
  // Profilim's counts: rounds played, the best round (cards known) and the stars (ch. 03 §16.2-16.4).
  profile.rounds = (profile.rounds ?? 0) + 1; profile.best = Math.max(profile.best ?? 0, G.results.right); profile.stars = (profile.stars ?? 0) + G.results.stars;
  save();
  renderGame();
}

function closeIntro() { profile.seenIntro = true; save(); G.intro = null; renderGame(); }

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
    <button class="chunky orange close" data-g="exit" title="Oyundan çık" aria-label="Kapat"><span class="face">${icon('IconCross')}</span></button>
    <div class="t"><b>Müzik Kart Oyunu</b>${playing ? `<small>Kart ${Math.max(current, 1)} / ${r.count}</small>` : ''}</div>
    <span class="avatar sv">Sv ${profile.level}</span>`;
  const body = $('#gbody');
  body.style.visibility = playing ? '' : 'hidden';
  if (playing) {
    body.innerHTML = `${ladderHtml()}<div class="card-area" id="carea">${cardAreaHtml()}</div><div class="answer-area" id="aarea">${answerHtml()}</div>`;
    if (G.renderedSeq !== G.cardSeq) G.renderedSeq = G.cardSeq;
    afterCardRender();
  }
  const head = $('#ghead');
  gameEl.style.setProperty('--below', `${head.offsetTop + head.offsetHeight + 10}px`);
  $('#gover').innerHTML = (G.results ? resultsHtml() : '') + (G.levelUp && !G.results ? levelUpHtml() : '') + (G.intro ? introHtml() : '');
  typing(playing && !G.intro && isTypingStage());
  G.fx = null; G.moved = false;
}

function ladderHtml() {
  const l = G.round.ladder;
  const step = (cls, lvl, ic, label) => `<span class="step ${cls}${l.level === lvl ? ' lit' : ''}">${icon(ic)}${label}</span>`;
  const dots = Array.from({ length: l.rightNeeded }, (_, i) => `<i class="${i < l.rightInARow ? 'on' : ''}"></i>`).join('');
  return `<div class="ladder${G.moved ? ' moved' : ''}"><div class="in">
    ${step('cevir', Level.Cevir, 'IconReplay', 'Çevir')}${step('sec', Level.Sec, 'IconCards', 'Seç')}${step('yaz', Level.Yaz, 'IconPencil', 'Yaz')}
    ${dots ? `<span class="ldots">${dots}</span>` : '<span></span>'}</div></div>`;
}

const accentVars = q => `--accent:${q.accent};--accent-deep:${readable(q.accent)};--accent-read:${readable(q.accent)};--edge:${edge(q.accent)}`;

/** QuestionCardViewModel (:580-607): the chip never names the answer. */
function chipOf(q) {
  if (q.kind === 'sign') return 'MÜZİK İŞARETİ';
  const inst = q.conceptIds.find(id => id.startsWith('instrument:'));
  const name = inst ? CONCEPTS[inst]?.name : null;
  return name && !normalise(q.answer).includes(normalise(name)) ? upperTr(name) : 'ÇALGI SORUSU';
}

function cardAreaHtml() {
  const q = G.q;
  const back = G.stage === Stage.Revealed || G.stage === Stage.Flipped;
  // The chip and the ladder's line play once: a later redraw (a tab on the information card) must not replay them.
  const chip = G.outcome && G.shownOutcome !== G.outcomeSeq ? `<div class="xp-chip" data-seq="${G.outcomeSeq}"><span class="toastb">${esc(G.outcome.headline)}</span><small>${esc(G.outcome.detail)}</small></div>` : '';
  const line = G.line && G.shownLine !== G.lineSeq ? `<div class="ladder-line" data-seq="${G.lineSeq}">${esc(G.line)}</div>` : '';
  G.shownOutcome = G.outcomeSeq; G.shownLine = G.lineSeq;
  if (back) return `<div class="back-scroll"><div class="back" style="${accentVars(q)}">${revealHtml(q)}</div></div>${chip}${line}`;
  const deal = G.renderedSeq !== G.cardSeq ? ' deal' : '';
  const solved = G.stage === Stage.Solved;
  return `<div class="qcard${deal}" style="${accentVars(q)}"><div class="face-card">
      <span class="chip">${esc(chipOf(q))}</span>
      <div class="symbol">${q.symbol ? esc(q.symbol) : `<span class="note-box">${icon('IconNote')}</span>`}</div>
      <div class="prompt">${esc(q.prompt)}</div>
      ${solved ? `<div class="solved"><b>${esc(q.answer)}</b><small>${esc(G.feedback)}</small></div>` : ''}
    </div></div>${chip}${line}`;
}

/** RevealCardView.axaml: the answer said kindly, then Tanım / Çocuk anlatımı for a sign, the facts for a question. */
function revealHtml(q) {
  const concept = CONCEPTS[q.conceptIds[0]]?.name ?? '';
  const head = `<div class="card ans">${q.symbol ? `<span class="s">${esc(q.symbol)}</span>` : '<span></span>'}<div>
    <small>Birlikte öğrenelim! Doğru cevap:</small><b>${esc(q.answer)}</b><small>${esc(concept)}</small>
    ${G.wrongPick ? `<small>Senin seçimin: ${esc(G.wrongPick)}</small>` : ''}</div></div>`;
  if (q.kind !== 'sign') {
    const ex = q.explanation;
    const instKey = q.conceptIds.find(id => id.startsWith('instrument:'))?.slice(11);
    const inst = INSTRUMENTS[instKey];
    const fam = FAMILIES[inst.family];
    const facts = [['Hatırla', ex.tip], [`${inst.name} hakkında`, ex.instrumentSummary], [fam.name, ex.familyDescription]].filter(([, t]) => t);
    // A riddle video exists for the instrument when the site lists one for its page (InstrumentPageViewModel.VideosFor).
    const entry = DIRECTORY.find(d => quizKeyOf(d.name) === instKey);
    const video = entry ? videosFor(entry)[0] : null;
    G.links = { video: video?.id ?? null, instrument: entry ? slug(entry.name) : null };
    return `${head}<div class="card"><div class="caption">SORU</div><p class="p" style="color:var(--ink);font-weight:700">${esc(q.prompt)}</p></div>
      ${facts.map(([t, x]) => `<div class="card fact"><h3 class="h3">${esc(t)}</h3><p class="p">${esc(x)}</p></div>`).join('')}
      <div class="links2">${video ? `<button class="chunky orange" data-g="video"><span class="face">${icon('IconPlay')}Videoyu izle</span></button>` : '<span></span>'}
        ${G.links.instrument ? `<button class="chunky steel" data-g="instrument">` : '<span hidden>'}<span class="face">${icon('IconBook')}Çalgı sayfası</span>${G.links.instrument ? '</button>' : '</span>'}</div>`;
  }
  return `${head}${explainHtml(q, G.revealTab, 'data-gtab')}`;
}

// Controls/PianoVisual.cs: a white key lights the black key after it (diyez) or before it (bemol); idle 4 s, it plays itself.
const NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
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
    </svg></div><div class="voices"><span class="voice${fa ? '' : ' on'}">ANNE SESLER · ince</span><span class="voice">ORTA SESLER</span><span class="voice${fa ? ' on' : ''}">BABA SESLER · kalın</span></div></div>`;
}

function answerHtml() {
  switch (G.stage) {
    case Stage.Typing: case Stage.Tiles:
      return `<div class="sheet" id="sheet">${sheetInner()}</div>${keyboardHtml()}`;
    case Stage.Choices:
      return `<div class="choices-wrap">
        ${G.bad ? `<div class="card note fbnote">${esc(G.feedback)}</div>` : ''}
        <div class="choices">${G.round.choices.map((c, i) => `<button class="chunky white large" data-choice="${i}"><span class="face">${esc(c)}</span></button>`).join('')}</div>
        <button class="chunky white dontknow" data-g="dontknow"><span class="face">Bilmiyorum</span></button></div>`;
    case Stage.Question:
      return `<button class="chunky blue large breathe shine wide" data-g="flip"><span class="face">${icon('IconReplay')}Kartı çevir</span></button>`;
    case Stage.Flipped:
      return `<div class="grade"><span class="ribbon small game">Bu cevabı biliyor muydun?</span><div class="two">
        <button class="chunky orange large" data-g="didnot"><span class="face">${icon('IconCross')}Bilemedim</span></button>
        <button class="chunky green large" data-g="knew"><span class="face">${icon('IconCheck')}Bildim</span></button></div></div>`;
    case Stage.Solved:
      return `<button class="chunky green large breathe shine wide" data-g="next"><span class="face">Devam${icon('IconArrow')}</span></button>`;
    case Stage.Revealed:
      return `<button class="chunky purple large" data-g="next"><span class="face">${icon('IconCheck')}Anladım, devam</span></button>`;
    default: return '';
  }
}

function sheetInner() {
  if (G.stage === Stage.Typing) {
    return `<span class="hint">Cevabını yaz · büyük küçük harf fark etmez</span>
      <div class="field" aria-label="Cevap">${G.answer ? `<span class="txt">${esc(upperTr(G.answer))}</span><span class="caret"></span>` : '<span class="caret"></span><span class="ph">Harflere dokun…</span>'}</div>`;
  }
  const t = G.round.tiles;
  const caret = t.caret;
  const words = [];
  t.tiles.forEach((tile, i) => {
    if (tile.kind === 'Gap') return;
    (words[tile.word] ??= []).push(`<span class="tl${tile.prefilled ? ' free' : ''}${tile.typed != null ? ' typed' : ''}${i === caret ? ' caret' : ''}${tile.kind === 'Mark' ? ' mark' : ''}">${esc(upperTr(tile.prefilled || tile.kind === 'Mark' ? tile.letter : tile.typed ?? ''))}</span>`);
  });
  const shape = `${t.wordLengths.length} kelime · ${t.wordLengths.join(' + ')} harf`;   // :141
  return `<div class="row2"><span class="fb">${esc(G.feedback)}</span><span class="shape">${shape}</span></div>
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

// Controls/GameKeyboard.axaml(.cs): the Turkish Q layout without Q, W and X on an 11-key grid, ⌫ three keys wide.
const ROW1 = 'ERTYUIOPĞÜ', ROW2 = 'ASDFGHJKLŞİ', ROW3 = 'ZCVBNMÖÇ', DIGITS = '1234567890';
const kb = { digits: false };
const kbSize = () => profile.keyboard !== 'auto' ? profile.keyboard : innerHeight < 780 ? 'small' : 'medium';   // Resolve, .cs:37-40
function keyboardHtml() {
  const k = (label, col, span, cls = '', data = '') => `<button class="key ${cls}" style="grid-column:${col} / span ${span}" ${data}><span>${label}</span></button>`;
  const letters = (row, off) => [...row].map((c, i) => k(c, 1 + off + i * 2, 2, '', `data-k="${c}"`)).join('');
  const size = kbSize();
  return `<div class="kb ${size === 'medium' ? '' : size}" id="kb">
    <div class="bar"><button class="chunky white small dk" data-g="dontknow"><span class="face">Bilmiyorum</span></button>
      <div class="handle" id="kb-handle" aria-label="Klavye boyutu"><i></i></div>
      <div class="sizes">${[['small', 's', 'Küçük'], ['medium', 'm', 'Orta'], ['large', 'l', 'Büyük']].map(([v, c, t]) => `<button class="size ${c}${size === v ? ' on' : ''}" data-size="${v}" aria-label="${t} klavye"><span>${t}</span></button>`).join('')}</div></div>
    <div class="rows">
      <div class="krow">${letters(kb.digits ? DIGITS : ROW1, 1)}</div>
      <div class="krow">${letters(ROW2, 0)}</div>
      <div class="krow">${letters(ROW3, 0)}${k(icon('IconErase'), 17, 6, 'erase', 'data-kb="erase" aria-label="Sil"')}</div>
      <div class="krow">${k(kb.digits ? 'ABC' : '123', 1, 4, 'mode word', 'data-kb="mode" aria-label="Rakamlar"')}${k('boşluk', 5, 10, 'space word', 'data-k=" " aria-label="Boşluk"')}${k(icon('IconCheck') + 'Gönder', 15, 8, 'send word', `id="kb-send" data-kb="send"${canSend() ? '' : ' disabled'}`)}</div>
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
  const title = R.stars === 3 ? 'Efsane kulak!' : R.stars === 2 ? 'Harika!' : 'İyi başlangıç!';   // :906
  const info = { 2: `${R.count} kartın ${R.right} tanesini bildin. Yaz seviyesindesin: bir sonraki turda da cevabı sen yazacaksın.`,
    1: `${R.count} kartın ${R.right} tanesini bildin. Seç seviyesindesin: üst üste doğru seçimlerle Yaz'a çıkarsın.`,
    0: `${R.count} kartın ${R.right} tanesini bildin. Kartları okuyarak öğreniyorsun: “Bildim” dedikçe yukarı çıkarsın.` }[R.level];   // :918-920
  const star = (i, mid) => `<span class="star${mid ? ' mid' : ''}"><svg viewBox="0 0 24 24"><path class="sock" d="${STAR}"/>${i < R.stars ? `<path class="gold" d="${STAR}"/>` : ''}</svg></span>`;
  const art = info => info.symbol ? `<span class="music">${esc(info.symbol)}</span>` : info.family ? `<img src="../assets/cards/portrait-${FAMILIES[info.family].art}.png" alt="">` : icon('IconNote');
  const facts = R.facts.map(f => {
    const delta = f.after - f.before;
    return `<div class="rrow fact-row" style="--accent:${f.info.color};--accent-deep:${readable(f.info.color)}"><span class="art">${art(f.info)}</span><div>
      <div class="top"><b>${esc(f.info.name)}</b>${delta > 0.004 ? `<span class="badge ink" style="background:var(--mint)">+%${Math.round(delta * 100)}</span>` : ''}</div>
      <p>${esc(f.info.fact)}</p><div class="bar"><span class="thin"><i style="width:${Math.round(Math.min(1, f.after) * 100)}%"></i></span><small>%${Math.round(Math.min(1, f.after) * 100)}</small></div></div></div>`;
  }).join('');
  const medal = medalHtml;
  const badges = R.badges.map(b => `<div class="rrow badge-row" id="${b === R.badges[0] ? 'first-badge' : ''}">${medal(b)}<div><b>${esc(b.name)}</b><small>${esc(b.description)}</small></div></div>`).join('');
  return `<div class="overlay below" id="results"><div class="pop-wrap">
    <svg class="rays" viewBox="-400 -400 800 800" aria-hidden="true"><path fill="rgba(255,204,0,.25)" d="M0,-400 L40,0 L-40,0 Z M0,400 L40,0 L-40,0 Z M-400,0 L0,40 L0,-40 Z M400,0 L0,40 L0,-40 Z M-283,-283 L28,-28 L-28,28 Z M283,283 L28,-28 L-28,28 Z M283,-283 L-28,-28 L28,28 Z M-283,283 L-28,-28 L28,28 Z"/></svg>
    <div class="pop-card" style="--edge:${edge('#FFCC00')}"><div class="pop-face">
      <div class="stars">${star(0)}${star(1, true)}${star(2)}</div>
      <div class="r-title">${title}</div>
      <p class="p r-info">${esc(info)}</p>
      <div class="stats3"><div class="rrow"><small>XP</small><b style="color:var(--text-xp)">+${R.xp}</b></div><div class="rrow"><small>Bilinen</small><b style="color:var(--text-success)">${R.right}/${R.count}</b></div><div class="rrow"><small>Seviye</small><b>${levelLabel(R.level)}</b></div></div>
      ${facts ? `<div class="eyebrow r-eyebrow">MÜZİK BİLGİN</div>${facts}` : ''}
      ${badges ? `<div class="eyebrow r-eyebrow" id="new-badges">YENİ ROZET</div>${badges}` : ''}
      <div class="r-btns"><button class="chunky orange" data-g="exit"><span class="face">Çık</span></button>
        <button class="chunky blue shine" data-g="replay"><span class="face">${icon('IconReplay')}Tekrar oyna</span></button></div>
    </div></div>
    <span class="pop-ribbon">Tur tamamlandı!</span>
    <button class="chunky white close x" data-g="exit" title="Kapat" aria-label="Kapat"><span class="face">${icon('IconCross')}</span></button>
  </div></div>`;
}
/** A badge's medal (BadgeArt): an icon, a sign's glyph or a family portrait on the badge's colour. */
function medalHtml(b) {
  const [kind, key] = b.artKey.split(':');
  const inner = kind === 'icon' ? icon(key) : kind === 'sign' ? `<span class="music">${esc(SIGN_CARDS.find(c => c.id === key)?.symbol)}</span>` : `<img src="../assets/cards/portrait-${FAMILIES[key].art}.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
  return `<span class="medal" style="--accent:${b.color}"><span>${inner}</span></span>`;
}
const STAR = 'M12,1.5 L15.1,8.3 L22.5,9.1 L17,14.1 L18.5,21.5 L12,17.8 L5.5,21.5 L7,14.1 L1.5,9.1 L8.9,8.3 Z';

function levelUpHtml() {
  const L = G.levelUp;
  return `<div class="overlay below"><div class="pop-wrap" style="max-width:400px"><div class="pop-card" style="--edge:${edge('#2B9BFF')}"><div class="pop-face" style="padding-top:46px;gap:12px">
    <div class="lvl-num">${L.level}</div><div class="r-title">Seviye ${L.level}!</div>
    <p class="p" style="text-align:center">Her doğru cevap XP getirir. Seviye ${L.level + 1} için ${L.toNext} XP daha topla.</p>
    <button class="chunky green large" data-g="lvl-close"><span class="face">Devam${icon('IconArrow')}</span></button></div></div>
    <span class="pop-ribbon slate">Yeni seviye!</span>
    <button class="chunky white close x" data-g="lvl-close" title="Kapat" aria-label="Kapat"><span class="face">${icon('IconCross')}</span></button></div></div>`;
}

function introHtml() {
  const i = G.intro.step, s = INTRO_STEPS[i];
  const pic = i === 0 ? '<div class="tiles5"><span>B</span><span class="free">E</span><span>M</span><span class="free">O</span><span></span></div>'
    : i === 1 ? '<div class="four"><span>Diyez</span><span>Bemol</span><span>Natürel</span><span>Porte</span></div>'
      : `<div class="flip"><span>?</span>${icon('IconReplay')}<span class="m">♭</span></div>`;
  return `<div class="overlay intro"><div class="pop-wrap"><div class="pop-card" style="--edge:${edge(s.accent)}"><div class="pop-face">
    <div class="pic" style="--accent:${s.accent}">${pic}</div>
    <div class="eyebrow">${esc(s.eyebrow)}</div><div class="tt">${esc(s.title)}</div><p class="p">${esc(s.text)}</p>
    <div class="stepdots">${[0, 1, 2].map(k => `<span class="dot${k === i ? ' on' : ''}"></span>`).join('')}</div>
    <div class="btns"><button class="chunky white" data-g="intro-prev"${i === 0 ? ' disabled' : ''}><span class="face">Geri</span></button>
      <button class="chunky blue" data-g="intro-next"><span class="face">${i === 2 ? 'Hadi oynayalım!' : 'Sonraki'}</span></button></div>
  </div></div><span class="pop-ribbon">Nasıl oynanır?</span>
  <button class="chunky white close x" data-g="intro-close" title="Kapat" aria-label="Kapat"><span class="face">${icon('IconCross')}</span></button></div></div>`;
}

function closeOverlaysOfShell() { toastHost.innerHTML = ''; }

// ───────────────────────── taps
/** A link out of the app: the gate first, as in the app (ch. 01 G-06); the demo then says it stays offline (G-09). */
const leaveApp = host => openGate(host, () => toast('Bağlantı bu demoda açılmaz', host));
const openVideo = id => openGate('youtube.com', () => openOverlay('player', id));
document.addEventListener('click', e => {
  const t = e.target.closest('[data-push], button, [data-actor], [data-w], [data-key]');
  if (!t) return;
  if (t.dataset.key && t.closest('.keys')) return tapKey(t);
  if (t.dataset.pin) return gateDigit(t.dataset.pin);
  if (t.dataset.do === 'gate-close') return closeGate();
  if (t.dataset.push) { e.stopPropagation(); return push(t.dataset.push); }
  if (t.dataset.go) { if (t.dataset.go === location.hash) return render(); inApp = true; location.hash = t.dataset.go; return; }
  if (t.dataset.actor) return actorTap(t);
  if (t.dataset.w) { piano.sel = +t.dataset.w; piano.idleSince = performance.now(); const el = $('[data-piano]'); if (el) el.innerHTML = pianoInner(); return; }
  if (t.dataset.banner) { const go = BANNER_GO[+t.dataset.banner]; return go === 'game' ? openGame() : go === '#/izle' ? (location.hash = go) : push(go); }
  if (t.dataset.flip) { flipped.has(t.dataset.flip) ? flipped.delete(t.dataset.flip) : flipped.add(t.dataset.flip); t.outerHTML = signTile(SIGN_CATEGORIES.find(c => c.key === t.dataset.flip)); return; }
  if (t.dataset.iflip) { instrumentFlips.has(t.dataset.iflip) ? instrumentFlips.delete(t.dataset.iflip) : instrumentFlips.add(t.dataset.iflip); return render(); }
  if (t.dataset.aile !== undefined) { location.hash = '#/ogren/calgilar' + (t.dataset.aile ? `?aile=${t.dataset.aile}` : ''); return; }
  if (t.dataset.calf !== undefined) { calFilter = t.dataset.calf; const y = page.scrollTop; render(); page.scrollTop = y; return; }
  if (t.dataset.sekme) { signTab = +t.dataset.sekme; const y = page.scrollTop; render(); page.scrollTop = y; return; }
  if (t.dataset.gtab) { G.revealTab = +t.dataset.gtab; return renderGame(); }
  if (t.dataset.play) return openGame({ concept: t.dataset.play });
  if (t.dataset.video) return openVideo(t.dataset.video);
  if (t.dataset.ext) return leaveApp(t.dataset.ext);
  if (t.dataset.songInCal) return openIn('cal', `#/sarki/${t.dataset.songInCal}`);
  if (t.dataset.song === 'toggle') return toggleSong();
  if (t.dataset.song === 'stop') return stopSong();
  if (t.dataset.set) { profile.settings[t.dataset.set] = !profile.settings[t.dataset.set]; save(); applySettings(); if (t.dataset.set === 'music' && !profile.settings.music) stopTheme(); return render(); }
  if (t.dataset.child) { profile.child = t.dataset.child; save(); closeOverlay(); return render(); }
  if (t.dataset.choice) return pick(G.round.choices[+t.dataset.choice]);
  if (t.dataset.k) return pressKey(t.dataset.k.toLocaleLowerCase('tr'));
  if (t.dataset.size) { profile.keyboard = t.dataset.size; save(); return renderGame(); }
  if (t.dataset.kb === 'send') return pressSend();
  if (t.dataset.kb === 'mode') { kb.digits = !kb.digits; return renderGame(); }
  const shell = t.dataset.do, g = t.dataset.g;
  switch (shell) {
    case 'back': return back();
    case 'play': return openGame();
    case 'review': return openGame({ concept: 'tekrar' });
    case 'howto': return openGame({ intro: true });
    case 'switcher': return openOverlay('switcher');
    case 'ov-close': return closeOverlay();
    case 'vplay': return toast('Video bu demoda açılmaz', 'İnternetsiz sunum');
    case 'riddle': { const d = DIRECTORY.find(x => slug(x.name) === route.arg); const v = d && videosFor(d)[0]; return v ? openVideo(v.id) : leaveApp('doremimi.org'); }
    case 'hesabim': return openGate('parent', () => push('#/hesabim'));
    case 'panel': return openGate('parent', () => push('#/ebeveyn-paneli'));
    case 'pill': return location.hash = '#/cal';
    case 'pill-x': return stopTheme();
    case 'wipe': store.wipe(); profile = freshProfile(); mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT); toast('Silindi', 'Demo verisi sıfırlandı'); return go('#/');
    case 'soon': return notYet();
  }
  switch (g) {
    case 'exit': return exitGame();
    case 'dontknow': return dontKnow();
    case 'flip': return flip();
    case 'knew': return grade(true);
    case 'didnot': return grade(false);
    case 'next': return next();
    case 'video': return G.links?.video ? openVideo(G.links.video) : null;
    // Çalgı sayfası closes the game, switches to Öğren and pushes the instrument (ch. 01 B-08).
    case 'instrument': { const k = G.links?.instrument; if (!k) return; exitGame(); return openIn('ogren', `#/calgi/${k}`); }
    case 'replay': { const c = G.concept === 'sunum' ? null : G.concept; return openGame({ concept: c, intro: false }); }
    case 'lvl-close': G.levelUp = null; return renderGame();
    case 'intro-prev': G.intro.step = Math.max(0, G.intro.step - 1); return renderGame();
    case 'intro-next': if (G.intro.step < 2) { G.intro.step++; return renderGame(); } return closeIntro();
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
  const t = e.target.closest('[data-kb="erase"]');
  if (!t) return;
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

function actorTap(el) {
  const who = el.dataset.actor;
  el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
  el.querySelector('.bubble')?.remove();
  const line = LINES[who][Math.floor(Math.random() * LINES[who].length)];
  el.insertAdjacentHTML('beforeend', `<span class="bubble">${esc(line)}</span>`);
  setTimeout(() => el.querySelector('.bubble')?.remove(), 2200);
}

// ───────────────────────── a hardware keyboard types in the game (ch. 04 §8.4); the deck's keys go back to the deck
const DECK_KEYS = ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End'];
function hardwareKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (!gameEl.hidden && G.round && !G.results && !G.intro && isTypingStage()) {
    if (e.key === 'Backspace') { pressBackspace(); flashKey('erase'); return true; }
    if (e.key === 'Enter') { pressSend(); flashKey('send'); return true; }
    if (e.key === ' ' || (e.key.length === 1 && isLetterOrDigit(e.key))) { const c = e.key.toLocaleLowerCase('tr'); pressKey(c); flashKey(c); return true; }
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
  const sel = c === 'erase' || c === 'send' ? `[data-kb="${c}"]` : `[data-k="${c === ' ' ? ' ' : upperTr(c)}"]`;
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 110);
}
const flashButton = async el => { if (!el || FAST) return; el.classList.add('down'); await sleep(140); el.classList.remove('down'); await sleep(120); };

// ───────────────────────── the deck drives the phone (ch. 10 W-02, W-03); every action presses what a child would
let queue = Promise.resolve();
function receive(m) {
  if (!m || typeof m !== 'object' || !m.type) return;
  queue = queue.then(() => run(m)).catch(err => console.warn('[demo]', m, err));
}
addEventListener('message', e => { if (e.source === parent || e.source === window) receive(e.data); });
try { new BroadcastChannel('doremimi-demo').onmessage = e => receive(e.data); } catch { /* no second-tab mirroring */ }

async function run(m) {
  if (m.type === 'reset') {
    store.wipe(); profile = freshProfile(); mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT);
    closeLayers(); stopTheme(); theme.played = false;
    stack = []; banner = 0; flipped.clear(); instrumentFlips.clear(); calFilter = ''; signTab = 1;
    applySettings();
    go(m.hash ?? '#/');
    return;
  }
  if (m.type === 'go') { closeLayers(); flipped.clear(); instrumentFlips.clear(); go(m.hash ?? '#/'); return; }
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
  'scroll': m => { const el = m.to ? document.querySelector(m.to) : null; if (el) el.scrollIntoView({ behavior: REDUCED || FAST ? 'auto' : 'smooth', block: 'start' }); else page.scrollTo({ top: m.y ?? 0, behavior: REDUCED ? 'auto' : 'smooth' }); },
  'game.start': m => openGame({ concept: m.deck ?? null, level: m.level ?? null, intro: m.intro }),
  'intro.finish': async () => {
    while (G.intro) { await sleep(800); await pressG('intro-next'); if (G.intro && G.intro.step < 2) { G.intro.step++; renderGame(); } else if (G.intro) closeIntro(); }
  },
  'game.type': async m => {
    for (const c of m.text) { flashKey(c); pressKey(c); await sleep(150); }
    if (m.send) { await sleep(350); flashKey('send'); pressSend(); }
  },
  /** Types the letters the tiles are missing, computed from the tiles, never stored (ch. 10 S06). */
  'game.fill': async m => {
    if (G.stage !== Stage.Tiles) throw new Error(`game.fill at ${G.stage}`);
    const missing = G.round.tiles.tiles.filter(t => t.kind === 'Letter' && !t.prefilled && t.typed == null).map(t => t.letter.toLocaleLowerCase('tr')).join('');
    await ACTS['game.type']({ text: missing, send: m.send });
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
  'results.scroll': () => { const el = $('#new-badges'); el?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); },
  /** A sequence with a visible pause between presses (0.8–1.2 s, W-03), for slides that play several steps at once. */
  'seq': async m => { for (const step of m.steps) { await run({ type: 'act', ...step }); await sleep(m.gap ?? 900); } },
};

/*
 * The deck's game slides as one script (dossier ch. 10 part 5): a slide or a button asks for a step, and the phone
 * plays the steps between where it is and there. Going back, jumping to a slide, or a round the presenter touched by
 * hand restarts the round and replays it fast to the step before, then plays the asked step. The rules are the real
 * ones and the deck is fixed and seeded (G-05), so a replay lands on the same cards, choices and ladder every time;
 * this is also the answer to O-12 (← in the game slides) without snapshots.
 */
const SCRIPT = [
  [{ name: 'game.start', deck: 'sunum', level: 'yaz', intro: true }],                                  // 0  S06 opens: the intro
  [{ name: 'intro.finish' }],                                                                           // 1  S06 · Hadi oynayalım!
  [{ name: 'game.type', text: 'sol', send: true }],                                                     // 2  S06 · Yanlış yaz: "sol"
  [{ name: 'game.fill', send: true }],                                                                  // 3  S06 · Kutuları doldur
  [{ name: 'game.next' }],                                                                              // 4  S07 opens: Diyez at Yaz
  [{ name: 'game.type', text: 'bemol', send: true }, { name: 'game.type', text: 'solm', send: true }],  // 5  S07 · İki deneme de yanlış
  [{ name: 'game.choose', right: false }],                                                              // 6  S07 · Yanlış seç
  [{ name: 'game.next' }],                                                                              // 7  S07 · Sıradaki kart (Bemol)
  [{ name: 'game.dontknow' }],                                                                          // 8  S08 · Bilmiyorum: Seç'e iner
  [{ name: 'game.next' }, { name: 'game.choose', right: false }, { name: 'game.next' }, { name: 'game.dontknow' }],  // 9  S08 · Çevir'e in
  [{ name: 'game.next' }, { name: 'game.flip' }, { name: 'game.grade', knew: true }, { name: 'game.flip' }, { name: 'game.grade', knew: true }],  // 10 S08 · Çevir, Bildim
  [{ name: 'game.choose', right: true }, { name: 'game.next' }, { name: 'game.choose', right: true }, { name: 'game.next' }],  // 11 S09 · Turu bitir
  [{ name: 'results.scroll', to: 'badges' }],                                                           // 12 S09 · Rozetler
];
const script = { pos: -1, dirty: false };

async function playStep(k) {
  for (const a of SCRIPT[k]) { await ACTS[a.name](a); await sleep(900); }
  script.pos = k;
}

ACTS.goto = async m => {
  const want = m.step;
  const onScript = !gameEl.hidden && G.concept === 'sunum' && !script.dirty && script.pos >= 0 && script.pos <= want;
  if (!onScript) {
    // Start over: a fresh child, as on the cover slide, so the badges of part 5 are new again.
    store.wipe(); profile = freshProfile(); mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT);
    script.pos = -1; script.dirty = false;
  }
  const playLast = m.play && want > script.pos;
  FAST = true;
  try { for (let k = script.pos + 1; k < (playLast ? want : want + 1); k++) await playStep(k); }
  finally { FAST = false; }
  if (playLast) await playStep(want);
};

// A tap or a key from a person, not the script, makes the round unknown to the script.
for (const type of ['click', 'keydown']) document.addEventListener(type, e => { if (e.isTrusted && !gameEl.hidden && G.concept === 'sunum' && e.target.closest?.('#game, body')) script.dirty = true; }, true);

// ───────────────────────── start
navigate();
if (EMBED && parent !== window) document.fonts.ready.then(() => parent.postMessage({ type: 'dm-ready' }, '*'));
