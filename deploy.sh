#!/bin/bash
# StormScope GitHub Pages deployer.
# Pattern adapted from Wingman: build, then force-push dist/ to the
# `gh-pages` branch of this same repo.
#
# Required:
#   - gh CLI authenticated as the repo owner, OR
#   - GH_TOKEN env var (export GH_TOKEN=ghp_xxx) — useful for CI / unattended.
#
# Usage:
#   ./deploy.sh

set -euo pipefail
cd "$(dirname "$0")"

REPO_OWNER="karel008-sudo"
REPO_NAME="StormScope"
DEPLOY_BRANCH="gh-pages"
PAGES_URL="https://${REPO_OWNER}.github.io/${REPO_NAME}/"

# 1. Resolve a token to push with.
if [ -z "${GH_TOKEN:-}" ]; then
  if command -v gh >/dev/null 2>&1; then
    GH_TOKEN="$(gh auth token 2>/dev/null || true)"
  fi
fi
if [ -z "${GH_TOKEN:-}" ]; then
  echo "✖ No GH_TOKEN found and gh is not authenticated."
  echo "  Either: export GH_TOKEN=ghp_xxx"
  echo "  Or:     gh auth login"
  exit 1
fi

# 2. Build.
echo "▶ Building production bundle…"
npm run build

# 3. Verify dist/ looks sane.
if [ ! -f dist/index.html ] || [ ! -f dist/sw.js ]; then
  echo "✖ Build did not produce dist/index.html or dist/sw.js"
  exit 1
fi

# 4. SPA fallback for GitHub Pages: copy index.html → 404.html so deep links
#    (e.g. when a user installs the PWA and an internal subpath is hit) work.
cp dist/index.html dist/404.html

# 5. Add a .nojekyll so GH Pages serves files starting with `_` and dotted
#    chunks correctly (vite assets are hash-named so this is mostly safety).
touch dist/.nojekyll

# 6. Push the dist/ contents to gh-pages.
DEPLOY_DIR=$(mktemp -d)
trap 'rm -rf "$DEPLOY_DIR"' EXIT

cp -R dist/. "$DEPLOY_DIR/"
cd "$DEPLOY_DIR"

git init -q
git config user.email "${REPO_OWNER}@users.noreply.github.com"
git config user.name "StormScope deploy bot"
git checkout -q -b "$DEPLOY_BRANCH"
git add -A
git commit -q -m "Deploy StormScope $(date -u +%FT%TZ)"

REMOTE="https://oauth2:${GH_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git"
git remote add origin "$REMOTE"

echo "▶ Force-pushing to ${REPO_OWNER}/${REPO_NAME}@${DEPLOY_BRANCH}…"
git push -q --force origin "$DEPLOY_BRANCH"

echo ""
echo "✔ Deployed."
echo "  Live URL: $PAGES_URL"
echo "  (First-time deploy: enable Pages → Source = Deploy from a branch → ${DEPLOY_BRANCH} / root.)"
