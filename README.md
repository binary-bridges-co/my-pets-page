# My Pets public page

The static site at `https://pets.binarybridges.co`: the My Pets homepage at `/` and its press page at `/press` (Astro, in `site/`, on the Binary Bridges design system), and the lost-pet card page at `/p/<id>`.

The card page shows a pet's public card, read in the visitor's browser from the My Pets app's iCloud public database. No server, no analytics, no tracking. Design: [docs/DESIGN.md](docs/DESIGN.md).

The plan is `.claude/PRPs/plans/phase-8-static-page.plan.md` in `binary-bridges-co/my-pets-ios`; the contract is its Spec §15 and `Spec/vectors/public-card.json` (copied in `test/spec/` with `SPEC_SOURCE`).

## Commands

Node 22 (`.nvmrc`).

```bash
npm ci
npm run build          # vendor check, type check (tsc and astro check), Astro then the card build into dist/ (add -- --host=github-pages for the fallback host)
npm test               # unit tests: Spec vectors, reader, text
npm run check:budget   # gzipped weight of the built page
npm run check:spec     # test/spec/public-card.json is the pinned copy (IOS_REPO=<checkout> also compares bytes)
npm run check:tokens   # site/src/styles/tokens.css and the marks are the pinned bb-context copies (BB_CONTEXT=<checkout> also compares bytes)
npm run check:headers  # headers, rewrites and redirects on the local preview (check:pages: on wrangler pages dev)
npm run test:e2e       # Playwright on Chromium, Firefox and WebKit
node scripts/build.mjs --launch=fixture   # the homepage in its released launch state (App Store listing), for the checks with -- --launch=fixture
npm run check:no-fixture                  # a normal dist/ carries no fixture
```

Everything is tested against fixtures: nothing here calls Apple's live API. The homepage's launch state (App Store, dates, press address) is `site/src/config/launch.ts`; launch day is `docs/RUNBOOK.md` §5.
