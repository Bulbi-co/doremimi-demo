#!/usr/bin/env bash
# Publishes the committed site to GitHub Pages: https://bulbi-co.github.io/doremimi-demo/
#
#   bash tools/publish-pages.sh        (from anywhere in the repo; publishes HEAD, not the working tree)
#
# Pages serves this repo's `gh-pages` branch (GitHub switched it on by itself when that branch was first pushed,
# 2026-11-16; nobody had access to the repository's Pages setting that night). So publishing is a commit on that
# branch holding the site's files and nothing else: index.html, sunum.*, robots.txt, app/, assets/, deck/, plus
# .nojekyll so Pages serves them as they are. tests/, tools/, docs/ and the README stay on main.
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
