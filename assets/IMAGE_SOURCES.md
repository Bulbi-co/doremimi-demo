# Image and font sources

Every file here is a copy, not a link, so the demo works offline and does not change when the app's art changes
(dossier ch. 10, part 10). App paths are relative to `/Users/janberkbulbi/Desktop/Codebase/doremimi-superapp`, at
commit `c33d9ff` (APK 0.1.73 / TestFlight 73). To refresh, copy the same paths again on purpose.

The characters, banners, sprites and YouTube thumbnails come from doremimi.org, the foundation's own site, through the
app (`docs/PLAN.md` §3). They are used here for the foundation's own demo; the site is published unlisted and
`noindex` (ch. 10 G-08).

| Demo path | Source | Size | Used by |
|---|---|---|---|
| `fonts/Baloo2-Bold.ttf`, `Baloo2-ExtraBold.ttf` | `Doremimi/Assets/Fonts/` | 2 files | headings, numbers, buttons |
| `fonts/Nunito-Medium.ttf`, `-Bold`, `-ExtraBold`, `-Black` | `Doremimi/Assets/Fonts/` | 4 files | reading text |
| `fonts/NotoMusic-Regular.ttf` | `Doremimi/Assets/Fonts/` | 1 file | ♭ ♯ 𝄢 𝄞 𝄚 𝄂 |
| `fonts/OFL-*.txt` | `Doremimi/Assets/Fonts/` | 3 files | the SIL OFL requires shipping the licences |
| `brand/logo.png` | `Doremimi/Assets/Content/brand/logo.png` (byte-identical; `tests/nav.test.mjs` checks it when the app repo is beside this one) | 128 KB | the dock's centre slot (ch. 11 NR-04), Doremimi nedir?, deck brand pill, favicon |
| `brand/bulbi-logo.png` | `/Users/janberkbulbi/Desktop/Codebase/Bulbi/eylul-fuarcilik/assets/bulbi-logo.png` | 16 KB | deck brand pill (whether it stays is O-07) |
| `site/characters/mimi.png`, `dore.png`, `group.png` | `Doremimi/Assets/Content/site/characters/` | 448 KB | Keşfet stage, avatar |
| `site/banners/game.png`, `characters.png`, `riddles.png`, `foundation.png`, `books.png` | `Doremimi/Assets/Content/site/banners/` | 768 KB | Keşfet carousel |
| `site/sprites/dore-drum/00-24.webp` | `Doremimi/Assets/Content/site/sprites/dore-drum/` | 25 frames | Dore drumming on Keşfet, 12 fps |
| `site/sprites/mimi-wave/00-47.webp` | `Doremimi/Assets/Content/site/sprites/mimi-wave/` | 48 frames | Mimi speaking on the information card, 8 fps |
| `site/youtube/<id>.jpg` (74) | `Doremimi/Assets/Content/site/youtube/` | 1.4 MB | every card of İzle, Keşfet's video strip, the instrument page, the player sheet |
| `site/instruments/<slug>.jpg` (41) | `Doremimi/Assets/Content/site/instruments/` (48 files; the 7 no code reaches are skipped, ch. 10 AS-13) | 0.7 MB | Çalgılar, the instrument page, Çal's song tiles, the song page |
| `cards/portrait-*.png` (5) | `Doremimi/Assets/Content/cards/` | 276 KB | `MÜZİK BİLGİN` rows, family badges |
| `screens/12g-game-yaz-tablet-1366x1024.png` | `docs/dossier/screens/` | 216 KB | the landscape tablet frame of the platforms slide only (no dock in it) |
| `screens/phone-kesfet-new-nav.png`, `tablet-kesfet-new-nav.png` | this demo: `tools/shoot.mjs` (`phone-01-kesfet`, `tablet-01-kesfet`) | 528 KB | the phone and portrait-tablet frames of the platforms slide; captured from the demo, not the app, because the app at `c33d9ff` still has the old four-tab dock |

Also copied, outside `assets/`: the 42 song files (`Doremimi/Assets/Content/music/*.json` → `app/data/songs/`, AS-17)
and the three site lists (`Doremimi/Assets/Content/site/{videos,lyrics,library}.json` → `app/data/site/`, AS-18),
unchanged.

Not copied: the family hero art (`art/hero-*.png`, AS-16), which only the screens still to build would use.

## The deck's opening section, "Dore Mimi, bugüne kadar" (`deck/foundation.js`)

Third-party pictures, not the foundation's own and not the app's. Each is shown small with its credit beside it; the
source ids are those of the research register (`doremimi-superapp/content/doremimi-research/sources.json`, also in
`deck/foundation-facts.js`). Replace both with the foundation's own files when it sends them.

| Demo path | Source | Size | Used by |
|---|---|---|---|
| `foundation/kitap-seti.jpg` | A3: idefix's product photo of the ten-book set, unchanged (sha256 `cafe1fec…e886fb`). https://image03.idefix.com/resize/600/0/product/295742/dore-mimi-muzikle-degerler-egitimi-set-1-10-kitap-takim-64377e98bc126.jpg | 600 × 423, 61 KB | slide "Kitap serisi" |
| `foundation/cso-afis-2022.jpg` | A2: the poster of "Dore Mimi CSO'da", 21 February 2022, from the Biletinial ticket page (CSO / Biletinial); the 600 × 800 PNG scaled with `sips` to a JPEG. https://b6s54eznn8xq.merlincdn.net/Uploads/Films/dore-mimi-csoda-2022214131256.png | 480 × 640, 109 KB | slide "CSO" |
