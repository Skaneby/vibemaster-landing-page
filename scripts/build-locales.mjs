#!/usr/bin/env node
// Builds one static, fully translated page per language from src/page.html
// and the translations in src/scripts/i18n.js:
//
//   en -> /index.html     sv -> /sv/index.html   de -> /de/index.html
//   es -> /es/index.html  fr -> /fr/index.html   hi -> /hi/index.html
//   zh -> /zh/index.html
//
// Why: the language switcher used to swap text with JavaScript after load,
// on one URL. Search engines and AI crawlers mostly don't run that script,
// so only English was discoverable. Each generated page has its text, <title>,
// meta description, Open Graph tags, hreflang links and JSON-LD baked in.
//
// Edit src/page.html and src/scripts/i18n.js — never the generated pages —
// then run:  node scripts/build-locales.mjs
//
// The page's own scripts are NOT run during the build (JavaScript is disabled
// in the headless browser); only applyTranslations() from i18n.js is, so no
// runtime DOM changes leak into the output.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://vibemaster.ai';
const LOCALES = ['en', 'sv', 'de', 'es', 'fr', 'hi', 'zh'];
const PATHS = { en: '/', sv: '/sv/', de: '/de/', es: '/es/', fr: '/fr/', hi: '/hi/', zh: '/zh/' };
const OG_LOCALE = { en: 'en_US', sv: 'sv_SE', de: 'de_DE', es: 'es_ES', fr: 'fr_FR', hi: 'hi_IN', zh: 'zh_CN' };

// Playwright: local install if present, otherwise the global one.
async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(join(globalRoot, 'noop.js'))('playwright');
}

function readI18n() {
  const src = readFileSync(join(ROOT, 'src/scripts/i18n.js'), 'utf8');
  const start = src.indexOf('// @i18n-data-start');
  const end = src.indexOf('// @i18n-data-end');
  if (start < 0 || end < 0) throw new Error('i18n.js: @i18n-data markers not found');
  const data = src.slice(start, end);
  const fnStart = src.indexOf('function applyTranslations(');
  const fnEnd = src.indexOf('\n}\n', fnStart) + 2;
  if (fnStart < 0) throw new Error('i18n.js: applyTranslations() not found');
  const translations = new Function(`${data}; return translations;`)();
  return { translations, applyTranslationsSrc: src.slice(fnStart, fnEnd) };
}

function jsonLdFor(templateLd, locale, t, faqNums, description) {
  const ld = JSON.parse(templateLd);
  const url = SITE + PATHS[locale];
  for (const node of ld['@graph']) {
    if (node['@type'] === 'SoftwareApplication') {
      node['@id'] = `${SITE}/#software`;
      node.description = description;
      node.inLanguage = locale;
    } else if (node['@type'] === 'Organization') {
      node['@id'] = `${SITE}/#organization`;
    } else if (node['@type'] === 'WebSite') {
      node['@id'] = `${SITE}/#website`;
      node.inLanguage = LOCALES;
    } else if (node['@type'] === 'FAQPage') {
      node['@id'] = `${url}#faq`;
      node.inLanguage = locale;
      // Mirror exactly the questions visible on the page, in this language.
      node.mainEntity = faqNums.map((n) => ({
        '@type': 'Question',
        name: t[`faq.q${n}`],
        acceptedAnswer: { '@type': 'Answer', text: t[`faq.a${n}`] },
      }));
    }
  }
  return JSON.stringify(ld, null, 2).replace(/</g, '\\u003c');
}

async function main() {
  const { translations, applyTranslationsSrc } = readI18n();
  const template = readFileSync(join(ROOT, 'src/page.html'), 'utf8');
  const templateLd = template.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const faqNums = [...new Set([...template.matchAll(/data-i18n="faq\.q(\d+)"/g)].map((m) => m[1]))];
  const enTitle = template.match(/<title>([^<]*)<\/title>/)[1];
  const enDesc = template.match(/<meta name="description" content="([^"]*)"/)[1];

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    const t = translations[locale];
    for (const n of faqNums) {
      if (!t[`faq.q${n}`] || !t[`faq.a${n}`]) throw new Error(`${locale}: faq.q${n}/a${n} missing`);
    }
    const url = SITE + PATHS[locale];
    const sep = locale === 'zh' ? '' : ' '; // Chinese is written without spaces
    const title = locale === 'en' ? enTitle : `Vibemaster — ${t['hero.h1.a']}${sep}${t['hero.h1.b']}`;
    const description = locale === 'en' ? enDesc : t['hero.sub'];
    const ld = jsonLdFor(templateLd, locale, t, faqNums, description);

    await page.setContent(template, { waitUntil: 'domcontentloaded' });
    const html = await page.evaluate(
      ({ translations, fnSrc, locale, url, title, description, ld, LOCALES, PATHS, OG_LOCALE, SITE }) => {
        const applyTranslations = new Function('translations', `${fnSrc}; return applyTranslations;`)(translations);
        applyTranslations(locale);

        const set = (sel, attr, val) => document.querySelector(sel)?.setAttribute(attr, val);
        document.title = title;
        set('meta[name="description"]', 'content', description);
        set('link[rel="canonical"]', 'href', url);
        set('meta[property="og:url"]', 'content', url);
        set('meta[property="og:title"]', 'content', title);
        set('meta[property="og:description"]', 'content', description);
        set('meta[name="twitter:title"]', 'content', title);
        set('meta[name="twitter:description"]', 'content', description);

        const anchor = document.querySelector('link[rel="canonical"]');
        const add = (tag, attrs) => {
          const el = document.createElement(tag);
          for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
          anchor.after(el);
        };
        // Added in reverse so they end up in reading order after <link rel="canonical">.
        add('link', { rel: 'alternate', hreflang: 'x-default', href: SITE + '/' });
        for (const l of [...LOCALES].reverse()) add('link', { rel: 'alternate', hreflang: l, href: SITE + PATHS[l] });

        const ogImage = document.querySelector('meta[property="og:image"]');
        for (const l of LOCALES.filter((l) => l !== locale).reverse()) {
          const el = document.createElement('meta');
          el.setAttribute('property', 'og:locale:alternate');
          el.setAttribute('content', OG_LOCALE[l]);
          ogImage.before(el);
        }
        const ogLocale = document.createElement('meta');
        ogLocale.setAttribute('property', 'og:locale');
        ogLocale.setAttribute('content', OG_LOCALE[locale]);
        document.querySelector('meta[property="og:locale:alternate"]').before(ogLocale);

        document.querySelector('script[type="application/ld+json"]').textContent = `\n${ld}\n  `;
        return document.documentElement.outerHTML + '\n';
      },
      { translations, fnSrc: applyTranslationsSrc, locale, url, title, description, ld, LOCALES, PATHS, OG_LOCALE, SITE },
    );

    const out = locale === 'en' ? join(ROOT, 'index.html') : join(ROOT, locale, 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, '<!DOCTYPE html>\n<!-- GENERATED by scripts/build-locales.mjs from src/page.html — do not edit -->\n' + html);
    console.log('wrote', out.slice(ROOT.length + 1));
  }

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
