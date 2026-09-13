#!/usr/bin/env node
// Generates one fully server-rendered static HTML page per supported locale
// from index.html + the translations in src/scripts/i18n.js.
//
//   en -> overwrites the root index.html in place (canonical https://vibemaster.ai/)
//   sv -> /sv/index.html   de -> /de/index.html   es -> /es/index.html
//   fr -> /fr/index.html   hi -> /hi/index.html   zh -> /zh/index.html
//
// Why: the site used to switch languages entirely client-side (one URL,
// text swapped in by JS after load). Search engines and AI crawlers mostly
// don't execute that JS, so only English was ever actually discoverable.
// This script bakes each locale's translated text, <title>, meta
// description, OG/Twitter tags, hreflang alternates, and JSON-LD directly
// into its own real, crawlable URL.
//
// This is the single source of truth for what ships — re-run it after ANY
// change to index.html's structure or to the translations in i18n.js.
// Do not hand-edit the generated /sv/, /de/, /es/, /fr/, /hi/, /zh/ files;
// they will be silently overwritten next run.
//
// Usage: node scripts/build-locales.mjs

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createServer } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATE_PATH = join(ROOT, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Root-absolute paths (/src/scripts/i18n.js) only resolve correctly against
// an actual server root — under file://, a leading "/" resolves to the OS
// filesystem root, not the repo. This tiny static server makes Playwright
// see exactly what the real site (vibemaster.ai/...) sees.
function startStaticServer(rootDir) {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(rootDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const SITE = 'https://vibemaster.ai';
const OG_IMAGE = `${SITE}/assets/og/vibemaster-og.png`;

const LOCALES = ['en', 'sv', 'de', 'es', 'fr', 'hi', 'zh'];
const LOCALE_PATH = { en: '/', sv: '/sv/', de: '/de/', es: '/es/', fr: '/fr/', hi: '/hi/', zh: '/zh/' };
const OG_LOCALE = { en: 'en_US', sv: 'sv_SE', de: 'de_DE', es: 'es_ES', fr: 'fr_FR', hi: 'hi_IN', zh: 'zh_CN' };

// English keeps its deliberately-written, higher-CTR copy. Every other
// locale reuses hero.sub — already professionally translated in i18n.js —
// as its meta description / OG description / JSON-LD description, so all
// four stay verbatim-consistent within each language without inventing new
// marketing translations that can't be verified here.
const EN_DESCRIPTION =
  "Vibemaster interviews you, writes the product spec, and hands it to Lovable, Cursor, Bolt or Replit — no vague prompts, no broken builds.";
const EN_TITLE = 'Vibemaster — Turn your idea into a spec AI can build';

function extractTranslations() {
  const src = readFileSync(join(ROOT, 'src/scripts/i18n.js'), 'utf8');
  const start = src.indexOf('// @i18n-data-start');
  const end = src.indexOf('// @i18n-data-end');
  if (start === -1 || end === -1) {
    throw new Error('i18n.js: @i18n-data-start/@i18n-data-end markers not found');
  }
  const chunk = src.slice(start, end);
  const objStart = chunk.indexOf('const translations = ') + 'const translations = '.length;
  const literal = chunk.slice(objStart).trim().replace(/;\s*$/, '');
  // eslint-disable-next-line no-new-func -- trusted, repo-local data file, not user input
  return new Function(`return (${literal});`)();
}

function faqEntity(t, pageUrl) {
  const mainEntity = [];
  for (let i = 1; i <= 6; i++) {
    const q = t[`faq.q${i}`];
    const a = t[`faq.a${i}`];
    if (!q || !a) continue;
    mainEntity.push({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    });
  }
  return { '@type': 'FAQPage', '@id': `${pageUrl}#faq`, mainEntity };
}

function buildJsonLd(locale, t, pageUrl, description) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'Vibemaster',
        url: `${SITE}/`,
        description,
        areaServed: 'Worldwide',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: 'Vibemaster',
        url: `${SITE}/`,
        inLanguage: LOCALES,
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE}/#software`,
        name: 'Vibemaster',
        url: `${SITE}/`,
        description,
        applicationCategory: 'ProductivityApplication',
        operatingSystem: 'Web',
        inLanguage: locale,
        publisher: { '@id': `${SITE}/#organization` },
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'EUR',
            description: '1 project per month, basic technical specs, Markdown export',
          },
          {
            '@type': 'Offer',
            name: 'Professional',
            price: '9',
            priceCurrency: 'EUR',
            description: 'Unlimited projects, version history, PDF & Markdown export, priority generation queue',
          },
        ],
      },
      faqEntity(t, pageUrl),
    ],
  };
}

async function main() {
  const translations = extractTranslations();
  const templateHtml = readFileSync(TEMPLATE_PATH, 'utf8');

  const server = await startStaticServer(ROOT);
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage();
  // One real navigation establishes the http origin so root-absolute paths
  // (/src/..., /favicon.svg) resolve exactly as they will on the real site.
  await page.goto(origin + '/', { waitUntil: 'networkidle' });

  for (const locale of LOCALES) {
    const t = translations[locale];
    if (!t) throw new Error(`No translations for locale "${locale}"`);

    const pagePath = LOCALE_PATH[locale];
    const pageUrl = `${SITE}${pagePath}`;
    const title = locale === 'en' ? EN_TITLE : `Vibemaster — ${t['hero.h1.a']} ${t['hero.h1.b']}`;
    const description = locale === 'en' ? EN_DESCRIPTION : t['hero.sub'];
    const jsonLd = buildJsonLd(locale, t, pageUrl, description);
    const jsonLdText = JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c');

    // Always start from the pristine on-disk template, never from a
    // previous iteration's output (important: the English pass overwrites
    // index.html on disk, so re-reading from disk mid-loop would poison
    // later locales with English's already-baked hreflang/JSON-LD).
    await page.setContent(templateHtml, { waitUntil: 'networkidle' });

    const html = await page.evaluate(
      ({ locale, pageUrl, title, description, jsonLdText, locales, localePath, ogLocale, ogImage }) => {
        window.applyTranslations(locale);
        document.documentElement.lang = locale;

        document.title = title;
        const setMeta = (selector, attr, value) => {
          const el = document.querySelector(selector);
          if (el) el.setAttribute(attr, value);
        };
        setMeta('meta[name="description"]', 'content', description);
        setMeta('link[rel="canonical"]', 'href', pageUrl);
        setMeta('meta[property="og:url"]', 'content', pageUrl);
        setMeta('meta[property="og:title"]', 'content', title);
        setMeta('meta[property="og:description"]', 'content', description);
        setMeta('meta[property="og:image"]', 'content', ogImage);
        setMeta('meta[name="twitter:title"]', 'content', title);
        setMeta('meta[name="twitter:description"]', 'content', description);
        setMeta('meta[name="twitter:image"]', 'content', ogImage);

        let ogLocaleTag = document.querySelector('meta[property="og:locale"]');
        if (!ogLocaleTag) {
          ogLocaleTag = document.createElement('meta');
          ogLocaleTag.setAttribute('property', 'og:locale');
          document.querySelector('meta[property="og:image"]').after(ogLocaleTag);
        }
        ogLocaleTag.setAttribute('content', ogLocale[locale]);
        document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((el) => el.remove());
        for (const l of locales) {
          if (l === locale) continue;
          const alt = document.createElement('meta');
          alt.setAttribute('property', 'og:locale:alternate');
          alt.setAttribute('content', ogLocale[l]);
          ogLocaleTag.after(alt);
        }

        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
        const iconLink = document.querySelector('link[rel="icon"]');
        for (const l of locales) {
          const link = document.createElement('link');
          link.setAttribute('rel', 'alternate');
          link.setAttribute('hreflang', l);
          link.setAttribute('href', `https://vibemaster.ai${localePath[l]}`);
          iconLink.before(link);
        }
        const xdefault = document.createElement('link');
        xdefault.setAttribute('rel', 'alternate');
        xdefault.setAttribute('hreflang', 'x-default');
        xdefault.setAttribute('href', 'https://vibemaster.ai/');
        iconLink.before(xdefault);

        const ld = document.querySelector('script[type="application/ld+json"]');
        if (ld) ld.textContent = jsonLdText;

        return '<!DOCTYPE html>\n' + document.documentElement.outerHTML + '\n';
      },
      {
        locale,
        pageUrl,
        title,
        description,
        jsonLdText,
        locales: LOCALES,
        localePath: LOCALE_PATH,
        ogLocale: OG_LOCALE,
        ogImage: OG_IMAGE,
      },
    );

    const outPath = locale === 'en' ? TEMPLATE_PATH : join(ROOT, locale, 'index.html');
    if (locale !== 'en') mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.log('wrote', outPath.replace(ROOT + '/', ''));
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
