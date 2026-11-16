#!/usr/bin/env bash
# Mutation check for tests/rules.test.mjs (CLAUDE.md: a guard is real only if it fails when the behaviour breaks).
# Each mutant edits a copy of app/lib in a temp folder and runs the suite there. Every mutant must be "caught";
# the CONTROL (a comment-only edit) must "SURVIVE", or the suite fails for reasons unrelated to the code.
#   bash tools/mutants.sh
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
# deck/, sunum.js and index.html are copied too: tests/flow.test.mjs reads them, and without them every run failed, the
# CONTROLs included, so no mutant could survive and the table proved nothing.
mutatef() { # name path-from-root perl-substitution
  local tmp; tmp="$(mktemp -d)"
  cp -R "$root/app" "$root/tests" "$root/deck" "$root/sunum.js" "$root/index.html" "$root/package.json" "$tmp/"; ln -s "$root/assets" "$tmp/assets"
  perl -0pi -e "$3" "$tmp/$2"
  if cmp -s "$root/$2" "$tmp/$2"; then echo "NOT APPLIED  $1"; rm -rf "$tmp"; return; fi
  if (cd "$tmp" && node --test tests/ >/dev/null 2>&1); then echo "SURVIVED     $1"; else echo "caught       $1"; fi
  rm -rf "$tmp"
}
mutate() { mutatef "$1" "app/lib/$2" "$3"; } # name file-in-app/lib perl-substitution
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
mutate "Oyunlar back in the dock"              nav.js     "s/label: 'İzle'/label: 'Oyunlar'/"
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
mutatef "CONTROL: modes comment only"            app/lib/modes.js   's/Pure, with the deck and the mastery/Pure, with deck and mastery/'
mutatef "CONTROL: app.js comment only"           app/app.js         's/nothing else\. The owner: Keşfet/nothing more. The owner: Keşfet/'
mutatef "CONTROL: content comment only"          app/data/content.js 's/a content default the content team may change/a content default that the content team may change/'
mutatef "Keşfet starts at Seç"                   app/lib/modes.js   's/\[RoundOrigin.Kesfet\]: \{ start: Level.Yaz/[RoundOrigin.Kesfet]: { start: Level.Sec/'
mutatef "Öğren's ladder moves"                   app/lib/modes.js   's/\[RoundOrigin.Ogren\]: \{ start: Level.Cevir, fixed: true \}/[RoundOrigin.Ogren]: { start: Level.Cevir, fixed: false }/'
mutatef "Çal starts at Yaz"                      app/lib/modes.js   's/\[RoundOrigin.Cal\]: \{ start: Level.Sec/[RoundOrigin.Cal]: { start: Level.Yaz/'
mutatef "a fixed ladder moves anyway"            app/lib/ladder.js  's/if \(this.fixed\) \{/if (false) {/'
mutatef "down after two struggles again"         app/data/content.js 's/downAfterStruggles: 4/downAfterStruggles: 2/'
mutatef "the ceiling ignores the level"          app/lib/modes.js   's/if \(L < 0\) return cards.slice\(\);/return cards.slice();/'
mutatef "the levels below before the own"        app/lib/modes.js   's/d === L \? 0 :/d === L ? 5 :/'
mutatef "the level above before the ones below"  app/lib/modes.js   's/10 \+ \(d - L\)/0.5 + (d - L)/'
mutatef "the top-up ignores the ceiling"         app/lib/modes.js   's/cards.push\(\.\.\.byCeiling\(all\(null\)\.filter\(c => kinds.has\(c.kind\) && !cards.includes\(c\)\), level\)/cards.push(...all(null).filter(c => kinds.has(c.kind) \&\& !cards.includes(c))/'
mutatef "Öğren deals a round, not the category"  app/lib/modes.js   's/: all\(concept\);/: all(concept).slice(0, count);/'
mutatef "the sheet counts a round's worth"       app/lib/modes.js   's/export const prepCount = \(deck, concept\) => deck.forConcept\(concept\).length;/export const prepCount = (deck, concept) => Math.min(6, deck.forConcept(concept).length);/'
mutatef "Keşfet shows only the signs"            app/lib/modes.js   "s/!id.startsWith\('instrument:'\) && concepts\[id\]/id.startsWith('signcat:') \&\& concepts[id]/"
mutatef "a sign card has no difficulty"          app/data/content.js "s/\{ difficulty: 'orta', id: 'bemol'/{ id: 'bemol'/"
mutatef "Natürel is Başlangıç"                   app/data/content.js "s/\{ difficulty: 'ileri', id: 'naturel'/{ difficulty: 'baslangic', id: 'naturel'/"
mutatef "the badge says Yazma Zirvesi again"     app/data/content.js "s/name: 'Zirve'/name: 'Yazma Zirvesi'/"
mutatef "the intro names a level"                app/data/content.js "s/title: 'Cevabı bul'/title: 'Yaz ya da seç'/"
mutatef "Nefesli back on Natürel's blue"         app/data/content.js "s/NefesliUflemeliCalgilar: \{ name: 'Nefesli Çalgılar', color: '#3E3A9E'/NefesliUflemeliCalgilar: { name: 'Nefesli Çalgılar', color: '#1E9BFF'/"
mutatef "Vurmalı group back on Fa's orange"      app/data/site.js   "s/'Vurmalı': '#7A5C4E'/'Vurmalı': '#FF9A1F'/"
mutatef "Telli badge keeps the old red"          app/data/content.js "s/color: '#1E7A4C', rule: \{ kind: 'LearnQuestions', count: 3 \}, conceptId: 'family:TelliCalgilar'/color: '#FF5A4E', rule: { kind: 'LearnQuestions', count: 3 }, conceptId: 'family:TelliCalgilar'/"
mutatef "the newsletter opens İletişim again"    app/data/hub.js    "s/'Bültene abone ol', 'Yeniliklerden ilk sen haberdar ol', \{ push: '#\/bulten' \}/'Bültene abone ol', 'Yeniliklerden ilk sen haberdar ol', { push: '#\/iletisim' }/"
mutatef "a hub row leads to no page"             app/data/hub.js    "s/push: '#\/destekciler'/push: '#\/sponsorlar'/"
mutatef "Öğren back to five tabs"                app/lib/nav.js     "s/, \{ key: 'notalar', label: 'Notalar' \}//"
mutatef "the round starts from the saved ladder" app/app.js         's/ladderFor\(G.origin, LEARNING.ladder\), LEARNING, G.random/ladderFor(G.origin, LEARNING.ladder, profile.ladder), LEARNING, G.random/'
mutatef "a song's round is Keşfet's"             app/app.js         's/data-play="\$\{P.concept \?\? .karisik.\}" data-origin="cal"/data-play="\${P.concept ?? "karisik"}" data-origin="kesfet"/'
mutatef "the sign page skips the sheet"          app/app.js         's/data-prep="signcat:\$\{key\}"/data-play="signcat:\${key}" data-origin="kesfet"/'
mutatef "the level toast is back"                app/app.js         "s/  if \(o.move !== Move.None\) gameBg/  if (o.move !== Move.None) G.line = 'Harika! Yazma seviyesine çıktın';\n  if (o.move !== Move.None) gameBg/"
mutatef "the results tile shows the level"       app/app.js         's/<small>Yıldız<\/small><b>\$\{R.stars\}\/3<\/b>/<small>Seviye<\/small><b>Yaz<\/b>/'
mutatef "the first game does not ask the level"  app/app.js         "s/\.\.\.\(profile.difficulty \? \[\] : \['level'\]\)/...([])/"
mutatef "the chosen level is not saved"          app/app.js         's/profile.difficulty = key; save\(\);/save();/'
mutatef "Zorluk does not change the level"       app/app.js         's/profile.difficulty = t.dataset.zorluk; save\(\);/save();/'
mutatef "the round ignores the child's level"    app/app.js         's/level: profile.difficulty, mastery/level: null, mastery/'
mutatef "Tekrar oyna forgets the way in"         app/app.js         's/openGame\(\{ concept: c, origin: G.origin, intro: false \}\)/openGame({ concept: c, intro: false })/'
mutatef "the Tekrar row is back"                 app/app.js         's/    \$\{oynaHtml\(\)\}/    \${oynaHtml()}<button class="trow" data-do="review">Tekrar zamanı<\/button>/'
mutatef "the sheet promises a round's worth"     app/app.js         's/Bu kategoride \$\{n\} kart var/Bu kategoride \${LEARNING.cardsPerRound} kart var/'
mutatef "OYNA is a bar again"                    app/style.css      's/width: min\(56%, 220px\); aspect-ratio: 1;/width: 100%;/'
