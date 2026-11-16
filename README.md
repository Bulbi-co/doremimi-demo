# Doremimi demo sunumu

A slide deck with a real, tappable Doremimi phone beside it, for presenting the app to the Dore Mimi Yetenek ve
Eğitim Vakfı. It follows the Eylül Fuarcılık demo (`../eylul-fuarcilik`) in mechanics, and the Doremimi dossier in
content:

- `../../doremimi-superapp/docs/dossier/10-demo-website-handover.md`: the build spec (slides, screens, tokens, ports).
- `../../doremimi-superapp/docs/dossier/11-navigation-revision.md`: the owner's navigation revision of 2026-11-13,
  which this demo already uses. Where the two disagree about where something lives, chapter 11 wins.

The dock is **Keşfet · Öğren · [Doremimi logo] · İzle · Çal**. The logo opens the foundation and app information hub.
The profile is the avatar in the top-right corner. Everything that plays notes lives in Çal. The real app at
`c33d9ff` still has the old four tabs: the screens inside the phone are 1:1 with the app, but where they live follows
chapter 11.

## Run it

No build step, no dependencies. Every asset, including the fonts, is in the folder, and nothing loads from the
network.

```
npm start                          # = node tools/serve.mjs; a busy 4175 moves to the next free port
```

Not `python3 -m http.server`: its listen backlog of 5 drops part of the deck's burst of ES-module requests on a cold
load, and one failed import leaves the whole deck or phone blank (9 of 12 cold loads failed). `tools/serve.mjs` is a
small Node server with no dependencies (Node's backlog is 511).

- Deck: http://localhost:4175
- The phone on its own (for development; the deck no longer links to it): http://localhost:4175/app/

Opening `index.html` from the file system does not work, because the phone loads its songs and lists with `fetch`. Use
the server.

## Presenting

| Key | Does |
|---|---|
| → · Space · PageDown | plays the slide's next "canlı göster" step; when none is left, goes to the next slide |
| ← · PageUp | undoes one step (the phone goes back to the step before), then goes to the previous slide |
| Home / End | first / last slide |
| N | speaker notes (Turkish) |
| F | full screen |
| R | resets the phone to this slide's starting state |
| swipe | next / previous slide on a touch screen |

- **The deck waits for the phone.** While the phone is playing a step, or a slide is still coming in, every control
  (→ ←, the dots, the step buttons, swipe, Home/End, R) is disabled and the step being played shows a spinner. Presses
  in that time are ignored, not queued, so nothing can skip what the audience is watching (`deck/flow.js`; the phone
  answers `dm-done` when it has finished). A phone that never answers frees the deck after 20 s.
- **Slide 1 resets the phone.** Going back to it starts the demo over.
- **Sound:** click **Sesi aç** (top right) once before you start. Browsers start audio only after a click.
- **Typing in the game:** while the game asks for a typed answer, the laptop keyboard types into it. During that time
  N, F and R are letters, not shortcuts.
- **Demo PIN: `135790`.** The parent gate accepts only this demo PIN, never the app's own default (ch. 10 G-06). It
  is in the notes of slide 8 (Aile ve içerik).
- `?notlar` on the deck URL opens the notes. `#7` opens slide 7.

The deck has 10 slides, each with at most two "canlı göster" steps, and tells dossier ch. 14 §9's story: Kapak,
Gezinme (the dock; logo, Öğren), Keşfet (the categories; OYNA, and the first game's level question), Oyun (Keşfet's
round: a wrong typing, the letter tiles, the choices and the card that explains), Öğren (a family's Hazırlan sheet;
its cards turned over), Çal (the piano; a song's round at the choices), Tur sonu (the results; the new badge), Aile ve
içerik (profiles, parent PIN, content the foundation edits), Platformlar and Kapanış (the foundation's page). The
slides are data in `deck/slides.js`; the phone's side is one seeded script, `app/data/script.js`, that the scripted
slides walk front to back, so every press lands on the same card each time and → never makes the phone start over.
`tests/deck.test.mjs` holds the two lists to each other.

## What is where

```
index.html  sunum.js  sunum.css    the deck: keys, notes, the phone frame, the sound button
deck/slides.js  deck/flow.js       the slides as data; the lock that waits for the phone
app/index.html  app.js  style.css  the phone: shell, every screen, the game, overlays
app/lib/                           the app's rules ported to JavaScript:
  answers.js tiles.js ladder.js round.js progress.js   the game (Yaz/Seç/Çevir, tiles, matching, XP, badges)
  modes.js                         ch. 14: the way in decides the level, the difficulty ceiling, the Hazırlan count
  music.js                         PianoKeys synthesis, sequencer, renderer, karaoke, ButtonMelody
  nav.js                           the dock and the routes (ch. 11), as data and one pure function
  backdrop.js icons.js rng.js      the 2.5D note canvas, the app's icons, seeded random
app/data/content.js  site.js       content copied from the app's C# (signs, questions, directory, people, texts)
app/data/hub.js                    the logo's page (ch. 14 §6), as data
app/data/script.js                 the deck's live demo as the phone's steps (ch. 14 §9)
app/data/songs/*.json              the app's 42 song files, unchanged
app/data/site/*.json               the app's videos, lyrics and library lists, unchanged
assets/                            fonts, logo, characters, banners, sprites, instrument photos, thumbnails
tests/                             guards for the ported rules, the music and the navigation
tools/mutants.sh                   checks the guards catch breakage (each mutant "caught", each CONTROL "SURVIVED")
tools/shoot.mjs                    screenshots every slide, step and phone screen into docs/screens/
docs/screens/                      the latest screenshots (not deployed)
```

The phone takes messages from the deck (`go`, `reset`, `act`, `batch`), as in the reference. Its routes:
`#/`, `#/ogren/isaretler`, `#/ogren/calgilar`, `#/doremimi`, `#/izle`, `#/cal` (the five roots); pages such as
`#/calgi/piyano`, `#/sarki/akordeon`, `#/sozler/akordeon`, `#/melodim`, `#/profil`, `#/vakif`;
the game as `#/oyun?deste=karisik`. The old `#/oyunlar`, `#/daha`, `#/ogren/videolar` and `#/ogren/kitaplik` redirect.

## Checks

```
npm test                 # node --test tests/: the game rules, the music, the navigation, the deck's flow lock
                         # tests/app-parity.test.mjs reads the app's own files (../doremimi-superapp, or DOREMIMI_APP);
                         # without the app checked out it is skipped, not passed
npm run e2e              # with npm start running: mashes → in headless Chrome; the deck must wait for the phone
npm run mutants          # every mutant must be "caught" and every CONTROL "SURVIVED"
npm run shots            # with the server running: screenshots into docs/screens/
```

`tools/shoot.mjs` needs Node 22, or Node 20 with `--experimental-websocket` (the npm script passes it), and Google
Chrome. It starts its own headless Chrome with a throwaway profile and stops it at the end.

## Deploy

**Vercel** (the target, ch. 10 D-03): import the folder as a static project, with no framework and no build command.
`vercel.json` sets `trailingSlash: true`, so `/app` serves `/app/`, which the phone's relative paths need.
`.vercelignore` keeps `tests/`, `tools/` and `docs/` out of the deployment.

**GitHub Pages** (optional copy, ch. 10 D-04): push the folder to a repository and serve the root of the default
branch. Every path is relative, so a project page (`user.github.io/repo/`) works too. `app/index.html` adds the missing
trailing slash itself when a host serves `/app` without it.

Keep the published URL unlisted. Every page has `noindex`, and `robots.txt` disallows everything (ch. 10 G-08).

## 1:1 and simplified

**1:1 with the app** (copy from the source, checked against `docs/dossier/screens`):

- The game: the intro, Yaz with the app's own Turkish keyboard (three sizes, held ⌫), letter tiles prefilled in the card's colour,
  the four choices after two misses, the reveal card with Tanım / Çocuk anlatımı (toy piano, clef faces), Seç, Çevir
  with Bildim / Bilemedim, the canvas mood change, the results with stars, XP, Müzik bilgin and
  badges, and the level-up popup. These run the app's rules, ported in `app/lib`.
- The shell's look, v3 (superapp f8c3a52, checked against its `docs/dossier/screens/v2` in `docs/screens/v3/`): milk
  white cards with one soft shadow, ink text, every button white or ink, the card's colour as the game's single accent
  (`app/lib/accent.js`), OYNA's yellow, no bounce or pulse; the near-white 2.5D note canvas with a mood per tab.
- Keşfet (the banner, OYNA, `Bugünün kartı` turning daily by the app's `DailyCard` rule, `app/lib/daily.js`); Öğren's
  İşaretler flip tiles; the instrument page; the song page with
  karaoke, the lit keys, Çal / Duraklat / Durdur; Profilim; Ayarlar; Hesabım; Ebeveyn paneli; the parent gate; Kim
  oynuyor?.
- The sound: the 44 piano keys are synthesised exactly as `PianoKeys.cs` does. Songs are sequenced with repeats, ties
  and verses, and mixed with the renderer's gains and fades. Button presses play the pentatonic walk. The startup theme
  plays the safe C-major way, with the `Şimdi çalıyor` pill.

**New, from chapter 11** (PROPOSED there; no app screenshot exists yet): the five-slot dock with the raised logo
plate; the `Doremimi` hub and its two new pages (`Doremimi nedir?`, `Kitaplar ve notalar`); İzle as a tab; the Çal root
(free-play keyboard, Melodim card, song tiles with chips, lyrics carousel); `Şarkısını çal` switching to Çal; the
`Sözleri` button; Profilim's child header and `Aile ve ayarlar` rows; the results button `Çık`; the hub's warm wash.
The game's own page (`Oyun merkezi`) went with the app's clean-up; `#/oyun-merkezi` and `#/oyunlar` land on Keşfet.

**Dossier ch. 14** (owner revision, 2026-11-16; the app gets the same, screen for screen): Keşfet is the game: OYNA is
a yellow circle whose little card loops through the game's three moves without naming them, then all 12 categories in
one colour grid, no Tekrar row. The way in decides the round, never the child: Keşfet starts at Yaz every time and moves
down only after four struggles in a row; Öğren goes through the Hazırlan sheet ("Bu kategoride N kart var") to that
category's cards turned over; Çal and an instrument's page play at the choices; the last two never move. No level name
is on screen (no ladder strip, no move toast, results count right answers). Every question has a difficulty; the first
game asks the child's level, Ayarlar › Zorluk changes it, and rounds deal under it as a ceiling. Öğren has six tabs
(İşaretler, a photo grid of Çalgılar, Aileler, Bilmeceler, Değerler, Notalar); the logo's page leads everywhere once.
Four family colours moved so the 12 categories can be told apart, each family wearing the colour the app's tokens.json
gives it (`app/data/content.js` FAMILIES says by how much; `tests/app-parity.test.mjs` holds it to the app).
Guards: `tests/ch14.test.mjs`, mutants in `tools/mutants.sh`, and `tools/ch14-e2e.mjs` in headless Chrome.

**Simplified:**

- **Videos never play.** As in the app, a video asks the parent PIN. Then the demo shows the thumbnail in a player
  frame with a play button, because the demo makes no network request (G-09). The play button says so.
- **Every link out** (Instagram, the website, e-mail, the library rows, the forms' `Gönder`) asks the gate, then shows
  a toast instead of leaving.
- **Accounts:** no welcome flow, sign-up or sign-in. Kim oynuyor? shows the snapshot preset's two children, Ada and
  Can. Picking one changes the name and the avatar, but progress is one shared demo profile. `Hesap oluştur`,
  `Profil ekle` and `Ebeveyn PIN'ini değiştir` say `Yakında`. `Hesabı ve verileri sil` wipes the demo state.
- **Profilim's Bilmeceler bar stays at 0**, because riddle XP is not paid anywhere in the app either (Top 20 #13).
  `Genel` is the average concept mastery, an approximation of the app's figure.
- **Tasarım sistemi** shows the palette and three buttons, not the app's whole component gallery.
- **The contact page leaves out the phone numbers and personal e-mail addresses.** This is a shared link, so it shows
  only the foundation's own address. The buttons still ask the gate.
- **The sign category page** (`Aç` on a flipped tile) is a simple list with `Pratik yap`. Its copy is PROPOSED,
  because the app's own layout was not screenshotted.
- **The content panel** is described on slide 8, not shown, until the real panel is screenshotted.
- **Azaltılmış hareket** stops the CSS motion and the canvas. The app also slows the card's deal, and the demo does not.
- **The phone keeps one state** in `localStorage` (`doremimi-demo-v1`). Slide 1 and `?reset` wipe it.

## TODO

- The accounts overlay (welcome slides, `Hesap oluştur` with KVKK, `Giriş yap`, the child form) and real per-child
  progress (ch. 10 A-33, W-05 `family.seed`).
- `Ebeveyn PIN'i` page; the gate's lock countdown text.
- The sign category page 1:1, once the app renders it.
- The content panel from a screenshot of `Doremimi.Admin`.
- The `overlay=` 1:1 check switch (W-06): a screenshot drawn at 50% over the phone.
- Golden files exported from the C# (ch. 10 O-13): the sequence of `akordeon`, `piyano` and `ana-tema`, the first
  samples of keys 0, 15 and 43, the accepted answers. They would replace the hand-worked numbers in `tests/`.
- After the owner decides the OC items of chapter 11, update the copy marked PROPOSED.
- When the app itself moves to the new navigation, re-render `docs/dossier/screens` and compare again.
