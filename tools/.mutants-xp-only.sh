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
  if (cd "$tmp" && node --test tests/xp.test.mjs >/dev/null 2>&1); then echo "SURVIVED     $1"; else echo "caught       $1"; fi
  rm -rf "$tmp"
}
mutate() { mutatef "$1" "app/lib/$2" "$3"; } # name file-in-app/lib perl-substitution
# One mutant over several files: name, then path perl-substitution pairs. For a drift that is consistent inside the
# demo (so the demo's own guards agree with it) and only the app's files can expose.
mutatem() {
  local name="$1"; shift
  local tmp; tmp="$(mktemp -d)"
  cp -R "$root/app" "$root/tests" "$root/deck" "$root/sunum.js" "$root/index.html" "$root/package.json" "$tmp/"; ln -s "$root/assets" "$tmp/assets"
  local changed=0
  while [ $# -ge 2 ]; do perl -0pi -e "$2" "$tmp/$1"; cmp -s "$root/$1" "$tmp/$1" || changed=1; shift 2; done
  if [ $changed = 0 ]; then echo "NOT APPLIED  $name"; rm -rf "$tmp"; return; fi
  if (cd "$tmp" && node --test tests/xp.test.mjs >/dev/null 2>&1); then echo "SURVIVED     $name"; else echo "caught       $name"; fi
  rm -rf "$tmp"
}
# tests/app-parity.test.mjs finds the app relative to its own file, which a temp copy is not; point it at the app here,
# or every parity mutant would "survive" on a skipped test.
export DOREMIMI_APP="${DOREMIMI_APP:-$(cd "$root/../../doremimi-superapp" 2>/dev/null && pwd)/}"
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
mutatef "the parent row names the level again"   app/i18n/ui.js     "s/'profile\.panel\.line': 'Çocukların ilerlemesi ve pratiği'/'profile.panel.line': 'Çocukların seviyesi ve pratiği'/"
mutatef "the XP key is back in French"           app/i18n/ui.js     "s/(  'results\.info': 'Tu as trouvé)/  'results.xp': 'Points',\n\$1/"
mutatef "the intro promises XP in French"        app/i18n/content-fr.js "s/Les bonnes réponses rapportent des étoiles\./Les bonnes réponses rapportent des XP et des étoiles./"
mutatef "the intro promises points in Turkish"   app/data/content.js "s/Doğru cevaplar yıldız getirir\./Doğru cevaplar puan ve yıldız getirir./"
mutatef "the level chip's style is back"         app/style.css      's/(\.praise-chip \{ position)/.levelbtn .lv { min-width: 52px; }\n$1/'
