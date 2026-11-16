// Dossier ch. 14 §14 asked of the running phone, in headless Chrome: no XP, no gold and no XP level on any screen, in
// Turkish, English and French, while the progress number is still saved. tests/xp.test.mjs holds the same in the source;
// this one reads what the browser drew, including the two things that only show for a moment (the outcome chip over a
// card and the toast for a first instrument), by reading the screen every 120 ms while a whole round is played.
//
//   PORT=4183 node tools/serve.mjs  (in another terminal)  then  node --experimental-websocket tools/xp-e2e.mjs http://127.0.0.1:4183
//
// Exit code 0 = every check passed. No dependencies (Node 22+, or 20 with --experimental-websocket).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { XP_WORD, GOLD_WORD, LEVEL_NUMBER } from '../tests/xp-words.mjs';

const base = (process.argv[2] ?? 'http://127.0.0.1:4175').replace(/\/$/, '');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9950 + Math.floor(Math.random() * 40);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-xp-'))}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) failed++; };
try {
  let version = null;
  for (let i = 0; i < 50 && !version; i++) { await sleep(200); try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* starting */ } }
  if (!version) throw new Error('Chrome did not start');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split('\n')[0]);
  };
  await new Promise(r => (ws.onopen = r));
  const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r?.exceptionDetails) errors.push(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r?.result?.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const tap = async sel => { const hit = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`); await sleep(250); return hit; };
  const act = m => ev(`window.postMessage(${JSON.stringify({ type: 'act', ...m })}, '*')`);
  const saved = () => ev(`JSON.parse(localStorage.getItem('doremimi-demo-v1') || 'null')?.profile ?? null`);

  /**
   * What is on screen now: every word a child can read or a screen reader says (text, aria-label, title), and whether
   * any of the parts §14 removed is in the page. The fake status bar is the phone's clock, not the app.
   */
  const READ = `(() => {
    const app = document.querySelector('#app');
    const said = [...app.querySelectorAll('[aria-label], [title]')].flatMap(e => [e.getAttribute('aria-label'), e.getAttribute('title')]).filter(Boolean);
    const bar = document.querySelector('#topbar'), head = document.querySelector('#ghead');
    return { text: app.innerText + '\\n' + said.join('\\n'),
      parts: [...app.querySelectorAll('.levelbtn, .lvbox, .lvl-num, .xp-chip, .xpb, .prof-level, #ghead .avatar, #ghead .sv')].map(e => e.className),
      bar: [...bar.children].map(e => e.className), head: head ? [...head.children].map(e => e.className.replace(/ pressed/, '')) : null,
      chip: document.querySelector('.praise-chip')?.innerText ?? null, toast: document.querySelector('#toast .toast')?.innerText ?? null,
      tiles: [...document.querySelectorAll('#results .stats2 .rrow small')].map(e => e.textContent) };
  })()`;
  const problems = r => [XP_WORD, GOLD_WORD, LEVEL_NUMBER].map(re => r.text.match(re)?.[0]).filter(Boolean).map(w => `"${w}"`)
    .concat(r.parts.map(p => `<.${p}>`))
    .concat(r.bar.every(c => /^(chunky white round backbtn|title|tile)$/.test(c)) ? [] : [`top bar: ${r.bar.join(' | ')}`])
    .concat(!r.head || r.head.join(' | ') === 'chunky white close | t' ? [] : [`game header: ${r.head.join(' | ')}`]);
  const look = async where => { const r = await ev(READ); const p = problems(r); check(p.length === 0, `${where}${p.length ? ': ' + [...new Set(p)].join(', ') : ''}`); return r; };

  for (const lang of ['tr', 'en', 'fr']) {
    const open = async hash => { await send('Page.navigate', { url: 'about:blank' }); await sleep(100); await send('Page.navigate', { url: `${base}/app/?reset&sunum&dil=${lang}${hash}` }); for (let i = 0; i < 100 && !(await ev(`!!document.querySelector('#page .page-in')`)); i++) await sleep(100); await sleep(400); };
    const go = async hash => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(500); };
    await open('#/');
    const oyna = await look(`${lang} Oyna`);
    check(oyna.bar.join(' | ') === 'title | tile', `${lang} Oyna: the top bar is the title and the avatar`);
    // a first instrument: the toast names it and pays nothing on screen
    await ev(`location.hash = '#/calgi/keman'`);
    let toast = null;
    for (let i = 0; i < 12; i++) { await sleep(120); const r = await ev(READ); toast ??= r.toast; const p = problems(r); if (p.length) { check(false, `${lang} first instrument: ${p.join(', ')}`); break; } }
    check(!!toast && !/\d/.test(toast), `${lang} first instrument: the toast is the name alone ("${toast?.replace(/\n/g, ' / ')}")`);
    check((await saved())?.xp === 10, `${lang} first instrument: the progress number is still saved (${(await saved())?.xp})`);
    await go('#/ogren/calgilar'); await look(`${lang} Öğren › Çalgılar`);
    // the first game: the level question (difficulty, kept), the intro's pages, then a whole round played right
    await go('#/');
    await tap('[data-do="play"]'); await look(`${lang} the first game’s question`);
    await tap('[data-level="baslangic"]'); await look(`${lang} intro 1`);
    await tap('[data-g="intro-next"]'); await look(`${lang} intro 2`);
    await tap('[data-g="intro-next"]'); await look(`${lang} intro 3`);
    await tap('[data-g="intro-close"]');
    const playing = await look(`${lang} a card`);
    check(playing.head?.join(' | ') === 'chunky white close | t', `${lang} a card: the game header is close and the title`);
    await act({ name: 'game.finish', gap: 350 });
    const chips = new Set(), bad = new Set();
    let reads = 0, results = null;
    for (let i = 0; i < 400 && !results; i++) {
      await sleep(120);
      const r = await ev(READ); reads++;
      if (r.chip) chips.add(r.chip.trim());
      for (const p of problems(r)) bad.add(p);
      if (r.tiles.length) results = r;
    }
    check(bad.size === 0, `${lang} a whole round, read ${reads} times${bad.size ? ': ' + [...bad].join(', ') : ''}`);
    check(chips.size > 0 && [...chips].every(c => !/\d/.test(c) && !c.includes('\n')), `${lang} the outcome chip is the praise line alone (${[...chips].join(' · ') || 'never seen'})`);
    check(results?.tiles.length === 2, `${lang} results: two tiles (${results?.tiles.join(', ')})`);
    await look(`${lang} results`);
    const after = await saved();
    check(after?.xp > 10 || after?.level > 1, `${lang} the round’s progress number is saved and not shown (xp ${after?.xp}, level ${after?.level})`);
    await tap('[data-g="exit"]');
    await go('#/profil'); await look(`${lang} Profilim`);
    await ev(`document.querySelector('#page').scrollTop = 4000`); await sleep(200); await look(`${lang} Profilim, the family rows`);
    await tap('[data-do="panel"]');
    for (const d of '135790') await tap(`[data-pin="${d}"]`);
    await sleep(600);
    check(await ev(`/ebeveyn-paneli/.test(location.hash)`), `${lang} the parent panel opened`);
    await look(`${lang} parent panel`);
    await go('#/ayarlar'); await look(`${lang} Ayarlar`);
  }
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  ws.close();
} catch (e) {
  check(false, e.message);
} finally {
  chrome.kill();
}
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exitCode = failed ? 1 : 0;
