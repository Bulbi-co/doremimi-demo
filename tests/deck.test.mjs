// Guards for the deck (deck/slides.js), the list sunum.js really draws and drives.
//
// The deck is nine slides (owner, 2026-11-16, after presenting the 16-slide one: every → brought up one more feature
// to explain). These hold the cut: the count, two steps a slide at most, an Oyna slide that opens the game and stops,
// and every step a whole state, so nothing the presenters tap on the phone can make a later slide replay a round.
// Before that the slides asked the phone for steps of a script (app/data/script.js) and these guards held the two
// lists together; the script is still in the phone for the tools, and no slide may ask for it again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLIDES, SONG_HOLD } from '../deck/slides.js';
import { SCRIPT } from '../app/data/script.js';
import { FAMILIES, SIGN_CATEGORIES } from '../app/data/content.js';
import { TABS, OGREN_TABS } from '../app/lib/nav.js';
import { knownRoute, ACT_NAMES, flat } from '../tools/phone-routes.mjs';
import { SONGS, DIRECTORY } from '../app/data/site.js';
import { sequence, karaokeLines, length as songLength, slug } from '../app/lib/music.js';

/** Every phone message on the deck in the order → sends them: each slide's own, then its steps, then what it sends as it is left. */
const messages = () => SLIDES.flatMap(s => [
  ...(s.phone ? [{ slide: s.id, msg: s.phone, entry: true }] : []),
  ...(s.acts ?? []).map(([label, msg]) => ({ slide: s.id, msg, label })),
  ...(s.leave ? [{ slide: s.id, msg: s.leave, leave: true }] : []),
]);
/** The same, batches opened up: one plain message each, with the slide it is on. */
const sent = () => messages().flatMap(({ slide: id, msg }) => flat(msg).map(m => ({ id, m })));
const slide = id => SLIDES.find(s => s.id === id);
/** What a slide's steps ask the phone for, a batch opened up: [[hashes and act names of step 1], [of step 2], …]. */
const asked = id => slide(id).acts.map(([, msg]) => flat(msg).map(m => (m.type === 'go' ? m.hash : m.name)));
const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const words = x => `${x.label} ${x.html} ${x.notes ?? ''} ${(x.acts ?? []).map(a => a[0]).join(' ')}`.replace(/<[^>]+>/g, ' ');

test('the deck is nine slides at most, in the order the owner cut it to', () => {
  assert.ok(SLIDES.length <= 9, `the deck has ${SLIDES.length} slides; the owner's limit is 9`);
  assert.deepEqual(SLIDES.map(s => s.id), ['kapak', 'bugune-kadar', 'gezinme', 'kesfet', 'ogren', 'cal', 'sarki', 'aile', 'kapanis']);
  assert.equal(new Set(SLIDES.map(s => s.id)).size, SLIDES.length, 'no slide twice');
  // What the cut took out stays out: the round's results, the three folded foundation slides, and a slide each for
  // İzle, the logo's tab, Ayarlar and the platforms.
  for (const id of ['oyun', 'sonuc', 'bugune-kitaplar', 'bugune-cso', 'bugune-kutuphane', 'izle', 'vakif', 'ayarlar', 'platform']) assert.ok(!slide(id), `the ${id} slide is gone`);
});

test('no slide has more than two steps, and no two buttons on a slide share a label', () => {
  // "Su kısım sürekli ileri ileri basıyorsun, her seferinde yeni bir özellikten bahsediyor": the Oyna slide had eleven.
  for (const s of SLIDES) {
    assert.ok((s.acts ?? []).length <= 2, `${s.id} has ${(s.acts ?? []).length} steps`);
    assert.equal(new Set((s.acts ?? []).map(a => a[0])).size, (s.acts ?? []).length, `${s.id} has two buttons with one label`);
  }
});

test('every step is a whole state: it opens its screen first, and nothing asks the phone for a scripted step', () => {
  // A scripted step (act 'goto') makes the phone replay the round up to it, fast, in front of the audience, and after
  // a round played by hand it starts the phone over first. A whole state needs nothing before it.
  for (const { id, m } of sent()) assert.ok(!(m.type === 'act' && m.name === 'goto'), `${id} asks for script step ${m.step}`);
  for (const { slide: id, msg, label, entry } of messages()) {
    const first = flat(msg)[0];
    assert.ok(['go', 'reset'].includes(first.type), `${id} ${entry ? 'opens' : `“${label}” starts`} with ${first.type} ${first.name ?? ''}, not with its screen`);
  }
  assert.ok(messages().length >= 15, 'the deck’s messages were read');
});

test('every hash the deck sends is a route the phone has, and every act one the phone knows', () => {
  assert.ok(sent().length >= 20, 'the deck’s messages were read');
  for (const { id, m } of sent()) {
    if (m.type === 'go' || m.type === 'reset') assert.ok(knownRoute(m.hash), `${id} sends the phone to ${m.hash}, which it does not have`);
    else if (m.type === 'act') assert.ok(ACT_NAMES.includes(m.name), `${id} asks for "${m.name}", which the phone does not know`);
    else assert.fail(`${id} sends a message of type ${m.type}`);
  }
  assert.ok(!knownRoute('#/yok') && !knownRoute('#/ogren/yok') && !knownRoute('#/oyunlar'), 'an unknown page, an unknown Öğren tab and a retired route are not routes');
});

test('the Oyna slide shows the categories, opens the game, and stops: the presenters play the round by hand', () => {
  const s = slide('kesfet');
  assert.deepEqual(s.acts.map(a => a[0]), ['Kategoriler', 'Şimdi Oyna']);
  assert.deepEqual(asked('kesfet'), [['#/', 'scroll'], ['#/', 'oyna.press']]);
  assert.equal(flat(s.acts[0][1]).find(m => m.name === 'scroll').to, '.kats-sec');
  assert.match(app, /<div class="kats-sec">/, 'the phone draws the section the step scrolls to (a selector that matches nothing scrolls to the top and says nothing)');
  // The press is on Oyna's own circle, the one home draws, and the act does nothing after it.
  const press = /^  'oyna\.press': async \(\) => \{ const sel = '([^']+)';[^\n]*await pressDo\(sel\); \},$/m.exec(app);
  assert.ok(press, 'the phone has oyna.press, and it ends at the press');
  assert.equal(press[1], '[data-do="play"][data-origin="kesfet"]');
  assert.match(app, /class="chunky oyna circle" data-do="play" data-origin="kesfet"/, 'which is the button Oyna draws');
  // Nothing on the deck plays a move, starts a round by itself, finishes one, or taps a play button on a page
  // (dossier ch. 14 §10, §14: one way into the game, no results slide).
  const game = sent().filter(({ m }) => m.type === 'act' && /^(game|results|intro)\.|^song\.game$|^oyna\./.test(m.name));
  assert.deepEqual(game.map(({ id, m }) => `${id} ${m.name}`), ['kesfet oyna.press'], 'the game is opened once, on the Oyna slide, and never played');
  for (const { id, m } of sent()) assert.doesNotMatch(`${m.sel ?? ''} ${m.tap ?? ''}`, /data-play|data-origin|data-g=/, `${id} taps into the game`);
  assert.ok(!ACT_NAMES.includes('song.game'), 'the phone has no act that opens a song’s round');
  assert.match(words(s), /telefonda siz oynayın/, 'the notes hand the round to the presenters');
});

test('Öğren opens a family and then an instrument by tapping them, as a child would', () => {
  assert.deepEqual(slide('ogren').phone, { type: 'go', hash: '#/ogren/aileler' });
  assert.deepEqual(asked('ogren'), [['#/ogren/aileler', 'tap'], ['#/ogren/calgilar?aile=yayli', 'tap']]);
  const [family, instrument] = slide('ogren').acts.map(([, msg]) => flat(msg).find(m => m.name === 'tap').sel);
  // The family card carries its key and the grid's tile its page (app/app.js); the keys are the content's own.
  const key = /^\[data-fam="(\w+)"\]$/.exec(family)?.[1];
  assert.ok(key in FAMILIES, `${family} is a family the phone has`);
  assert.match(app, /<button class="fam" data-fam="\$\{key\}"/);
  assert.equal(instrument, '[data-push="#/calgi/keman"]');
  assert.match(app, /<button class="itile" data-push="#\/calgi\/\$\{slug\(d\.name\)\}"/);
  assert.ok(DIRECTORY.some(d => slug(d.name) === 'keman'), 'Keman is in the directory');
});

test('every tab of the dock is opened somewhere on the deck, and the navigation slide opens the two with no slide of their own', () => {
  const hashes = sent().filter(({ m }) => m.type === 'go' || m.type === 'reset').map(({ m }) => m.hash);
  for (const tab of TABS) assert.ok(hashes.some(h => h === tab.hash || (tab.key === 'ogren' && h.startsWith('#/ogren/'))), `nothing on the deck opens ${tab.key} (${tab.hash})`);
  assert.deepEqual(asked('gezinme'), [['#/doremimi'], ['#/izle']]);
  assert.deepEqual([slide('kesfet').phone.hash, slide('cal').phone.hash], ['#/', '#/cal']);
  assert.equal(slide('kapanis').phone.hash, '#/doremimi', 'the deck closes on the foundation’s tab');
});

test('the deck tells no retired story: no XP, no results, no game from a song, no ladder, no mode named as a level', () => {
  const text = SLIDES.map(words).join('\n');
  assert.doesNotMatch(text.toLocaleLowerCase('tr'), /\bxp\b|bu çalgıyla oyna|deneyim puanı|\baltın\b|seviye \d|\bsv \d|tur sonu|sonuç ekranı/);
  for (const old of [/Çevir'e iner/, /Yaz\s*→\s*Seç/, /merdiven/i, /iki zorlanma/i, /Önce yaz, sonra seç/, /Konu seç/, /Tekrar zamanı/, /Seviye(si)? (Yaz|Seç|Çevir)/]) assert.doesNotMatch(text, old);
  // The phone's scripted round (kept for the tools) holds to the same rules.
  assert.ok(SCRIPT.flat().every(a => !('level' in a)), 'the script never picks a level');
  for (const name of ['game.finish', 'results.scroll', 'song.game']) assert.ok(!SCRIPT.flat().some(a => a.name === name), `the script has no ${name}`);
});

// The audience is the foundation's own people (owner, 2026-11-16: "make sure it is cohesive"): nothing on a slide, a
// button or in a note is a word of ours (how it was built, who tested it, what a tab used to be called).
const INTERNAL = /(?<!\p{L})(testçi|dossier|ladder|merdiven|commit|guard|avalonia|testflight|apk|keşfet|süzgeç)|\.net(?!\p{L})/u;
test('the deck says nothing in the developers’ own words, and calls the piano what the phone calls it', () => {
  for (const s of SLIDES) { const hit = INTERNAL.exec(words(s).toLocaleLowerCase('tr')); assert.ok(!hit, `${s.id} says “${hit?.[0]}”`); }
  // The matcher itself: Turkish casing, a word inside a word (Kapak holds no "apk"), a file type.
  assert.ok(INTERNAL.test('testçilere göre') && INTERNAL.test('KEŞFET'.toLocaleLowerCase('tr')) && INTERNAL.test('avalonia, .net'));
  assert.ok(!INTERNAL.test('kapak') && !INTERNAL.test('internet'));
  // Çal's own page says "uygulamanın piyanosu" (app/i18n/ui.js cal.note); the slides once said "klavye" for it.
  assert.doesNotMatch(SLIDES.map(s => `${s.html} ${(s.acts ?? []).map(a => a[0]).join(' ')}`).join(' '), /klavye/i, 'the slides call it the piano');
});

test('the numbers typed on the slides are the phone’s: 12 categories, 7 signs, 5 families, 41 instruments, 4 Öğren tabs', () => {
  const families = Object.keys(FAMILIES).length, signs = SIGN_CATEGORIES.length;
  const NUM = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
  assert.match(slide('kesfet').html, new RegExp(`altında ${signs + families} kategori`));
  assert.match(words(slide('kesfet')), new RegExp(`${NUM[signs]} müzik işareti ve ${NUM[families]} çalgı ailesi`));
  assert.match(slide('ogren').html, new RegExp(`>${NUM[families][0].toLocaleUpperCase('tr')}${NUM[families].slice(1)} aile:`));
  assert.match(slide('ogren').html, new RegExp(`>${DIRECTORY.length} çalgı:`));
  assert.match(slide('cal').html, new RegExp(`altında ${SONGS.filter(x => x.slug !== 'ana-tema').length} şarkı\\.`));
  assert.match(words(slide('ogren')), new RegExp(`Öğren'in ${NUM[OGREN_TABS.length]} sekmesi`));
  assert.match(app, /if \(gate\.wrong >= 3\) \{ gate\.lockedUntil = Date\.now\(\) \+ 30_000;/, 'the gate locks for 30 s after three wrong PINs');
  assert.match(words(slide('aile')), /üç yanlışta 30 saniye kilitlenir/);
});

test('the closing slide carries the platforms as one line, and every slide has presenter notes', () => {
  const line = /<small class="cl-plat">([^]*?)<\/small>/.exec(slide('kapanis').html)?.[1].replace(/<br>/g, ' · ');
  assert.deepEqual(line?.split(' · '), ['iPhone', 'iPad', 'Android', 'Mac', 'Windows', 'tarayıcı']);
  for (const s of SLIDES) assert.ok((s.notes ?? '').replace(/<[^>]+>/g, '').trim().length > 40, `${s.id} has no presenter notes`);
  // A tour slide says one thing: a short title and a lead, the rest is for the presenter.
  for (const s of SLIDES.filter(x => x.theme === 'light')) assert.ok(/<h1 class="title tour">[^<]{5,45}<\/h1>/.test(s.html), `${s.id} has a short title`);
});

test('the Şarkı slide plays Keman’s song on the song’s own page, then opens a lyric sheet that exists', async () => {
  const s = slide('sarki');
  assert.equal(SLIDES[SLIDES.indexOf(s) - 1].id, 'cal', 'right after Çal');
  assert.deepEqual(s.phone, { type: 'go', hash: '#/sarki/keman' });
  assert.deepEqual(asked('sarki'), [['#/sarki/keman', 'song.play'], ['#/sozler/gitar']]);
  assert.ok(SONGS.some(x => x.slug === 'keman'), 'the phone has Keman’s song');
  const lyrics = JSON.parse(readFileSync(new URL('../app/data/site/lyrics.json', import.meta.url), 'utf8'));
  const sheets = lyrics.map(l => slug(l.instrument));
  assert.ok(sheets.includes('gitar'), 'Gitar has a lyric sheet');
  assert.ok(!sheets.includes('keman'), 'Keman has none, which is why the slide opens Gitar’s');
  // The numbers the Çal and Şarkı slides say, against the phone's own lists.
  const songs = SONGS.filter(x => x.slug !== 'ana-tema').length;
  assert.match(words(s), new RegExp(`\\b${songs} şarkının hepsi`), `${songs} songs`);
  assert.match(words(slide('cal')), new RegExp(`\\b${DIRECTORY.length} çalgının her birinin şarkısı var`));
  assert.equal(songs, DIRECTORY.length, 'a song for every instrument');
  assert.equal(sheets.length, 10); assert.match(words(s), /on çalgının sözleri/);
  // What the slide says the karaoke line does, against the song the phone plays (its own sequencer): note names
  // while the tune opens, then the words.
  const events = sequence(JSON.parse(readFileSync(new URL('../app/data/songs/keman.json', import.meta.url), 'utf8')));
  const NOTE = /^(do|re|mi|fa|sol|la|si)$/i;
  const lines = karaokeLines(events).filter(l => l.syllables.length).map(l => ({ at: events.find(e => e.line === l.number).start, names: l.syllables.every(x => NOTE.test(x.text)) }));
  assert.ok(lines[0].names, 'the first karaoke line is note names');
  const sung = lines.find(l => !l.names);
  assert.ok(sung && sung.at > lines[0].at, 'and the words come after it');
  assert.match(words(s), /önce nota adları, sonra sözler/);
  // Auto-play leaves the song on until the first sung line has passed, and no longer than half a minute.
  const lineSeconds = events.find(e => e.line === 2).start - events.find(e => e.line === 1).start;
  assert.ok(lineSeconds > 2, 'a karaoke line lasts a few seconds');
  assert.equal(s.acts[0][2]?.hold, SONG_HOLD, 'the step that plays the song carries the hold');
  // To the millisecond: the starts are sums of floats (19.200000000000006).
  assert.ok(SONG_HOLD >= Math.round((sung.at + lineSeconds) * 1000), `the song plays past its first sung line (${sung.at.toFixed(1)} s + ${lineSeconds.toFixed(1)} s; hold ${SONG_HOLD} ms)`);
  assert.ok(SONG_HOLD <= 30000 && SONG_HOLD / 1000 < songLength(events));
  assert.match(words(s), new RegExp(`şarkıyı ${SONG_HOLD / 1000} saniye dinletir`), 'the notes give the hold the deck uses');
  assert.ok(s.acts.slice(1).every(a => a[2]?.hold === undefined), 'only that step');
});
