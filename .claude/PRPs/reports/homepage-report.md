# Report: the My Pets homepage at pets.binarybridges.co

Issue: binary-bridges-co/my-pets-page#8. Plan: `.claude/PRPs/plans/homepage.plan.md` (revision 2, with "Amendments during implementation" A1-A14). Review: `.claude/PRPs/reviews/homepage.review.md` (round 2, APPROVED). Branch `feat/homepage`.

## What was built

- `/` (homepage) and `/press`, built with Astro 7.3.5 and Tailwind 4.3.3 from `site/`, on the bb-context site surface: pinned `tokens.css` (bb-context `55edc0d`, `site/TOKENS_SOURCE`, `npm run check:tokens`), Geist and Geist Mono Latin self-hosted, numbered SectionLabels (home 00-06, press 00-07), SiteButton, SectionLabel and Icon ported from bb-homepage `e687520`. No new token, no hex outside `tokens.css`, light and dark, no JavaScript.
- One `dist/`: Astro first, then the card build with a collision guard; the one-line home and its `home` string are gone. Telemetry is off before Astro loads.
- Launch state in `site/src/config/launch.ts` (coming soon, `pressEmail: null`), with pure functions in `site/src/lib/launch.ts`. `sitePrivacyLine` is tied to `smartAppBanner`. A `--launch=fixture` build (pre-order, test media in `dist/fixture/`) is checked by the budget, the headers and the browsers in CI. `npm run check:no-fixture` checks the normal build.
- `_headers`: `/` and `/press` get their own CSP (`script-src 'none'`) and are indexable. `_astro/*` is immutable, and the sitemap and robots.txt carry no noindex. `scripts/preview.mjs` follows wrangler's Pages emulation: rule order and clean URLs with 308s.
- Apple's official badges, unaltered and pinned in `site/BADGES_SOURCE`. They are shown only once a listing exists; before that the page shows a text label.

## Tests (tests first in each task)

New units:
- `site-launch.test.ts`
- `site-copy.test.ts`
- `site-build.test.ts`

New browser specs:
- `home.spec.ts`
- `home-privacy.spec.ts`
- `home-layout.spec.ts`
- `home-a11y.spec.ts`

Changed assertions, as the plan lists:
- `nojs.spec.ts` (`/`)
- `privacy.spec.ts` (built HTML list)
- `check-headers.mjs` (`/`)

The storage watch moved to `support.ts`. Nothing was skipped or deleted.

## Validation (Node 22.22.2)

| Command | Result |
|---|---|
| check:spec, check:tokens | pass |
| build (vendor, tsc, astro check, Astro and card build) | pass |
| test:unit | 186 pass, 0 fail |
| check:budget (normal, github-pages, fixture) | pass |
| check:headers / check:pages (normal) | 185 / 185 checks pass |
| check:headers / check:pages (fixture) | 203 / 203 checks pass |
| playwright, Chromium + Firefox + WebKit | 174 passed (normal build) |
| PETS_LAUNCH=fixture playwright test/e2e/home | 69 passed |
| build, test:unit, check:no-fixture | pass |

A later re-run on a machine with a load average around 87 timed out in Firefox on unchanged card specs (`layout.spec.ts`, `states.spec.ts`; `page.goto` timeouts). The run before it at normal load was all green, and CI decides.

## Price comparison

US App Store listings were checked on 19 November 2026 and recorded anonymised in `docs/research/subscription-prices.md`. Eight of the ten yearly tiers fall between US$19.00 and US$47.99. The two outliers are US$9.49 (single pet) and US$99.99 (breeder). The figure "about US$20-50 a year" is kept, with its footnote.

## Code review

A reviewer subagent read `git diff origin/main...HEAD` and found no blocking findings.

Fixed, tests first:
- `endsOn` is now the last day of the launch price, included.
- `validate` refuses backslash media paths.
- `check-no-fixture` reads each file once.

Not changed:
- The accent on the hero phrase stays. bb-context `site.md` allows "One phrase of it may be `accent`".
- The icon SVGs keep their own hex. They are pinned artwork copies.

## Not done or open

- bb-context token-scope PR (task 0): someone else owns it, and it must merge before this PR.
- Apple publishes the pre-order badge in black only, with no white version. The pre-order state uses the black badge in both themes (A5).
- `pressEmail` and the App Store id are launch-day config (RUNBOOK §5).
- Follow-ups outside this repository, from the plan's Further Notes:
  - bb-context project page and `site.md` "Other sites"
  - `npm run drift`
  - a comment on my-pets-ios #265
