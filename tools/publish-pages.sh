#!/usr/bin/env bash
# Publishes the committed site to GitHub Pages: https://doremimi.bulbi.co/
#
#   bash tools/publish-pages.sh        (from anywhere in the repo; publishes HEAD, not the working tree)
#
# Pages serves this repo's `gh-pages` branch (GitHub switched it on by itself when that branch was first pushed,
# 2026-11-16; nobody had access to the repository's Pages setting that night). So publishing is a commit on that
# branch holding the site's files and nothing else: index.html, sunum.*, robots.txt, app/, assets/, deck/, plus
# .nojekyll so Pages serves them as they are. tests/, tools/, docs/ and the README stay on main.
#
# The CNAME file is what gives the site its address. Under GitHub's own name, bulbi-co.github.io, Chrome stopped
# people who often visit bulbi.co with "Did you mean bulbi.co? The site you just tried to visit looks fake"
# (2026-11-16): its lookalike check compares a host with popular sites and with the visitor's own history. A
# subdomain of bulbi.co is not a lookalike of it. The DNS side is one record in Route 53:
# doremimi.bulbi.co CNAME bulbi-co.github.io. The file is written on every publish because the branch's content is
# replaced on every publish: without it the next one would take the address away.
#
# It is taken from HEAD with `git archive`, so an uncommitted edit is never published, and what is live can always be
# named by a commit. .github/workflows/pages.yml runs this same script after the guards on every push to main.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
sha="$(git -C "$root" rev-parse --short HEAD)"
tmp="$(mktemp -d)"
git -C "$root" fetch -q origin gh-pages
git -C "$root" worktree add -q --detach "$tmp/site" FETCH_HEAD
cd "$tmp/site"
# Everything out, then HEAD's site in: a file deleted on main must not stay live.
git rm -rq --ignore-unmatch .
git -C "$root" archive HEAD index.html sunum.js sunum.css robots.txt app assets deck | tar -x -C "$tmp/site"
touch .nojekyll
printf 'doremimi.bulbi.co\n' > CNAME
git add -A
if git diff --cached --quiet; then
  echo "publish-pages: gh-pages already holds the site of $sha; nothing to publish"
else
  git commit -q -m "site: the demo as published from main $sha"
  git push -q origin HEAD:gh-pages
  echo "publish-pages: published main $sha as $(git rev-parse --short HEAD) on gh-pages"
fi
cd "$root"
git worktree remove "$tmp/site"
