/*
 * Doremimi — tanıtım sunumu. The deck's mechanics follow the Eylül demo (eylul-fuarcilik/sunum.js; dossier ch. 10
 * R-02 to R-12). The slides are data in deck/slides.js; each may send the phone a message when it opens, and its
 * "canlı göster" buttons play in order on →. This file draws them and drives them through deck/flow.js.
 */
import { SLIDES, icon } from './deck/slides.js';
import { initial, step as flowStep } from './deck/flow.js';

const $ = s => document.querySelector(s);
// Buton: [başlık, telefona gidecek mesaj]
const actions = list => list.length ? `<div class="acts">${list.map(([t, msg], k) => `<button class="act${k ? ' ghost' : ''}" data-msg='${JSON.stringify(msg).replace(/'/g, '&#39;')}'><b>${t}</b><span class="a-go">${icon('IconPlay')}</span></button>`).join('')}</div>` : '';

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
