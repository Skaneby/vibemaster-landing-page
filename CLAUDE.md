# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A static, single-page marketing site for Vibemaster (vibemaster.ai), deployed to GitHub Pages (see `CNAME`). No backend, no framework, no package.json. Just HTML, a Tailwind-built CSS bundle, and a vanilla-JS i18n layer.

## Run / build

There is no `npm`/`yarn` toolchain. The only build step is Tailwind.

```bash
# Serve locally (any static server works)
python3 -m http.server 8080

# Rebuild Tailwind CSS (binary is gitignored — download once, then keep)
curl -sL https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64 \
  -o tailwindcss && chmod +x tailwindcss
./tailwindcss -i src/styles/input.css -o src/styles/output.css --watch
```

Tailwind v4 is in use (`output.css` declares `tailwindcss v4.2.0`). Use the standalone CLI binary, not a Node toolchain. After editing `src/styles/input.css`, regenerate `src/styles/output.css` and commit both — the deployed site loads `output.css` directly.

## File map

Production pages (served from GitHub Pages):
- `index.html` — the landing page. ~1000 lines, all sections inline. Loads `src/styles/output.css` and `src/scripts/i18n.js`.
- `villkor.html` — Swedish Terms & Privacy page. Self-contained styles in a `<style>` block plus `output.css`.
- `favicon.svg`, `robots.txt`, `sitemap.xml`, `llms.txt`, `CNAME` — static assets / SEO.

Source:
- `src/styles/input.css` — Tailwind v4 source. Defines the **Ivory Tactile** design tokens in `@theme` (background, ivory/bone/sand/rice surfaces, ink/charcoal/deep, olive/bronze/amber, etc.) and custom `@utility` blocks (`glass`, `neumorphic-raised`, `neumorphic-inset`, `gradient-button`, `signature-gradient`, `hero-glow`, `text-gradient`, `pro-gradient-border`).
- `src/styles/output.css` — generated bundle. Do not hand-edit.
- `src/styles/main.css` — leftover skeleton from initial scaffold; **not loaded by any page**. Ignore unless intentionally cleaning up.
- `src/scripts/i18n.js` — translation table + runtime applier (see below). The only meaningful JS.
- `src/scripts/main.js` — empty placeholder. Don't add behaviour here unless you also wire it into pages.
- `src/scripts/design-switcher.js` — disabled floating widget for switching between design previews; only loaded by `preview-stitch.html`.

Internal-only / gitignored (do not assume present, do not commit):
- `preview-stitch.html`, `compare.html` — alternate design preview & side-by-side comparison tool. `preview-stitch.html` uses Tailwind via CDN (`cdn.tailwindcss.com`) and a different palette (Space Grotesk, electric blue) — it is **not** production styling. `compare.html` is listed in `.gitignore`.
- `tasks/`, `documents/`, `.claude/`, `CLAUDE.MD` — all gitignored as "Internal / AI workflow". Note: `.gitignore` lists `CLAUDE.MD` (uppercase) which on Linux does not match this `CLAUDE.md`; if you want this file ignored, fix the casing.

## i18n — non-obvious, touch carefully

`src/scripts/i18n.js` is a single ~1750-line file with translation tables for **7 languages**: `en, sv, de, es, fr, hi, zh`. English is the default and the source of truth.

How it works:
- On `DOMContentLoaded`, `detectLanguage()` reads `localStorage["vm-lang"]`, falls back to `navigator.languages`, defaults to `en`.
- `applyTranslations(lang)` walks the DOM and substitutes content based on attributes:
  - `data-i18n` → `el.textContent`
  - `data-i18n-html` → `el.innerHTML` (used where copy contains markup)
  - `data-i18n-placeholder` → `el.placeholder`
  - `data-i18n-src` → `el.src` (used for the localized YouTube embed in the hero video)
- The header language picker calls `vmSetLang(lang)` (exposed on `window`), which persists the choice and re-applies translations without reload.

Rules when editing copy:
- **Every user-visible string lives in `i18n.js`**, not in HTML. The HTML `data-i18n` element holds the English fallback for SEO/no-JS; the displayed text comes from the table.
- When you add a new key, add it to **all 7 language blocks**. Missing keys silently fall back to whatever the HTML contained.
- When you change `i18n.js`, bump the cache-busting query string in `index.html` (`<script src="src/scripts/i18n.js?v=13">` → `v=14`). Recent commits show this is the established pattern.
- The mobile nav and language dropdown have separate `[data-lang-btn="..."]` buttons that get their active state styled by `applyTranslations`; if you add a language, update both menus and the `translations` object.

## Styling conventions

- The production palette is the **Ivory Tactile** theme defined in `input.css @theme`. Use those tokens (`bg-ivory`, `text-ink`, `border-mist`, `text-moss`, `text-stone`, `bg-sand`, `text-bronze`, etc.) rather than raw Tailwind colours.
- Page-specific tweaks (animations, custom `.card-tactile`, `.btn-ink`, `.faq-row`, etc.) are kept in inline `<style>` blocks in each HTML file, not in shared CSS. Follow that pattern instead of adding to `input.css` for one-off rules.
- Icons are inline SVG `<symbol>`s in a sprite at the top of each page, referenced via `<use href="#i-..."/>`. Add new icons to the sprite rather than pulling in an icon library — CSP forbids it.
- The site is mobile-first. Header collapses into a `#mobile-nav` panel toggled by `#nav-toggle`; the wiring lives at the bottom of `index.html`.

## CSP — affects what you can add

`index.html` and `villkor.html` ship with a strict Content-Security-Policy meta tag:
- `connect-src 'none'` — **no fetch/XHR/WebSocket at runtime**. Don't add analytics SDKs, form posts, etc., without updating CSP.
- `script-src 'self' 'unsafe-inline'` — inline `<script>` is fine; external scripts will be blocked. (`preview-stitch.html` allows `cdn.tailwindcss.com`, but it's not production.)
- `frame-src https://www.youtube.com https://www.youtube-nocookie.com` — YouTube embeds only.
- `img-src 'self' data: https://lh3.googleusercontent.com` — Google avatar host is whitelisted for testimonials.
- Fonts come from Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) and are explicitly allowed.

If you add a new external resource, update the CSP in **both** `index.html` and `villkor.html`.

## SEO / structured data

`index.html` carries a substantial JSON-LD `@graph` (SoftwareApplication, Organization, WebSite, FAQPage). When pricing, plan names, language list, or FAQ copy changes, update the JSON-LD too — it is not generated. `llms.txt` is the AI-crawler summary; keep it in sync with hero/pricing copy. `sitemap.xml` only lists `/` and `/villkor.html`.

## Commit style

Recent history uses short, prefixed messages: `Feature:`, `Fix:`, `Copy:`, `i18n:`, `Pricing:`, `Hero:`, `Footer:`, `Design overhaul:`, `SEO/GEO:`. Match the prefix to the area touched and keep the subject under ~70 chars.
