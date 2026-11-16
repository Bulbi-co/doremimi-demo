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
# the deck's story against the phone's script, dossier ch. 14 §9 (tests/deck.test.mjs)
mutatef "CONTROL: slides comment only"           deck/slides.js     's/Its own module, apart from sunum.js/Its own module, separate from sunum.js/'
mutatef "CONTROL: script comment only"           app/data/script.js 's/It is data in its own module/It is plain data in its own module/'
mutatef "the script loses Öğren's page step"     app/data/script.js "s/  \[\{ name: 'page', hash: '#\/ogren\/aileler' \}\],[^\n]*\n//"
mutatef "Öğren opens with a plain go()"          deck/slides.js     "s/phone: at\(9\)/phone: go('#\/ogren\/aileler')/"
mutatef "Şimdi Oyna only in the fast replay"    deck/slides.js     "s/\['Şimdi Oyna', play\(0\)\]/['Şimdi Oyna', at(0)]/"
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
# the deck: auto-play (tests/flow.test.mjs, dossier ch. 14 §11)
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
mutatef "deck: Ayarlar does not put Turkish back" deck/slides.js    "s/    leave: settings\(null, 'tr', true\),\n//"
mutatef "deck: leaving Ayarlar resets Zorluk too" deck/slides.js    "s/leave: settings\(null, 'tr', true\)/leave: settings('baslangic', 'tr', true)/"
mutatef "deck: leaving Ayarlar shows a press"    deck/slides.js     "s/leave: settings\(null, 'tr', true\)/leave: settings(null, 'tr')/"
mutatef "deck: a step is given a blink"          deck/flow.js       's/export const AUTO_STEP = 3500;/export const AUTO_STEP = 800;/'
mutatef "deck: reading time ignores the words"   deck/slides.js     's/return Math\.min\(READ_MAX, 2500 \+ words \* 300\);/return 6000;/'
mutatef "deck: the control clicks → by itself"   sunum.js           "s/\\\$\('#auto'\)\.onclick = \(\) => dispatch\(\{ type: 'auto' \}\);/\\\$('#auto').onclick = () => setInterval(() => \\\$('#next').click(), 4000);/"
mutatef "deck: A is not a shortcut"              sunum.js           "s/  if \(k === 'a' \|\| k === 'A'\) dispatch\(\{ type: 'auto' \}\);\n//"
mutatef "deck: the tick timer is never set"      sunum.js           "s/  else if \(fx\.type === 'autotimer'\)[^\n]*\n//"
mutatef "deck: a letter is typed during auto-play" sunum.js         "s/if \(flow\.auto\) dispatch\(\{ type: 'auto', on: false \}\); else phone/phone/"
mutatef "deck: no auto-play control on the page" index.html         's/          <button class="auto-btn" id="auto"[^\n]*\n//'
mutatef "deck: the lock disables the control"    sunum.js           "s/\[\\\$\('#prev'\), \\\$\('#next'\), /[\\\$('#prev'), \\\$('#next'), \\\$('#auto'), /"
# the deck: the walkthrough and the played steps (tests/deck.test.mjs)
mutatef "deck CONTROL: slides comment only"      deck/slides.js     's/Scrolled to, not tapped: the card turns daily/Scrolled to and not tapped: the card turns daily/'
mutatef "deck: the round skips a step"           deck/slides.js     "s/\['Sıradaki kart', play\(4\)\],\n//"
mutatef "deck: two steps on one button"          deck/slides.js     "s/\['İki deneme de yanlış', play\(5\)\]/['İki deneme de yanlış', play(6)]/"
mutatef "deck: the round is played out of order" deck/slides.js     "s/(      \['Yanlış yaz: “sol”', play\(2\)\],\n)(      \['Harf kutularını doldur', play\(3\)\],\n)/\$2\$1/"
mutatef "deck: a step asks past the script"      deck/slides.js     "s/\['Keman', play\(11\)\]/['Keman', play(31)]/"
mutatef "deck: İzle opens the player without the PIN" deck/slides.js "s/batch\(go\('#\/izle'\), act\('video\.open'\), act\('gate\.type'\)\)/batch(go('#\/izle'), act('player.open'))/"
mutatef "deck: the tapped banner is not the foundation's" deck/slides.js "s/act\('banner\.show', \{ index: 3 \}\), act\('tap', \{ sel: '\[data-banner=\"3\"\]' \}\)/act('banner.show', { index: 1 }), act('tap', { sel: '[data-banner=\"1\"]' })/"
mutatef "deck: the phone is left in French"      deck/slides.js     "s/, \['Türkçe', settings\('orta', 'tr'\)\]\]/]/"
mutatef "deck: English is skipped"               deck/slides.js     "s/\['English', settings\('orta', 'en'\)\], //"
mutatef "deck: a Zorluk the app does not have"   deck/slides.js     "s/\['Zorluk: Orta', settings\('orta', 'tr'\)\]/['Zorluk: Orta', settings('zor', 'tr')]/"
mutatef "deck: Ayarlar opens with a press"       deck/slides.js     "s/phone: settings\('baslangic', 'tr', true\)/phone: settings('baslangic', 'tr')/"
mutatef "deck: a slide opens a page the phone lacks" deck/slides.js "s/id: 'izle', label: 'İzle', theme: 'light', phone: go\('#\/izle'\)/id: 'izle', label: 'İzle', theme: 'light', phone: go('#\/videolar')/"
mutatef "deck: the phone loses the settings act" app/app.js         "s/  'settings': async m => \{/  'ayarlar': async m => {/"
mutatef "deck: Bugünün kartı after the round starts" deck/slides.js "s/(      \/\/ Scrolled to, not tapped[^\n]*\n      \['Bugünün kartı'[^\n]*\n)(      \['Şimdi Oyna', play\(0\)\],\n)/\$2\$1/"
mutatef "deck: the XP slide comes back"          deck/slides.js     "s/Sekmenin başlığı vakfın kendisi\./Sekmenin başlığı vakfın kendisi. Her tur XP kazandırır./"
mutatef "deck: İzle's lead grows a second sentence" deck/slides.js  "s/oynatmadan önce ebeveyn PIN’i istenir\.'/oynatmadan önce ebeveyn PIN’i istenir. Çocuk tek başına çıkamaz.'/"
mutatef "deck: Öğren's family opens in the fast replay" deck/slides.js "s/\['Yaylı Çalgılar', play\(10\)\]/['Yaylı Çalgılar', at(10)]/"
mutatef "deck: Öğren enters a step late"         deck/slides.js     "s/id: 'ogren', label: 'Öğren', theme: 'light', phone: at\(9\)/id: 'ogren', label: 'Öğren', theme: 'light', phone: at(10)/"
mutatef "deck: Çal's page is never asked for"    deck/slides.js     "s/id: 'cal', label: 'Çal', theme: 'light', phone: at\(12\)/id: 'cal', label: 'Çal', theme: 'light', phone: go('#\/cal')/"
mutatef "deck: two buttons with one label"       deck/slides.js     "s/\['Anladım, devam', play\(7\)\]/['Sıradaki kart', play(7)]/"
# the deck: the song slide (tests/deck.test.mjs; owner, 2026-11-16)
mutatef "deck: the song step only opens the page" deck/slides.js    "s/batch\(go\('#\/sarki\/keman'\), act\('song\.play'\)\), \{ hold: SONG_HOLD \}/batch(go('#\/sarki\/keman')), { hold: SONG_HOLD }/"
mutatef "deck: a lyric sheet Keman does not have" deck/slides.js    "s/\['Gitar: şarkı sözleri', go\('#\/sozler\/gitar'\)\]/['Keman: şarkı sözleri', go('#\/sozler\/keman')]/"
mutatef "deck: the song slide opens on Çal's list" deck/slides.js   "s/id: 'sarki', label: 'Şarkı', theme: 'light', phone: go\('#\/sarki\/keman'\)/id: 'sarki', label: 'Şarkı', theme: 'light', phone: go('#\/cal')/"
mutatef "deck: the song told before Çal"         deck/slides.js     "s/id: 'sarki'/id: 'TMP'/; s/id: 'cal'/id: 'sarki'/; s/id: 'TMP'/id: 'cal'/"
mutatef "deck: the slide says 40 songs"          deck/slides.js     "s/'41 şarkının hepsi aynı klavyede/'40 şarkının hepsi aynı klavyede/"
mutatef "deck: nine lyric sheets in the notes"   deck/slides.js     "s/on çalgının sözleri ayrı bir sayfada okunur/dokuz çalgının sözleri ayrı bir sayfada okunur/"
mutatef "deck: the karaoke line is only note names again" deck/slides.js "s/karaoke satırında önce nota adları, sonra sözler ilerler\./nota adları karaoke satırında ilerler./"
mutatef "deck: Keman's song loses its words"     app/data/songs/keman.json 's/"hem"/"la"/g; s/"tel"/"la"/g; s/"li"/"la"/g; s/"yim"/"la"/g; s/"yay"/"la"/g; s/"lı"/"la"/g; s/"en"/"la"/g; s/"çok"/"la"/g; s/"ça"/"la"/g; s/"nı"/"la"/g; s/"rım"/"la"/g; s/"Ku"/"la"/g; s/"zen"/"la"/g; s/"le"/"la"/g; s/"ben"/"la"/g; s/"den"/"la"/g; s/"boy"/"la"/g; s/"lu"/"la"/g; s/"be"/"la"/g; s/"nen"/"la"/g; s/"kü"/"la"/g; s/"çü"/"la"/g; s/"ko"/"la"/g; s/"yım"/"la"/g; s/"Bir"/"la"/g; s/"kaç"/"la"/g; s/"fark"/"la"/g; s/"ren"/"la"/g; s/"gim"/"la"/g; s/"var"/"la"/g; s/"dört"/"la"/g; s/"bir"/"la"/g; s/"ya"/"la"/g; s/"pım"/"la"/g; s/"Her"/"la"/g; s/"mü"/"la"/g; s/"zik"/"la"/g; s/"te"/"la"/g; s/"va"/"la"/g; s/"dur"/"la"/g; s/"mam"/"la"/g; s/"hep"/"la"/g'
mutatef "deck: a song's round from the deck"     deck/slides.js     "s/\['Gitar: şarkı sözleri', go\('#\/sozler\/gitar'\)\]\]/['Gitar: şarkı sözleri', go('#\/sozler\/gitar')], ['Oyna', act('game.start', { deck: 'karisik' })]]/"
mutatef "deck: a play button tapped on a page"   deck/slides.js     "s/\['Keman', play\(11\)\]\]/['Keman', play(11)], ['Oyna', act('tap', { sel: '[data-play]' })]]/"
mutatef "deck: a results step is back in the script" app/data/script.js "s/(  \[\{ name: 'page', hash: '#\/cal' \}\],[^\n]*\n)/\$1  [{ name: 'game.finish', gap: 400 }],\n/"
mutatef "deck: Seviye 3 on a slide"              deck/slides.js     "s/Sekmenin başlığı vakfın kendisi\./Sekmenin başlığı vakfın kendisi. Çocuk Seviye 3 oldu./"
# the deck: "Dore Mimi, bugüne kadar" (tests/foundation.test.mjs, dossier ch. 14 §13)
mutatef "deck CONTROL: foundation benign wording" deck/foundation.js "s/Buradan sonra uygulamaya geçiyoruz\./Şimdi uygulamaya geçiyoruz./"
mutatef "deck: the series has 12 books"          deck/foundation.js  's/\$\{N\.books\} kitaplık seri, \$\{FACTS\.concerts\.orchestraTr\}/12 kitaplık seri, \${FACTS.concerts.orchestraTr}/'
mutatef "deck: a concert an hour later"          deck/foundation.js  "s/time: '15\.00'/time: '16.00'/"
mutatef "deck: a concert in another hall"        deck/foundation.js  "s/time: '14\.30', where: \['CSO Tarihi Salon'\]/time: '14.30', where: ['CSO Ada Ankara']/"
mutatef "deck: a number changed in the snapshot" deck/foundation-facts.js 's/"value": 74,/"value": 80,/'
mutatef "deck: a year typed into the notes"      deck/foundation.js  "s/Vakfın kuruluş tarihi slaytta yok:/Vakıf 2018’de kuruldu;/"
mutatef "deck: Harika on a slide"                deck/foundation.js  "s/Buradan sonra uygulamaya geçiyoruz\./Harika bir kütüphane. Buradan sonra uygulamaya geçiyoruz./"
mutatef "deck: thanks in capitals"               deck/foundation.js  "s/Dore Mimi, <em>bugüne kadar<\/em>/TEŞEKKÜRLER, <em>bugüne kadar<\/em>/"
mutatef "deck: MEB onaylı in the lead"           deck/foundation.js  "s/okul öncesi ve 1\. sınıf için;/okul öncesi ve 1. sınıf için, MEB onaylı;/"
mutatef "deck: the section moved after the tour" deck/slides.js      "s/(  \.\.\.FOUNDATION_SLIDES,\n)((?:.*\n)*?)(  \{\n    id: 'platform')/\$2\$1\$3/"
mutatef "deck: a tour slide before the section"  deck/slides.js      "s/(  \/\/ What the foundation has done, before the app is shown[^\n]*\n  \.\.\.FOUNDATION_SLIDES,\n)((?:.*\n)*?)(  \{\n    \/\*\n     \* The whole round is played here)/\$2\$1\$3/"
mutatef "deck: a foundation step opens #/yok"    deck/foundation.js  "s/acts: \[\['İzle: bilmeceler', \{ type: 'go', hash: '#\/izle' \}\]\]/acts: [['İzle: bilmeceler', { type: 'go', hash: '#\/yok' }]]/"
mutatef "deck: a postponed concert on the timeline" deck/foundation.js "s/  \{ date: '2021', text:/  { date: '2020-11-20\/22', text: 'CSO konserleri' },\n  { date: '2021', text:/"
mutatef "deck: a phone number in the notes"      deck/foundation.js  "s/Buradan sonra uygulamaya geçiyoruz\./Vakıf: 0312 555 12 34. Buradan sonra uygulamaya geçiyoruz./"
