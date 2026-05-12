# Project rules for Claude

## Branching: always land on main

Every change ships to `main`. The workflow is:

1. Commit on the working branch (`claude/devotional-web-app-QTmhy` by default
   in this repo).
2. Push the branch.
3. Open a PR with the GitHub MCP (`mcp__github__create_pull_request`).
4. Merge the PR with `mcp__github__merge_pull_request` (method: `merge`).

Direct `git push origin main` returns 403 because main is protected — the
PR-and-merge dance above is how we satisfy the protection rule while still
keeping main as the only branch users see.

Don't ask "should I merge?" — that's the default.

## Other conventions

- Run `python3 scripts/curate.py` after any change to the source text, the
  sayings JSON, or the chunker — it rebuilds `data/devotional/passages.json`.
- Smoke-test the app with `node scripts/smoke.mjs` (Playwright) before
  merging UI changes. The dev server must be running at :5173.
- No secrets in committed files. API keys live in `~/.claude/settings.json`
  or `.claude/settings.local.json` (gitignored).
- Gospel translation source is swappable: drop a Lockman-licensed NASB
  JSON at `data/source/nasb_1977.json` (same shape as `asv_1901.json`) and
  the build picks it up automatically.
