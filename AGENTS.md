# my-pets-page: agent guide

The public pages of My Pets at `pets.binarybridges.co`: the page of a pet's card (`/p/<id>`), read in the visitor's browser from the app's iCloud public database, and the homepage. No server, no analytics, no tracking. Commands are in [README.md](README.md), the architecture and its decisions in [docs/DESIGN.md](docs/DESIGN.md), going live in [docs/RUNBOOK.md](docs/RUNBOOK.md); read the first two before changing anything.

## Rules that are never skipped

- A change to the card's format starts in `my-pets-ios` (its Spec §15 and vectors); the copy here is pinned to a commit and `npm run check:spec` proves it.
- Nothing about visitors is kept: no analytics, no storage, no request other than the one lookup.
- Everything is tested against fixtures; nothing here calls Apple's live API.
- The weight budget holds: `npm run check:budget`.
- **This repository is public.** Nothing private goes into a file, an issue or a pull request.
- Decisions are recorded in `docs/DESIGN.md`.

## Workflow

This repository is part of the Binary Bridges workspace, controlled from `../bb-context`. A session starts there and works here from a worktree. The flow is `../bb-context/AGENTS.md` §3, with Matt Pocock's skills; where this file is stricter or differs, this file wins.

| Step | Here |
|---|---|
| 1. Repositories | This repository, and `my-pets-ios` when the card's format changes |
| 2. Shaping | A wayfinder map, research or grilling only when the task needs it; most tasks need none |
| 3. Worktree | `.claude/worktrees/<slug>` on `<type>/<slug>`, from freshly fetched `origin/main`. Never the base checkout |
| 4. Spec and tickets | The spec (`/to-spec`) and its tickets (`/to-tickets`) as GitHub issues, before any code. A small change is one issue. No plan file |
| 5. Implement | Tests first (`/implement`, `tdd`) |
| 6. Validate | `npm run build`, then `npm run preview`: open the built page and use it against the fixtures, in both themes and at the narrowest width |
| 7. Iterate | Until it works, with an automated test for every behaviour and every fix. `npm run build`, `npm test`, `npm run check:budget`, `npm run check:spec` and `npm run test:e2e` green |
| 8. Review | `/code-review` against `origin/main`, then the architecture of what was built |
| 9. Pull request | Opened from the worktree, CI green. The owner approves |
| 10. Merge and retro | After the approval: merge, remove the worktree and the branch, `/retro`. Going live follows `docs/RUNBOOK.md` |

Decide and keep moving: design, implementation and architecture calls are the agent's, recorded in the spec or on the ticket. Ask the owner only what defines the product or cannot be undone.

## Agent skills

What Matt Pocock's skills need to know about this repository (written by `/setup-matt-pocock-skills`).

### Issue tracker

Issues, specs and tickets are GitHub issues of `binary-bridges-co/my-pets-page`, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `GLOSSARY.md` at the root, created when the first term is settled; decisions in `docs/DESIGN.md`, never in `docs/adr/`. See `docs/agents/domain.md`.
