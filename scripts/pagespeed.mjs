#!/usr/bin/env node
// Query Google PageSpeed Insights API for a URL on mobile + desktop,
// save the raw JSON and a concise markdown summary under reports/pagespeed/.
//
// Usage:
//   node scripts/pagespeed.mjs [url] [--strategy=mobile|desktop|both]
//   PAGESPEED_API_KEY=... node scripts/pagespeed.mjs https://vibemaster.ai
//
// The API key is optional (unauthenticated calls are rate-limited but work).
// Get a key at https://developers.google.com/speed/docs/insights/v5/get-started

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const REPORTS_DIR = join(REPO_ROOT, 'reports', 'pagespeed')

const API_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

const args = process.argv.slice(2)
const url =
  args.find((a) => !a.startsWith('--')) ?? 'https://vibemaster.ai'
const strategyArg =
  args.find((a) => a.startsWith('--strategy='))?.split('=')[1] ?? 'both'
const strategies =
  strategyArg === 'both' ? ['mobile', 'desktop'] : [strategyArg]

const apiKey = process.env.PAGESPEED_API_KEY

async function runPagespeed(target, strategy) {
  const params = new URLSearchParams({ url: target, strategy })
  for (const c of CATEGORIES) params.append('category', c)
  if (apiKey) params.set('key', apiKey)

  const res = await fetch(`${API_ENDPOINT}?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `PageSpeed API ${strategy} failed: ${res.status} ${res.statusText}\n${body}`,
    )
  }
  return res.json()
}

function pct(n) {
  return n == null ? 'n/a' : `${Math.round(n * 100)}`
}

function fmtMetric(audit) {
  if (!audit) return 'n/a'
  return audit.displayValue ?? audit.numericValue ?? 'n/a'
}

function summarize(data, strategy) {
  const lr = data.lighthouseResult ?? {}
  const cats = lr.categories ?? {}
  const audits = lr.audits ?? {}

  const scores = {
    performance: pct(cats.performance?.score),
    accessibility: pct(cats.accessibility?.score),
    bestPractices: pct(cats['best-practices']?.score),
    seo: pct(cats.seo?.score),
  }

  const coreVitals = {
    LCP: fmtMetric(audits['largest-contentful-paint']),
    FCP: fmtMetric(audits['first-contentful-paint']),
    CLS: fmtMetric(audits['cumulative-layout-shift']),
    TBT: fmtMetric(audits['total-blocking-time']),
    TTI: fmtMetric(audits['interactive']),
    SI: fmtMetric(audits['speed-index']),
  }

  const opportunities = Object.values(audits)
    .filter((a) => a.details?.type === 'opportunity' && a.numericValue > 0)
    .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      title: a.title,
      savingsMs: Math.round(a.numericValue ?? 0),
      description: a.description,
    }))

  const diagnostics = Object.values(audits)
    .filter(
      (a) =>
        a.score !== null &&
        a.score !== 1 &&
        a.details?.type !== 'opportunity' &&
        ['diagnostic', 'table'].includes(a.details?.type),
    )
    .slice(0, 10)
    .map((a) => ({ id: a.id, title: a.title, score: a.score }))

  return { strategy, scores, coreVitals, opportunities, diagnostics }
}

function toMarkdown(summaries, url, timestamp) {
  const lines = []
  lines.push(`# PageSpeed Insights report`)
  lines.push('')
  lines.push(`- URL: ${url}`)
  lines.push(`- Timestamp: ${timestamp}`)
  lines.push('')

  for (const s of summaries) {
    lines.push(`## ${s.strategy.toUpperCase()}`)
    lines.push('')
    lines.push('### Scores')
    lines.push(`| Category | Score |`)
    lines.push(`|---|---|`)
    lines.push(`| Performance | ${s.scores.performance} |`)
    lines.push(`| Accessibility | ${s.scores.accessibility} |`)
    lines.push(`| Best Practices | ${s.scores.bestPractices} |`)
    lines.push(`| SEO | ${s.scores.seo} |`)
    lines.push('')
    lines.push('### Core Web Vitals & timings')
    lines.push(`| Metric | Value |`)
    lines.push(`|---|---|`)
    for (const [k, v] of Object.entries(s.coreVitals)) {
      lines.push(`| ${k} | ${v} |`)
    }
    lines.push('')

    if (s.opportunities.length) {
      lines.push('### Top opportunities (potential savings)')
      lines.push(`| Audit | Est. savings (ms) | Title |`)
      lines.push(`|---|---|---|`)
      for (const o of s.opportunities) {
        lines.push(`| \`${o.id}\` | ${o.savingsMs} | ${o.title} |`)
      }
      lines.push('')
    }

    if (s.diagnostics.length) {
      lines.push('### Diagnostics (non-passing)')
      lines.push(`| Audit | Score |`)
      lines.push(`|---|---|`)
      for (const d of s.diagnostics) {
        lines.push(`| \`${d.id}\` | ${d.score ?? 'n/a'} |`)
      }
      lines.push('')
    }
  }

  lines.push('---')
  lines.push(
    'Full raw responses are stored alongside this file as `*-mobile.json` / `*-desktop.json`.',
  )
  return lines.join('\n')
}

async function main() {
  await mkdir(REPORTS_DIR, { recursive: true })

  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const slug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-')
  const base = `${stamp}_${slug}`

  console.log(`Running PageSpeed Insights for ${url} (${strategies.join(', ')})`)
  if (!apiKey) {
    console.log('No PAGESPEED_API_KEY set — using unauthenticated quota.')
  }

  const summaries = []
  for (const strategy of strategies) {
    console.log(`  → ${strategy} ...`)
    const data = await runPagespeed(url, strategy)
    const rawPath = join(REPORTS_DIR, `${base}-${strategy}.json`)
    await writeFile(rawPath, JSON.stringify(data, null, 2))
    console.log(`    saved ${rawPath}`)
    summaries.push(summarize(data, strategy))
  }

  const md = toMarkdown(summaries, url, now.toISOString())
  const mdPath = join(REPORTS_DIR, `${base}.md`)
  const latestPath = join(REPORTS_DIR, 'latest.md')
  await writeFile(mdPath, md)
  await writeFile(latestPath, md)
  console.log(`Wrote ${mdPath}`)
  console.log(`Wrote ${latestPath}`)
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err)
  process.exit(1)
})
