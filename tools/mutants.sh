#!/usr/bin/env bash
# Mutation check for tests/rules.test.mjs (CLAUDE.md: a guard is real only if it fails when the behaviour breaks).
# Each mutant edits a copy of app/lib in a temp folder and runs the suite there. Every mutant must be "caught";
# the CONTROL (a comment-only edit) must "SURVIVE", or the suite fails for reasons unrelated to the code.
#   bash tools/mutants.sh
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
mutate() { # name file perl-substitution
  local tmp; tmp="$(mktemp -d)"
  cp -R "$root/app" "$root/tests" "$root/package.json" "$tmp/"; ln -s "$root/assets" "$tmp/assets"
  perl -0pi -e "$3" "$tmp/app/lib/$2"
  if cmp -s "$root/app/lib/$2" "$tmp/app/lib/$2"; then echo "NOT APPLIED  $1"; rm -rf "$tmp"; return; fi
  if (cd "$tmp" && node --test tests/ >/dev/null 2>&1); then echo "SURVIVED     $1"; else echo "caught       $1"; fi
  rm -rf "$tmp"
}
mutate "CONTROL: comment only"                 answers.js 's/Walks UTF-16 code units/Walks the UTF-16 code units/'
mutate "drop the ı → i fold"                   answers.js "s/'ı': 'i', //"
mutate "short answers forgive a typo"          answers.js 's/n.length <= 4 \? 0/n.length <= 3 ? 0/'
mutate "digits forgive a typo"                 answers.js 's/if \(DIGIT.test\(n\)\) return 0;//'
mutate "prefill rounds instead of ceil"        tiles.js   's/Math.ceil\(letters \* fraction\)/Math.round(letters * fraction)/'
mutate "consonants before vowels"              tiles.js   "s/\['a', 'e', 'i', 'o', 'u'\].includes/!['a', 'e', 'i', 'o', 'u'].includes/"
mutate "hash offset dropped"                   tiles.js   's/const offset = \(seed % 1000\) \/ 1000 \* step;/const offset = 0;/'
mutate "backspace removes green letters"       tiles.js   's/this.tiles\[i\].typed != null\) \{ this.tiles\[i\].typed = null;/this.tiles[i].kind === "Letter") { this.tiles[i].typed = null; this.tiles[i].prefilled = false;/'
mutate "down after one struggle"               ladder.js  's/>= this.config.downAfterStruggles/>= this.config.downAfterStruggles - 1/'
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
