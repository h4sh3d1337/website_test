# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal hacking / bug bounty / pentesting reference site for the user (handle: MMR), styled as an authentic black/red hacker terminal — self-hosted JetBrains Mono, `./category` naming that mimics `ls -la` output, muted animations, no build step. Deployed to Cloudflare Pages, connected to GitHub (`iorert71/web-mmr`, private).

There is no framework, no bundler, no package.json. It's plain HTML/CSS/vanilla JS served as-is. Do not introduce a build step, npm dependencies, or a framework unless the user explicitly asks — the whole point of the project is that it deploys straight from the repo root with zero build config.

## Commands

There is no build/lint/test tooling. To preview locally:

```bash
python3 -m http.server 8340
```

then open `http://localhost:8340/index.html`. To validate a JS file after editing (there's no bundler to catch syntax errors otherwise):

```bash
node --check assets/js/<file>.js
```

Every feature added to this site has historically been verified with Playwright (headless Chromium, `executable_path="/usr/bin/chromium"`) against the local server above — filling inputs, clicking, reading computed styles/clipboard, screenshotting — rather than trusting a code read alone. Keep doing this for any UI change.

## Content rule (non-negotiable)

Every payload, command, or technique added to `cheatsheets-data.js` must be a **real, sourced** technique — the same material PayloadsAllTheThings / HackTricks / GTFOBins / PortSwigger Web Security Academy already document, not invented syntax. This was an explicit, repeated instruction from the user throughout the site's construction. When adding new cards, cross-check exact syntax against a real source before writing it.

## Architecture

**Pages**: `index.html` (home, `./listing` of categories + a lightweight site-wide search), `cheatsheets.html` (the big interactive payload/command browser), `web.html` / `recon.html` / `privesc.html` / `shells.html` / `exploits.html` / `practice.html` (static `ls -la`-style link lists to external resources). All share `style.css`.

**`cheatsheets.html` is intentionally full-width** (`.cs-app`), not the narrow 760px `.term` card used by every other page — it's a separate app-like layout with a sidebar (tracks + categories + tools) and a main card grid.

### The cheatsheets tool (`cheatsheets.html` + `assets/js/cheatsheets*.js`)

- `assets/js/cheatsheets-data.js` — `CS_TRACKS` (two tracks: `bugbounty`, `pentesting`, each with a `categories` array of `{id, label}`) and `CS_CARDS` (a flat array of `{track, cat, title, code, note}`). This is the single source of truth for all payload content. ~290 cards as of the last count — check `grep -c "track:'" assets/js/cheatsheets-data.js` for the current number.
- `assets/js/cheatsheets.js` — rendering/state: track switch, category multi-select filter, search, pagination (`PAGE_SIZE = 24`), the decoder-tool mode toggle, and the live variable substitution system.
- **Variable substitution**: a shared `VARS` object (`IP/DOMAIN/DC/USER/PASS/HASH` for pentesting, `DOMAIN` shared with bug bounty) is spliced into card code via `code.replace(/\{(IP|DOMAIN|DC|USER|PASS|HASH)\}/g, ...)`. Unset variables are left as the literal `{TOKEN}` in the rendered command rather than being blanked or filled with fake example data — this was an explicit user preference (only `IP` ships with a non-empty default).
- **Deep linking**: `cheatsheets.html?track=...&cat=...&q=...` is read via `URLSearchParams` on load and drives initial state — this is how the home-page search results link directly into a filtered/searched view.
- `assets/js/decoder.js` — a self-contained encode/decode/hash tool (base64/url/html/hex/binary/decimal/unicode/base32/rot13/rot47/morse/xor/jwt-decode/md5/sha1/256/512), rendered as CLI-flag-style buttons inside the same page (`#cs-decoder`), toggled via `showDecoder()`/`showBrowser()` in `cheatsheets.js`. Deliberately has zero emoji/hacking-cliché iconography per user preference.

### Home-page search (`assets/js/site-index.js` + `assets/js/home-search.js`)

`site-index.js` is a **generated, hand-off-limits file** — regenerate it, don't hand-edit it. It holds `SITE_LINKS` (external links scraped from the static pages) and `SITE_CS_GROUPS` (cheatsheet categories with title-only arrays, no code/notes — kept deliberately light so the home page never loads the full payload dataset). Whenever `CS_CARDS` or `CS_TRACKS` changes, regenerate `SITE_CS_GROUPS` with a small Python regex script (parse `CS_TRACKS` for category labels, parse `CS_CARDS` for `{track, cat, title}`, group titles by category, emit the JS array) — this pattern has been used repeatedly in this repo's history rather than hand-transcribing, to avoid transcription errors. `home-search.js` flattens both arrays into one in-memory index at load and filters on `label`/`desc` substring match, building result rows via `createElement`/`textContent` only.

### Styling (`style.css`)

Single stylesheet, CSS custom properties in `:root` (`--black`, `--border`, `--fg*`, `--red*`, `--mono`). Two rules worth knowing before touching layout:

- `[hidden]{display:none !important;}` — a global override. Without it, `[hidden]` loses to any author rule setting `display:flex/grid` on the same element (UA-stylesheet vs author-stylesheet specificity), which silently breaks show/hide toggles.
- `.term-window{overflow:hidden}` (for rounded corners) breaks `position:sticky` on any descendant, because it makes the window a non-scrolling scroll-container ancestor. Where sticky is needed inside a `.term-window` (e.g. the cheatsheets sidebar), override with `overflow:visible` on that specific instance and reapply `border-radius` directly on `.term-bar` to keep the rounded-corner look.

### Security posture

`_headers` (Cloudflare Pages format) carries a strict CSP (`default-src 'self'`, no third-party script/style/font origins), X-Frame-Options, HSTS, COOP/CORP, Permissions-Policy, etc. Rules this repo follows to stay clean against that CSP:

- Never use `innerHTML` with dynamic data — always `createElement`/`textContent`, or assign to `.value` on form fields. All dynamic rendering in this repo (search results, cheatsheet cards, decoder output) already follows this.
- Any new external `fetch()` destination must be added to `connect-src` in `_headers`. Currently only `/cdn-cgi/trace` (same-origin) and `https://api.ipify.org` (fallback for visitor IP when not served through Cloudflare) are used.
- All external links use `target="_blank" rel="noopener noreferrer"`.
- Fonts are self-hosted (`assets/fonts/JetBrainsMono.woff2`) specifically to avoid a third-party font CDN request.

### Deployment

Cloudflare Pages, connected to the `main` branch of `iorert71/web-mmr` on GitHub, auto-deploys on push. No build command, no build output directory override needed — it's a static root (`Framework preset: None`, `Build output directory: /`). `*.pages.dev` URLs (including other people's, e.g. `workers-sdk.pages.dev`) are known to be unreachable from some Spanish ISPs (Movistar/Vodafone/Orange) due to LaLiga anti-piracy IP-range blocking colliding with Cloudflare's shared Pages anycast range (`188.114.96.0/20`) — this is an ISP-side issue, not a deployment misconfiguration, and is documented on Cloudflare's community forum. `*.workers.dev` and Cloudflare's main CDN ranges are unaffected.
