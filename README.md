# My Pets public page

The static page at `https://pets.binarybridges.co/p/<id>`: it shows a pet's public card, read in the visitor's browser from the My Pets app's iCloud public database. No server, no analytics, no tracking. Design: [docs/DESIGN.md](docs/DESIGN.md).

The plan is `.claude/PRPs/plans/phase-8-static-page.plan.md` in `binary-bridges-co/my-pets-ios`; the contract is its Spec §15 and `Spec/vectors/public-card.json` (copied in `test/spec/` with `SPEC_SOURCE`).

## Commands

Node 22 (`.nvmrc`).

```bash
npm ci
npm run build          # vendor check, type check, dist/ (add -- --host=github-pages for the fallback host)
npm test               # unit tests: Spec vectors, reader, text
npm run check:budget   # gzipped weight of the built page
npm run check:spec     # test/spec/public-card.json is the pinned copy (IOS_REPO=<checkout> also compares bytes)
```

Everything is tested against fixtures: nothing here calls Apple's live API.
