// The phone in its three languages, checked in headless Chrome (dossier ch. 14 §11): what tests/i18n.test.mjs and
// tests/type.test.mjs hold in the source, asked of the running page.
//
//   node --experimental-websocket tools/phone-e2e.mjs http://127.0.0.1:4178
//
// On every page of the plan, in tr, en and fr:
//   - small text (13 px and under) outside the game is never Regular: the computed weight, after every rule has applied;
//   - in en and fr, no Turkish word outside an element marked lang="tr" (lyrics, video titles, the foundation's texts);
//   - a label that does not fit its control (the dock, Öğren's tabs, chips, the segmented tracks, buttons) is reported;
//   - each type role (tests/type.test.mjs) is what the browser computes on the element that should wear it;
//   - no console error.
// Exits 1 on any finding; the last line says how many pages it read.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
// An optional third argument: only the pages whose "<lang> <hash>" (or "<lang> game <name>") matches it.
const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9735 + Math.floor(Math.random() * 200);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-e2e-'))}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let version = null;
for (let i = 0; i < 50 && !version; i++) { await sleep(200); try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* starting */ } }
if (!version) { chrome.kill(); throw new Error('Chrome did not start'); }
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200));
};
await new Promise(r => (ws.onopen = r));
const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;

/** Runs in the page: the findings for what is on screen now. */
const CHECK = `(() => {
  const out = { small: [], turkish: [], overflow: [] };
  const lang = document.documentElement.lang;
  // Names English and French write as Turkish does: instruments that have no other name.
  const NAMES = /Bağlama|bağlama/g;
  const walker = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim();
    const el = n.parentElement;
    if (!text || !el || !el.getClientRects().length) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || el.closest('[hidden], .fake-status, svg')) continue;
    if (!el.closest('.game') && parseFloat(st.fontSize) <= 13.5 && +st.fontWeight < 500 && /\\p{L}/u.test(text)) out.small.push(st.fontWeight + ' ' + st.fontSize + ' ' + text.slice(0, 40));
    if (lang !== 'tr' && /[ğĞıİşŞ]/.test(text.replace(NAMES, '')) && !el.closest('[lang="tr"]')) out.turkish.push(text.slice(0, 60));
  }
  for (const el of document.querySelectorAll('.tab span, .otab, .chip-btn, .zopt, .chunky > .face, .topbar h1, .kface b, .imeta b, .song-tile b, .sign-tile b')) {
    if (!el.getClientRects().length || !el.textContent.trim()) continue;   // an icon-only face is not a label
    if (el.scrollHeight > el.clientHeight + 1 && el.matches('.topbar h1')) out.overflow.push('title, two lines not enough: ' + el.textContent.trim());
    if (el.scrollWidth > el.clientWidth + 1) out.overflow.push(el.className + ': ' + el.textContent.trim().slice(0, 40) + ' (' + el.scrollWidth + ' > ' + el.clientWidth + ')');
  }
  // Each role as the page computes it, after every rule: [selector, px, weight]. Read from a rendered element, so a
  // later rule that wins by specificity (as the row rule once did over the song header's name) is seen.
  out.roles = [];
  const ROLES = [['.topbar h1:not(.fit1):not(.fit2)', 28, 700], ['.sign-hero b', 22, 700], ['.inst-hero .mt b', 22, 700], ['.song-head .mt b', 22, 700],
    ['.stack > .ribbon:not(.small) h2', 20, 700], ['.khead', 20, 700], ['.lrow .mt b, .mrow .mt b', 15, 600], ['.mrow .mt small, .lrow .mt small', 13, 500],
    ['.eyebrow', 11, 600], ['.card.menu .group-title', 17, 600], ['.otab', 15, 600], ['.chip-btn', 13, 600], ['.dock .tab span', 11, 600]];
  for (const [sel, px, w] of ROLES) for (const el of document.querySelectorAll(sel)) {
    if (!el.getClientRects().length || el.closest('.game')) continue;
    const st = getComputedStyle(el);
    if (parseFloat(st.fontSize) !== px || +st.fontWeight !== w) out.roles.push(sel + ' is ' + st.fontWeight + ' ' + st.fontSize + ', not ' + w + ' ' + px + 'px: ' + el.textContent.trim().slice(0, 30));
  }
  // An eyebrow labels what comes after it, on its own line above it (the Vakıf page once ran "DUYURU" into its title).
  for (const el of document.querySelectorAll('.page .eyebrow')) {
    const next = el.nextElementSibling;
    if (!next || !el.getClientRects().length) continue;
    if (next.getBoundingClientRect().top < el.getBoundingClientRect().bottom - 1) out.roles.push('eyebrow shares a line: ' + el.textContent.trim() + ' / ' + next.textContent.trim().slice(0, 20));
  }
  return out;
})()`;

const PAGES = ['#/', '#/ogren/isaretler', '#/ogren/calgilar', '#/ogren/calgilar?aile=bakir-nefesli', '#/ogren/aileler', '#/degerler', '#/isaret-kategori/diyez',
  '#/isaret/fa-anahtari', '#/calgi/keman', '#/calgi/baglama', '#/izle', '#/cal', '#/sarki/keman', '#/sozler/akordeon', '#/doremimi', '#/vakif', '#/dore-ve-mimi', '#/ekip',
  '#/burslar', '#/gonullu', '#/iletisim', '#/etkinlikler', '#/bulten', '#/destek', '#/destekciler', '#/yasal', '#/metin/kvkk', '#/yardim', '#/hakkinda', '#/kitaplar',
  '#/doremimi-nedir', '#/profil', '#/ayarlar', '#/hesabim', '#/ebeveyn-paneli', '#/melodim'];
// The game's screens, opened by taps from Oyna (each a list of selectors to click in turn).
const GAME = [['level', ['[data-do="play"]']], ['intro', ['[data-do="play"]', '[data-level="orta"]']],
  ['typing', ['[data-do="play"]', '[data-level="orta"]', '[data-g="intro-close"]']],
  ['reveal', ['[data-do="play"]', '[data-level="orta"]', '[data-g="intro-close"]', '[data-g="dontknow"]']]];

let findings = 0, read = 0;
const report = (where, kind, list) => { if (!list.length) return; findings += list.length; console.log(`${where}  ${kind}\n    ${[...new Set(list)].join('\n    ')}`); };
for (const lang of ['tr', 'en', 'fr']) {
  for (const hash of PAGES) {
    if (only && !only.test(`${lang} ${hash}`)) continue;
    errors.length = 0;
    await send('Page.navigate', { url: `${base}/app/?still&reset&sunum&dil=${lang}${hash}` });
    await sleep(900);
    const r = await evaluate(CHECK);
    read++;
    report(`${lang} ${hash}`, 'small Regular text', r.small);
    report(`${lang} ${hash}`, 'Turkish outside lang="tr"', r.turkish);
    report(`${lang} ${hash}`, 'label does not fit', r.overflow);
    report(`${lang} ${hash}`, 'type role not applied', r.roles);
    report(`${lang} ${hash}`, 'console error', errors.slice());
  }
  for (const [name, taps] of GAME) {
    if (only && !only.test(`${lang} game ${name}`)) continue;
    errors.length = 0;
    await send('Page.navigate', { url: `${base}/app/?still&reset&sunum&dil=${lang}#/` });
    await sleep(900);
    for (const sel of taps) { await evaluate(`document.querySelector(${JSON.stringify(sel)})?.click()`); await sleep(250); }
    const r = await evaluate(CHECK);
    read++;
    report(`${lang} game ${name}`, 'Turkish outside lang="tr"', r.turkish);
    report(`${lang} game ${name}`, 'label does not fit', r.overflow);
    report(`${lang} game ${name}`, 'console error', errors.slice());
  }
}
ws.close(); chrome.kill();
console.log(`${read} pages read, ${findings} findings`);
process.exitCode = findings ? 1 : 0;
