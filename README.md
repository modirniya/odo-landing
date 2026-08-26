# Odometer Landing Page

Marketing site for **Odometer: Simple Mileage Tracking**, live at
[odometer.pro](https://odometer.pro/). Static HTML on GitHub Pages, deployed from
`main` at the repo root.

## Build

The site has a build step now: Tailwind is **compiled**, not loaded from a CDN, and
the guide pages are generated from a shared layout.

```bash
npm install
npm run build      # build:pages then build:css
npm run serve      # http://localhost:4173
```

| Script | What it does |
| --- | --- |
| `npm run build` | `build:pages` then `build:css` — always in that order |
| `npm run build:pages` | Wraps `src/pages/*.html` in `src/layout.html`, writes the output |
| `npm run build:css` | Compiles `src/input.css` to `assets/site.css` (minified) |
| `npm run dev` | Tailwind in watch mode |

**Generated files are committed.** GitHub Pages serves this repo as-is, so
`assets/site.css`, `404.html` and the `mileage-*/index.html` directories must be
committed after any change to `src/`. Run `npm run build` before you push.

## Layout

```
index.html                          hand-written — the home page
support/index.html                  hand-written — the app-store support page
privacy.html                        redirect stub -> legal.neuera.app
404.html                            generated
mileage-log-for-taxes/              generated
mileage-tracker-without-gps/        generated
mileage-log-for-rideshare-drivers/  generated
robots.txt, sitemap.xml, CNAME, .nojekyll
src/
  input.css                         Tailwind entry + all custom CSS + @font-face
  layout.html                       shared shell for the generated pages
  pages/*.html                      page bodies, each with a leading <!--meta {...} --> block
scripts/build-pages.mjs             the generator
assets/                             images, fonts, compiled CSS
```

### Adding a guide page

1. Drop a fragment in `src/pages/<slug>.html`. It starts with a metadata block:

   ```html
   <!--meta
   {
     "slug": "my-page",
     "title": "Page title — Odometer",
     "description": "Meta description.",
     "heading": "H1 text",
     "breadcrumb": "Short label",
     "published": "2026-08-25",
     "faq": [{ "q": "...", "a": "..." }]
   }
   -->
   ```

   Use `{{BASE}}` for links back to the site root (it becomes `../`).

2. `npm run build`
3. Add the URL to `sitemap.xml` and to the **Guides** column of all three footers.

Anything in `faq` is emitted as `FAQPage` structured data, so those questions and
answers **must** also appear as visible `<details>` markup in the body. Schema with
no visible counterpart is treated as spam.

### The header and footer live in three places

`src/layout.html`, `index.html` and `support/index.html` each carry their own copy —
the first two pages are too bespoke to template. Change the nav or footer in all
three.

## Conventions worth keeping

- **Legal pages are not hosted here.** Privacy and terms live on
  `legal.neuera.app/odometer/`, which is versioned and archived. `privacy.html`
  is only a redirect stub for the Play Store listing and older inbound links.
  Do not reintroduce a local copy — the last one drifted (stale date, wrong
  contact address).
- **Play Store links carry an install referrer.** Every store link ships
  `&referrer=utm_source%3Dodometer.pro%26utm_medium%3Dweb%26utm_campaign%3D<placement>`
  so Play Console attributes the install. A bare listing URL reports as organic
  and makes the site unmeasurable.
- **The App Store badge points at the NeuEra developer page** until Odometer's own
  listing is live. The URL is `APP_STORE_URL` in `scripts/build-pages.mjs`
  (feeds the guide pages) and appears twice in `index.html` (hero, download
  section). When App Store Connect shows the Apple ID, swap all three to
  `https://apps.apple.com/app/id<APPLE_ID>` and add
  `<meta name="apple-itunes-app" content="app-id=<APPLE_ID>">` to each page's
  head for the Safari smart banner.
- **Images.** App screenshots live in `assets/screens/` as `<name>.png` (the
  full-resolution source, 1320x2868) plus generated `-320/-480/-640/-960.webp`
  and a `-640.png` fallback. Never reference the full-size source from a page.
  When the app's UI changes, drop the new captures in with **new names** (or a
  version suffix) rather than overwriting — GitHub Pages and browsers cache by
  URL, and overwriting in place left returning visitors on the old shots.
- **`sitemap.xml` lastmod is hand-maintained.** Bump a date when that page's own
  content changes, not on every deploy.
- **Claims stay verifiable.** No ratings, no download counts, no specific tax
  rates — rates change annually and differ by country, so the app makes it a
  field and the site says to check with your own tax authority.

## Support form

`support/index.html` POSTs JSON to the shared NeuEra n8n endpoint, the same one
Kalum and Play Lounge use. The sending app is identified by the `app` field:

```
POST https://n8n.neuera.app/webhook/support-playlounge
{
  "app": "odometer",          // <- Odometer's tag
  "name", "email", "category", "device", "message",
  "honeypot", "userAgent", "timestamp"
}
```

The endpoint is named after the first app that used it; the `app` field is what
routes it. If Odometer ever needs its own webhook, change `WEBHOOK_URL` and `APP_TAG`
together at the bottom of `support/index.html`.

## Known gaps

- **`.well-known/assetlinks.json` is missing**, so Android App Links from
  `odometer.pro` do not verify and will not deep-link into the installed app.
  It needs the SHA-256 fingerprint of the **app signing key** from
  Play Console → Setup → App integrity (not the upload key). Add it as:

  ```json
  [{ "relation": ["delegate_permission/common.handle_all_urls"],
     "target": { "namespace": "android_app",
                 "package_name": "pro.odometer.android",
                 "sha256_cert_fingerprints": ["<from Play Console>"] } }]
  ```

- **No analytics.** No GA, no Plausible. Install attribution goes through the
  Play referrer above; on-site behaviour is not measured at all.
- **No Search Console verification file.** Add the HTML verification file to the
  repo root, then submit `https://odometer.pro/sitemap.xml`.
- **App Store launch checklist.** The copy currently says the iPhone version is
  *coming* (home FAQ ×2, download section, meta description, guide CTAs, badge
  aria-labels) and the `MobileApplication` schema says `operatingSystem:
  "Android"`. When the listing is live: swap the three App Store URLs (see the
  badge note above), flip that copy to present tense, set `operatingSystem` to
  `"Android, iOS"`, add the App Store URL to `sameAs`/`installUrl`, and add
  `<meta name="apple-itunes-app" content="app-id=<APPLE_ID>">`.

## Deploy

Push to `main`. GitHub Pages serves the root of the branch; `CNAME` points at
`odometer.pro`. There is no Actions workflow — which is exactly why the built
files must be committed.
