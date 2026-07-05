# Vibemaster Landing Page

Landing page for [Vibe-Researcher](https://github.com) — replace with actual link.

## Project structure

```
vibemaster-landing-page/
├── index.html          # Main entry point
├── src/
│   ├── styles/
│   │   └── main.css    # Global styles
│   └── scripts/
│       └── main.js     # JavaScript
├── assets/
│   ├── images/         # Images and icons
│   └── fonts/          # Custom fonts (if any)
└── README.md
```

## Development

Open `index.html` directly in a browser, or use a simple local server:

```bash
# Python (usually pre-installed)
python3 -m http.server 8080

# Then open http://localhost:8080
```

## Deployment

Static site — can be deployed to GitHub Pages, Netlify, Vercel, or any static host.

## Performance auditing

`scripts/pagespeed.mjs` runs the Google PageSpeed Insights API against the
live site and saves reports under `reports/pagespeed/`. Claude can read
`reports/pagespeed/latest.md` to plan targeted improvements.

```bash
# no dependencies, Node 20+
node scripts/pagespeed.mjs
```

See `scripts/README.md` for details. A GitHub Action
(`.github/workflows/pagespeed.yml`) runs weekly and on manual dispatch;
add a `PAGESPEED_API_KEY` repo secret to use an authenticated quota.
