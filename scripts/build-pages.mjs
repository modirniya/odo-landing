/**
 * Wraps each fragment in src/pages/ in src/layout.html and writes it out as a
 * clean-URL directory (src/pages/foo.html -> foo/index.html), except 404.html
 * which GitHub Pages only honours at the site root.
 *
 * The point is that the header, footer, icon links and social tags live in ONE
 * file. index.html and support/index.html are hand-written and carry their own
 * copies — they are too bespoke to template — so if you change the nav or the
 * footer, change it in three places: src/layout.html, index.html, support/.
 *
 * Each fragment starts with an HTML comment holding its metadata as JSON:
 *
 *   <!--meta
 *   { "slug": "...", "title": "...", "description": "...", "faq": [...] }
 *   -->
 *
 * Run with `npm run build:pages` (or `npm run build`, which does CSS too).
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://odometer.pro'

// Store links. The App Store href is the NeuEra developer page until Odometer's
// own listing is live — a badge that 404s is worse than one that lands on a
// page listing the app. Swap in https://apps.apple.com/app/id<APPLE_ID> once
// App Store Connect shows it (and update the two copies in index.html).
export const APP_STORE_URL = 'https://apps.apple.com/us/developer/neuera-apps/id1895216844'
const PLAY_URL = 'https://play.google.com/store/apps/details?id=pro.odometer.android'

// One Organization, identical on every page. index.html and support/ carry
// a pasted copy of this object — keep the three in step.
const ORG = {
  "@type": "Organization",
  "@id": "https://odometer.pro/#organization",
  "name": "Odometer",
  "legalName": "NeuEra Apps LLC",
  "url": "https://odometer.pro/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://odometer.pro/assets/icon.png",
    "width": 512,
    "height": 512
  },
  "email": "hello@neuera.app",
  "sameAs": [
    "https://play.google.com/store/apps/details?id=pro.odometer.android"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "hello@neuera.app",
    "url": "https://odometer.pro/support/",
    "availableLanguage": [
      "English"
    ]
  }
}

// Pages other than the home page reference the app by @id; a bare @id that
// resolves nowhere on the page conveys nothing, so they carry this stub.
const APP_STUB = {
  "@type": "MobileApplication",
  "@id": "https://odometer.pro/#app",
  "name": "Odometer: Simple Mileage Tracking",
  "url": "https://odometer.pro/",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Android"
}

const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

const layout = await readFile(join(ROOT, 'src/layout.html'), 'utf8')
const files = (await readdir(join(ROOT, 'src/pages'))).filter((f) => f.endsWith('.html')).sort()

/** Escape text for use inside <title> and attribute values. */
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Pull the leading <!--meta { ... } --> block off a fragment. */
function splitFragment(raw, file) {
  const match = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/)
  if (!match) throw new Error(`${file}: missing leading <!--meta ... --> block`)
  let meta
  try {
    meta = JSON.parse(match[1])
  } catch (err) {
    throw new Error(`${file}: meta block is not valid JSON — ${err.message}`)
  }
  for (const key of ['slug', 'title', 'description']) {
    if (!meta[key]) throw new Error(`${file}: meta is missing "${key}"`)
  }
  if (!meta.noindex && !meta.published) throw new Error(`${file}: indexable pages need "published" (YYYY-MM-DD)`)
  const body = raw.slice(match[0].length).trimEnd()
  // Every FAQ entry must exist verbatim in the visible markup — schema with
  // no visible counterpart is treated as spam. Fail the build on drift.
  if (meta.faq?.length) {
    const norm = (s) => s.replace(/<[^>]+>/g, '').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim()
    const summaries = [...body.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => norm(m[1]))
    const paras = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => norm(m[1]))
    for (const f of meta.faq) {
      if (!summaries.includes(norm(f.q))) throw new Error(`${file}: FAQ question not in body: ${f.q}`)
      if (!paras.some((p) => p.includes(norm(f.a)))) throw new Error(`${file}: FAQ answer not in body: ${f.q}`)
    }
  }
  return { meta, body }
}

/**
 * Structured data. Every page gets Article + BreadcrumbList; pages that declare
 * `faq` also get a FAQPage whose questions must match the markup in the body
 * (Google treats schema with no visible counterpart as spam).
 */
function structuredData(meta, canonical) {
  const graph = [
    {
      '@type': 'Article',
      '@id': `${canonical}#article`,
      headline: meta.heading || meta.title,
      description: meta.description,
      inLanguage: 'en',
      mainEntityOfPage: canonical,
      image: { '@type': 'ImageObject', url: `${SITE}/assets/og-default.png`, width: 1200, height: 630 },
      datePublished: meta.published,
      dateModified: meta.modified || meta.published,
      author: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: ORG.name },
      publisher: { '@id': `${SITE}/#organization` },
      about: { '@id': `${SITE}/#app` },
    },
    ORG,
    APP_STUB,
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Odometer', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: meta.breadcrumb || meta.heading || meta.title, item: canonical },
      ],
    },
  ]

  if (meta.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: meta.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }

  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
  return `    <script type="application/ld+json">\n${json}\n    </script>`
}

/** Visible byline under the h1 — the on-page counterpart of datePublished. */
function dateline(meta) {
  const updated = meta.modified && meta.modified !== meta.published
    ? ` &middot; Updated <time datetime="${meta.modified}">${fmtDate(meta.modified)}</time>`
    : ''
  return `<p class="text-sm text-gray-500 mb-8"><time datetime="${meta.published}">Published ${fmtDate(meta.published)}</time>${updated} &middot; by ${ORG.name}</p>`
}

/** article:* Open Graph properties — Facebook/LinkedIn read these, not JSON-LD. */
function articleMeta(meta) {
  return [
    `    <meta property="article:published_time" content="${meta.published}">`,
    `    <meta property="article:modified_time" content="${meta.modified || meta.published}">`,
    `    <meta property="article:author" content="${SITE}/">`,
  ].join('\n')
}

let written = 0
for (const file of files) {
  const raw = await readFile(join(ROOT, 'src/pages', file), 'utf8')
  const { meta, body } = splitFragment(raw, file)

  // 404 must sit at the root for GitHub Pages to serve it; everything else
  // becomes a directory so the URL has no .html on the end.
  const isRoot = meta.slug === '404'
  const outPath = isRoot ? join(ROOT, '404.html') : join(ROOT, meta.slug, 'index.html')
  // 404.html is served in place of ANY missing path, so its links have to be
  // root-absolute — a relative href from /a/b/typo would resolve into /a/b/.
  const base = isRoot ? '/' : '../'
  const canonical = isRoot ? `${SITE}/404.html` : `${SITE}/${meta.slug}/`

  const html = layout
    .replaceAll('{{TITLE}}', esc(meta.title))
    .replaceAll('{{DESCRIPTION}}', esc(meta.description))
    .replaceAll('{{CANONICAL}}', canonical)
    .replaceAll('{{ROBOTS}}', meta.noindex ? 'noindex, follow' : 'index,follow,max-image-preview:large')
    .replaceAll('{{JSONLD}}', meta.noindex ? '' : structuredData(meta, canonical))
    .replaceAll('{{OGTYPE}}', meta.ogType || 'article')
    .replaceAll('{{ARTICLE_META}}', meta.noindex ? '' : articleMeta(meta))
    .replaceAll('{{BODY}}', body)
    // After BODY — the token lives inside the fragment.
    .replaceAll('{{DATELINE}}', meta.published ? dateline(meta) : '')
    .replaceAll('{{APP_STORE_URL}}', APP_STORE_URL)
    // Play referrer campaign is per page so Play Console shows which guide
    // produced the install.
    .replaceAll('{{PLAY_CAMPAIGN}}', `guide_${meta.slug.replaceAll('-', '_')}`)
    // Last, so a {{BASE}} inside an injected value still resolves.
    .replaceAll('{{BASE}}', base)

  // A noindex page must not self-canonicalize or claim an og:url — an error
  // page that does is the textbook soft-404 shape.
  const final = meta.noindex
    ? html
        .replace(`    <link rel="canonical" href="${canonical}">\n`, '')
        .replace(`    <meta property="og:url" content="${canonical}">\n`, '')
    : html

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, final)
  console.log(`  ${file} -> ${outPath.slice(ROOT.length + 1)}`)
  written++
}

console.log(`built ${written} page${written === 1 ? '' : 's'}`)
