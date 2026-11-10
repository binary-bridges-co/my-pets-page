# My Pets public page: runbook

Going live is the plan's **phase 5**, with the closed beta: it needs an active Apple Developer Program membership (the CloudKit Console) and a Cloudflare account, both created by the owner then. Until then the page is built and tested against fixtures only, and nothing here has been done. Do the steps in order; each ends with a check.

What it costs: Cloudflare Pages free plan (nothing), CloudKit public database (included in the membership), the `binarybridges.co` domain at Namecheap (already paid). Nothing else.

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

Record in `docs/DESIGN.md` §3 and as fixtures in `test/support/scenarios.ts`: the CORS headers (`Access-Control-Allow-Origin` for the page's origin: **C4**, the open question), the shape of a found record (`type` strings, the Base64 form of Bytes) and of a missing name (`NOT_FOUND`), and a throttled answer if one can be provoked. Then open the Pages preview (step 2) on a real link in Safari, Chrome and Firefox and check Web Inspector shows one `POST` to `api.apple-cloudkit.com`, with no preflight error. If the browser call fails on CORS: stop, owner question Q-R2-4. Finally look at what the Console's logs show for these anonymous lookups (C6).

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

## If the host must change

The same `dist/` serves anywhere; the records stay in iCloud.

- **GitHub Pages** (fallback): `npm run build -- --host=github-pages` adds a `<meta>` CSP (without `frame-ancestors`) and makes `404.html` the page, since GitHub Pages has no headers and no rewrites (so `/p/<id>` answers with status 404 and the page still works). Publish `dist/` with the official Pages actions, set the repository's custom domain to `pets.binarybridges.co`, and change the Namecheap CNAME to `binary-bridges-co.github.io.`. Limits: no HSTS, COOP, CORP or Permissions-Policy headers; the AASA file is served with GitHub's own content type (Apple may refuse it, so app links can stop working); GitHub logs visitors' addresses.
- **Netlify**: the same `_headers` (drop the `! Access-Control-Allow-Origin` line, which only Cloudflare reads) and `_redirects`; CNAME to `<site>.netlify.app`. Its free plan is credit-based and can pause a site.
- After any move: the new allowed origin in the production API token (step 1.5), then `npm run check:headers -- https://pets.binarybridges.co`.
