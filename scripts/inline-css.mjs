/**
 * Inlines the compiled stylesheet into every built HTML page.
 *
 * Why: GitHub Pages caps Cache-Control at max-age=600, so an external
 * stylesheet is re-fetched on almost every visit anyway — and on a slow
 * connection that one render-blocking round trip was the largest single
 * item between navigation and first paint (~870 ms on Lighthouse's slow-4G
 * profile). Shipping the ~5 KB (gzipped) of CSS inside the HTML removes it.
 *
 * Idempotent: the first run replaces the <link rel="stylesheet"> tag with a
 * <style data-inlined> block; later runs replace that block's contents, so
 * index.html, support/index.html and privacy.html — which are both source and
 * output — pick up CSS changes on every build. The generated pages are
 * rebuilt from src/layout.html (which keeps the <link>) and re-inlined.
 *
 * url(fonts/...) in the stylesheet is relative to /assets/site.css; once the
 * CSS lives in a page it must be root-absolute so nested pages resolve it.
 *
 * Runs last in `npm run build`. assets/site.css is still written and
 * deployed, so anything that wants the external file (or `npm run dev`
 * watching it) keeps working.
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

let css = await readFile(join(ROOT, 'assets/site.css'), 'utf8')
css = css.replaceAll('url(fonts/', 'url(/assets/fonts/').trim()
if (css.includes('</style')) throw new Error('site.css contains "</style" — cannot inline safely')

const LINK_RE = /[ \t]*<link rel="stylesheet" href="(?:\.\.\/|\/)?assets\/site\.css">\n/
const STYLE_RE = /[ \t]*<style data-inlined>[\s\S]*?<\/style>\n/
const block = `    <style data-inlined>${css}</style>\n`

/** Every deployable HTML file: the root ones plus each <dir>/index.html. */
async function pages() {
  const out = []
  for (const name of await readdir(ROOT)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'src' || name === 'scripts') continue
    const p = join(ROOT, name)
    const s = await stat(p)
    if (s.isFile() && name.endsWith('.html')) out.push(p)
    else if (s.isDirectory()) {
      try { await stat(join(p, 'index.html')); out.push(join(p, 'index.html')) } catch {}
    }
  }
  return out.sort()
}

let n = 0
for (const file of await pages()) {
  const html = await readFile(file, 'utf8')
  let next
  if (STYLE_RE.test(html)) next = html.replace(STYLE_RE, () => block)
  else if (LINK_RE.test(html)) next = html.replace(LINK_RE, () => block)
  else continue
  if (next !== html) {
    await writeFile(file, next)
    n++
  }
}
console.log(`inlined site.css (${(Buffer.byteLength(css) / 1024).toFixed(1)} kB) into ${n} page${n === 1 ? '' : 's'}`)
