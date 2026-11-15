/*
 * Doremimi — tanıtım sunumu. The deck's mechanics follow the Eylül demo (eylul-fuarcilik/sunum.js; dossier ch. 10
 * R-02 to R-12); the copy is dossier ch. 10 part 5 (PROPOSED, the owner's to change), cut from 16 slides to 9 at the
 * owner's request: the showcase-only slides (vision, stats, signs, instruments, panel) and most steps are gone.
 * Slides are data; each may send the phone a message when it opens, and its "canlı göster" buttons play in order on →.
 */
import { ICONS } from './app/lib/icons.js';
import { initial, step as flowStep } from './deck/flow.js';

const $ = s => document.querySelector(s);
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}" fill-rule="evenodd"/></svg>`;
// Buton: [başlık, telefona gidecek mesaj]
const actions = list => list.length ? `<div class="acts">${list.map(([t, msg], k) => `<button class="act${k ? ' ghost' : ''}" data-msg='${JSON.stringify(msg).replace(/'/g, '&#39;')}'><b>${t}</b><span class="a-go">${icon('IconPlay')}</span></button>`).join('')}</div>` : '';
/*
 * Bir slayt: kısa başlık, bir cümle, en çok iki satır, en çok iki canlı gösterim. The owner asked for a quicker,
 * denser deck (2026-11-13): no step counter, no icon tiles, nothing that is there only to be shown.
 */
const step = (title, lead, feats = [], pre = '') => `
  <h1 class="title tour">${title}</h1>
  <p class="lead">${lead}</p>${pre}
  ${feats.length ? `<ul class="feats">${feats.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}`;
const go = hash => ({ type: 'go', hash });
const act = (name, args = {}) => ({ type: 'act', name, ...args });
/*
 * A "canlı göster" step outside the game is a whole state, not a delta: it goes to its screen, then presses. So ←
 * (which resends the step before) and R always land on the same screen, whatever was tapped in between.
 */
const batch = (...msgs) => ({ type: 'batch', msgs });
const at = step => ({ type: 'act', name: 'goto', step });           // the phone's scripted round, app/app.js SCRIPT
const play = step => ({ type: 'act', name: 'goto', step, play: true });
// The new dock as a small picture for the navigation slide (dossier ch. 11 NR-02).
const dockPic = `<div class="dockpic">${[['IconHome', 'Keşfet'], ['IconBook', 'Öğren'], null, ['IconEye', 'İzle'], ['IconNote', 'Çal']].map(t => t
  ? `<span class="dp">${icon(t[0])}<b>${t[1]}</b></span>` : '<span class="dp logo"><img src="assets/brand/logo.png" alt="Doremimi"></span>').join('')}</div>`;

const SLIDES = [
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
      'Keşfet · Öğren · İzle · Çal. Ortadaki logo vakfın sayfalarını açar; çocuğun profili sağ üstte.',
      [],
      dockPic),
    acts: [['Logoya dokun', go('#/doremimi')], ['Öğren', go('#/ogren/isaretler')]],
    notes: `<p>Vakıfla konuştuğumuz yeni düzen: <b>Keşfet · Öğren · logo · İzle · Çal.</b> “Oyunlar” ve “Daha fazla” kalktı.</p><ol><li><b>Logo</b>: vakıf, ekip, burslar, gönüllülük, iletişim, yasal metinler.</li><li><b>Öğren</b>: müzik işaretleri ve 41 çalgı. İzle'de videolar, Çal'da nota çalan her şey.</li></ol><p>Telefondaki ekranlar uygulamayla birebir; yalnızca yerleri yeni.</p>`,
  },
  {
    id: 'kesfet', label: 'Keşfet', theme: 'light', phone: go('#/'),
    html: step('Keşfet: tek düğme, OYNA',
      'Çocuk okumadan da ne yapacağını bilir. Altında konular ve bugünün kartı; üstte vakfın duyuruları döner.',
      []),
    acts: [['Konu seç', batch(go('#/'), act('scroll', { to: '.topics' }))], ['Bugünün kartı', batch(go('#/'), act('scroll', { to: '.today' }))]],
    notes: `<p>Ana ekranda tek büyük eylem: <b>OYNA.</b> Vakfın haberleri üstteki banner'da döner. Ekranda başka bir şey yok; beyaz ve sade.</p><ol><li><b>Konu seç</b>: her işaret ve çalgı ailesi bir satır; rengi, tek cümlelik bilgisi ve çocuğun ilerlemesi. Tekrar zamanı gelen kart varsa en üstte durur.</li><li><b>Bugünün kartı</b>: her gün sırayla bir çalgı, bir soru, bir işaret. Aynı gün herkes aynı kartı görür; internet gerekmez.</li></ol>`,
  },
  {
    id: 'oyun', label: 'Oyun', theme: 'light', phone: at(1),
    html: step('Önce yaz, sonra seç',
      'Çocuk cevabı kendisi yazar. Bilemezse harf kutuları, sonra dört seçenek gelir; yanlışta kart dönüp anlatır.',
      ["Zorlandıkça Yaz → Seç → Çevir'e iner, bildikçe çıkar", 'Yanlış cevap hiçbir şey kaybettirmez']),
    acts: [['Yanlış yaz: “sol”', play(2)], ['Seçenekler, bilgi kartı', play(6)]],
    notes: `<p>Uygulamada tek oyun var; asıl beceri <b>cevabı yazmak</b>.</p><ol><li><b>Yanlış yaz</b>: “sol” olmadı; cevap harf kutularına döndü, kartın renginde gelen harfler yardım.</li><li><b>Seçenekler</b>: iki yazma denemesi de yanlış olunca dört seçenek gelir; yanlış seçimde kart dönüp anlatır.</li></ol><p>Üstteki şerit merdiven: üst üste iki zorlanmada bir basamak iner; düğmeyle seçilmez. Laptop klavyesiyle de yazabilirsiniz.</p>`,
  },
  {
    id: 'sonuc', label: 'Tur sonu', theme: 'light', phone: at(10),
    html: step('Tur sonu ve ilerleme',
      "Yıldızlar, XP ve hangi müzik konusunda ne kadar ilerlediği. Yeni rozetler burada açılır.",
      ['Yıldız ve XP hiçbir şey ödemez', 'Zorlandığı konu önce gelir']),
    acts: [['Turu bitir', play(11)]],
    notes: `<p>Yıldızlar yalnızca turun notu; para ya da ödül yok. Asıl önemli kısım <b>Müzik bilgin</b>: çocuk hangi konuda zorlandıysa önce o gelir, ilerleme çubuğuyla.</p><p>Rozetler bir içerik dosyası; panelde rozet tablosu henüz yok (planlanan).</p>`,
  },
  {
    id: 'cal', label: 'Çal', theme: 'light', phone: go('#/cal'),
    html: step('Çal: piyano ve şarkılar',
      'Çocuk piyanoda serbestçe çalar. Bir çalgı seçince o çalgının şarkısı karaoke sözleriyle çalar, tuşlar yanar.',
      []),
    acts: [['Piyanoda çal', batch(go('#/cal'), act('keys.play', { keys: [60, 62, 64, 65, 67, 67, 69, 67] }))], ['Akordeon şarkısı', batch(go('#/sarki/akordeon'), act('song.play'))]],
    notes: `<p>Nota çalan her şey burada.</p><ol><li><b>Piyano</b>: çalınanlar Melodim'e eklenir.</li><li><b>Akordeon</b>: karaoke satırı ilerler, tuşlar yanar. 41 çalgının her birinin şarkısı var.</li></ol><p>Her şarkı aynı piyano sesiyle çalar; gerçek çalgı sesleri vakfın kararı.</p>`,
  },
  {
    id: 'aile', label: 'Aile ve içerik', theme: 'light', phone: go('#/profil'),
    html: step('Aile, kilit, içerik',
      "Her çocuğa ayrı profil. Dışarı giden her bağlantı ebeveyn PIN'i ister. İçeriği vakıf düzenler.",
      ['Reklam yok, sohbet yok, ücretli ödül yok', "İşaret, soru, çalgı, video: Excel'de açılan tablolar"]),
    acts: [['Kim oynuyor?', batch(go('#/profil'), act('switcher.open'))], ["Ebeveyn PIN'i", batch(go('#/profil'), act('gate.open', { row: 'hesabim' }), act('gate.type'))]],
    notes: `<p>Profil sağ üstte; kardeşler <b>Kim oynuyor?</b> ile geçer. Ebeveyn sayfaları ve dışarı giden her bağlantı altı haneli PIN ister; üç yanlışta 30 saniye kilit. Demo PIN'i <b>135790</b> (yalnızca bu demoya ait).</p><p>İçerik kodda değil, tablolarda: vakıf ekibi panelden düzenler, yayından önce hatalar satır satır gösterilir. Bugün içerik değişikliği yeni bir sürümle telefona ulaşır.</p>`,
  },
  {
    id: 'platform', label: 'Platformlar', theme: 'dark', layout: 'full', cls: 'platforms',
    html: `
      <h1 class="title">Tek kod,<br><em>her cihaz.</em></h1>
      <ul class="plat">
        <li><b>iPhone · iPad</b><span>TestFlight 0.1.73, iOS 15+</span></li>
        <li><b>Android</b><span>APK 0.1.73, Android 6+</span></li>
        <li><b>Mac · Windows</b><span>.dmg ve .zip, henüz imzasız</span></li>
        <li><b>Tarayıcı</b><span>WebAssembly</span></li>
      </ul>`,
    notes: `<p>Tek kod tabanı (Avalonia, .NET): iPhone ve iPad'de TestFlight, Android'de APK, Mac, Windows ve tarayıcı. Mağazaya çıkış için imzalar ve vakfın onayı gerekiyor.</p>`,
  },
  {
    id: 'kapanis', label: 'Kapanış', theme: 'dark', layout: 'center', phone: go('#/doremimi'),
    html: `<div class="closing"><span class="cl-l">Dore ve Mimi</span><span class="cl-r">artık <em>cebinizde.</em></span></div>`,
    notes: `<p>Telefonda vakfın kendi yeri açık. Sorularınız ve değiştirmek istedikleriniz bizim için yol haritası.</p>`,
  },
];

/* ---------- ses (S-04): the deck owns the AudioContext; the phone borrows it through window.__dmAudio */
let audioCtx = null;
window.__dmAudio = () => { if (!audioCtx) { const C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C(); } return audioCtx; };
function unlockAudio() { const c = window.__dmAudio(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, unlockAudio, true));

/* ---------- kurulum */
const stage = $('#stage'), slidesEl = $('#slides'), phone = $('#phone'), device = $('#device');
slidesEl.innerHTML = SLIDES.map((s, i) => `<section class="slide ${s.layout === 'full' ? 'wide' : ''}" data-i="${i}"><div class="col">${s.html}${actions(s.acts ?? [])}</div></section>`).join('');
$('#dots').innerHTML = SLIDES.map((s, i) => `<button data-dot="${i}" aria-label="${i + 1}. ${s.label}" title="${s.label}"></button>`).join('');

/* ---------- ölçek (R-02) */
function fit() { const s = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `translate(-50%, -50%) scale(${s})`; }
addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 200)); fit();

/*
 * ---------- akış (deck/flow.js): every input goes through the one state machine, which decides whether the deck may
 * move now. While the phone is playing a step (until its dm-done) or a slide is still coming in, input is ignored and
 * the controls show they are waiting; nothing queues up to fire later (owner, 2026-11-15).
 */
let flow = initial(SLIDES.map(s => ({ phone: s.phone ?? null, acts: (s.acts ?? []).map(a => a[1]) })));
function dispatch(e) {
  const r = flowStep(flow, e);
  flow = r.state;
  for (const fx of r.effects) perform(fx);
}
function perform(fx) {
  if (fx.type === 'show') render(fx.slide);
  else if (fx.type === 'send') phone.contentWindow.postMessage(fx.msg, '*');
  else if (fx.type === 'mark') mark();
  else if (fx.type === 'timer') setTimeout(() => dispatch({ type: 'dwell', token: fx.token }), fx.ms);
  else if (fx.type === 'watchdog') setTimeout(() => dispatch({ type: 'watchdog', token: fx.token }), fx.ms);
  else if (fx.type === 'warn') console.warn('[sunum]', fx.text);
}

let swipe = null;
slidesEl.addEventListener('touchstart', e => { const t = e.touches[0]; swipe = { x: t.clientX, y: t.clientY }; }, { passive: true });
slidesEl.addEventListener('touchend', e => {
  if (!swipe) return; const t = e.changedTouches[0]; const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y; swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dispatch({ type: dx < 0 ? 'next' : 'prev' });
}, { passive: true });

/* ---------- telefonla konuşma (R-07, W-02, W-04) */
phone.addEventListener('load', () => setTimeout(() => dispatch({ type: 'ready' }), 1500));   // dm-ready normally comes first; this is the fallback
let phoneTyping = false;
addEventListener('message', e => {
  if (e.source !== phone.contentWindow) return;
  const m = e.data || {};
  if (m.type === 'dm-ready') dispatch({ type: 'ready' });
  if (m.type === 'dm-done') dispatch({ type: 'done', id: m.id });
  if (m.type === 'dm-key') key(m.key);
  if (m.type === 'dm-typing') phoneTyping = !!m.on;
});
document.addEventListener('click', e => {
  const b = e.target.closest('.slide.on .act');
  if (b) dispatch({ type: 'act', k: [...document.querySelectorAll('.slide.on .act')].indexOf(b) });
  const d = e.target.closest('[data-dot]');
  if (d) dispatch({ type: 'goto', slide: Number(d.dataset.dot) });
});

/* ---------- görünüm */
function render(i) {
  const s = SLIDES[i];
  document.querySelectorAll('.slide').forEach((el, k) => { const was = el.classList.contains('on'); el.classList.toggle('on', k === i); el.classList.toggle('leave', was && k !== i); });
  stage.className = 'stage ' + (s.theme === 'dark' ? 'dark ' : '') + (s.layout === 'full' ? 'full ' : '') + (s.cls || '');
  document.body.classList.toggle('light', s.theme !== 'dark');
  device.classList.toggle('away', s.layout === 'full');
  device.classList.toggle('center', s.layout === 'center');
  document.querySelectorAll('[data-dot]').forEach((d, k) => d.classList.toggle('on', k === i));
  $('#count').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(SLIDES.length).padStart(2, '0');
  $('#bar').style.width = ((i + 1) / SLIDES.length * 100) + '%';
  $('#notes-body').innerHTML = s.notes || '';
  $('#notes-step').textContent = (i + 1) + '. slayt';
  history.replaceState(null, '', location.search + '#' + (i + 1));
}
/** Paints the lock: while busy every control is disabled and the step being played says so. */
function mark() {
  const busy = flow.phase !== 'idle';
  stage.classList.toggle('busy', busy);
  stage.setAttribute('aria-busy', String(busy));
  [$('#prev'), $('#next'), ...document.querySelectorAll('[data-dot], .act')].forEach(b => { b.disabled = busy; });
  [...document.querySelectorAll('.slide.on .act')].forEach((a, k) => {
    a.classList.toggle('done', k < flow.sub && !(busy && k === flow.playing));
    a.classList.toggle('upnext', !busy && k === flow.sub);
    a.classList.toggle('playing', busy && k === flow.playing);
  });
}

/* ---------- tuşlar (R-09, K-01, K-02) */
function key(k) {
  if (['ArrowRight', 'PageDown'].includes(k) || (k === ' ' && !phoneTyping)) dispatch({ type: 'next' });
  if (['ArrowLeft', 'PageUp'].includes(k)) dispatch({ type: 'prev' });
  if (k === 'Home') dispatch({ type: 'goto', slide: 0 });
  if (k === 'End') dispatch({ type: 'goto', slide: SLIDES.length - 1 });
  if (phoneTyping) return;   // while the game takes letters, N, F and R are letters, not shortcuts
  if (k === 'n' || k === 'N') $('#notes').hidden = !$('#notes').hidden;
  if (k === 'f' || k === 'F') { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); else document.documentElement.requestFullscreen?.().catch(() => {}); }   // refused (no gesture, headless): stay windowed, no uncaught rejection
  if (k === 'r' || k === 'R') dispatch({ type: 'reset' });
}
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // K-02: while the phone's game is at a typing stage, letters, digits, Space, Backspace and Enter go to the phone
  // even when the deck has the focus, so the presenter can type on the laptop without clicking into the phone.
  if (phoneTyping && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) { e.preventDefault(); phone.contentWindow.postMessage({ type: 'key', key: e.key }, '*'); return; }
  if (e.key === ' ') e.preventDefault();
  key(e.key);
});
$('#next').onclick = () => dispatch({ type: 'next' });
$('#prev').onclick = () => dispatch({ type: 'prev' });
$('#sound').onclick = () => { unlockAudio(); phone.contentWindow.postMessage({ type: 'sound' }, '*'); $('#sound').classList.add('on'); $('#sound-t').textContent = 'Ses açık'; };
$('#notes-close').onclick = () => { $('#notes').hidden = true; };

addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if (Number.isFinite(n) && n - 1 !== flow.cur) dispatch({ type: 'goto', slide: n - 1 }); });
const start = parseInt(location.hash.slice(1), 10);
dispatch({ type: 'goto', slide: Number.isFinite(start) ? start - 1 : 0 });
if (new URLSearchParams(location.search).has('notlar')) $('#notes').hidden = false;
