#!/bin/bash
# Run these commands one at a time in your terminal.
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username.

# ── Step 1: Initialize git in the project folder ────────────────
cd hoopmind
git init
git add .
git commit -m "Initial commit: HoopMind AI sideline assistant"

# ── Step 2: Create the GitHub repo (requires GitHub CLI) ────────
# Install GitHub CLI first: https://cli.github.com
gh repo create hoopmind --public --description "AI-powered sideline assistant for basketball coaches" --push --source .

# ── Step 3: Enable GitHub Pages ─────────────────────────────────
gh api repos/YOUR_GITHUB_USERNAME/hoopmind/pages \
  --method POST \
  --field source='{"branch":"gh-pages","path":"/"}' \
  2>/dev/null || true

# Go to: https://github.com/YOUR_GITHUB_USERNAME/hoopmind/settings/pages
# Under "Build and deployment" > "Source" > select "GitHub Actions"

# ── Step 4: Trigger the deploy ───────────────────────────────────
git push origin main
# GitHub Actions will build and deploy automatically (takes ~2 minutes)

# ── Step 5: Update README with your actual username ──────────────
# Edit README.md and replace "yourusername" with YOUR_GITHUB_USERNAME
# Then:
git add README.md
git commit -m "Update README with live demo link"
git push

# Your app will be live at:
# https://YOUR_GITHUB_USERNAME.github.io/hoopmind/
echo "Done! Check GitHub Actions tab for deploy status."
