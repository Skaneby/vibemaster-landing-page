# Scripts

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
