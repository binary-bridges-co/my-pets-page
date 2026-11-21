---
status: APPROVED
plan: .claude/PRPs/plans/homepage.plan.md
issue: binary-bridges-co/my-pets-page#8
reviewer: independent reviewer subagent (round 2)
reviewed: 2026-11-19
round: 2
---

## Verdict

Approved. Revision 2 (`af5107a`) fixes every round 1 finding, and the fixes hold up against the code. The high finding (the Smart App Banner against "loads nothing from other companies") is settled by owner decision 1. The plan now ties the privacy sentence to the banner meta through one function, `sitePrivacyLine`, which is checked in a unit test and in the browser on the launch fixture build.

The fixture build exercises the launch markup as far as the existing seams allow: CSP watch, axe, layout, budget and headers. Fixture data reaches `dist/` only behind `--launch=fixture`, and a test checks that a normal `dist/` holds none of it. Branching in specs on `launch-state.ts` with no `skip` passes `e2e-guard.test.ts:16`. The telemetry guard covers `scripts/build.mjs`, the `astro check` script and CI. The token-scope PR does not touch the pinned copy's hash, because `dist/tailwind-v4/theme.css` carries no scope text.

What is left is low severity: under-specified mechanics around the fixture mode, a test that needs a built `dist/`, a public "internal" research file, and two procedural details. Fix them during implementation.

## Round 1 findings

| # | Severity | Fixed? | Note |
|---|---|---|---|
| 1 | HIGH | yes | Owner decision 1 keeps the banner, discloses it and records how AC 5 is read. `sitePrivacyLine` is the only source of the sentence. `site-launch.test.ts` asserts that the banner sentence appears exactly when `smartAppBanner` is non-empty, and the fixture `home.spec.ts` asserts the meta and the sentence together. |
| 2 | MEDIUM | yes | The claim is corrected to "core plus the site surface's spacing and type". Task 0 widens the `site` scope in bb-context, with a decision entry, and merges before this PR. `band` is now out by design choice. Checked: `theme.css` has no scope text (header lines 1-4), so the pin is unaffected. |
| 3 | MEDIUM | yes | The `--launch=fixture` build covers the pre-order state: Apple artwork in `<picture>`, the `?ct=` link, the banner meta, video, screenshot and `mailto:`. The build job runs budget and headers on it, and every engine runs `home*` specs on it under the `support.ts:50-58` CSP watch. See new finding 1 for the mechanics. |
| 4 | MEDIUM | yes | The variable is set before the dynamic `import('astro')`. The current `build.mjs` imports only esbuild statically (`:4`), so this ordering works. The `typecheck` script carries it, CI sets it at job level, and `site-build.test.ts` asserts both. |
| 5 | MEDIUM | yes | `DISCLAIMER` is the #266 sentence verbatim. Banned and allowed names are written out. The press description is adapted, with "signed PDF" becoming "a PDF your vet can verify". |
| 6 | MEDIUM | yes | Proof point 1 keeps the review step. Proof point 2 is "A record you own and your vet can verify" (#261, #266 shot 6). Proof points 3 and 4 match #266 shots 2 and 8 and #261 point 3. All four are asserted verbatim. |
| 7 | MEDIUM | yes | The figure is #261's decided framing. It gets a footnote, is checked at implementation and has a fallback with no figure. See new finding 3. |
| 8 | MEDIUM | yes | Axe runs at 320, 1024 and 1920 px, in both themes, on both builds. |
| 9 | LOW | yes | 44 px applies to standalone controls only; inline links need 24 px. |
| 10 | LOW | yes | The `/press` h1 uses `display`. |
| 11 | LOW | yes | `theme-color` is read from `tokens.css` by `site/src/lib/tokens.ts` and unit-tested. |
| 12 | LOW | yes | The roadmap uses #273's wording, "a photo of the paper vaccination card". |
| 13 | LOW | yes | The lost-mode exception is in the privacy copy. |
| 14 | LOW | yes | Verified: `package.json:24-31`, `playwright.config.ts:26-30`, `privacy.spec.ts:9-27`. |
| 15 | LOW | yes | The preview redirects `/press.html`, `/press/` and `/index.html`, and the host check asserts no second copy. |
| 16 | LOW | yes | `preload="none"`, a poster, width and height, asserted in the fixture `home.spec.ts`. |

## New findings

| # | Severity | Plan section | Finding | Required change |
|---|---|---|---|---|
| 1 | LOW | Architecture (launch fixture build); Budget; Host | The fixture mode is under-specified in three places. (a) It is unclear whether `PETS_LAUNCH` comes only from the `--launch=fixture` flag. An inherited `PETS_LAUNCH` with a plain `npm run build` would give Astro the fixture config without copying the fixture media. (b) `check-budget.mjs` and `check-headers.mjs` must know they face a fixture build ("fixture media rows in the fixture build only"), and the plan does not say how. (c) The plan does not say where the fixture media land in `dist/`, while the budget fails "root files other than the known list". | In `scripts/build.mjs`, set `process.env.PETS_LAUNCH` from the flag and delete it otherwise. Name the fixture media folder. Give the two check scripts an explicit mode, either a `--launch=fixture` argument or detection of that folder, and run the fixture rows only in that mode. |
| 2 | LOW | Testing (`site-build.test.ts`) | The check that a normal `dist/` holds no fixture runs inside `npm run test:unit`. On a fresh clone, or after a fixture build, `npm test` would fail with no hint about the cause. | Make the assertion state its precondition in the failure message ("run `npm run build` first"), or move it into a small check script that the CI build job runs after the normal rebuild. |
| 3 | LOW | Launch config (comparison line) | `docs/research/subscription-prices.md` is called "internal and not shipped", but `binary-bridges-co/my-pets-page` is public (`gh repo view`: PUBLIC). Listing apps by name and price there publishes a competitor comparison. Separately, the fallback without a figure replaces owner-decided framing (#261 "US$20-50 every year"). | Either keep the app names out of this repository (record the date, count and range here, and keep the names where the #260 research lives) or drop the word "internal". If the fallback is taken, tell the owner on #8 as well as recording it there. |
| 4 | LOW | Ordered tasks (task 0) | bb-context `docs/decisions.md` "How to change the system" step 1 is "Open an issue in `bb-context`". Task 0 does not list that step. | Add the bb-context issue to task 0. |
| 5 | LOW | Interface | `docs/platforms/site.md` says "Every section opens with a numbered SectionLabel". The plan numbers only the homepage's sections. | Name the `/press` sections and their labels. |

## Checklist

- [x] Every acceptance criterion maps to at least one task and one test: AC 1 on both builds, AC 5 per owner decision 1, AC 7 at 320-1920 px in both themes with axe at three widths
- [x] No task exceeds the issue's scope; the bb-context scope PR is listed as a separate unit with its own plan
- [x] Research findings cite real `file:line`, and those lines say what the plan claims (spot-checked `build.mjs:23-25, 57-66, 90-101`, `check-budget.mjs:8-13, 36-38`, `check-headers.mjs:10-24, 59-61, 86-89`, `preview.mjs:14-20, 51, 56-62, 85-89`, `support.ts:26-58`, `nojs.spec.ts:18-25`, `privacy.spec.ts:9-27, 93`, `a11y.spec.ts:27-31`, `src/strings/{en,es}.json:59`, `tokens.json:495-503`, `bb-homepage/src/layouts/BaseLayout.astro:2-4`)
- [x] Validation commands are runnable (`check:tokens` and the fixture flag are added in tasks 1 and 4; the last line leaves a normal `dist/`)
- [x] Security-sensitive surfaces (personal data, third-party requests) are handled: no script, `script-src 'none'`, same-origin resources and links checked on both builds, the banner disclosed
- [x] The interface follows the design system; no token invented in the product; the scope widened in bb-context first
- [x] Production changes are in `bb-infrastructure`, not in compose files (none needed: Cloudflare Pages)
- [x] Rollback is described and plausible
