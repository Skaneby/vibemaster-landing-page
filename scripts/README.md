# Scripts

## Locale build (`build-locales.mjs`)

Generates one fully server-rendered static HTML page per supported
language from `index.html` + the translations in `src/scripts/i18n.js`:

- `en` → overwrites the root `index.html` in place (`https://vibemaster.ai/`)
- `sv` → `sv/index.html`, `de` → `de/index.html`, `es` → `es/index.html`,
  `fr` → `fr/index.html`, `hi` → `hi/index.html`, `zh` → `zh/index.html`

Why this exists: the site used to switch languages entirely client-side —
one URL, with JavaScript swapping the text in after load. Search engines
and AI crawlers mostly don't execute that JS, so only English was ever
actually discoverable, no matter how many languages the UI supported. This
script bakes each locale's translated text, `<title>`, meta description,
OG/Twitter tags, hreflang alternates, and JSON-LD directly into its own
real, crawlable URL — `curl https://vibemaster.ai/sv/` returns the full
Swedish page, no JS required.

**This is the single source of truth for what ships.** Re-run it after
*any* change to `index.html`'s structure or to the translations object in
`i18n.js`:

```bash
npm install        # first time only (installs Playwright)
npm run build:locales
```

Do not hand-edit the generated `sv/`, `de/`, `es/`, `fr/`, `hi/`, `zh/`
files, or the translated sections of the root `index.html` — they will be
silently overwritten next run. Edit `index.html`'s structure/markup and
`src/scripts/i18n.js`'s translation strings instead.

### How it works

1. Extracts the `translations` object out of `i18n.js` (between the
   `@i18n-data-start` / `@i18n-data-end` markers) so there's exactly one
   copy of the translation data, shared by the runtime language switcher
   and this build script.
2. Spins up a throwaway local static file server (plain Node `http`, no
   dependency) so root-absolute asset paths like `/src/scripts/i18n.js`
   resolve exactly as they will on the real domain. This matters: under a
   bare `file://` URL a leading `/` resolves to the OS filesystem root, not
   the repo root, so this step isn't optional.
3. For each locale, loads the template into a real headless Chromium page
   and calls the page's own `window.applyTranslations(locale)` — the exact
   function the language switcher uses at runtime — so the generated
   output can never drift from what a real visitor's browser would render.
4. Rewrites `<title>`, meta description, canonical, OG/Twitter tags,
   `og:locale` (+ alternates), hreflang `<link>` tags for all 7 locales
   plus `x-default`, and the JSON-LD block (Organization / WebSite /
   SoftwareApplication share one `@id` each across all locale pages —
   same real-world entities, just described in different languages;
   FAQPage gets its own per-page `@id` and mirrors the visible on-page
   Q&A text exactly).
5. Serializes the resulting DOM back to an HTML string and writes it out.

### Adding a new locale

1. Add the language's key block to the `translations` object in
   `src/scripts/i18n.js` (copy an existing locale's keys).
2. Add it to `localePaths` in `i18n.js`.
3. Add it to `LOCALES`, `LOCALE_PATH`, and `OG_LOCALE` in
   `build-locales.mjs`.
4. Run `npm run build:locales`.

## OG image (`build-og-image.mjs`)

Regenerates `assets/og/vibemaster-og.png` (1200×630, the standard Open
Graph / Twitter Card size) from the same ivory/olive design language as
the rest of the site. Deliberately language-neutral — logo, wordmark, and
a short symbolic "Idea → Spec → Build" line, no long English sentence
baked into the pixels — so the one image reads fine regardless of which
locale's link is being shared; the actual localized copy comes from each
page's own `og:title` / `og:description`.

```bash
npm run build:og   # or: node scripts/build-og-image.mjs
```

## PageSpeed Insights (`pagespeed.mjs`)

Runs Google's PageSpeed Insights API against a URL on both mobile and
desktop, saves the raw JSON, and writes a concise markdown summary that
Claude (or a human) can read to plan performance improvements.

### Requirements

- Node.js 20+ (uses the built-in `fetch`; no npm dependencies)
- Optional: a PageSpeed Insights API key. Without one, calls use the
  public unauthenticated quota (fine for occasional runs).

Get a key: <https://developers.google.com/speed/docs/insights/v5/get-started>

### Local usage

```bash
# Default target is https://vibemaster.ai
node scripts/pagespeed.mjs

# Custom URL
node scripts/pagespeed.mjs https://vibemaster.ai/compare.html

# With an API key
PAGESPEED_API_KEY=YOUR_KEY node scripts/pagespeed.mjs

# Only one strategy
node scripts/pagespeed.mjs https://vibemaster.ai --strategy=mobile
```

Outputs land in `reports/pagespeed/`:

- `YYYY-MM-DD_HH-MM-SS_<host>-mobile.json` — raw Lighthouse JSON (mobile)
- `YYYY-MM-DD_HH-MM-SS_<host>-desktop.json` — raw Lighthouse JSON (desktop)
- `YYYY-MM-DD_HH-MM-SS_<host>.md` — timestamped markdown summary
- `latest.md` — a copy of the most recent summary, so Claude can just
  read `reports/pagespeed/latest.md`

### Scheduled runs

`.github/workflows/pagespeed.yml` runs the script every Monday at
06:00 UTC (and on manual dispatch), uploads the reports as a workflow
artifact, and commits the `reports/pagespeed/` folder back to the repo
so history is visible in git.

To enable authenticated calls in CI, add a repository secret named
`PAGESPEED_API_KEY`.

### How Claude uses the output

Ask Claude something like:

> Read `reports/pagespeed/latest.md` and propose the top 5 changes to
> `index.html` and `src/styles/main.css` that will improve the mobile
> Performance score.

Claude can then cross-reference the opportunities in the report against
the actual HTML/CSS/JS in this repo.
