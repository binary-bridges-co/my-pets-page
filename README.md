# My Pets public page

The static site at `https://pets.binarybridges.co`: the My Pets homepage at `/`, its press page at `/press` and the Help, Privacy and Terms pages at `/help`, `/privacy`, `/terms` and, in Spanish, under `/es/` (Astro, in `site/`, on the Binary Bridges design system), and the lost-pet card page at `/p/<id>`.

The card page shows a pet's public card, read in the visitor's browser from the My Pets app's iCloud public database. No server, no analytics, no tracking. Design: [docs/DESIGN.md](docs/DESIGN.md).

Hosting: a private S3 bucket behind CloudFront on Binary Bridges' AWS account (bb-infrastructure stack `my-pets-page-aws`), published from `main` by `.github/workflows/deploy.yml`; a few cents a month at most, inside CloudFront's free tier (US$0.00 to 0.05 expected). Going live, DNS and cost: [docs/RUNBOOK.md](docs/RUNBOOK.md).

The plan is `.claude/PRPs/plans/phase-8-static-page.plan.md` in `binary-bridges-co/my-pets-ios`; the contract is its Spec §15 and `Spec/vectors/public-card.json` (copied in `test/spec/` with `SPEC_SOURCE`).

## Commands

Node 22 (`.nvmrc`).

```bash
npm ci
npm run build          # vendor check, type check (tsc and astro check), Astro then the card build into dist/ (-- --host=aws checks the CloudFront configuration is current; -- --host=github-pages for that fallback)
npm test               # unit tests: Spec vectors, reader, text
npm run check:budget   # gzipped weight of the built page
npm run check:spec     # test/spec/public-card.json is the pinned copy (IOS_REPO=<checkout> also compares bytes)
npm run check:legal    # the Help, Privacy and Terms texts are the pinned iOS copies (IOS_REPO=<checkout> also compares them)
npm run check:tokens   # site/src/styles/tokens.css and the marks are the pinned bb-context copies (BB_CONTEXT=<checkout> also compares bytes)
npm run check:headers  # headers, rewrites and redirects on the local preview (check:pages: on wrangler pages dev; -- <url> for a live site)
npm run gen:aws        # after a build: writes aws/cloudfront.generated.yml (CloudFront behaviours, header policies, function) from src/host/
npm run check:aws      # the same header check on a local emulation of that CloudFront configuration
npm run check:aws-infra -- <bb-infrastructure>/aws/my-pets-page/stack.yml   # its generated blocks are this repository's
npm run deploy:aws -- --bucket=<name> --distribution=<id> --dry-run       # what the deploy workflow runs (without --dry-run it needs AWS credentials)
npm run test:e2e       # Playwright on Chromium, Firefox and WebKit
node scripts/build.mjs --launch=fixture   # the homepage in its released launch state (App Store listing), for the checks with -- --launch=fixture
npm run check:no-fixture                  # a normal dist/ carries no fixture
```

Everything is tested against fixtures: nothing here calls Apple's live API. The homepage's launch state (App Store, dates, press address) is `site/src/config/launch.ts`; launch day is `docs/RUNBOOK.md` §5.
