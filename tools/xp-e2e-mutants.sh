#!/usr/bin/env bash
# Mutation check for tools/xp-e2e.mjs, the guard that reads the RUNNING phone for dossier ch. 14 §14 (tools/mutants.sh
# does the same for the guards that read the sources). Each mutant edits a copy of the phone in a temp folder, serves
# that copy and runs the check against it in one language. Every mutant must be "caught" and the CONTROL must
# "SURVIVE", or the check fails for a reason that is not the mutation. Needs Chrome; about a minute per line.
#   bash tools/xp-e2e-mutants.sh            every line
#   bash tools/xp-e2e-mutants.sh 'chip'     the lines whose name matches (two halves can run side by side on two PORTs)
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
# Far from 4175-4195 on purpose: tools/serve.mjs moves to the next port when its own is busy, so a mutant served inside
# that range could push somebody's real server up by one and leave their check reading this copy.
port="${PORT:-41830}"
only="${1:-}"
mutate() { # name language path-from-root perl-substitution
  if [ -n "$only" ] && ! [[ "$1" =~ $only ]]; then return; fi
  local tmp; tmp="$(mktemp -d)"
  cp -R "$root/app" "$root/tools" "$tmp/"; ln -s "$root/assets" "$tmp/assets"
  perl -0pi -e "$4" "$tmp/$3"
  if cmp -s "$root/$3" "$tmp/$3"; then echo "NOT APPLIED  $1"; rm -rf "$tmp"; return; fi
  (cd "$tmp" && PORT="$port" exec node tools/serve.mjs >/dev/null 2>&1) &
  local server=$!
  for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$port/app/" && break; sleep 0.2; done
  # the check itself is the real one, from the repo: only the phone it reads is the mutated copy
  if node --experimental-websocket "$root/tools/xp-e2e.mjs" "http://127.0.0.1:$port" "$2" >"$tmp/out.txt" 2>&1; then echo "SURVIVED     $1"
  # A run that never read the phone proves nothing about the mutant: on a busy machine four of sixteen "caught" lines
  # were Chrome failing to start, which would have passed for a guard that works.
  elif ! grep -q '^ok ' "$tmp/out.txt"; then echo "NOT RUN      $1    ($(grep -m1 '^FAIL' "$tmp/out.txt" | cut -c7-150))"
  else echo "caught       $1    ($(grep -c '^FAIL' "$tmp/out.txt") checks; first: $(grep -m1 '^FAIL' "$tmp/out.txt" | cut -c7-150))"; fi
  kill "$server" 2>/dev/null; wait "$server" 2>/dev/null
  rm -rf "$tmp"
}
mutate "CONTROL: a comment that names XP"        tr app/app.js      's/is kept for the backend and never drawn \(ch\. 14 §14\)/is kept for the backend (it was the XP) and never drawn (ch. 14 §14)/'
mutate "+N XP back on the outcome chip"          tr app/app.js      "s/G\.outcome = \{ praise: t\(\{ TypedFirstTry/G.outcome = { praise: '+' + o.xp + ' XP ' + t({ TypedFirstTry/"
mutate "a number alone on the outcome chip"      en app/app.js      "s/G\.outcome = \{ praise: t\(\{ TypedFirstTry/G.outcome = { praise: '+' + o.xp + ' ' + t({ TypedFirstTry/"
mutate "the level chip back in the top bar"      en app/app.js      's/(    <button class="tile" data-go="#\/profil" data-do="avatar")/    <button class="tile levelbtn" data-go="#\/profil"><b class="num">Level \${profile.level}<\/b><\/button>\n$1/'
mutate "a bare number chip in the top bar"       tr app/app.js      's/(    <button class="tile" data-go="#\/profil" data-do="avatar")/    <button class="tile" data-go="#\/profil"><b class="num">\${profile.level}<\/b><\/button>\n$1/'
mutate "Niv. N in the game header"               fr app/app.js      's/(n: r\.count \}\)\)\}<\/small>` : .{2}\}<\/div>)`;/$1\n    <span class="avatar num">Niv. \${profile.level}<\/span>`;/'
mutate "a first instrument pays on screen"       tr app/app.js      "s/toast\(t\('instrument\.discovered', \{ name: d\.label \}\)\);/toast('+' + LEARNING.xp.seenInstrument, t('instrument.discovered', { name: d.label }));/"
mutate "results get a third tile"                en app/app.js      's/<div class="stats2 num"><div class="rrow">/<div class="stats2 num"><div class="rrow"><small>\${esc(t("results.stars"))}<\/small><b>+\${G.round.xpEarned}<\/b><\/div><div class="rrow">/'
mutate "Profilim shows the level"                tr app/app.js      's/<div class="card prof-counts"><span>/<div class="card prof-counts"><span><b class="num">Seviye \${profile.level}<\/b><\/span><span>/'
mutate "the parent panel shows the number"       fr app/app.js      's/(<b class="h3">\$\{esc\(kidName\(kid\)\)\}<\/b>)<span class="p num">/$1<small class="num">\${profile.xp} XP<\/small><span class="p num">/'
mutate "XP in a French string"                   fr app/i18n/ui.js  "s/'results\.right': 'Justes'/'results.right': 'XP'/"
mutate "gold in an English string"               en app/i18n/ui.js  "s/'profile\.stars': \{ one: 'star', other: 'stars' \}/'profile.stars': { one: 'gold coin', other: 'gold coins' }/"
mutate "the intro promises XP in Turkish"        tr app/data/content.js "s/Doğru cevaplar yıldız getirir\./Doğru cevaplar XP ve yıldız getirir./"
mutate "the progress number is no longer saved"  tr app/app.js      's/  profile\.level = lv\.level; profile\.xp = lv\.xp;\n  mastery\.record/  mastery.record/'
mutate "the chip placed by its own top again"    tr app/style.css   's/(\.praise-chip \{ position: absolute; left: 50%; top: -50px;) height: 170px;/$1/'
mutate "the chip too wide for a 360 px phone"    fr app/style.css   's/(\.praise-chip \.toastb \{[^}]*font: 800) 22px\/28px/$1 30px\/36px/'
