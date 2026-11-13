// Guards for the navigation revision (dossier ch. 11): the dock, the routes and where each page lives. They import
// the module the phone runs (app/lib/nav.js), and check the owner's words, not a copy of the table: four labelled
// tabs Keşfet, Öğren, İzle, Çal with the logo in the middle, no Oyunlar and no Daha fazla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS, resolve } from '../app/lib/nav.js';

test('the dock is Keşfet · Öğren · logo · İzle · Çal, the logo in the centre slot with no label (NR-02, OC-02)', () => {
  assert.deepEqual(TABS.map(t => t.logo ? 'LOGO' : t.label), ['Keşfet', 'Öğren', 'LOGO', 'İzle', 'Çal']);
  assert.equal(TABS.findIndex(t => t.logo), Math.floor(TABS.length / 2), 'the logo is centred');
  assert.equal(TABS.find(t => t.logo).title, 'Doremimi');
  assert.ok(!TABS.some(t => /Oyunlar|Daha fazla/.test(t.label + t.title)));
});

test('the dock draws the official logo file, the same one as the app icon (NR-04, D21)', () => {
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  assert.match(app, /class="plate"><img src="\.\.\/assets\/brand\/logo\.png"/);
  const shipped = readFileSync(new URL('../assets/brand/logo.png', import.meta.url));
  const official = (() => { try { return readFileSync(new URL('../../../doremimi-superapp/Doremimi/Assets/Content/brand/logo.png', import.meta.url)); } catch { return null; } })();
  if (official) assert.ok(shipped.equals(official), 'assets/brand/logo.png differs from the app’s brand/logo.png');
});

test('every tab root clears the stack; the old tabs redirect so stale links still land (NR-91)', () => {
  for (const t of TABS) assert.equal(resolve(t.hash).kind, 'root', t.hash);
  assert.equal(resolve('#/oyunlar').to, '#/oyun-merkezi');
  assert.equal(resolve('#/daha').to, '#/doremimi');
  assert.equal(resolve('#/ogren/videolar').to, '#/izle');
  assert.equal(resolve('#/ogren/kitaplik').to, '#/cal');
  assert.equal(resolve('#/ogren/calgilar').kind, 'root');
});

test('opened with nothing under it, a song lives in Çal, an instrument in Öğren, the foundation in the hub (NR-50, NR-30)', () => {
  assert.equal(resolve('#/sarki/akordeon').tab, 'cal');
  assert.equal(resolve('#/melodim').tab, 'cal');
  assert.equal(resolve('#/sozler/akordeon').tab, 'cal');
  assert.equal(resolve('#/calgi/piyano').tab, 'ogren');
  for (const p of ['vakif', 'ekip', 'burslar', 'gonullu', 'iletisim', 'kitaplar', 'doremimi-nedir', 'yardim', 'hakkinda']) assert.equal(resolve(`#/${p}`).tab, 'doremimi', p);
});

test('a tapped page stays on the tab it was tapped from; Profilim has no home of its own (NR-10, NR-60)', () => {
  assert.equal(resolve('#/dore-ve-mimi', { tab: 'kesfet', fromApp: true }).tab, 'kesfet');
  assert.equal(resolve('#/profil', { tab: 'izle' }).tab, 'izle');
  assert.equal(resolve('#/profil', { tab: 'cal', fromApp: true }).tab, 'cal');
  assert.equal(resolve('#/oyun?deste=karisik').kind, 'game');
});
