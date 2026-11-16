// Headless Chrome over the DevTools protocol, for the deck's walking tools (auto-e2e.mjs, deck-walk.mjs). No
// dependencies: Node 22+, or Node 20 with --experimental-websocket. Chrome gets a throwaway profile and is killed by
// close().
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** `gesture: false` leaves Chrome's autoplay policy on, as for a visitor who has not clicked yet: audio stays locked. */
export async function launch({ width = 1600, height = 900, gesture = true } = {}) {
  const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const port = 9935 + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dm-deck-'))}`, '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', ...(gesture ? ['--autoplay-policy=no-user-gesture-required'] : []), 'about:blank'], { stdio: 'ignore' });
  let ver = null;
  for (let i = 0; i < 150 && !ver; i++) { await sleep(200); try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* starting */ } }
  if (!ver) { chrome.kill(); throw new Error('headless Chrome did not start'); }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  // errors: uncaught exceptions in the page. warnings: console.warn/error, which is where the phone logs a step that
  // threw ("[demo]") and the deck a watchdog ("[sunum]"); either means a walk was not clean.
  const errors = [], warnings = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(m.params.type)) warnings.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
  };
  await new Promise(r => (ws.onopen = r));
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const shot = async file => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.data, 'base64')); };
  const key = k => ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true }))`);
  const close = () => { try { ws.close(); } catch { /* already closed */ } chrome.kill(); };
  return { send, ev, shot, key, close, errors, warnings };
}

/** The deck as the walking tools read it: where it is, whether the lock is held, how many of the slide's steps are done. */
export const DECK_STATE = `({ count: document.querySelector('#count').textContent, busy: document.querySelector('#stage').getAttribute('aria-busy'),
  acts: document.querySelectorAll('.slide.on .act').length, done: document.querySelectorAll('.slide.on .act.done').length,
  auto: document.querySelector('#auto')?.getAttribute('aria-pressed') })`;

/** Opens the deck and waits until the phone is loaded and the lock has lifted. */
export async function openDeck(c, url) {
  await c.send('Page.navigate', { url: 'about:blank' }); await sleep(200);
  await c.send('Page.navigate', { url });
  for (let i = 0; i < 300 && !(await c.ev(`!!document.querySelector('.slide') && document.querySelector('#phone').contentDocument?.readyState === 'complete'`)); i++) await sleep(100);
  await sleep(500);
  for (let i = 0; i < 300 && (await c.ev(`document.querySelector('#stage').getAttribute('aria-busy')`)) !== 'false'; i++) await sleep(100);
}

/** A file name for a rest of the deck: "07-kesfet-03-seviye-baslangic". */
export const slug = s => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const restName = (SLIDES, i, done) => `${String(i + 1).padStart(2, '0')}-${SLIDES[i].id}${done ? `-${String(done).padStart(2, '0')}-${slug(SLIDES[i].acts[done - 1][0])}` : ''}`;
