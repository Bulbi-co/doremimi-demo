#!/usr/bin/env bash
# Mutation check for tests/rules.test.mjs (CLAUDE.md: a guard is real only if it fails when the behaviour breaks).
# Each mutant edits a copy of app/lib in a temp folder and runs the suite there. Every mutant must be "caught";
# the CONTROL (a comment-only edit) must "SURVIVE", or the suite fails for reasons unrelated to the code.
#   bash tools/mutants.sh
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
# deck/, sunum.js and index.html are copied too: tests/flow.test.mjs reads them, and without them every run failed, the
# CONTROLs included, so no mutant could survive and the table proved nothing.
# tools/ as well: the deck's guards import tools/phone-routes.mjs and tools/foundation-facts.mjs.
# ONLY=<regex> runs the mutants whose name matches, for one area's table without the whole file's.
mutatef() { # name path-from-root perl-substitution
  if [ -n "${ONLY:-}" ] && ! [[ "$1" =~ $ONLY ]]; then return; fi
  local tmp; tmp="$(mktemp -d)"
  cp -R "$root/app" "$root/tests" "$root/deck" "$root/tools" "$root/sunum.js" "$root/index.html" "$root/package.json" "$tmp/"; ln -s "$root/assets" "$tmp/assets"
  perl -0pi -e "$3" "$tmp/$2"
  if cmp -s "$root/$2" "$tmp/$2"; then echo "NOT APPLIED  $1"; rm -rf "$tmp"; return; fi
  if (cd "$tmp" && node --test tests/ >/dev/null 2>&1); then echo "SURVIVED     $1"; else echo "caught       $1"; fi
  rm -rf "$tmp"
}
mutate() { mutatef "$1" "app/lib/$2" "$3"; } # name file-in-app/lib perl-substitution
# One mutant over several files: name, then path perl-substitution pairs. For a drift that is consistent inside the
# demo (so the demo's own guards agree with it) and only the app's files can expose.
mutatem() {
  local name="$1"; shift
  if [ -n "${ONLY:-}" ] && ! [[ "$name" =~ $ONLY ]]; then return; fi
  local tmp; tmp="$(mktemp -d)"
  cp -R "$root/app" "$root/tests" "$root/deck" "$root/tools" "$root/sunum.js" "$root/index.html" "$root/package.json" "$tmp/"; ln -s "$root/assets" "$tmp/assets"
  local changed=0
  while [ $# -ge 2 ]; do perl -0pi -e "$2" "$tmp/$1"; cmp -s "$root/$1" "$tmp/$1" || changed=1; shift 2; done
  if [ $changed = 0 ]; then echo "NOT APPLIED  $name"; rm -rf "$tmp"; return; fi
  if (cd "$tmp" && node --test tests/ >/dev/null 2>&1); then echo "SURVIVED     $name"; else echo "caught       $name"; fi
  rm -rf "$tmp"
}
# tests/app-parity.test.mjs finds the app relative to its own file, which a temp copy is not; point it at the app here,
# or every parity mutant would "survive" on a skipped test.
export DOREMIMI_APP="${DOREMIMI_APP:-$(cd "$root/../../doremimi-superapp" 2>/dev/null && pwd)/}"
mutate "CONTROL: comment only"                 answers.js 's/Walks UTF-16 code units/Walks the UTF-16 code units/'
mutate "drop the ı → i fold"                   answers.js "s/'ı': 'i', //"
mutate "short answers forgive a typo"          answers.js 's/n.length <= 4 \? 0/n.length <= 3 ? 0/'
mutate "digits forgive a typo"                 answers.js 's/if \(DIGIT.test\(n\)\) return 0;//'
mutate "prefill rounds instead of ceil"        tiles.js   's/Math.ceil\(letters \* fraction\)/Math.round(letters * fraction)/'
mutate "consonants before vowels"              tiles.js   "s/\['a', 'e', 'i', 'o', 'u'\].includes/!['a', 'e', 'i', 'o', 'u'].includes/"
mutate "hash offset dropped"                   tiles.js   's/const offset = \(seed % 1000\) \/ 1000 \* step;/const offset = 0;/'
mutate "backspace removes green letters"       tiles.js   's/this.tiles\[i\].typed != null\) \{ this.tiles\[i\].typed = null;/this.tiles[i].kind === "Letter") { this.tiles[i].typed = null; this.tiles[i].prefilled = false;/'
mutate "down after three struggles"            ladder.js  's/>= this.config.downAfterStruggles/>= this.config.downAfterStruggles - 1/'
mutate "comeback one card later"               round.js   's/this.index \+ 1 \+ this.config.comebackAfterCards/this.index + 2 + this.config.comebackAfterCards/'
mutate "Bildim counts as a struggle"           round.js   's/Resolution.TypedWithTiles, Resolution.Knew\]\.includes\(r\)\) return Signal.Right/Resolution.TypedWithTiles].includes(r)) return Signal.Right/'
mutate "two stars need more than half"         progress.js 's/accuracy >= cfg.twoAt/accuracy > cfg.twoAt + 0.1/'
mutate "tiles recognise nothing"               round.js   's/\[Resolution.TypedWithTiles, Resolution.PickedAfterTyping, Resolution.PickedFirstTry\].includes\(r\)\) return Evidence.Recognised/[Resolution.PickedAfterTyping, Resolution.PickedFirstTry].includes(r)) return Evidence.Recognised/'
# music.js (tests/music.test.mjs)
mutate "CONTROL: music comment only"           music.js   's/Every song is the one piano voice/Every song is one piano voice/'
mutate "ties are not merged"                   music.js   's/if \(tied && tied.midi === midi\)/if (false)/'
mutate "second verse sings the first"          music.js   's/lyrics\[Math.min\(pass - 1, lyrics.length - 1\)\]/lyrics[0]/'
mutate "repeats are played once"               music.js   's/if \(m.repeat_end && pass === 1\)/if (false)/'
mutate "three bars per karaoke line"           music.js   's/export const MEASURES_PER_LINE = 2;/export const MEASURES_PER_LINE = 3;/'
mutate "fold by a fifth, not an octave"        music.js   's/while \(midi < FIRST_MIDI\) midi \+= 12;/while (midi < FIRST_MIDI) midi += 7;/'
mutate "lookup skips the name step"            music.js   's/s.slug === k \|\| slug\(s.instrument\) === k/s.slug === k/'
mutate "a button may repeat its key"           music.js   's/keys.filter\(k => k > this.key\)/keys.filter(k => k >= this.key)/'
mutate "theme keeps its sharps"                music.js   's/\[1, 3, 6, 8, 10\].includes\(\(\(m % 12\) \+ 12\) % 12\) \? m - 1 : m/m/'
# nav.js (tests/nav.test.mjs)
mutate "CONTROL: nav comment only"             nav.js     's/draws what `resolve` decides/draws what resolve decides/'
mutatef "Oyunlar back in the dock"              app/i18n/ui.js     "s/'tab.izle': 'İzle'/'tab.izle': 'Oyunlar'/"
mutate "logo moved to the end"                 nav.js     "s/(\{ key: 'doremimi'[^\n]*\n)(.*\n)(.*\n)/\$2\$3\$1/"
mutate "Daha fazla link lands nowhere"         nav.js     "s/daha: '#\/doremimi', //"
mutate "songs open on the current tab"         nav.js     "s/sarki: 'cal', //"
mutate "a tap jumps to the page's home tab"    nav.js     's/!fromApp && !stacked && PAGE_HOME/!stacked \&\& PAGE_HOME/'
# daily.js and accent.js (tests/kesfet.test.mjs)
mutate "CONTROL: daily comment only"           daily.js   's/Day zero, a Monday/Day zero (a Monday)/'
mutate "the kind turns weekly, not daily"      daily.js   's/const turn = Math.floor\(day \/ kinds\);/const turn = Math.floor(day \/ 7);/'
mutate "the kind is the turn, not the day"     daily.js   's/let kind = mod\(day, kinds\);/let kind = mod(Math.floor(day \/ 7), kinds);/'
mutate "an empty pool shows nothing"           daily.js   's/if \(poolSizes\[kind\] > 0\) return/return/'
mutate "the hour moves the day"                daily.js   's/Date.UTC\(date.getFullYear\(\), date.getMonth\(\), date.getDate\(\)\)/date.getTime() + 0/'
# (Trying white before ink is not a mutant: no colour reads 4.5:1 under both, so the order cannot be observed.)
mutate "the old rule: white labels only"       accent.js  's/\[face, label\] = \[c, INK\];/[face, label] = [darken(c), WHITE];/'
mutate "every accent is deepened"              accent.js  's/if \(contrast\(INK, c\) >= MIN\) \[face, label\] = \[c, INK\];/if (false) [face, label] = [c, INK];/'
# dossier ch. 14 (tests/ch14.test.mjs, and ch13/rules where they pin the same thing)
mutatef "CONTROL: modes comment only"            app/lib/modes.js   's/runs the code app.js runs/runs the very code app.js runs/'
mutatef "CONTROL: app.js comment only"           app/app.js         's/A round. `origin` is the way in/A round: `origin` is the way in/' 
mutatef "CONTROL: content comment only"          app/data/content.js 's/a content default the content team may change/a content default that the content team may change/'
mutatef "Keşfet starts at Seç"                   app/lib/modes.js   's/\[RoundOrigin.Kesfet\]: \{ start: Level.Yaz/[RoundOrigin.Kesfet]: { start: Level.Sec/'
mutatef "Öğren gets its own round back"          app/lib/modes.js   "s/Object.freeze\(\{ Kesfet: 'kesfet', Cal: 'cal' \}\)/Object.freeze({ Kesfet: 'kesfet', Ogren: 'ogren', Cal: 'cal' })/"
mutatef "Çal starts at Yaz"                      app/lib/modes.js   's/\[RoundOrigin.Cal\]: \{ start: Level.Sec/[RoundOrigin.Cal]: { start: Level.Yaz/'
mutatef "a fixed ladder moves anyway"            app/lib/ladder.js  's/if \(this.fixed\) \{/if (false) {/'
mutatef "down after two struggles again"         app/data/content.js 's/downAfterStruggles: 4/downAfterStruggles: 2/'
mutatef "the ceiling ignores the level"          app/lib/modes.js   's/if \(L < 0\) return cards.slice\(\);/return cards.slice();/'
mutatef "the levels below before the own"        app/lib/modes.js   's/d === L \? 0 :/d === L ? 5 :/'
mutatef "the level above before the ones below"  app/lib/modes.js   's/10 \+ \(d - L\)/0.5 + (d - L)/'
mutatef "the top-up ignores the ceiling"         app/lib/modes.js   's/cards.push\(\.\.\.byCeiling\(all\(null\)\.filter\(c => kinds.has\(c.kind\) && !cards.includes\(c\)\), level\)/cards.push(...all(null).filter(c => kinds.has(c.kind) \&\& !cards.includes(c))/'
mutatef "Keşfet shows only the signs"            app/lib/modes.js   "s/!id.startsWith\('instrument:'\) && concepts\[id\]/id.startsWith('signcat:') \&\& concepts[id]/"
mutatef "a sign card has no difficulty"          app/data/content.js "s/\{ difficulty: 'orta', id: 'bemol'/{ id: 'bemol'/"
mutatef "Natürel is Başlangıç"                   app/data/content.js "s/\{ difficulty: 'ileri', id: 'naturel'/{ difficulty: 'baslangic', id: 'naturel'/"
mutatef "the badge says Yazma Zirvesi again"     app/data/content.js "s/name: 'Zirve'/name: 'Yazma Zirvesi'/"
mutatef "the intro names a level"                app/data/content.js "s/title: 'Cevabı bul'/title: 'Yaz ya da seç'/"
mutatef "Nefesli back on Natürel's blue"         app/data/content.js "s/NefesliUflemeliCalgilar: \{ name: 'Nefesli Çalgılar', color: '#1E7A4C'/NefesliUflemeliCalgilar: { name: 'Nefesli Çalgılar', color: '#1E9BFF'/"
mutatef "Vurmalı group back on Fa's orange"      app/data/site.js   "s/'Vurmalı': '#C6E01E'/'Vurmalı': '#FF9A1F'/"
mutatef "Telli badge keeps the old red"          app/data/content.js "s/color: '#C2379B', rule: \{ kind: 'LearnQuestions', count: 3 \}, conceptId: 'family:TelliCalgilar'/color: '#FF5A4E', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:TelliCalgilar'/"
mutatef "the newsletter opens İletişim again"    app/data/hub.js    "s/\['IconMail', 'bulten', \{ push: '#\/bulten' \}\]/['IconMail', 'bulten', { push: '#\/iletisim' }]/"
mutatef "a hub row leads to no page"             app/data/hub.js    "s/push: '#\/destekciler'/push: '#\/sponsorlar'/"
mutatef "Öğren gets Bilmeceler back"            app/lib/nav.js     "s/\{ key: 'aileler' \}, \{ key: 'degerler' \}/{ key: 'aileler' }, { key: 'bilmeceler' }, { key: 'degerler' }/"
mutatef "the round starts from the saved ladder" app/app.js         's/ladderFor\(G.origin, LEARNING.ladder\), LEARNING, G.random/ladderFor(G.origin, LEARNING.ladder, profile.ladder), LEARNING, G.random/'
mutatef "the song page can play again"           app/app.js         's/\$\{\/\* No way into the game from a song[^\n]*\n/<button class="chunky yellow" data-play="karisik" data-origin="cal"><\/button>\n/'
mutatef "the instrument page can play again"     app/app.js         's/(\n    \$\{d\.riddle \? `<button class="chunky purple")/\n    <button class="chunky yellow" data-play="instrument:x" data-origin="cal"><\/button>$1/' 
mutatef "the level toast is back"                app/app.js         "s/  if \(o.move !== Move.None\) gameBg/  if (o.move !== Move.None) G.line = 'Harika! Yazma seviyesine çıktın';\n  if (o.move !== Move.None) gameBg/"
mutatef "the results tile shows the level"       app/app.js         's/<small>\$\{esc\(t\(.results\.stars.\)\)\}<\/small><b>\$\{R\.stars\}\/3<\/b>/<small>Seviye<\/small><b>Yaz<\/b>/' 
mutatef "the first game does not ask the level"  app/app.js         "s/\.\.\.\(profile.difficulty \? \[\] : \['level'\]\)/...([])/"
mutatef "the chosen level is not saved"          app/app.js         's/profile.difficulty = key; save\(\);/save();/'
mutatef "Zorluk does not change the level"       app/app.js         's/profile.difficulty = d.zorluk; save\(\);/save();/' 
mutatef "the round ignores the child's level"    app/app.js         's/level: profile.difficulty, mastery/level: null, mastery/'
mutatef "Tekrar oyna forgets the way in"         app/app.js         's/openGame\(\{ concept: c, origin: G.origin, intro: false \}\)/openGame({ concept: c, intro: false })/'
mutatef "the Tekrar row is back"                 app/app.js         's/    \$\{oynaHtml\(\)\}/    \${oynaHtml()}<button class="trow" data-do="review">Tekrar zamanı<\/button>/'
mutatef "OYNA is a bar again"                    app/style.css      's/width: min\(56%, 220px\); aspect-ratio: 1;/width: 100%;/'
# the deck's story and the phone's script, dossier ch. 14 §9 (tests/deck.test.mjs). The deck does not play the script
# since the nine-slide cut (2026-11-16): it stays in the phone for tools/shoot.mjs and tools/ch14-e2e.mjs, and a slide
# that asks for one of its steps again makes the phone replay a round, fast, in front of the audience. (A script that
# loses a step is no mutant any more: no slide names a step, so no guard of the deck can see it.)
mutatef "CONTROL: slides comment only"           deck/slides.js     's/Its own module, apart from sunum.js/Its own module, separate from sunum.js/'
mutatef "CONTROL: script comment only"           app/data/script.js 's/It is data in its own module/It is plain data in its own module/'
mutatef "Öğren opens on a step of the script"    deck/slides.js     "s/id: 'ogren', label: 'Öğren', theme: 'light', phone: go\('#\/ogren\/aileler'\)/id: 'ogren', label: 'Öğren', theme: 'light', phone: act('goto', { step: 9 })/"
mutatef "Keman is a step of the script again"    deck/slides.js     "s/\['Keman', batch\(go\('#\/ogren\/calgilar\?aile=yayli'\), tap\('\[data-push=\"#\/calgi\/keman\"\]'\)\)\]/['Keman', act('goto', { step: 11, play: true })]/"
mutatef "a scripted step behind its own go"      deck/slides.js     "s/\['Piyanoda çal', batch\(go\('#\/cal'\), act\('keys\.play', [^\n]*\n/['Piyanoda çal', batch(go('#\/cal'), act('goto', { step: 12, play: true }))]],\n/"
mutatef "Çal told before Öğren"                  deck/slides.js     "s/id: 'ogren'/id: 'TMP'/; s/id: 'cal'/id: 'ogren'/; s/id: 'TMP'/id: 'cal'/"
mutatef "the ladder bullet is back"              deck/slides.js     "s/'Bilemezse harf kutuları, sonra dört seçenek gelir'/\"Zorlandıkça Yaz → Seç → Çevir'e iner, bildikçe çıkar\"/"
mutatef "the script picks a level"               app/data/script.js "s/origin: 'kesfet', intro: true/origin: 'kesfet', level: 'yaz', intro: true/"
# the demo against the app's own files (tests/app-parity.test.mjs)
mutatef "CONTROL: family comment only"           app/data/content.js 's/Which family wears which is the app.s/Which family wears which colour is the app\x27s/'
mutatem "the families swap colours, consistently" \
  app/data/content.js "s/(TelliCalgilar: \{ name: 'Telli Çalgılar', color: )'#C2379B'/\$1'#1E7A4C'/; s/(NefesliUflemeliCalgilar: \{ name: 'Nefesli Çalgılar', color: )'#1E7A4C'/\$1'#C2379B'/; s/(family:TelliCalgilar', color: )'#C2379B'/\$1'#1E7A4C'/; s/(family:NefesliUflemeliCalgilar', color: )'#1E7A4C'/\$1'#C2379B'/" \
  app/data/site.js    "s/'Telli': '#C2379B'/'Telli': '#1E7A4C'/; s/'Nefesli': '#1E7A4C'/'Nefesli': '#C2379B'/"
mutatef "Bakır nefesli drifts"                   app/data/site.js    "s/'Bakır nefesli': '#F6B53A'/'Bakır nefesli': '#F6B53B'/"
mutatef "a badge colour drifts"                  app/data/content.js "s/color: '#2B9BFF', rule: \{ kind: 'TypedFirstTryInRound'/color: '#2B9BFE', rule: { kind: 'TypedFirstTryInRound'/"
mutatef "a badge line drifts"                    app/data/content.js "s/Üç farklı günde müzik oynadın\./Üç ayrı günde müzik oynadın./"
# dossier ch. 14 §10, revision 2 (tests/ch14.test.mjs, nav.test.mjs)
mutatef "the tab is Keşfet again"                app/i18n/ui.js     "s/'tab.kesfet': 'Oyna'/'tab.kesfet': 'Keşfet'/"
mutatef "the circle says OYNA again"             app/i18n/ui.js     "s/'oyna.button': 'Şimdi Oyna'/'oyna.button': 'OYNA'/"
mutatef "the banners back on Oyna"               app/app.js         's/<div class="stack home">\n    \$\{oynaHtml\(\)\}/<div class="stack home">\n    \${carouselHtml()}\n    \${oynaHtml()}/'
mutatef "the foundation card back on the hub"    app/app.js         's/    \$\{carouselHtml\(\)\}\n    \$\{HUB\.map/    <div class="card hub-hero"><\/div>\n    \${HUB.map/'
mutatef "the carousel turns on Oyna"             app/app.js         "s/if \(route\.tab === 'doremimi' && !route\.page\) startCarousel/if (route.tab === 'kesfet' \&\& !route.page) startCarousel/"
mutatef "İzle drops the riddles"                 app/app.js         "s/const WATCH_KINDS = \['riddle', /const WATCH_KINDS = [/"
mutatef "a family card opens a round"            app/app.js         's/data-fam="\$\{key\}" data-go=/data-fam="\${key}" data-play="family:\${key}" data-origin="kesfet" data-go=/'
mutatef "Öğren's tabs in another order"          app/lib/nav.js     "s/\{ key: 'isaretler' \}, \{ key: 'calgilar' \}/{ key: 'calgilar' }, { key: 'isaretler' }/"
mutatef "two tabs called Play in English"        app/i18n/ui.js     "s/'tab.cal': 'Music'/'tab.cal': 'Play'/"
# dossier ch. 14 §11, three languages (tests/i18n.test.mjs)
mutatef "CONTROL: ui comment only"               app/i18n/ui.js     's/Every word the phone shows outside/Each word the phone shows outside/'
mutatef "CONTROL: i18n comment only"             app/i18n/index.js  's/Türkçe is the source,/Türkçe is the source language,/'
mutatef "a key missing in French"                app/i18n/ui.js     "s/'kb.digits.aria': 'Chiffres', 'kb.space': 'espace', /'kb.digits.aria': 'Chiffres', /"
mutatef "a placeholder lost in English"          app/i18n/ui.js     "s/'game.card': 'Card \{i\} of \{n\}'/'game.card': 'Card {i}'/"
mutatef "a Turkish word left in app.js"          app/app.js         's/\$\{esc\(t\(.results\.exit.\)\)\}/Çık/'
mutatef "an English word left in an attribute"   app/app.js         's/aria-label="\$\{esc\(t\(.song\.stop.\)\)\}"/aria-label="Stop"/'
mutatef "a French letter not on the keyboard"    app/i18n/keyboards.js "s/'QSDFGHJKLM'/'QSDFGHJKL'/"
mutatef "an English answer it does not accept"   app/i18n/content-en.js "s/accepted: \['Flat', 'flat sign'\]/accepted: ['flat sign']/"
mutatef "a French question left out"             app/i18n/content-fr.js "s/    tempo: \{ q:[^\n]*\n//"
mutatef "the deck's phone follows the laptop"    app/i18n/index.js  "s/  if \(embed\) return 'tr';\n//"
mutatef "the device language is ignored"         app/i18n/index.js  "s/  for \(const l of languages\)[^\n]*\n//"
mutatef "Dil does not rebuild the deck"          app/app.js         's/  deck = new QuestionDeck\(L\.QUESTIONS\);\n//'
mutatef "a fresh child keeps the old language"   app/app.js         's/mastery = new Mastery\(LEARNING, profile\.mastery, DAY_SHIFT\); setLang\(langNow\(\)\); \}/mastery = new Mastery(LEARNING, profile.mastery, DAY_SHIFT); }/'
mutatef "the foundation page says nothing"       app/app.js         's/return `<div class="stack">\$\{trOnly\(\)\}\n    <div class="card"><span class="eyebrow">/return `<div class="stack">\n    <div class="card"><span class="eyebrow">/'
# dossier ch. 14 §11, the type system (tests/type.test.mjs)
mutatef "CONTROL: style comment only"            app/style.css      's/One role per kind of text, each/A role per kind of text, each/'
mutatef "meta back to Regular"                   app/style.css      's/--t-meta: 500 13px/--t-meta: 400 13px/'
mutatef "titles tracked open"                    app/style.css      's/--ls-title: -0.021em/--ls-title: 0.01em/'
mutatef "eyebrows not in capitals"               app/style.css      's/text-transform: uppercase; font-feature-settings: "case";/font-feature-settings: "case";/'
mutatef "counts in proportional figures"         app/style.css      's/\.num \{ font-variant-numeric: tabular-nums; \}/.num { }/'
mutatef "text on colour at Medium"               app/style.css      's/(\.ftxt small, \.ftxt em\) \{ font: )600 13px/${1}500 13px/'
mutatef "a weight Inter does not ship"           app/style.css      's/--t-card: 600 17px/--t-card: 650 17px/'
mutatef "the section as big as the title"        app/style.css      's/--t-section: 700 20px\/26px/--t-section: 700 28px\/34px/'
mutatef "a count loses its figures"              app/app.js         's/<small class="num">\$\{esc\(t\(.game\.card./<small>\${esc(t(\x27game.card\x27/'
# dossier ch. 14 §14, no XP, no gold and no XP level on the phone (tests/xp.test.mjs)
mutatef "CONTROL: a comment that names XP"       app/app.js         's/is kept for the backend and never drawn \(ch\. 14 §14\)/is kept for the backend (it was the XP) and never drawn (ch. 14 §14)/'
mutatef "CONTROL: a comment in the stylesheet"   app/style.css      's/took the "\+N XP" headline, so the praise/took the "+N XP" headline and the XP pill, so the praise/'
mutatef "+N XP back on the outcome chip"         app/app.js         "s/G\.outcome = \{ praise: t\(\{ TypedFirstTry/G.outcome = { praise: '+' + o.xp + ' ' + t({ TypedFirstTry/"
mutatef "the chip gets a second line"            app/app.js         's/<span class="toastb">\$\{esc\(G\.outcome\.praise\)\}<\/span><\/div>/<span class="toastb">\${esc(G.outcome.praise)}<\/span><small>\${esc(G.round.count)}<\/small><\/div>/'
mutatef "the level chip back in the top bar"     app/app.js         's/(    <button class="tile" data-go="#\/profil" data-do="avatar")/    <button class="tile" data-go="#\/profil"><b class="num">\${profile.level}<\/b><\/button>\n$1/'
mutatef "a chip in the game header"              app/app.js         's/(n: r\.count \}\)\)\}<\/small>` : .{2}\}<\/div>)`;/$1\n    <span class="avatar num">\${profile.level}<\/span>`;/'
mutatef "results get their XP tile back"         app/app.js         's/<div class="stats2 num"><div class="rrow">/<div class="stats2 num"><div class="rrow"><small>\${esc(t("results.stars"))}<\/small><b>+\${G.round.xpEarned}<\/b><\/div><div class="rrow">/'
mutatef "the level-up popup returns"             app/app.js         's/(  G\.roundBadges\.push\(\.\.\.earned\);\n)/$1  if (lv.levelsGained > 0) G.levelUp = { level: profile.level };\n/'
mutatef "Profilim shows the level"               app/app.js         's/<div class="card prof-counts"><span>/<div class="card prof-counts"><span><b class="num">\${profile.level}<\/b><\/span><span>/'
mutatef "Profilim gets the note card back"       app/app.js         's/(    \$\{group\(t\(.profile\.family.\), \[)/    <div class="card note"><p class="p strong c">\${esc(t("profile.stats"))}<\/p><\/div>\n$1/'
mutatef "the parent panel shows the number"      app/app.js         's/(<b class="h3">\$\{esc\(kidName\(kid\)\)\}<\/b>)<span class="p num">/$1<small class="num">\${profile.xp}<\/small><span class="p num">/'
mutatef "a first instrument pays on screen"      app/app.js         "s/toast\(t\('instrument\.discovered', \{ name: d\.label \}\)\);/toast('+' + LEARNING.xp.seenInstrument, t('instrument.discovered', { name: d.label }));/"
mutatef "a card no longer records progress"      app/app.js         's/  profile\.level = lv\.level; profile\.xp = lv\.xp;\n  mastery\.record/  mastery.record/'
mutatef "a first instrument records nothing"     app/app.js         's/      const lv = addXp\(LEARNING, profile\.level, profile\.xp, LEARNING\.xp\.seenInstrument\);\n      profile\.level = lv\.level; profile\.xp = lv\.xp; save\(\);/      save();/'
mutatef "XP in a Turkish string"                 app/i18n/ui.js     "s/'results\.right': 'Doğru'/'results.right': 'Doğru XP'/"
mutatef "Seviye N in an English string"          app/i18n/ui.js     "s/'game\.card': 'Card \{i\} of \{n\}'/'game.card': 'Level {n} · card {i}'/"
mutatef "gold in a French string"                app/i18n/ui.js     "s/'results\.stars': 'Étoiles'/'results.stars': 'Pièces d’or'/"
mutatef "a riddle's row pays XP again"            app/data/site/videos.json 's/"title": "Arp · Bilmece"/"title": "Arp · Bilmece · +3 XP"/'
mutatef "the parent row names the level again"   app/i18n/ui.js     "s/'profile\.panel\.line': 'Çocukların pratiği ve rozetleri'/'profile.panel.line': 'Çocukların seviyesi ve pratiği'/"
mutatef "the parent row in other words"          app/i18n/ui.js     "s/'profile\.panel\.line': 'Çocukların pratiği ve rozetleri'/'profile.panel.line': 'Çocukların ilerlemesi ve pratiği'/"
mutatef "En iyi tur back in İstatistikler"       app/app.js         "s/(\['stats\.rounds', profile\.rounds \?\? 0\], )/\$1\['stats.rounds', profile.best ?? 0\], /"
mutatef "the best round is no longer saved"      app/app.js         's/ profile\.best = Math\.max\(profile\.best \?\? 0, G\.results\.right\);//'
mutatef "the best-round key is back in English"  app/i18n/ui.js     "s/( 'stats\.answered': 'Questions answered',)/ 'stats.best': 'Best round',\$1/"
mutatef "the XP key is back in French"           app/i18n/ui.js     "s/(  'results\.info': 'Tu as trouvé)/  'results.xp': 'Points',\n\$1/"
mutatef "the intro promises XP in French"        app/i18n/content-fr.js "s/Les bonnes réponses rapportent des étoiles\./Les bonnes réponses rapportent des XP et des étoiles./"
mutatef "the intro promises points in Turkish"   app/data/content.js "s/Doğru cevaplar yıldız getirir\./Doğru cevaplar puan ve yıldız getirir./"
mutatef "the level chip's style is back"         app/style.css      's/(\.praise-chip \{ position)/.levelbtn .lv { min-width: 52px; }\n$1/'
# the outcome chip's box and rise are the app's (tests/app-parity.test.mjs reads MusicCardGameView.axaml and Controls.axaml)
mutatef "CONTROL: the chip a pixel wider"        app/style.css      's/(\.praise-chip \.toastb \{ padding: 8px) 20px/$1 21px/'
mutatef "the chip placed by its own top again"   app/style.css      's/(\.praise-chip \{ position: absolute; left: 50%; top: -50px;) height: 170px;/$1/'
mutatef "the chip's box starts at the card"      app/style.css      's/(\.praise-chip \{ position: absolute; left: 50%; top:) -50px;/$1 0px;/'
mutatef "the chip at the top of its box"         app/style.css      's/(\.praise-chip \{[^}]*)justify-content: flex-end;/$1justify-content: flex-start;/'
mutatef "the chip rises 80"                      app/style.css      's/76% \{ opacity: 1; transform: translate\(-50%, -50px\); \}/76% { opacity: 1; transform: translate(-50%, -80px); }/'
# the deck: auto-play (tests/flow.test.mjs, dossier ch. 14 §11)
# No slide has a `leave` message since Ayarlar's went with the nine-slide cut (2026-11-16); the machine still sends
# one, and its mutants below are caught by tests/flow.test.mjs's made-up deck.
mutatef "deck CONTROL: flow comment only"        deck/flow.js       's/It is not a\n \* second way to move/It is not\n * a second way to move/'
mutatef "deck: a tick skips the slide's steps"   deck/flow.js       "s/return move\(\{ \.\.\.s, armed: false \}, \{ type: 'next' \}\);/return s.cur < s.slides.length - 1 ? enter({ ...s, armed: false }, s.cur + 1) : { state: s, effects: [] };/"
mutatef "deck: a stale tick is taken"            deck/flow.js       's/ \|\| e\.token !== s\.autoToken \|\| s\.phase/ || s.phase/'
mutatef "deck: → does not stop auto-play"        deck/flow.js       's/const taken = s\.auto && MANUAL\.includes\(e\.type\);/const taken = false;/'
mutatef "deck: a press the lock ignores does not stop it" deck/flow.js "s/const taken = s\.auto && MANUAL/const taken = s.auto \&\& s.phase === 'idle' \&\& MANUAL/"
mutatef "deck: a dot does not stop auto-play"    deck/flow.js       "s/\['next', 'prev', 'goto', 'act', 'reset'\]/['next', 'prev', 'act', 'reset']/"
mutatef "deck: auto-play never ends"             deck/flow.js       's/  if \(atEnd\(state\)\) return [^\n]*\n//'
mutatef "deck: a tick is armed while busy"       deck/flow.js       "s/if \(!state\.auto \|\| state\.phase !== 'idle'\) return state\.armed/if (!state.auto) return state.armed/"
mutatef "deck: two ticks for one rest"           deck/flow.js       's/  if \(state\.armed\) return \{ state, effects \};\n//'
mutatef "deck: every slide gets the same pause"  deck/flow.js       's/Math\.max\(AUTO_SLIDE, slide\?\.read \?\? 0\)/AUTO_SLIDE/'
mutatef "deck: a step's own hold is ignored"     deck/flow.js       's/slide\?\.holds\?\.\[state\.sub - 1\] \?\? AUTO_STEP/AUTO_STEP/'
mutatef "deck: the hold lands on the step before" deck/flow.js      's/slide\?\.holds\?\.\[state\.sub - 1\]/slide?.holds?.[state.sub]/'
mutatef "deck: the deck hands the machine no holds" deck/slides.js  's/holds: \(slide\.acts \?\? \[\]\)\.map\(a => a\[2\]\?\.hold \?\? null\),/holds: [],/'
mutatef "deck: the song step has no hold"        deck/slides.js     "s/act\('song\.play'\)\), \{ hold: SONG_HOLD \}\]/act('song.play'))]/"
mutatef "deck: the song is cut before its words" deck/slides.js     's/export const SONG_HOLD = 24000;/export const SONG_HOLD = 15000;/; s/şarkıyı 24 saniye dinletir/şarkıyı 15 saniye dinletir/'
mutatef "deck: the notes give another hold"      deck/slides.js     's/şarkıyı 24 saniye dinletir/şarkıyı 10 saniye dinletir/'
mutatef "deck: sunum.js builds its own slides"   sunum.js           's/initial\(SLIDES\.map\(asFlow\), /initial(SLIDES.map(s => ({ phone: s.phone ?? null, acts: (s.acts ?? []).map(a => a[1]) })), /'
mutatef "deck: the leave message is never sent"  deck/flow.js       "s/\.\.\.\(leave \? \[\{ type: 'send', msg: leave \}\] : \[\]\), \.\.\.show/...show/"
mutatef "deck: the leave is sent after the next slide's message" deck/flow.js "s/effects: \[\.\.\.\(leave \? \[\{ type: 'send', msg: leave \}\] : \[\]\), \.\.\.show, \.\.\.r\.effects\]/effects: [...show, ...r.effects, ...(leave ? [{ type: 'send', msg: leave }] : [])]/"
mutatef "deck: the slide being entered sends its leave" deck/flow.js "s/const leave = !first && s\.cur !== i \? s\.slides\[s\.cur\]\?\.leave \?\? null : null;/const leave = s.slides[i]?.leave ?? null;/"
mutatef "deck: the lock waits for the leave"     deck/flow.js       "s/\[\{ type: 'send', msg: leave \}\]/[{ type: 'send', msg: { ...leave, id: 0 } }]/"
mutatef "deck: the deck hands the machine no leave" deck/slides.js  's/  leave: slide\.leave \?\? null,\n//'
mutatef "deck: a step is given a blink"          deck/flow.js       's/export const AUTO_STEP = 3500;/export const AUTO_STEP = 800;/'
mutatef "deck: reading time ignores the words"   deck/slides.js     's/return Math\.min\(READ_MAX, 2500 \+ words \* 300\);/return 6000;/'
mutatef "deck: the control clicks → by itself"   sunum.js           "s/\\\$\('#auto'\)\.onclick = \(\) => dispatch\(\{ type: 'auto' \}\);/\\\$('#auto').onclick = () => setInterval(() => \\\$('#next').click(), 4000);/"
mutatef "deck: A is not a shortcut"              sunum.js           "s/  if \(k === 'a' \|\| k === 'A'\) dispatch\(\{ type: 'auto' \}\);\n//"
mutatef "deck: the tick timer is never set"      sunum.js           "s/  else if \(fx\.type === 'autotimer'\)[^\n]*\n//"
mutatef "deck: a letter is typed during auto-play" sunum.js         "s/if \(flow\.auto\) dispatch\(\{ type: 'auto', on: false \}\); else phone/phone/"
mutatef "deck: no auto-play control on the page" index.html         's/          <button class="auto-btn" id="auto"[^\n]*\n//'
mutatef "deck: the lock disables the control"    sunum.js           "s/\[\\\$\('#prev'\), \\\$\('#next'\), /[\\\$('#prev'), \\\$('#next'), \\\$('#auto'), /"
# the deck: nine slides, two steps a slide at most, every step a whole state (tests/deck.test.mjs; owner, 2026-11-16)
mutatef "deck CONTROL: slides comment only"      deck/slides.js     's/The two tabs with no slide of their own;/The two tabs without a slide of their own;/'
mutatef "deck: a tenth slide"                    deck/slides.js     "s/(  \{\n    id: 'kapanis')/  { id: 'onuncu', label: 'Onuncu', theme: 'dark', layout: 'center', phone: go('#\/doremimi'), html: '<h1 class=\"title\">Bir slayt daha<\/h1>', notes: '<p>Dokuzdan sonra gelen, sahibinin istemediği onuncu slayt.<\/p>' },\n\$1/"
mutatef "deck: a third step on a slide"          deck/slides.js     "s/act\('gate\.type'\)\)\]\],/act('gate.type'))], ['Ayarlar', go('#\/ayarlar')]],/"
mutatef "deck: two buttons with one label"       deck/slides.js     "s/\[\"Ebeveyn PIN'i\", batch/['Kim oynuyor?', batch/"
mutatef "deck: a step presses before it opens its screen" deck/slides.js "s/\['Piyanoda çal', batch\(go\('#\/cal'\), (act\('keys\.play', \{ keys: \[[^\]]*\] \}\))\)\]/['Piyanoda çal', \$1]/"
mutatef "deck: a slide opens a page the phone lacks" deck/slides.js "s/id: 'aile', label: 'Aile ve içerik', theme: 'light', phone: go\('#\/profil'\)/id: 'aile', label: 'Aile ve içerik', theme: 'light', phone: go('#\/aile')/"
mutatef "deck: a step names an act the phone lacks" deck/slides.js  "s/act\('switcher\.open'\)/act('switcher.show')/"
mutatef "deck: the phone loses the tap act"      app/app.js         "s/  'tap': async m => \{/  'press': async m => {/"
# the Oyna slide: the categories, then the game opened and nothing after it
mutatef "deck: Şimdi Oyna types the first answer" deck/slides.js    "s/\['Şimdi Oyna', batch\(go\('#\/'\), act\('oyna\.press'\)\)\]/['Şimdi Oyna', batch(go('#\/'), act('oyna.press'), act('game.type', { text: 'sol', send: true }))]/"
mutatef "deck: Şimdi Oyna answers the level question" deck/slides.js "s/\['Şimdi Oyna', batch\(go\('#\/'\), act\('oyna\.press'\)\)\]/['Şimdi Oyna', batch(go('#\/'), act('oyna.press'), act('intro.finish'))]/"
mutatef "deck: Şimdi Oyna picks a choice"        deck/slides.js     "s/\['Şimdi Oyna', batch\(go\('#\/'\), act\('oyna\.press'\)\)\]/['Şimdi Oyna', batch(go('#\/'), act('oyna.press'), act('game.choose', { right: true }))]/"
mutatef "deck: Şimdi Oyna deals its own round"   deck/slides.js     "s/\['Şimdi Oyna', batch\(go\('#\/'\), act\('oyna\.press'\)\)\]/['Şimdi Oyna', batch(go('#\/'), act('game.start', { deck: 'sunum', origin: 'kesfet', intro: true }))]/"
mutatef "deck: the round is played out on Çal's step" deck/slides.js "s/\['Piyanoda çal', batch\(go\('#\/cal'\), act\('keys\.play', [^\n]*\n/['Piyanoda çal', batch(go('#\/'), act('game.finish'))]],\n/"
mutatef "deck: the next card on Aile's step"     deck/slides.js     "s/batch\(go\('#\/profil'\), act\('switcher\.open'\)\)/batch(go('#\/profil'), act('game.next'))/"
mutatef "deck: the tiles are filled on Aile's step" deck/slides.js  "s/batch\(go\('#\/profil'\), act\('switcher\.open'\)\)/batch(go('#\/profil'), act('game.fill', { send: true }))/"
mutatef "deck: Şimdi Oyna before Kategoriler"    deck/slides.js     "s/(      \['Kategoriler', [^\n]*\n)(      \['Şimdi Oyna', [^\n]*\n)/\$2\$1/"
mutatef "deck: Kategoriler only opens Oyna"      deck/slides.js     "s/\['Kategoriler', batch\(go\('#\/'\), act\('scroll', \{ to: '\.kats-sec' \}\)\)\]/['Kategoriler', go('#\/')]/"
mutatef "deck: Kategoriler scrolls to no section" deck/slides.js    "s/act\('scroll', \{ to: '\.kats-sec' \}\)/act('scroll', { to: '.kategoriler' })/"
mutatef "deck: the phone's category section is renamed" app/app.js  's/<div class="kats-sec">/<div class="kats">/'
mutatef "deck: oyna.press answers the level too" app/app.js         's/(  .oyna\.press.: async [^\n]*)await pressDo\(sel\); \},/$1await pressDo(sel); await ACTS["intro.finish"](); },/'
mutatef "deck: oyna.press presses any play button" app/app.js       "s/'oyna\.press': async \(\) => \{ const sel = '\[data-do=\"play\"\]\[data-origin=\"kesfet\"\]';/'oyna.press': async () => { const sel = '[data-do=\"play\"]';/"
mutatef "deck: Oyna's circle is not what oyna.press presses" app/app.js 's/class="chunky oyna circle" data-do="play" data-origin="kesfet"/class="chunky oyna circle" data-do="play" data-origin="oyna"/'
mutatef "deck: the phone loses oyna.press"       app/app.js         "s/  'oyna\.press': async/  'oyna.open': async/"
mutatef "deck: a play button tapped on a page"   deck/slides.js     "s/\['Piyanoda çal', batch\(go\('#\/cal'\), act\('keys\.play', [^\n]*\n/['Piyanoda çal', batch(go('#\/'), tap('[data-play=\"family:TelliCalgilar\"]'))]],\n/"
mutatef "deck: the notes keep the round for the deck" deck/slides.js "s/<b>Buradan sonra telefonda siz oynayın\.<\/b>/<b>Sıradaki adımlar turu oynatır.<\/b>/"
# Öğren's taps, and the tabs
mutatef "deck: the family is a link, not a tap"  deck/slides.js     "s/\['Yaylı Çalgılar', batch\(go\('#\/ogren\/aileler'\), tap\('\[data-fam=\"YayliCalgilar\"\]'\)\)\]/['Yaylı Çalgılar', go('#\/ogren\/calgilar?aile=yayli')]/"
mutatef "deck: a family the phone does not have" deck/slides.js     's/data-fam="YayliCalgilar"/data-fam="YayliSazlar"/'
mutatef "deck: Keman is a link, not a tap"       deck/slides.js     "s/\['Keman', batch\(go\('#\/ogren\/calgilar\?aile=yayli'\), tap\('\[data-push=\"#\/calgi\/keman\"\]'\)\)\]/['Keman', go('#\/calgi\/keman')]/"
mutatef "deck: another instrument is tapped"     deck/slides.js     's/tap\(.\[data-push="#\/calgi\/keman"\].\)/tap(\x27[data-push="#\/calgi\/viyola"]\x27)/'
mutatef "deck: Öğren opens on İşaretler"         deck/slides.js     "s/id: 'ogren', label: 'Öğren', theme: 'light', phone: go\('#\/ogren\/aileler'\)/id: 'ogren', label: 'Öğren', theme: 'light', phone: go('#\/ogren\/isaretler')/"
mutatef "deck: the family card loses its key"    app/app.js         's/<button class="fam" data-fam="\$\{key\}"/<button class="fam" data-family="\${key}"/'
mutatef "deck: the instrument tile does not push its page" app/app.js 's/<button class="itile" data-push="#\/calgi\//<button class="itile" data-go="#\/calgi\//'
mutatef "deck: the navigation slide skips İzle"  deck/slides.js     "s/, \['İzle', go\('#\/izle'\)\]\],/],/"
mutatef "deck: the logo step opens the foundation's page, not the tab" deck/slides.js "s/\['Logo: Dore Mimi Vakfı', go\('#\/doremimi'\)\]/['Logo: Dore Mimi Vakfı', go('#\/vakif')]/"
mutatef "deck: İzle before the logo"             deck/slides.js     "s/(\['Logo: Dore Mimi Vakfı', go\('#\/doremimi'\)\]), (\['İzle', go\('#\/izle'\)\])/\$2, \$1/"
mutatef "deck: Çal opens on a song"              deck/slides.js     "s/id: 'cal', label: 'Çal', theme: 'light', phone: go\('#\/cal'\)/id: 'cal', label: 'Çal', theme: 'light', phone: go('#\/sarki\/piyano')/"
mutatef "deck: the deck closes on Oyna"          deck/slides.js     "s/layout: 'center', phone: go\('#\/doremimi'\)/layout: 'center', phone: go('#\/')/"
# what the slides say
mutatef "deck: XP on a slide"                    deck/slides.js     "s/Oyna, Öğren ve Çal sıradaki üç slaytta\./Oyna, Öğren ve Çal sıradaki üç slaytta. Her tur XP kazandırır./"
mutatef "deck: Seviye 3 on a slide"              deck/slides.js     "s/Oyna, Öğren ve Çal sıradaki üç slaytta\./Oyna, Öğren ve Çal sıradaki üç slaytta. Çocuk Seviye 3 oldu./"
mutatef "deck: the closing line drops a platform" deck/slides.js    's/Mac · Windows · tarayıcı/Mac · tarayıcı/'
mutatef "deck: a slide without presenter notes"  deck/slides.js     "s/    notes: \`<p>Öğren'in dört sekmesi:[^\n]*\n/    notes: '',\n/"
mutatef "deck: a tour title grows into a sentence" deck/slides.js   "s/step\('Çal: piyano ve şarkılar'/step('Çal: piyano, şarkılar, karaoke sözleri ve Melodim, hepsi bir arada'/"
# the deck: the song slide (tests/deck.test.mjs; owner, 2026-11-16)
mutatef "deck CONTROL: the song slide's comment" deck/slides.js     's/A song of its own \(owner, 2026-11-16\)/A song with a slide of its own (owner, 2026-11-16)/'
mutatef "deck: the song step only opens the page" deck/slides.js    "s/batch\(go\('#\/sarki\/keman'\), act\('song\.play'\)\), \{ hold: SONG_HOLD \}/batch(go('#\/sarki\/keman')), { hold: SONG_HOLD }/"
mutatef "deck: a lyric sheet Keman does not have" deck/slides.js    "s/\['Gitar: şarkı sözleri', go\('#\/sozler\/gitar'\)\]/['Keman: şarkı sözleri', go('#\/sozler\/keman')]/"
mutatef "deck: the song slide opens on Çal's list" deck/slides.js   "s/id: 'sarki', label: 'Şarkı', theme: 'light', phone: go\('#\/sarki\/keman'\)/id: 'sarki', label: 'Şarkı', theme: 'light', phone: go('#\/cal')/"
mutatef "deck: the song told before Çal"         deck/slides.js     "s/id: 'sarki'/id: 'TMP'/; s/id: 'cal'/id: 'sarki'/; s/id: 'TMP'/id: 'cal'/"
mutatef "deck: the slide says 40 songs"          deck/slides.js     "s/'41 şarkının hepsi aynı klavyede/'40 şarkının hepsi aynı klavyede/"
mutatef "deck: nine lyric sheets in the notes"   deck/slides.js     "s/on çalgının sözleri ayrı bir sayfada okunur/dokuz çalgının sözleri ayrı bir sayfada okunur/"
mutatef "deck: the karaoke line is only note names again" deck/slides.js "s/karaoke satırında önce nota adları, sonra sözler ilerler\./nota adları karaoke satırında ilerler./"
mutatef "deck: Keman's song loses its words"     app/data/songs/keman.json 's/"hem"/"la"/g; s/"tel"/"la"/g; s/"li"/"la"/g; s/"yim"/"la"/g; s/"yay"/"la"/g; s/"lı"/"la"/g; s/"en"/"la"/g; s/"çok"/"la"/g; s/"ça"/"la"/g; s/"nı"/"la"/g; s/"rım"/"la"/g; s/"Ku"/"la"/g; s/"zen"/"la"/g; s/"le"/"la"/g; s/"ben"/"la"/g; s/"den"/"la"/g; s/"boy"/"la"/g; s/"lu"/"la"/g; s/"be"/"la"/g; s/"nen"/"la"/g; s/"kü"/"la"/g; s/"çü"/"la"/g; s/"ko"/"la"/g; s/"yım"/"la"/g; s/"Bir"/"la"/g; s/"kaç"/"la"/g; s/"fark"/"la"/g; s/"ren"/"la"/g; s/"gim"/"la"/g; s/"var"/"la"/g; s/"dört"/"la"/g; s/"bir"/"la"/g; s/"ya"/"la"/g; s/"pım"/"la"/g; s/"Her"/"la"/g; s/"mü"/"la"/g; s/"zik"/"la"/g; s/"te"/"la"/g; s/"va"/"la"/g; s/"dur"/"la"/g; s/"mam"/"la"/g; s/"hep"/"la"/g'
mutatef "deck: a song's round from the deck"     deck/slides.js     "s/\['Gitar: şarkı sözleri', go\('#\/sozler\/gitar'\)\]\]/['Gitar: şarkı sözleri', go('#\/sozler\/gitar')], ['Oyna', act('game.start', { deck: 'karisik' })]]/"
mutatef "deck: a results step is back in the script" app/data/script.js "s/(  \[\{ name: 'page', hash: '#\/cal' \}\],[^\n]*\n)/\$1  [{ name: 'game.finish', gap: 400 }],\n/"
# the deck: "Dore Mimi, bugüne kadar" (tests/foundation.test.mjs, dossier ch. 14 §13). One slide since 2026-11-16: the
# books, the concerts and the site are three cards under the timeline, and the concert rows went with their slide.
mutatef "deck CONTROL: foundation benign wording" deck/foundation.js "s/Vakıf kendi görsellerini gönderirse değiştirilecek\./Vakıf kendi görsellerini gönderdiğinde değiştirilecek./"
mutatef "deck: the card says 12 books"           deck/foundation.js  's/<div><b>\$\{N\.books\} kitap, /<div><b>12 kitap, /'
mutatef "deck: the timeline says an 80-book series" deck/foundation.js 's/text: `\$\{N\.books\} kitaplık seri basıldı`/text: `80 kitaplık seri basıldı`/'
# (A marker on a date no fact has is no mutant: the notes look its source up, so the module does not load at all.)
mutatef "deck: the report of plans drawn as done" deck/foundation.js "s/\{ date: '2021-12-26', text: '“Dore Mimi CSO’da”, CSO Ada Ankara' \}/{ date: '2021-02-19', text: 'CSO ile yeni konserler' }/"
mutatef "deck: a number changed in the snapshot" deck/foundation-facts.js 's/"value": 74,/"value": 80,/'
mutatef "deck: a year typed into the notes"      deck/foundation.js  "s/<p>Slaytta yok: yayınevi/<p>Vakıf 2018’de kuruldu. Slaytta yok: yayınevi/"
mutatef "deck: Harika on a slide"                deck/foundation.js  "s/\`Bir kitap serisi, /\`Harika bir kitap serisi, /"
mutatef "deck: thanks in capitals"               deck/foundation.js  "s/Dore Mimi, <em>bugüne kadar<\/em>/TEŞEKKÜRLER, <em>bugüne kadar<\/em>/"
mutatef "deck: MEB onaylı on a card"             deck/foundation.js  "s/okul öncesi ve 1\. sınıf için\.<\/span>/okul öncesi ve 1. sınıf için, MEB onaylı.<\/span>/"
mutatef "deck: the section moved after the tour" deck/slides.js      "s/(  \/\/ What the foundation has done, before the app is shown[^\n]*\n  \.\.\.FOUNDATION_SLIDES,\n)((?:.*\n)*?)(  \{\n    id: 'kapanis')/\$2\$1\$3/"
mutatef "deck: a tour slide before the section"  deck/slides.js      "s/(  \/\/ What the foundation has done, before the app is shown[^\n]*\n  \.\.\.FOUNDATION_SLIDES,\n)((?:.*\n)*?)(  \{\n    \/\*\n     \* The slide opens the game and stops there)/\$2\$1\$3/"
mutatef "deck: the section is two slides again"  deck/foundation.js  "s/\n  \},\n\];\n\$/\n  },\n  { id: 'bugune-kitaplar', label: 'Kitaplar', theme: 'dark', layout: 'full', html: '<h1 class=\"title tour\">Çalgıları tanıyorum<\/h1><p class=\"lead\">Bir kitap serisi, okul öncesi ve birinci sınıf için.<\/p>', notes: '<p>Her kitap bir çalgıyı anlatır. <i>Kaynak: idefix ürün sayfası.<\/i><\/p>' },\n];\n/"
mutatef "deck: the foundation slide gets a live step" deck/foundation.js "s/(    id: 'bugune-kadar', label: 'Bugüne kadar', theme: 'dark', layout: 'full',\n)/\$1    acts: [['İzle: bilmeceler', { type: 'go', hash: '#\/izle' }]],\n/"
mutatef "deck: the foundation slide moves the phone" deck/foundation.js "s/(    id: 'bugune-kadar', label: 'Bugüne kadar', theme: 'dark', layout: 'full',\n)/\$1    phone: { type: 'go', hash: '#\/doremimi' },\n/"
mutatef "deck: the foundation slide makes room for the phone" deck/foundation.js "s/id: 'bugune-kadar', label: 'Bugüne kadar', theme: 'dark', layout: 'full',/id: 'bugune-kadar', label: 'Bugüne kadar', theme: 'dark',/"
mutatef "deck: the site's card is dropped"       deck/foundation.js  's/  <li><div><b>\$\{num\(.siteVideos.\)\.tr\}<\/b>[^\n]*\n//'
mutatef "deck: a picture without its credit"     deck/foundation.js  "s/'Serinin on kitabının kapakları', 'Görsel: idefix\.com'\)/'Serinin on kitabının kapakları', 'Kitap seti')/"
mutatef "deck: a picture that is not in the repo" deck/foundation.js "s/'kitap-seti\.jpg'/'kitap-seti-2026.jpg'/"
mutatef "deck: the notes cite no source"         deck/foundation.js  's/`<i>Kaynak: \$\{ids\.map/`<i>Bkz. \${ids.map/'
mutatef "deck: a postponed concert on the timeline" deck/foundation.js "s/  \{ date: '2021', text:/  { date: '2020-11-20\/22', text: 'CSO konserleri' },\n  { date: '2021', text:/"
mutatef "deck: a phone number in the notes"      deck/foundation.js  "s/<p>Slaytta yok: yayınevi/<p>Vakıf: 0312 555 12 34. Slaytta yok: yayınevi/"
# the fake status bar's clock is the device's, not the app's language's (tests/clock.test.mjs)
mutate  "clock CONTROL: comment only"            clock.js           's/so it does not follow Ayarlar › Dil\./so it does not follow the Dil setting./'
mutate  "clock: 12-hour"                         clock.js           's/two\(date\.getHours\(\)\)/two(date.getHours() % 12 || 12)/'
mutate  "clock: no leading zero"                 clock.js           's/String\(n\)\.padStart\(2, .0.\)/String(n)/'
mutate  "clock: minutes before hours"            clock.js           's/two\(date\.getHours\(\)\)\}:\$\{two\(date\.getMinutes\(\)\)/two(date.getMinutes())}:\${two(date.getHours())/'
mutatef "clock: formatted in the app's language again" app/app.js   "s/deviceClock\(new Date\(\)\)/new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })/"
mutatef "clock: Intl in the app's language"      app/app.js         "s/deviceClock\(new Date\(\)\)/new Intl.DateTimeFormat(lang, { timeStyle: 'short' }).format(new Date())/"
