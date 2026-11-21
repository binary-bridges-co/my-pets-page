# My Pets public page: runbook

Going live is the plan's **phase 5**, with the closed beta: it needs an active Apple Developer Program membership (the CloudKit Console) and a Cloudflare account, both created by the owner then. Until then the page is built and tested against fixtures only, and nothing here has been done. Do the steps in order; each ends with a check.

What it costs: Cloudflare Pages free plan (nothing), CloudKit public database (included in the membership), the `binarybridges.co` domain at Namecheap (already paid). Nothing else.

The site is one deploy: the card page (`/p/<id>`), the homepage and `/press`, and the Help, Privacy and Terms pages the App Store listing and the app's Settings link to (`/help`, `/privacy`, `/terms`, and `/es/help`, `/es/privacy`, `/es/terms`). The AASA file claims `/p/*` only, so every other path opens in Safari, never in the app.

## 0. The owner's list, in order

Short form of sections 1 to 3 and 6; the details and the checks are there. Nothing costs money.

1. **Renew the Apple Developer Program membership** (developer.apple.com → Account). The CloudKit Console needs it.
2. **CloudKit Console, Development** (https://icloud.developer.apple.com → CloudKit Database → container `iCloud.co.binarybridges.pets` → environment switch at the top: **Development**): create the record type `PublicLink` with its five fields, delete every index, set the security roles (§1, steps 1 to 3).
3. **Deploy the schema to Production**: in the same Console, left column **Deploy Schema Changes…** → Deploy. The Production environment has no `PublicLink` type, and its API token is useless, until this is done. Switch the environment to **Production** and check the type, the fields, no index and the roles (§1, step 4).
4. **Create the two API tokens**: left column **Tokens & Keys** (under Settings) → **API Tokens** → **+**. For production: name `my-pets-page production`, environment **Production**, Allowed Origins **Specific domains** → `https://pets.binarybridges.co`, no sign-in callback → Save, and copy the token. Then `my-pets-page development` the same way with environment **Development** and origin `https://my-pets-page.pages.dev` (§1, step 5).
5. **Put the tokens in the repository**: paste the production token as `apiToken` in `config/production.json` and the development token in `config/development.json`, replacing the `PLACEHOLDER…` values, in a pull request to `main` (or hand them to an agent to open it). They are public by design; the roles protect the records (§1, step 6).
6. **Cloudflare account**: https://dash.cloudflare.com/sign-up with the owner's email; turn on two-factor (My Profile → Authentication). No card is needed (§2, step 1).
7. **Pages project**: Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git** → GitHub → install the Cloudflare app on `binary-bridges-co` with **Only select repositories** → `my-pets-page` → back in Cloudflare choose `my-pets-page` → **Begin setup**. Project name `my-pets-page`, production branch `main`, framework preset **None**, the build command and output directory of §2 step 4, and under **Environment variables** `NODE_VERSION` = `22` → **Save and Deploy** (§2, steps 2 to 4).
8. **Turn Web Analytics off**: the project → **Metrics** (or Settings) → Web Analytics → **Disable** if it is on. Leave Bot Fight Mode off (§2, step 5).
9. **Custom domain**: the project → **Custom domains** → **Set up a custom domain** → `pets.binarybridges.co` → Continue. Cloudflare shows a CNAME to add (§3, step 1).
10. **DNS at Namecheap**: Domain List → `binarybridges.co` → **Manage** → **Advanced DNS** → delete the `A` record `pets` → `46.202.176.67`; **Add new record** → `CNAME Record`, host `pets`, value `my-pets-page.pages.dev.`, TTL Automatic → save. Back in Cloudflare wait for **Active** and the certificate (§3, steps 2 and 3).
11. **Effective date**: if the pages go live after the date in `site/src/content/legal.ts` (`PRIVACY_EFFECTIVE_DATE`), change it to the go-live day in the same pull request as the tokens (§6).
12. **Run the go-live checks** of §3 step 4 and §6, then the device checks of §4. Tell the iOS repo (issue `binary-bridges-co/my-pets-ios#312`) the pages are live, so the Spanish App Store page and the app can use the `/es/` addresses.

## 1. CloudKit: schema, roles, tokens (CloudKit Console, after the renewal)

At https://icloud.developer.apple.com, container `iCloud.co.binarybridges.pets`, **Development** environment first.

1. **Record type** `PublicLink` (Schema → Record Types → +), fields exactly (Spec §15.7 r2):

   | Field | Type |
   |---|---|
   | `v` | Int(64) |
   | `key` | Bytes |
   | `body` | Bytes |
   | `sig` | Bytes |
   | `photo` | Bytes |

2. **No indexes.** Schema → Indexes → `PublicLink`: delete any index the Console proposes, `recordName` included. Nobody must be able to list or query cards.
3. **Security roles** (Schema → Security Roles → `PublicLink`): **World** Read; **Authenticated** Create; **Creator** Read and Write. No other grant.
4. **Deploy** the schema to Production (Schema → Deploy Schema Changes). Check in Production that the type, fields, no indexes and the roles are there.
5. **API tokens** (Settings → Tokens & Keys → API Tokens → +):
   - `my-pets-page production`: environment Production, Allowed Origins **Specific domains** `https://pets.binarybridges.co`, no sign-in callback.
   - `my-pets-page development`: environment Development, Allowed Origins the Pages preview domain `https://my-pets-page.pages.dev` (branch previews at `<hash>.my-pets-page.pages.dev` then can't read records, which is fine).
6. Put the tokens in `config/production.json` and `config/development.json` (`apiToken`) in a PR. They are public by design (DESIGN §3, T18); the roles protect the records. Rotating one is a new token, the same PR, and a redeploy.

**Phase 0 spike (first thing after step 5).** From a terminal, with the development token and a record the app saved in Development:

```bash
curl -s -X POST -H 'Content-Type: text/plain;charset=UTF-8' \
  -H 'Origin: https://my-pets-page.pages.dev' -D - \
  'https://api.apple-cloudkit.com/database/1/iCloud.co.binarybridges.pets/development/public/records/lookup?ckAPIToken=<token>' \
  --data '{"records":[{"recordName":"<id>"},{"recordName":"<id>.1"}]}'
```

Record in `docs/DESIGN.md` §3 and as fixtures in `test/support/scenarios.ts`: the CORS headers (`Access-Control-Allow-Origin` for the page's origin: **C4**, the open question), the shape of a found record (`type` strings, the Base64 form of Bytes) and of a missing name (`NOT_FOUND`), and a throttled answer if one can be provoked. Then open the Pages preview (step 2) on a real link in Safari, Chrome and Firefox and check Web Inspector shows one `POST` to `api.apple-cloudkit.com`, with no preflight error. If the browser call fails on CORS: stop, owner question Q-R2-4. Note what the found record's `created` and `modified` carry, `deviceID` especially (C8): a device name in it is personal data in a public record and goes to the owner before go-live. Finally look at what the Console's logs show for these anonymous lookups (C6).

## 2. Cloudflare Pages: the project

1. Create a free Cloudflare account (owner's email, two-factor on). No credit card is needed for Pages.
2. Workers & Pages → Create → **Pages** → Connect to Git → GitHub → install the Cloudflare app on `binary-bridges-co` for **this repository only** → choose `my-pets-page`.
3. Project name `my-pets-page` (so the address is `my-pets-page.pages.dev`). Production branch `main`. If Cloudflare gives the project another `*.pages.dev` name (the name is taken), use that name everywhere below and in the development token's origin.
4. Build settings: framework **None**; build command
   ```
   npm ci && npm run build -- --config=$([ "$CF_PAGES_BRANCH" = "main" ] && echo production || echo development)
   ```
   output directory `dist`; environment variable `NODE_VERSION` = `22`.
5. Settings → **Web Analytics: off** (it injects a script; DESIGN T8). Leave Bot Fight Mode and other script-injecting features off.
6. Check the preview:
   ```bash
   npm run check:headers -- https://my-pets-page.pages.dev
   ```
   It must print `check-headers: … checks pass`. (CI already runs the same check against `wrangler pages dev`, Cloudflare's local emulation, and the local preview.) If the only failure is `x-robots-tag` on the `pages.dev` address (Pages may add its own `noindex` there), that is expected; the check on the custom domain in step 3 must pass in full. Run Lighthouse (Chrome DevTools, mobile) on a published and a lost card of the preview once: LCP < 2.5 s, CLS < 0.1, TBT < 200 ms.

## 3. The custom domain

1. Pages project → Custom domains → **Set up a custom domain** → `pets.binarybridges.co`. Cloudflare says to add a CNAME at the current DNS provider (the zone stays at Namecheap; no nameserver move).
2. At Namecheap → Domain List → `binarybridges.co` → **Advanced DNS**:
   - delete the record `A  pets  46.202.176.67` (the old VPS);
   - add `CNAME Record`, host `pets`, value `my-pets-page.pages.dev.`, TTL Automatic;
   - if the zone has **CAA** records, make sure one allows the CA Cloudflare uses (`letsencrypt.org`, `pki.goog` or `ssl.com`); with no CAA record at all, nothing to do.
3. Back in Cloudflare, wait for the domain to show **Active** and the certificate **Issued** (minutes, sometimes an hour).
4. Check:
   ```bash
   dig +short pets.binarybridges.co CNAME
   npm run check:headers -- https://pets.binarybridges.co
   curl -sI https://pets.binarybridges.co/.well-known/apple-app-site-association   # 200, application/json, no Location
   curl -s https://app-site-association.cdn-apple.com/a/v1/pets.binarybridges.co    # the same JSON, once Apple's CDN fetched it (can take a day)
   ```
5. Apple's CDN caches the AASA file; a later change to it can take a day or more to reach phones. The app's Associated Domains entitlement `applinks:pets.binarybridges.co` is already in the app (umbrella plan R2.6); the signed beta build carries it.
6. Nothing changes in bb-infrastructure: the cluster no longer serves `pets.`; remove its route there separately when convenient.

## 4. Device checks (umbrella plan, device checklist 1, 11, 12, 14, 15, 18, 19)

Run them with the beta build: a tag tapped and scanned on a phone without My Pets shows the card; lost mode shows the band within a minute of a fresh load; Deactivate makes the page say "This tag is no longer active"; Safari's Web Inspector shows only `pets.binarybridges.co` and `api.apple-cloudkit.com`, no cookie, no storage; a force-quit iPhone with My Pets opens the app from the tag.

## 5. The homepage on launch day

The homepage's launch state is one file, `site/src/config/launch.ts` (`realConfig`); CI already tests the released state with the fixture build. There is no pre-order (owner, 21 Nov 2026): the badge area says "Coming soon to the App Store" until release day.

1. On release day, once the app is on the App Store: set `appStore` to `{ state: 'available', id: '<digits>' }` (add `campaign` for a `?ct=` tag if wanted). The badge, the Smart App Banner and the privacy line follow. Lost mode and the collar tag's public page go live then too, not before.
2. Set `releaseDate` (ISO date) and `launchPrice.endsOn`, the **last** day of the launch price (the launch price is the first 28 days, so release day plus 27 days, ISO date; the page says "until" that day, included).
3. Once the mailbox `press@binarybridges.co` receives mail, set `pressEmail` to it. Never before: until then the press page says "Promo codes on request." with no address.
4. Add real screenshots and the video under `site/public/` with a budget row each (`scripts/check-budget.mjs`), then list them in `screenshots` and `previewVideo`.
5. **Rebuild the day after `endsOn`** (retry the last deployment in Cloudflare, or push any commit): the page then shows US$19.99 only. Before the rebuild it still tells the truth, since the dated line names both prices.
6. After deploy: `npm run check:headers -- https://pets.binarybridges.co` (it checks `/`, `/press` and their assets too), and Lighthouse on `/` once (mobile). Web Analytics stays off.

## 6. Help, Privacy and Terms (the App Store's Support and Privacy Policy URLs)

The texts are the iOS repo's `Store/website/` files (English) and `Store/website/es/` (Spanish), copied byte for byte into `site/src/content/legal/` at the commits in `LEGAL_SOURCE`, without their leading note for maintainers. A change is made in the iOS repo first, then copied here with a new `LEGAL_SOURCE` line (`npm run check:legal`, and `IOS_REPO=<checkout> npm run check:legal` to compare with the iOS files). Keep the privacy page in step with the iOS repo's `Store/privacy-label.md`.

- **Effective date.** `PRIVACY_EFFECTIVE_DATE` in `site/src/content/legal.ts` fills `{{EFFECTIVE_DATE}}` on both privacy pages ("Effective November 21, 2026", "Vigente desde el 21 de noviembre de 2026"). It is the go-live day: change it if go-live is later. A placeholder left in a text fails the build.
- **Contact** is `support@binarybridges.co`, a `mailto:` link only (no form: a form needs a server).
- Every page has no script (`script-src 'none'`, `connect-src 'none'`), no cookie and nothing from another site; `/es/` pages carry `lang="es"`, and each page names its twin with `hreflang` and links to it ("Español" / "English").

**Go-live checks** (after §3):

```bash
npm run check:headers -- https://pets.binarybridges.co      # every page below: 200, no redirect, lang, headers; the AASA
for p in help privacy terms es/help es/privacy es/terms; do curl -s -o /dev/null -w "%{http_code} %{content_type} $p\n" "https://pets.binarybridges.co/$p"; done   # 200 text/html each
curl -s https://app-site-association.cdn-apple.com/a/v1/pets.binarybridges.co   # Apple's CDN copy: the same JSON as /.well-known/apple-app-site-association
```

1. Open `/help`, `/privacy`, `/terms` and the three `/es/` pages in Safari on an iPhone: they open in Safari (not in My Pets), the language link switches to the twin, the footer links to all three, the privacy page shows the effective date and no `{{`.
2. Apple's CDN answers the JSON above with `"/": "/p/*"` and the app ID `9JB56TN367.co.binarybridges.pets`. It can take up to a day after §3 to appear; until then, tag links open in Safari only.
3. **A published test card from a tag link**: in the beta build, publish a test pet's card, write its link to a tag (or show its QR code), and on an iPhone **with** My Pets tap or scan it: My Pets opens on that pet. On an iPhone **without** My Pets (or with the app deleted): Safari shows the card at `https://pets.binarybridges.co/p/<id>`. Unpublish the test card afterwards.
4. In App Store Connect, set the app's **Support URL** to `https://pets.binarybridges.co/help` and **Privacy Policy URL** to `https://pets.binarybridges.co/privacy` (Spanish localization: the `/es/` addresses), then tell the iOS repo the pages are live.

## If the host must change

The same `dist/` serves anywhere; the records stay in iCloud.

- **GitHub Pages** (fallback): `npm run build -- --host=github-pages` adds a `<meta>` CSP (without `frame-ancestors`) and makes `404.html` the page, since GitHub Pages has no headers and no rewrites (so `/p/<id>` answers with status 404 and the page still works). Publish `dist/` with the official Pages actions, set the repository's custom domain to `pets.binarybridges.co`, and change the Namecheap CNAME to `binary-bridges-co.github.io.`. Limits: no HSTS, COOP, CORP or Permissions-Policy headers; the AASA file is served with GitHub's own content type (Apple may refuse it, so app links can stop working); GitHub logs visitors' addresses.
- **Netlify**: the same `_redirects`, and `_headers` rewritten without the `! Name` lines (only Cloudflare reads them: give `/p/*`, `/404.html` and the other card paths the card CSP and `noindex`, and `/` and `/press` the homepage CSP); CNAME to `<site>.netlify.app`. Its free plan is credit-based and can pause a site.
- After any move: the new allowed origin in the production API token (step 1.5), then `npm run check:headers -- https://pets.binarybridges.co`.
