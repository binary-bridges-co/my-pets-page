# My Pets public page: runbook

The site is hosted on **AWS: a private S3 bucket behind CloudFront**, declared in `binary-bridges-co/bb-infrastructure` (stack `my-pets-page-aws`, `aws/my-pets-page/stack.yml`) the way bb-sign's frontend is (owner, 21 Nov 2026, in place of Cloudflare Pages). DNS stays at Namecheap. Merging to `main` here builds and publishes the site (`.github/workflows/deploy.yml`); merging in bb-infrastructure applies the AWS resources. Do the steps in order; each ends with a check.

What it costs: a few cents a month at most (§9). CloudFront's always-free tier covers this site's traffic, S3 holds about 1 MB, the certificate is free; the CloudKit public database is included in the Apple membership and the domain at Namecheap is already paid.

The site is one deploy: the card page (`/p/<id>`), the homepage and `/press`, and the Help, Privacy and Terms pages the App Store listing and the app's Settings link to (`/help`, `/privacy`, `/terms`, and `/es/help`, `/es/privacy`, `/es/terms`). The AASA file claims `/p/*` only, so every other path opens in Safari, never in the app.

## 0. The owner's list, in order

Short form of sections 1 to 3; the details and the checks are there. Steps 1 to 10 put `https://pets.binarybridges.co/privacy` live, which Apple's external beta review needs; they don't need the CloudKit tokens (steps 11 to 14), which only the card page needs.

**AWS: the bb-infrastructure PR (binary-bridges-co/bb-infrastructure#163), then this repository's PR (`feat/aws-hosting`)**

1. **Certificate.** AWS console, region **N. Virginia (us-east-1)** (top right) → **Certificate Manager** → **Request** → **Request a public certificate** → Next → Fully qualified domain name `pets.binarybridges.co` → **DNS validation** → key algorithm **RSA 2048** → **Request**. Open the new certificate and copy its **ARN**, and under **Domains** its **CNAME name** and **CNAME value** (§2, step 1).
2. **Validation record at Namecheap.** Domain List → `binarybridges.co` → **Manage** → **Advanced DNS** → **Add new record** → `CNAME Record`: **Host** = the CNAME name without `.binarybridges.co.` (it looks like `_1a2b…9f.pets`), **Value** = the CNAME value (it looks like `_3c4d…7e.abcdefgh.acm-validations.aws.`), TTL Automatic → save (the green tick). Keep this record for good: ACM renews the certificate with it. Wait until the certificate says **Issued** (5 to 30 minutes).
3. **Give the ARN** to the agent (or paste it as `CertificateArn` in bb-infrastructure's `aws/my-pets-page/params.json` on the PR branch). Done 21 Nov 2026.
4. **Deploy the GitHub roles by hand** (AWS admin, a terminal with the AWS CLI logged in, a bb-infrastructure checkout of the PR branch): the commands of §2 step 2. Expect one `Add` (`MyPetsPageCfnServiceRole`) and two `Modify` (`PlanRole`, `ExecuteRole`) rows, nothing else.
5. **Re-run the PR's check** "AWS CloudFormation (my-pets-page)" (the PR → **Checks** → that workflow → **Re-run all jobs**): its comment lists eleven `Add` rows (the bucket and its policy, the origin access control, six header policies, the function, the distribution). **Merge the bb-infrastructure PR.** Its workflow creates the stack (5 to 15 minutes, mostly CloudFront).
6. **Read the outputs**: CloudFormation (us-east-1) → Stacks → `my-pets-page-aws` → **Outputs**: `DistributionId` (`E…`) and `DistributionDomainName` (`d….cloudfront.net`).
7. **Deploy the GitHub roles by hand again**, now from bb-infrastructure `main`, with the distribution id (§2, step 4): one `Add` row, `MyPetsPageDeployRole`; the stack's new output `MyPetsPageDeployRoleArn` is the deploy role.
8. **Three repository variables here**: GitHub → `binary-bridges-co/my-pets-page` → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**: `AWS_DEPLOY_ROLE_ARN` = the ARN of step 7; `AWS_DISTRIBUTION_ID` = `E…`; `SITE_URL` = `https://d….cloudfront.net` (the domain name of step 6 with `https://`).
9. **Merge this repository's PR** (if it is already merged: **Actions** → **Deploy** → **Run workflow** on `main`). The workflow builds, uploads, invalidates and ends with `npm run check:headers` against `SITE_URL`: it must be green.
10. **The site's record at Namecheap** (Advanced DNS): if an `A` or `CNAME` record for `pets` exists, **delete** it (today there is none: `46.202.176.67` is the apex `@`, which stays); then **Add new record** → `CNAME Record`, Host `pets`, Value the domain name of step 6 followed by a dot (`d….cloudfront.net.`), TTL Automatic → save. Change the variable `SITE_URL` to `https://pets.binarybridges.co` and run the checks of §3. Privacy, Help and Terms are live.

**CloudKit (after the Apple Developer Program renewal)**

11. **CloudKit Console, Development** (https://icloud.developer.apple.com → CloudKit Database → container `iCloud.co.binarybridges.pets` → environment switch at the top: **Development**): create the record type `PublicLink` with its five fields, delete every index, set the security roles (§1, steps 1 to 3).
12. **Deploy the schema to Production**: in the same Console, left column **Deploy Schema Changes…** → Deploy. The Production environment has no `PublicLink` type, and its API token is useless, until this is done. Switch the environment to **Production** and check the type, the fields, no index and the roles (§1, step 4).
13. **Create the two API tokens**: left column **Tokens & Keys** (under Settings) → **API Tokens** → **+**. For production: name `my-pets-page production`, environment **Production**, Allowed Origins **Specific domains** → `https://pets.binarybridges.co`, no sign-in callback → Save, and copy the token. Then `my-pets-page development` the same way with environment **Development** and origin `http://localhost:4173` (§1, step 5).
14. **Put the tokens in the repository**: paste the production token as `apiToken` in `config/production.json` and the development token in `config/development.json`, replacing the `PLACEHOLDER…` values, in a pull request to `main` (or hand them to an agent to open it). They are public by design; the roles protect the records. Merging it redeploys (§1, step 6). If go-live is later than `PRIVACY_EFFECTIVE_DATE` in `site/src/content/legal.ts`, change that date in the same pull request (§6).
15. **Run the go-live checks** of §3 and §6, then the device checks of §4. Tell the iOS repo (issue `binary-bridges-co/my-pets-ios#312`) the pages are live, so the Spanish App Store page and the app can use the `/es/` addresses.

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
   - `my-pets-page development`: environment Development, Allowed Origins **Specific domains** `http://localhost:4173` (the local preview: `npm run build -- --config=development && npm run preview`). There is no hosted preview on AWS (one distribution, production only). If the Console refuses a `localhost` origin, stop: owner question (a second, development distribution at about the same cost, or no development token).
6. Put the tokens in `config/production.json` and `config/development.json` (`apiToken`) in a PR. They are public by design (DESIGN §3, T18); the roles protect the records. Rotating one is a new token, the same PR, and a redeploy.

**Phase 0 spike (first thing after step 5).** From a terminal, with the development token and a record the app saved in Development:

```bash
curl -s -X POST -H 'Content-Type: text/plain;charset=UTF-8' \
  -H 'Origin: http://localhost:4173' -D - \
  'https://api.apple-cloudkit.com/database/1/iCloud.co.binarybridges.pets/development/public/records/lookup?ckAPIToken=<token>' \
  --data '{"records":[{"recordName":"<id>"},{"recordName":"<id>.1"}]}'
```

Record in `docs/DESIGN.md` §3 and as fixtures in `test/support/scenarios.ts`: the CORS headers (`Access-Control-Allow-Origin` for the page's origin: **C4**, the open question), the shape of a found record (`type` strings, the Base64 form of Bytes) and of a missing name (`NOT_FOUND`), and a throttled answer if one can be provoked. Then open the local preview of a development build (`npm run build -- --config=development && npm run preview`, then `http://localhost:4173/p/<id>`) on a real link in Safari, Chrome and Firefox and check Web Inspector shows one `POST` to `api.apple-cloudkit.com`, with no preflight error. If the browser call fails on CORS: stop, owner question Q-R2-4. Note what the found record's `created` and `modified` carry, `deviceID` especially (C8): a device name in it is personal data in a public record and goes to the owner before go-live. Finally look at what the Console's logs show for these anonymous lookups (C6).

## 2. AWS: the stack and the deploy

How it is built (DESIGN §10): CloudFront serves the private bucket `production-mypets-page` through origin access control, HTTPS only (HTTP is redirected), HTTP/2 and HTTP/3. Every `_headers` rule is a cache behaviour whose response headers policy carries exactly the headers Cloudflare Pages would send for that path; a viewer-request CloudFront Function does `_redirects`' rewrite and Pages' clean URLs; a missing object is `404.html` with status 404. The policies, the function and the behaviours are **generated here** (`npm run gen:aws`, committed as `aws/cloudfront.generated.yml`) and copied verbatim into bb-infrastructure (§7). Only this repository's deploy workflow writes to the bucket, through the role `github-actions-my-pets-page-deploy` (GitHub OIDC, `main` only; it may put and delete objects in that bucket and invalidate that distribution, nothing else; no stored key).

1. **Certificate** (§0 steps 1 and 2): ACM in **us-east-1** (CloudFront only takes certificates from there), DNS validation, the validation CNAME at Namecheap kept for renewals. If the zone has **CAA** records, one must allow Amazon (`amazon.com`); with no CAA record, nothing to do. Check: the certificate shows **Issued**.
2. **The roles, by hand** (bb-infrastructure `aws/github-oidc.yml`, a stack no workflow deploys), from a checkout of the bb-infrastructure PR branch. The first deploy also takes bb-sign's distribution id (`BbSignDistributionId`, which the new service role is explicitly denied; it isn't in git, so it is read from the bb-sign stack):
   ```bash
   BB_SIGN_DIST=$(aws cloudformation describe-stacks --region us-east-1 --stack-name bb-sign-aws \
     --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
   aws cloudformation deploy --region us-east-1 --stack-name bb-github-oidc --template-file aws/github-oidc.yml \
     --capabilities CAPABILITY_NAMED_IAM --parameter-overrides BbSignDistributionId="$BB_SIGN_DIST" --no-execute-changeset
   aws cloudformation describe-change-set --region us-east-1 --change-set-name <the ARN it printed> \
     --query 'Changes[].ResourceChange.[Action,LogicalResourceId,Replacement]' --output table
   aws cloudformation execute-change-set --region us-east-1 --change-set-name <the same ARN>
   aws cloudformation wait stack-update-complete --region us-east-1 --stack-name bb-github-oidc
   ```
   Expect `Add MyPetsPageCfnServiceRole`, `Modify PlanRole`, `Modify ExecuteRole` and nothing else (parameters you don't pass keep their values). Check: IAM → Roles has `bb-infrastructure-cfn-my-pets-page`.
3. **The stack** (the merge of the bb-infrastructure PR): the workflow "AWS CloudFormation (my-pets-page)" creates `my-pets-page-aws` through that role; CloudFront takes 5 to 15 minutes. A failed creation rolls back by itself and leaves the stack `ROLLBACK_COMPLETE`: read the failed event (CloudFormation → the stack → **Events**), **Delete** the stack, tell the agent, and re-run the workflow after the fix. Check: the stack is `CREATE_COMPLETE` with four outputs.
4. **The deploy role, by hand**, from bb-infrastructure `main`:
   ```bash
   aws cloudformation deploy --region us-east-1 --stack-name bb-github-oidc --template-file aws/github-oidc.yml \
     --capabilities CAPABILITY_NAMED_IAM --parameter-overrides MyPetsPageDistributionId=<DistributionId> --no-execute-changeset
   ```
   then describe, execute and wait as in step 2 (each with `--region us-east-1`): one row, `Add MyPetsPageDeployRole`. Check: the stack's output `MyPetsPageDeployRoleArn`.
5. **The variables and the first deploy** (§0 steps 8 and 9). The deploy job is skipped while `AWS_DEPLOY_ROLE_ARN` is unset, so merging this repository before the AWS side does no harm. Every later merge to `main` publishes by itself.
6. **Check on the CloudFront address**, before the DNS moves (the deploy already ran it):
   ```bash
   npm run check:headers -- https://<DistributionDomainName>
   ```
   It must print `check-headers: … checks pass`. Run Lighthouse (Chrome DevTools, mobile) once on `/`, a published card and a lost card: LCP < 2.5 s, CLS < 0.1, TBT < 200 ms.

What the deploy does (`scripts/deploy-aws.mjs`): `npm run build -- --host=aws --config=production` (it fails if the generated CloudFront configuration is stale), the budget and `npm run check:aws`, then one `aws s3 cp` per content type and Cache-Control (hashed files first, HTML last; the AASA file as `application/json`), `aws s3 sync --delete` for objects the build no longer has, an invalidation of `/*` (waited for), and `npm run check:headers -- $SITE_URL`. To roll back, revert the commit on `main`: the revert deploys the previous site.

## 3. The custom domain

1. Namecheap → Domain List → `binarybridges.co` → **Manage** → **Advanced DNS**. The site needs these two records, and only these:

   | Type | Host | Value | Why |
   |---|---|---|---|
   | CNAME | `_<token>.pets` (from ACM) | `_<token>.<id>.acm-validations.aws.` (from ACM) | Certificate validation and renewal; keep it |
   | CNAME | `pets` | `d<id>.cloudfront.net.` (`DistributionDomainName`) | The site |

   If an `A` or `CNAME` record for `pets` exists, delete it first (a host can't have an `A` and a `CNAME` record at once). Today there is none: `46.202.176.67` is the apex (`@`), which stays.
2. DNS takes minutes (Namecheap's automatic TTL is at most 30 minutes; the old `A` record may be cached that long).
3. Check:
   ```bash
   dig +short pets.binarybridges.co CNAME        # d….cloudfront.net.
   npm run check:headers -- https://pets.binarybridges.co
   curl -sI https://pets.binarybridges.co/.well-known/apple-app-site-association   # 200, content-type: application/json, no location
   curl -s https://app-site-association.cdn-apple.com/a/v1/pets.binarybridges.co    # the same JSON, once Apple's CDN fetched it (can take a day)
   ```
4. Apple's CDN caches the AASA file; a later change to it can take a day or more to reach phones. The app's Associated Domains entitlement `applinks:pets.binarybridges.co` is already in the app (umbrella plan R2.6); the signed beta build carries it.
5. Nothing else changes in bb-infrastructure's cluster: it doesn't serve `pets.` (the my-pets-server deploy, bb-infrastructure#158, was closed and never merged).

## 4. Device checks (umbrella plan, device checklist 1, 11, 12, 14, 15, 18, 19)

Run them with the beta build: a tag tapped and scanned on a phone without My Pets shows the card; lost mode shows the band within a minute of a fresh load; Deactivate makes the page say "This tag is no longer active"; Safari's Web Inspector shows only `pets.binarybridges.co` and `api.apple-cloudkit.com`, no cookie, no storage; a force-quit iPhone with My Pets opens the app from the tag.

## 5. The homepage on launch day

The homepage's launch state is one file, `site/src/config/launch.ts` (`realConfig`); CI already tests the released state with the fixture build. There is no pre-order (owner, 21 Nov 2026): the badge area says "Coming soon to the App Store" until release day.

1. On release day, once the app is on the App Store: set `appStore` to `{ state: 'available', id: '<digits>' }` (add `campaign` for a `?ct=` tag if wanted). The badge, the Smart App Banner and the privacy line follow. Lost mode and the collar tag's public page go live then too, not before.
2. Set `releaseDate` (ISO date) and `launchPrice.endsOn`, the **last** day of the launch price (the launch price is the first 28 days, so release day plus 27 days, ISO date; the page says "until" that day, included).
3. Once the mailbox `press@binarybridges.co` receives mail, set `pressEmail` to it. Never before: until then the press page says "Promo codes on request." with no address.
4. Add real screenshots and the video under `site/public/` with a budget row each (`scripts/check-budget.mjs`), then list them in `screenshots` and `previewVideo`.
5. **Rebuild the day after `endsOn`** (GitHub → `my-pets-page` → **Actions** → **Deploy** → **Run workflow** on `main`, or push any commit): the page then shows US$19.99 only. Before the rebuild it still tells the truth, since the dated line names both prices.
6. After deploy: `npm run check:headers -- https://pets.binarybridges.co` (it checks `/`, `/press` and their assets too), and Lighthouse on `/` once (mobile).

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

## 7. Changing headers, rewrites or pages

`src/host/_headers` and `src/host/_redirects` are the one source of truth for both hosts. A change to them or to `scripts/aws/viewer-request.js`, or an HTML page added or removed, changes the CloudFront configuration:

1. Change the file, `npm run build`, then `npm run gen:aws` (rewrites `aws/cloudfront.generated.yml`) and commit both. `npm test`, `npm run build -- --host=aws` and `npm run check:aws` fail while the committed file is stale; `npm run check:aws` runs the whole header check against a local emulation of the generated configuration.
2. Copy the two generated blocks (from `# BEGIN GENERATED` to `# END GENERATED`, both lines included) into bb-infrastructure's `aws/my-pets-page/stack.yml` in a PR; `npm run check:aws-infra -- <bb-infrastructure checkout>/aws/my-pets-page/stack.yml` must pass. Its workflow checks each block's SHA-256 and comments the change set.
3. Merge bb-infrastructure first (CloudFront takes a few minutes), then this repository: the deploy refuses a build whose configuration differs from the committed file, so a page can't go live before its route.

The generator refuses what CloudFront can't express (a header its policies can't send, overlapping rules that one behaviour per path can't merge, more than 25 behaviours or 20 policies) instead of approximating it.

## 8. Privacy: what AWS sees and keeps

Nothing in this setup records visitors: CloudFront standard logging and real-time logs are off, the bucket has no server access logging, no cookie is forwarded or set (the cache policy forwards no cookie, header or query string to S3), there is no analytics and no WAF, and the function logs nothing.

What AWS still processes, transiently, to answer a request: the visitor's IP address, the TLS handshake (with the name `pets.binarybridges.co`), the requested path (a tag link's `/p/<id>`, never the `#` fragment, which browsers don't send) and request headers such as User-Agent, at the CloudFront edge; AWS Shield Standard, always on, inspects traffic for attacks. CloudFront's built-in CloudWatch metrics are aggregate counts (requests, bytes, error rates) without addresses. CloudTrail records the deploy's API calls (who uploaded what, when), not visits. The card page says the host sees the visitor's address and the link id (DESIGN §5, T8); that stays true, with AWS as the host.

## 9. Cost

Expected: **US$0.00 to 0.05 a month** for a small site.

| Item | This site | Price |
|---|---|---|
| CloudFront data and requests | A few MB and some thousands of requests a month. Always-free tier, per AWS account and month: 1 TB out, 10 million requests | US$0 |
| CloudFront Functions | One run per page request (files under `/_astro/` and `/assets/`, the AASA, robots and sitemap skip it); 2 million a month free | US$0 |
| Invalidations | One path (`/*`) per deploy; 1,000 paths a month free | US$0 |
| S3 | About 1 MB stored (US$0.023 per GB-month); some hundred writes per deploy (US$0.005 per 1,000) and CloudFront's revalidations of HTML (US$0.0004 per 1,000) | under US$0.05 |
| ACM certificate, response headers policies, origin access control | | free |

What could raise it: traffic past the free tier, which is shared with bb-sign's distribution in the same account (then about US$0.0075 to 0.016 per 10,000 HTTPS requests and US$0.085 to 0.12 per GB, by region; a request flood is billed too, as there is no WAF); turning on CloudFront logging, real-time logs, a WAF or the console's one-click "security protections" (a paid pricing plan and web ACL); a second distribution for development.

Worst case, as there is no WAF: a request flood is billed. About **US$75 to 160 per 100 million requests** at CloudFront past the shared free tier; when the flood asks for random paths (each a 404 that misses the cache), add up to about US$40 of S3 GETs (US$0.0004 per 1,000) and US$10 of function runs (US$0.10 per million) per 100 million, plus the 404 page's bytes. The account's existing AWS budget, with alerts at 80 % and 90 %, covers it: an alert arrives long before such a bill. A separate budget for this site is optional.

## 10. If the host must change

The same `dist/` serves anywhere; the records stay in iCloud.

- **Cloudflare Pages** (the first plan, kept as a fallback): `src/host/_headers` and `_redirects` are its native configuration and stay the source of truth for AWS too; CI still checks them on `wrangler pages dev` (`npm run check:pages`). Create a Pages project connected to this repository (build `npm ci && npm run build -- --config=production`, output `dist`, `NODE_VERSION` = `22`, Web Analytics off), add `pets.binarybridges.co` as its custom domain, and point the Namecheap CNAME `pets` at `<project>.pages.dev.`.

- **GitHub Pages** (fallback): `npm run build -- --host=github-pages` adds a `<meta>` CSP (without `frame-ancestors`) and makes `404.html` the page, since GitHub Pages has no headers and no rewrites (so `/p/<id>` answers with status 404 and the page still works). Publish `dist/` with the official Pages actions, set the repository's custom domain to `pets.binarybridges.co`, and change the Namecheap CNAME to `binary-bridges-co.github.io.`. Limits: no HSTS, COOP, CORP or Permissions-Policy headers; the AASA file is served with GitHub's own content type (Apple may refuse it, so app links can stop working); GitHub logs visitors' addresses.
- **Netlify**: the same `_redirects`, and `_headers` rewritten without the `! Name` lines (only Cloudflare and the AWS generator read them: give `/p/*`, `/404.html` and the other card paths the card CSP and `noindex`, and `/` and `/press` the homepage CSP); CNAME to `<site>.netlify.app`. Its free plan is credit-based and can pause a site.
- After any move: the new allowed origin in the production API token (step 1.5), then `npm run check:headers -- https://pets.binarybridges.co`; then remove the stack `my-pets-page-aws` (bb-infrastructure `docs/runbooks/my-pets-page.md`).
