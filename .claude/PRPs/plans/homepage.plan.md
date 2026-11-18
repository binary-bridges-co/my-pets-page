# Plan: the My Pets homepage at pets.binarybridges.co

Issue: binary-bridges-co/my-pets-page#8 ("My Pets homepage at pets.binarybridges.co (Astro, design system)").
Worktree: `.claude/worktrees/homepage`, branch `feat/homepage`, from `origin/main` at `f24583d`.
Shape: the `to-spec` spec, then the workspace addendum (bb-context `AGENTS.md` §3.3): research with `file:line`, ordered tasks naming files, validation commands, risks and rollback, interface.

## Metadata

| Field | Value |
|---|---|
| Complexity | Medium-large: a second build (Astro) joined to the existing esbuild page, per-path headers, two pages of copy, five new browser specs |
| Source | #8; decisions on binary-bridges-co/my-pets-ios #261 (positioning + amendment), #262 (+ amendment: homepage on pets.binarybridges.co), #263 (+ amendment: launch price), #273 (roadmap), #266 (App Store page), #265 (press) |
| Dependencies | The App Store id and state, the release date and the launch-price end date (placeholders until the membership is renewed and the launch date is set); the press contact address; Apple's official badge artwork |
| Branch | `feat/homepage` |
| Repository rules | No `AGENTS.md` here: the workspace workflow applies in full (bb-context `docs/projects/my-pets-page.md`). Tests: the affected suites; before done, the repository's own checks (CI job list). Visual checks: both themes |
| Review | Every plan, a rejection is revised and re-reviewed (bb-context `AGENTS.md` §3.4) |

## Problem Statement

A US pet owner who hears about My Pets (press, a community post, a search) has nowhere to go. `https://pets.binarybridges.co/` today answers one line, "My Pets helps lost pets get home. This site shows the cards their families publish." It does not say what the app does, what it costs, where it is going, or how to get it. Journalists have no press page. And the site is `noindex` everywhere, so search cannot find it at all.

## Solution

`/` becomes the My Pets homepage and `/press` its press page, built with Astro on the Binary Bridges design system (site surface, core tokens, light and dark). The homepage says the promise, shows an App Store badge (or "coming soon"), the preview video slot, the four proof points in order, the price, privacy, the origin story, the roadmap and an FAQ. Both pages are indexable, ship no JavaScript, make no request outside the site and keep nothing about the visitor. The lost-pet card page at `/p/<id>`, its 404 notice and the app-links file are untouched in behaviour, headers and budget. One `dist/` still deploys to Cloudflare Pages.

## User Stories

1. As a pet owner who heard about My Pets, I want the homepage to say in one line what the app promises, so that I know within seconds whether it is for me.
2. As a pet owner whose pet takes daily medication, I want to read first that I can say what the vet said and get dose alarms that ring even on silent, so that I see the app solves my main worry.
3. As a pet owner, I want to read that the record is mine, on my iPhone and in my iCloud, and that my vet can check it hasn't been altered, so that I trust where my pet's history lives.
4. As a pet owner tired of subscriptions, I want to see "one payment, no subscription" with the price, so that I know the full cost up front.
5. As a pet owner, I want to see the launch price, the date it ends and the price after, so that I can decide when to buy without being misled.
6. As a pet owner, I want to see how one payment compares with yearly subscriptions without naming other apps, so that I can judge the value.
7. As a pet owner, I want to learn that lost mode takes two taps, so that I know the app also helps if my pet goes missing.
8. As a privacy-minded owner, I want a plain statement that my pet's data never goes to a Binary Bridges server and that there is no account, so that I can trust the app.
9. As a visitor, I want the site itself to set no cookie, store nothing and load nothing from other companies, so that browsing it is as private as the app claims.
10. As a pet owner, I want to read why the app exists (the vet nurse's two problems), so that I understand who made it and why.
11. As a pet owner, I want to see what is available now and what is coming next, later and being explored, without dates, so that I know where the product is going without false promises.
12. As a pet owner, I want to know what one payment covers (iPhone, iPad and Mac) and that Android and the clinic app are separate products, also without subscriptions, so that I am not surprised later.
13. As a pet owner, I want an FAQ that answers whether the app replaces my vet, where my data is, whether I need an account and what happens after the launch price, so that I can buy with no open doubts.
14. As a pet owner, I want to read that the app keeps records and does not diagnose or treat, so that I know to follow my veterinarian.
15. As an iPhone visitor, I want an App Store badge that takes me to the listing (or pre-order) when the app is there, and an honest "coming soon" before, so that I never follow a dead link.
16. As an iPhone visitor in Safari, I want Apple's Smart App Banner once the app has a listing, so that I can open or get the app in one tap.
17. As a visitor, I want to watch the 24 s preview video on the page once it exists, without autoplay or sound surprises, so that I see the app working.
18. As a visitor on a 320 px phone, I want the page to fit with no sideways scrolling and tap targets of at least 44 px, so that I can read and act comfortably.
19. As a visitor on a large screen, I want the page laid out for the width (up to 1920 px), so that it reads well.
20. As a visitor with dark mode on, I want the page in the dark theme of the design system, so that it is comfortable and consistent with the app.
21. As a keyboard or screen-reader user, I want landmarks, a sensible heading order, visible focus and labelled links, so that I can use the page fully.
22. As a visitor who prefers reduced motion, I want no motion, so that the page does not bother me.
23. As a visitor with JavaScript off, I want the whole page to work, so that nothing is hidden from me.
24. As a journalist, I want a `/press` page with a description, a fact sheet, screenshots, the video, the icon, the privacy paragraph and a developer note, so that I can write about the app without emailing first.
25. As a journalist, I want to know that promo codes are available on request and whom to ask, so that I can try the app.
26. As a search engine, I want `/` and `/press` indexable, with a canonical URL, a description and a sitemap, so that people searching can find My Pets.
27. As a finder who tapped a lost pet's tag, I want `/p/<id>` to behave exactly as before, so that the homepage changes nothing for me.
28. As the owner, I want the App Store state, its id, the release date and the launch-price end date in one config module, so that launch day is a one-file change.
29. As the owner, I want the page to stay truthful if the launch price ends before a rebuild, so that a stale page never promises a price that no longer exists.
30. As the owner, I want the homepage to use the Binary Bridges tokens and add none, so that it stays one family with the app and the company site.
31. As the owner, I want CI to fail on a budget overrun, a missing header, a third-party request, an accessibility violation or a banned word in the copy, so that regressions never ship.
32. As the owner, I want the roadmap only on the homepage and never in App Store copy, so that the listing describes only the current app.
33. As the maintainer, I want the card page's build, budget and header checks to keep their exact meaning, so that its privacy guarantees remain provable.
34. As the maintainer, I want the copied tokens pinned to a bb-context commit with a hash check, so that drift is caught the same way the Spec vectors are.

## Implementation Decisions

Agent calls are marked **[agent call]**; the owner was asked only about architecture and product (bb-context `AGENTS.md` §0 rule 7). Each is to be recorded on #8 when implementation starts.

### Architecture: one dist/, Astro first, the card build second **[agent call]**

- Astro lives in its own root, `site/` (`site/astro.config.mjs`, `site/src/`, `site/public/`), so the card page's `src/`, its `tsconfig.json` and its esbuild entry stay byte-for-byte as they are.
- `npm run build` stays the one command (Cloudflare Pages' build command in `docs/RUNBOOK.md` §2.4 does not change). `scripts/build.mjs` does, in order: empty `dist/`; run Astro's programmatic `build()` with `root: site/` and `outDir: dist/`; then the existing esbuild steps write `p/index.html`, `404.html`, `assets/page.<hash>.{js,css}`, `.nojekyll`, `_headers`, `_redirects` and `.well-known/apple-app-site-association`.
- Why Astro first: Astro owns and clears its output directory; the card build writes into folders and names Astro never uses. The reverse order would have Astro clearing the card files.
- **Collision guard**: before each card write, the build fails if the target already exists. Astro may write only `index.html`, `press.html`, `sitemap.xml`, `robots.txt`, `_astro/*` and the files of `site/public/` (favicon, icon); it must not write `404.html`, `p/`, `assets/`, `.well-known/`, `_headers`, `_redirects` (there is no `site/src/pages/404.astro`). A unit test asserts the reserved names are absent from `site/public/` and `site/src/pages/`.
- **The one collision today is `index.html`**, the one-line home (`scripts/build.mjs:92`). The homepage replaces it: the build stops writing the notice home, and the unused `home` string leaves both `src/strings/en.json:59` and `src/strings/es.json:59` (key parity kept).
- Astro settings: `output: 'static'`, `site: 'https://pets.binarybridges.co'`, `trailingSlash: 'never'`, `build.format: 'file'` (so `/press` is `press.html` and Pages serves `/press` with status 200 and no redirect to `/press/`), `build.assets: '_astro'`, `build.inlineStylesheets: 'never'` and `vite.build.assetsInlineLimit: 0` (no inline style, no `data:` URL, so the CSP needs no `unsafe-inline`), no integrations, `@tailwindcss/vite` as the one Vite plugin, telemetry off in CI (`ASTRO_TELEMETRY_DISABLED=1`).
- **No JavaScript on the homepage or `/press` [agent call]**: no client scripts, no islands, no view transitions; the FAQ is native `<details>`, the video is native `<video controls>`. That allows `script-src 'none'` and removes any storage or tracking risk by construction.
- The GitHub Pages fallback (`--host=github-pages`) passes the host to Astro through an environment variable read at build time; the layout then emits the homepage CSP as a `<meta http-equiv>` without `frame-ancestors`, as the card page does (`scripts/build.mjs:62-66`).

### Dependencies (dev, pinned exactly, as `package.json:22-29` does) **[agent call]**

Matching `bb-homepage`'s installed versions: `astro` 7.3.5, `tailwindcss` 4.3.3, `@tailwindcss/vite` 4.3.3, `@fontsource-variable/geist` 5.3.0, `@fontsource-variable/geist-mono` 5.3.0, `@astrojs/check` 0.9.10. `typescript` stays 5.9.3 if `@astrojs/check` accepts it; otherwise it moves to 6.0.3 (bb-homepage's) in the same task and the card's `npm run typecheck` must stay green. `npm run typecheck` runs `tsc --noEmit -p .` and `astro check --root site`.

### Tokens: a pinned copy of bb-context's Tailwind 4 theme **[agent call]**

- `site/src/styles/tokens.css` is a byte copy of bb-context `dist/tailwind-v4/theme.css` at `55edc0d`. `site/TOKENS_SOURCE` records repository, commit, path and SHA-256 for it and for the copied marks, in the format of `test/spec/SPEC_SOURCE`. `scripts/check-tokens-source.sh` mirrors `scripts/check-spec-source.sh:1-28`: hash check always, byte comparison with `git show` when `BB_CONTEXT=<checkout>` is given. CI and Cloudflare Pages only see this repository, so the copy must be vendored.
- **Core tokens only**: `paper`, `surface`, `ink`, `muted`, `line`, `line-strong`, `accent`, `on-fill`, the radii, `text-hero`, `text-display`, `text-lead`, `spacing-section`, `duration-fast`, `ease-out-expo`, the two font families. **No `band` family** (scope `site` is "bb-homepage only", `tokens/tokens.json` meta.scopes) and **no `pets-paper`** (scope `pets` is "My Pets (iOS) only", `tokens/tokens.json:495-503`). No `seal`, no state colours. **No new token.**
- Dark mode follows `prefers-color-scheme`, as the theme file does; no toggle.

### Fonts: self-hosted Geist, Latin only **[agent call]**

Geist Variable and Geist Mono Variable from `@fontsource-variable`, as bb-homepage does (`bb-homepage/src/layouts/BaseLayout.astro:2-4`), but with hand-written `@font-face` rules for the Latin `wght` files only (English-only pages), `font-display: swap`, and one `<link rel="preload">` for Geist Latin. Vite emits them hashed under `_astro/`. Mono is needed for the numbered SectionLabels.

### Launch config: one module, validated, unit-tested **[agent call]**

`site/src/config/launch.ts` exports one typed object:

```ts
{
  appStore: { state: 'coming-soon' } | { state: 'pre-order' | 'available'; id: string /* digits */; campaign?: string },
  releaseDate: string | null,          // ISO date, for the fact sheet
  launchPrice: { price: 'US$9.99', regular: 'US$19.99', endsOn: string | null }, // endsOn: ISO date
  pressEmail: string | null,           // null until the owner gives one
  previewVideo: { src: string; poster: string } | null,
  screenshots: { src: string; alt: string; width: number; height: number }[],
}
```

`site/src/lib/launch.ts` holds the pure functions the pages use, so they are tested in Node with the existing runner:
- `validate(config)` fails the build on a non-numeric id, a bad date or an email that is not an address.
- `badge(config)`: `coming-soon` renders a text label "Coming soon to the App Store" with no Apple artwork (Apple's badge must not be altered, and there is no "coming soon" badge); `pre-order` and `available` render Apple's official "Pre-order on the App Store" / "Download on the App Store" artwork linking to `https://apps.apple.com/app/id<id>` (plus `?ct=<campaign>` if set).
- `smartAppBanner(config)`: `app-id=<id>` when an id exists, else nothing (no `<meta name="apple-itunes-app">`).
- `priceLines(config, buildDate)`: before `endsOn`, "US$9.99 launch price until <Month D, YYYY>, then US$19.99. One payment, no subscription."; with `endsOn` null, "US$9.99 launch price for the first three months, then US$19.99." (#263: three months from launch day); on or after `endsOn`, "US$19.99, one payment, no subscription." The dated sentence states both prices, so a page that is not rebuilt on the end date still tells the truth. The comparison line, "Subscription apps charge US$20-50 every year", names no app (#261).
- `pressContact(config)`: with an address, "Promo codes on request: <address>" as a `mailto:` link; with `null`, "Promo codes on request." and no link, so no fake address can ship. The issue's "contact email placeholder" is this `null`.
- Initial values: `coming-soon`, no release date, `endsOn: null`, no video, no screenshots, `pressEmail: null`.

### Copy: one English module, rules enforced by test **[agent call]**

All visible text sits in `site/src/content/en.ts` (the pages hold no prose), like the card's `src/strings/en.json`. Content, from the launch plan and the decisions:

- Promise (the one `hero`; "every record yours" may be the one `accent` phrase): "Every dose on time, every record yours. One payment, no subscription."
- Proof points, in order (#261): (1) Say what the vet said, and My Pets sets the dose alarms. They ring even on silent. (2) A record you own, on your iPhone and in your iCloud, that your vet can check hasn't been altered. (3) No account, no subscription, one payment. (4) Lost mode in two taps.
- Price: `priceLines` above, plus "One payment covers My Pets on iPhone, iPad and Mac, with all its updates. Android and the clinic app will be separate products, also without subscriptions." (#273 item 3).
- Privacy: "Your pet's data never goes to a Binary Bridges server. Records stay on your iPhone and in your own iCloud. There is no account to create." Plus one line on this site: "This site sets no cookies, stores nothing and loads nothing from other companies."
- Origin: "In her first year as a vet nurse, my wife kept seeing the same two problems: medication given wrong and vaccines forgotten." No clinic details. Signed "The developer of My Pets, Binary Bridges" (the signature is an execution detail per #265; the owner may swap in his name).
- Roadmap, no dates (#273): Now: iPhone and iPad. Next: Spanish; Mac; sitters can mark doses; Apple Watch (mark a dose from the wrist). Later: Android; the open record format for apps and devices; a page where vets check a record; bring your records in (from other apps or a photo of the paper card). Exploring: a clinic app with no subscription; open prototype devices that use the format; satellite help for lost pets. With the protocol sentence and the satellite sentence verbatim from the brief. The working name "Open Pet Record" does not appear.
- FAQ: Does My Pets replace my vet? (record-keeping only: "My Pets keeps records and reminders. It does not diagnose or treat; follow your veterinarian.") Where is my pet's data? Do I need an account? What does the one payment cover? What happens after the launch price? How does my vet check a record? Do the alarms ring on silent? What is lost mode? Is My Pets on Android?
- `/press`: description (from the App Store description drafted on #266, direction B, ownership first), fact sheet (name "My Pets: Pet Health Records", developer Binary Bridges SAS, platforms iPhone and iPad, category Medical, language English, price, release date or "to be announced", website), screenshot slots and video slot (render the files listed in config; empty lists render "Screenshots and the preview video will be here at launch."), the app icon (Bridge cat, SVG, with a download link), the privacy paragraph, the developer note (origin story), the promo-code line from `pressContact`.
- Words (#261): no hash, chain, signature, blockchain, crypto, immutable, append-only, AI, on-device model; no competitor or device brand names; "diagnose" and "treat" only inside the one disclaimer sentence; no App Store claim beyond the current app (the roadmap is labelled as such and sits only on the homepage).
- The press location: #265 placed the press page in bb-docs at `/my-pets/press`; #262's amendment and #273 (later) move the homepage and `/press` to pets.binarybridges.co, and #8 says `/press`. This plan follows #8. A comment on my-pets-ios #265 records it.

### Headers per path (`src/host/_headers`) **[agent call]**

- `/*` keeps exactly today's lines (`src/host/_headers:3-13`): every response, the 404 notice and every unknown path included, still gets the card CSP, `noindex` and the rest. The card page and its checks are untouched.
- New rules after it, one per path, using Pages' detach (`! Name`):
  - `/` and `/press`: `! Content-Security-Policy`, `! X-Robots-Tag`, then `Content-Security-Policy: default-src 'none'; script-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; manifest-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'` and `Cache-Control: no-cache`. (`/` already has its own rule for `Cache-Control` at `src/host/_headers:16-17`; it gains the lines above, since Pages keys rules by path.)
  - `/_astro/*`: `Cache-Control: public, max-age=31536000, immutable`.
  - `/sitemap.xml`, `/robots.txt`: `! X-Robots-Tag`.
- **Verified semantics**: wrangler 4.140.0's `attachHeaders` (bundled `wrangler-dist/cli.js`, around line 367267) runs each matching rule in order, deleting its detached names first and then setting its headers, with a set-once map so a header set again after a delete is not joined. So a later rule can replace the CSP of `/*`. The production Pages check (`npm run check:headers -- https://my-pets-page.pages.dev`, RUNBOOK step 2.6) confirms it at go-live.
- `scripts/preview.mjs:85-89` applies a rule's headers and then its detaches, which would drop a replaced header. It changes to Pages' order (detach first, then set, joining only across rules that have not detached) and gains Pages' `.html` resolution (`/press` serves `press.html`) and the MIME types `.woff2`, `.svg`, `.png`, `.webp`, `.mp4`, `.xml`, `.txt`.
- The other common headers stay on the homepage unchanged (HSTS, nosniff, `Referrer-Policy: no-referrer`, COOP, CORP, `X-Frame-Options`, `Permissions-Policy`). `no-referrer` on the App Store link is fine: campaign attribution uses the `ct` parameter.

### Indexing

`/` and `/press` carry a `<link rel="canonical">`, `<meta name="description">`, Open Graph title, description and URL (no `og:image` until the screenshots exist), `theme-color` from `paper`/`ink` with a comment naming the tokens (as `bb-homepage/src/layouts/BaseLayout.astro:83-87` does). `robots.txt` allows everything and names the sitemap; crawlers must still be allowed to fetch `/p/*` to see its `noindex`. `sitemap.xml` (an Astro endpoint) lists `/` and `/press`.

### Budget (`scripts/check-budget.mjs`) **[agent call]**

The card section keeps its numbers and files (`scripts/check-budget.mjs:8-13`), minus `index.html`, which leaves for the homepage section: HTML at most 16 KB gzipped per page (`index.html`, `press.html`); all of `_astro/*.css` at most 15 KB gzipped; `_astro/*.js` exactly zero files; fonts at most two `woff2` files and 80 KB in total; any other file in `_astro/` fails as unexpected; root files other than the known list fail. The user's web rules (landing page: CSS under 30 KB, JS under 150 KB) are met with room; screenshots and video get their own budget rows when they arrive.

### Tests (seams)

One existing seam carries almost everything: the built `dist/` served by `scripts/preview.mjs` (and by `wrangler pages dev`), observed by Playwright and by `scripts/check-headers.mjs`. One new small seam: the pure functions in `site/src/lib/launch.ts` and the copy module, run by the existing Node test runner (`scripts/build-tests.mjs` bundles `test/unit/*.test.ts`). No Astro component tests, no Vitest.

## Testing Decisions

- A good test here checks what a visitor, a crawler or the host sees (text, order, links, headers, requests, storage, layout, axe results), never Astro internals or class names.
- **Unit** (`test/unit/`, node:test, prior art `test/unit/text.test.ts`, `e2e-guard.test.ts`):
  - `site-launch.test.ts`: `validate`, `badge` (three states), `smartAppBanner`, `priceLines` (null date, the day before, the day of, the day after the end date), `pressContact` (address and `null`).
  - `site-copy.test.ts`: every banned word absent from `site/src/content/en.ts` (case-insensitive, whole words), "diagnose" and "treat" only in the disclaimer, "Open Pet Record" absent, the four proof points in order, the roadmap groups and items exactly as #273, the protocol and satellite sentences verbatim.
  - `site-build.test.ts`: no reserved card path in `site/public/` or `site/src/pages/`.
  - `e2e-guard.test.ts` covers the new specs as they are written (they import from `./support`).
- **Browser** (`test/e2e/`, Playwright on Chromium, Firefox and WebKit, prior art `layout.spec.ts`, `a11y.spec.ts`, `privacy.spec.ts`, `nojs.spec.ts`; every test fails on a CSP violation through `support.ts:50-58`):
  - `home.spec.ts`: the promise in the h1; the badge in its `coming-soon` form with no Apple artwork and no link; no `apple-itunes-app` meta; the four proof points in order; both price lines and the comparison; privacy; origin; the four roadmap groups and items; the FAQ opens with the keyboard; the nav reaches `/press` and back; `/press` has the fact sheet, icon, privacy paragraph, developer note and the promo-code contact; no `<script>`, no `style` attribute, no inline `<style>` in either page.
  - `home-privacy.spec.ts`: on `/` and `/press`, every request is to the preview origin (none aborted, none to `https://`), no cookie set, no storage call (the storage watch moves from `privacy.spec.ts:9-25` to `support.ts` so both use it), no service worker, every `src`/`href` resource (stylesheet, icon, preload, img, video, source) is same-origin, the only external `<a href>` are `https://apps.apple.com/` (when a badge links) and `mailto:`.
  - `home-layout.spec.ts`: 320, 375, 768, 1024, 1440, 1920 px in light and dark: no sideways scroll on `/` and `/press`, the App Store badge or label visible in the first screen at 375 px, every link and summary at least 44 px tall on the narrow widths.
  - `home-a11y.spec.ts`: axe with no violation on `/` and `/press`, light and dark; one h1 per page and no skipped heading level; `main`, `header`, `footer`, `nav` landmarks; visible focus on the first link; reduced motion leaves no transition.
  - `nojs.spec.ts`: JavaScript off shows the full homepage (it has none to lose).
- **Changed existing assertions, because `/` is no longer the one-line home** (and only these): `nojs.spec.ts:18-25` checks the promise on `/` instead of the old sentence; `privacy.spec.ts:93` lists `p/index.html` and `404.html` (the homepage gets its own stricter checks above); `scripts/check-headers.mjs:59-61` expects the homepage CSP and no `X-Robots-Tag` on `/`. `a11y.spec.ts:27-31` keeps `/` in its list unchanged (the homepage must pass it). Every card assertion stays as it is.
- **Host** (`scripts/check-headers.mjs`, run on the preview and on `wrangler pages dev`): the card checks unchanged; `/` and `/press` status 200 with no redirect, `text/html`, the homepage CSP, no `x-robots-tag`, `no-cache`; every `_astro/` asset the two pages reference: 200, right type, immutable; `/sitemap.xml` and `/robots.txt` 200 with no `x-robots-tag`; `/press/` and `/index.html` do not serve a second copy (redirect or 404, as Pages does, and the same on the preview).
- **Budget**: as above; the CSP-with-Trusted-Types check (`scripts/check-budget.mjs:15-21`) stays.

## Out of Scope

The `/r/` tap counter and the scorecard (separate tasks); Spanish copy (Phase 12); real screenshots, the video and AI images (captured later, then added to the config with a budget row); the card page's own move onto the design system (bb-context decision 16 stays open for it); an `og:image`; analytics of any kind; bb-context changes (see Further Notes).

## Further Notes

- Follow-ups outside this repository, each its own PR after this one merges: bb-context `docs/projects/my-pets-page.md` (the homepage, the `site/` tree, the repository's real path `bb-pets/page`), `docs/platforms/site.md` "Other sites" and `docs/decisions.md` item 16 (the homepage uses the system; the card page is still the exception), and `npm run drift` learning `site/src/styles/tokens.css`. A comment on my-pets-ios #265 about the press page's location.
- The site's FAQ uses native `<details>`, a pattern the site component pages do not list yet. It uses only existing tokens; it is noted on #8 and can be proposed to bb-context `docs/components/` later.

## Research findings

- `scripts/build.mjs:23-25` empties `dist/` and creates `assets/`; `:90-95` writes `p/index.html`, `index.html` (notice `home`), `404.html`, `.nojekyll`; `:97-101` copies `_headers`, `_redirects` and the AASA file. Only `index.html` collides with an Astro homepage.
- `scripts/build.mjs:57-66`: the card CSP and its `<meta>` form for GitHub Pages (no `frame-ancestors`).
- `src/host/_headers:3-13`: CSP, `X-Robots-Tag: noindex` and the common headers on `/*`; `:16-17` `/` has `Cache-Control: no-cache`; `:22-23` `/assets/*` immutable; `:26-28` the AASA.
- `src/host/_redirects:3`: `/p/*  /p/  200` only; `scripts/preview.mjs:51` accepts only 200 rewrites.
- `scripts/preview.mjs:56-62` resolves a file or a folder's `index.html` (no `.html` extension); `:84-89` sets then detaches within a rule (Pages detaches first); `:14-20` knows only html, css, js, json.
- `scripts/check-budget.mjs:8` budgets HTML 4 KB, CSS 6 KB, JS 20 KB; `:11` names `index.html` among the card files; `:12` fails on any non-JS/CSS file in `assets/`; `:36-38` exactly one script and one stylesheet.
- `scripts/check-headers.mjs:10-24` the expected card headers, `noindex` included; `:59-61` applies them to `/`; `:86-89` the 404 notice.
- `scripts/check-pages.mjs:22` runs `wrangler pages dev dist`; the same `check-headers.mjs` runs against it.
- `test/e2e/nojs.spec.ts:18-25` asserts the old home sentence; `test/e2e/privacy.spec.ts:89-97` scans `index.html` for `https?:`; `test/e2e/a11y.spec.ts:27-31` runs axe on `/`.
- `test/unit/e2e-guard.test.ts`: every spec imports from `./support` and none skips.
- `test/e2e/support.ts:26-48` aborts every request outside the preview origin and CloudKit; `:50-58` fails a test on any CSP violation.
- `playwright.config.ts:30-34` builds and serves `dist/` on port 4173; `.github/workflows/ci.yml` runs spec check, build, unit, budget, headers, pages and the GitHub Pages build, then browsers per engine.
- `package.json:22-29` pins every dev dependency exactly; `.nvmrc` 22, `engines.node >=22.12`.
- `.gitignore:1` ignores `.claude/` (this plan is added with `git add -f`; the review and report the same way).
- `docs/DESIGN.md:18` lists fonts as a non-goal of the card page (still true: only the homepage has fonts); `:103-114` budget; `:116-140` headers; `:178-191` tests.
- bb-homepage: Astro 7.3.5, Tailwind 4.3.3, fontsource 5.3.0 installed (`node_modules/*/package.json`); `astro.config.mjs` uses `@tailwindcss/vite`; `src/styles/tokens.css` is an `@theme` copy; `src/components/ui/Button.astro` is SiteButton (pill, min height 48, `primary`/`ghost`/`band`); `src/components/ui/SectionLabel.astro`; its CSP allows `'unsafe-inline'` styles (`security-headers.conf:8`), which this site avoids with `inlineStylesheets: 'never'`.
- bb-context: `dist/tailwind-v4/theme.css` (generated, core + site tokens, dark under `prefers-color-scheme`); `tokens/tokens.json` scopes `site` = bb-homepage only, `pets` = iOS only; `docs/platforms/site.md` (layout: container 80rem, padding `clamp(1rem, 4vw, 2.5rem)`, sections `space-section` apart, leads 38rem; one hero; SectionLabel on every section; SiteButton pills); `assets/app-icons/my-pets-bridge-cat-{light,dark}.svg`; `docs/foundations/content-icons-marks.md` (no brass on the My Pets mark, icons on an `ink` tile).
- wrangler 4.140.0 `attachHeaders` (bundled `cli.js` ~367267): detach, then set, set-once per name across rules.

## Ordered tasks (tests first in each)

1. **Dependencies and pinned tokens.** `package.json` (devDependencies above, scripts `check:tokens`, `typecheck` with `astro check --root site`), `package-lock.json`, `.gitignore` (`site/.astro/`), `site/tsconfig.json` (extends `astro/tsconfigs/strict`), `tsconfig.json` (include `site/src/lib/**/*.ts`, `site/src/config/**/*.ts`, `site/src/content/**/*.ts` for the unit tests). RED: `npm run check:tokens` with `site/TOKENS_SOURCE` written first and no copy. GREEN: `site/src/styles/tokens.css`, `site/public/icon.svg`, `site/public/icon-dark.svg` (bridge cat, copied), `scripts/check-tokens-source.sh`.
2. **Launch logic and copy.** RED: `test/unit/site-launch.test.ts`, `test/unit/site-copy.test.ts`, `test/unit/site-build.test.ts`. GREEN: `site/src/config/launch.ts`, `site/src/lib/launch.ts`, `site/src/content/en.ts`.
3. **Host contract.** RED: `scripts/check-headers.mjs` (homepage, `/press`, `_astro`, sitemap, robots, `/press/` and `/index.html`), `scripts/check-budget.mjs` (homepage section, `index.html` moved), then `test/e2e/support.ts` (storage watch moved in), `test/e2e/home.spec.ts`, `home-privacy.spec.ts`, `home-layout.spec.ts`, `home-a11y.spec.ts`, and the three changed assertions in `nojs.spec.ts`, `privacy.spec.ts`. All fail on the current build.
4. **The joined build.** `site/astro.config.mjs`, `scripts/build.mjs` (Astro first, collision guard, no notice home, host env for the meta CSP), `src/strings/en.json` and `src/strings/es.json` (drop `home`), `src/host/_headers` (new path rules), `scripts/preview.mjs` (detach order, `.html` resolution, MIME types). GREEN for `check:headers`, `check:pages` and the card specs with an empty homepage page.
5. **Layout and primitives.** `site/src/styles/global.css` (Tailwind, tokens, `@font-face` Latin, base, focus ring with `accent`, reduced motion), `site/src/layouts/Base.astro` (head, canonical, OG, theme-color, favicon, font preload, Smart App Banner from `smartAppBanner`, GitHub Pages meta CSP), `site/src/components/SiteButton.astro`, `SectionLabel.astro`, `Icon.astro` (ported from bb-homepage `src/components/ui/`, source commit in a header comment), `AppStoreBadge.astro`, `SiteHeader.astro`, `SiteFooter.astro`, `site/public/badges/` (Apple's official artwork, downloaded from Apple's marketing tools at implementation, black for light and white for dark, unaltered).
6. **The pages.** `site/src/pages/index.astro` (hero, video slot, proof points, price, privacy, origin, roadmap, FAQ), `site/src/pages/press.astro`, `site/src/pages/sitemap.xml.ts`, `site/public/robots.txt`. GREEN for every unit, browser, budget and host check.
7. **CI.** `.github/workflows/ci.yml`: a `check:tokens` step after `check:spec`; `ASTRO_TELEMETRY_DISABLED: 1` at job level. Browsers job unchanged (it runs every spec).
8. **Docs.** `README.md` (what the site now is, `site/`, `check:tokens`), `docs/DESIGN.md` (§1 goals, §2 dist table, §7 homepage budget, §8 headers per path, §10 `.html` resolution, §11 T8 and T19 with Astro's dev tree, §13 tests), `docs/RUNBOOK.md` (launch day: set `appStore`, `releaseDate`, `launchPrice.endsOn`, `pressEmail`; rebuild on the end date; homepage in the header check and Lighthouse; Web Analytics stays off).
9. **Code review and PR** per bb-context `AGENTS.md` §3.1 steps 8-9.

## Validation

From the worktree root, Node 22:

```bash
npm ci
npm run check:spec                       # unchanged card contract
npm run check:tokens                     # copy matches TOKENS_SOURCE (BB_CONTEXT=<bb-context checkout> also compares bytes)
npm run build                            # vendor check, tsc, astro check, Astro then card build, collision guard
npm run test:unit                        # card units + site-launch, site-copy, site-build
npm run check:budget                     # card numbers unchanged; homepage section
npm run check:headers                    # local preview: card and homepage headers
npm run check:pages                      # the same on wrangler pages dev
node scripts/build.mjs --host=github-pages && npm run check:budget
npx playwright install --with-deps chromium firefox webkit
npx playwright test                      # every card spec plus the home specs, three engines
npm run build                            # leave the Cloudflare build in dist/
```

Acceptance criteria to proof:

| AC | Proven by |
|---|---|
| 1 Homepage content, badge from one config value | `home.spec.ts`, `site-launch.test.ts`, `site-copy.test.ts` |
| 2 `/press` content | `home.spec.ts` (press block), `check:headers` |
| 3 Design system, light and dark, no new token | `check:tokens`; review of `global.css` (only `var(--…)` from the copy, no hex outside `tokens.css`, checked by a grep in `site-build.test.ts`); `home-a11y` and `home-layout` in both themes |
| 4 Card page unchanged | every existing spec, `check:headers`, `check:pages`, `check:budget` card rows, with only the three listed assertions changed |
| 5 Indexable, own CSP, no third party | `check:headers` (`/`, `/press`), `home-privacy.spec.ts`, CSP watch |
| 6 Claims and words | `site-copy.test.ts` |
| 7 One dist, CI green, 320-1920 light and dark, no a11y violation | CI jobs; `home-layout.spec.ts`; `home-a11y.spec.ts` |

Manual, once: both themes looked at, at 375 px (bb-context `DESIGN.md` "Before you finish").

## Interface

- Surface: site (bb-context `docs/platforms/site.md`), editorial: one `hero` h1 per page, numbered SectionLabels (00 hero, 01 proof points, 02 price, 03 privacy, 04 story, 05 roadmap, 06 FAQ), sections `spacing-section` apart, container 80rem, leads at most 38rem.
- Components: the App Store badge is the hero's one call to action (no SiteButton `primary` competes with it); SiteButton `ghost` for "Press kit" and "See the roadmap"; SectionLabel; Icon (`arrow-right`, `external`); AppStoreBadge (Apple artwork or a `line`-bordered `radius-pill` label); proof points as an ordered list on `surface` cards (`radius-card`, `line` border, no shadow); roadmap as four labelled columns (labels in Geist Mono, `muted`), not state colours; FAQ as `<details>` rows separated by `line`; the video as a `radius-card` frame; the Bridge cat mark beside the wordmark, decorative (`alt=""`), the light or dark file by `<picture>` with `prefers-color-scheme`.
- Tokens: `paper`, `surface`, `ink`, `muted`, `line`, `line-strong`, `accent`, `on-fill`, `radius-pill`, `radius-card`, `radius-box` (focus outline corner, as bb-homepage), `text-hero`, `text-display`, `text-lead`, `spacing-section`, `duration-fast`, `ease-out-expo`, `font-sans`, `font-mono`. **No new token.** No `band`, `seal`, state colours or `pets-*`.
- Narrowest width 320 px; both themes; no motion beyond the SiteButton hover, off under reduced motion.

## Production

No `bb-infrastructure` change: pets.binarybridges.co is Cloudflare Pages, outside the cluster (`docs/DESIGN.md` §10). The Pages build command and output folder stay the same.

## Risks and rollback

| Risk | Likelihood | Mitigation |
|---|---|---|
| Production Pages replaces a detached header differently from wrangler | Low | The behaviour is read from wrangler's code and tested on `wrangler pages dev` in CI; `check:headers` on the `pages.dev` preview before the domain points there. Fallback: drop fonts (system stack) and the video until fixed, so the homepage works under the card CSP, which needs no header change |
| Astro or Vite emits an inline style, a `data:` URL or a script | Medium | `inlineStylesheets: 'never'`, `assetsInlineLimit: 0`; `home.spec.ts` checks the HTML; the CSP watch fails any violation in three engines |
| `@astrojs/check` needs TypeScript 6 | Medium | Move to 6.0.3 in task 1 and keep `tsc -p .` green; otherwise drop `astro check` and type-check `site/src/lib` with `tsc` only |
| Astro adds a large dev dependency tree (supply chain, T19) | Certain | Exact pins and the lock file; nothing from it ships but CSS, fonts and HTML; DESIGN T19 updated |
| The page says a launch price after it ended | Low | The dated sentence names both prices; the build drops it after the date; RUNBOOK step to rebuild on the day |
| A placeholder press address ships | Low | There is none: `null` renders the line without a contact |
| Apple's badge artwork terms | Low | Unaltered official files, used only once a listing exists; text label before |
| Copy drifts into claims (diagnosis, competitors, jargon) | Low | `site-copy.test.ts` |

Rollback: revert the merge commit on `main`; Cloudflare Pages rebuilds the previous `dist/` (the one-line home and the card page as they are today). Nothing else holds state: no data, no DNS, no infrastructure change.
