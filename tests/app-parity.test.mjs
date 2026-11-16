// The demo's phone holds copies of the app's content and rules (data/content.js, data/site.js say from where). A copy
// agrees with itself for ever, so these guards read the APP's own files and compare. They found the first drift they
// were written for: after ch. 14 the demo gave the four moved family colours to the wrong families (Telli green where
// the app has magenta, Yaylı magenta for indigo, Nefesli indigo for green), and every demo guard still passed.
//
// The app lives in another repo. On this machine it is ../../../doremimi-superapp from here; DOREMIMI_APP overrides
// that. Where it is not checked out (Vercel, another laptop) the guards are skipped and say so, not passed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { FAMILIES, BADGES, LEARNING, SIGN_CARDS } from '../app/data/content.js';
import { GROUP_COLORS } from '../app/data/site.js';

const APP = process.env.DOREMIMI_APP ?? fileURLToPath(new URL('../../../doremimi-superapp/', import.meta.url));
const has = existsSync(join(APP, 'Doremimi.Core/Config/tokens.json'));
const skip = has ? false : `the app repo is not at ${APP} (set DOREMIMI_APP)`;
const read = rel => readFileSync(join(APP, rel), 'utf8');
// badges.json carries the content team's // notes above the array; JSON does not.
const json = rel => JSON.parse(read(rel).split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n'));

test('the five family colours are the app’s tokens.json, family for family, in FAMILIES, GROUP_COLORS and the badges', { skip }, () => {
  const tokens = json('Doremimi.Core/Config/tokens.json').families;
  const KEY = { TelliCalgilar: 'telli', YayliCalgilar: 'yayli', NefesliUflemeliCalgilar: 'uflemeli', VurmaliCalgilar: 'vurmali', TusluCalgilar: 'tuslu' };
  const GROUP = { TelliCalgilar: 'Telli', YayliCalgilar: 'Yaylı', NefesliUflemeliCalgilar: 'Nefesli', VurmaliCalgilar: 'Vurmalı', TusluCalgilar: 'Tuşlu' };
  assert.deepEqual(Object.keys(FAMILIES).sort(), Object.keys(KEY).sort());
  for (const [family, key] of Object.entries(KEY)) {
    const want = tokens[key].toUpperCase();
    assert.equal(FAMILIES[family].color.toUpperCase(), want, `${family}: tokens.json ${key} is ${want}`);
    assert.equal(GROUP_COLORS[GROUP[family]].toUpperCase(), want, `GROUP_COLORS ${GROUP[family]}`);
  }
});

test('the two groups that are not families wear the app’s GroupColor', { skip }, () => {
  const src = read('Doremimi/ViewModels/ShellViewModel.cs');
  const of = name => src.match(new RegExp(`InstrumentGroup\\.${name} => "(#[0-9A-Fa-f]{6})"`))?.[1];
  assert.equal(GROUP_COLORS['Bakır nefesli'].toUpperCase(), of('BakirNefesli')?.toUpperCase());
  assert.equal(GROUP_COLORS['Diğer'].toUpperCase(), (src.match(/_ => "(#[0-9A-Fa-f]{6})"/)?.[1] ?? '').toUpperCase());
});

test('every badge has the app’s name, line and colour (two were renamed in ch. 14; ids kept)', { skip }, () => {
  const app = json('Doremimi/Assets/Content/catalog/badges.json');
  assert.deepEqual(BADGES.map(b => b.id), app.map(b => b.id));
  for (const a of app) {
    const d = BADGES.find(b => b.id === a.id);
    assert.deepEqual([d.name, d.description, d.color.toUpperCase()], [a.name, a.description, a.color.toUpperCase()], a.id);
  }
});

test('the ladder moves on the app’s numbers (ch. 14: down after four struggles)', { skip }, () => {
  assert.deepEqual(LEARNING.ladder, json('Doremimi.Core/Config/learning.json').ladder);
});

test('every sign card has the app’s difficulty', { skip }, () => {
  const KEY = { BaslangicSeviyesi: 'baslangic', OrtaSeviye: 'orta', IleriSeviye: 'ileri' };
  const cards = json('Doremimi/Assets/Content/catalog/signs.json').cards;
  assert.equal(cards.length, SIGN_CARDS.length);
  for (const c of cards) assert.equal(SIGN_CARDS.find(s => s.id === c.id)?.difficulty, KEY[c.difficulty], c.id);
});
