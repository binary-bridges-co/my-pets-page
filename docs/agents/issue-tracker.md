# Issue tracker: GitHub

Issues, specs and tickets for this repository live as GitHub issues of `binary-bridges-co/my-pets-page`. Use the `gh` CLI for every operation.

**This repository is public.** Nothing private goes into an issue or a pull request here: no production detail, no customer data, nothing copied from a private repository. A spec that needs private detail is an issue in `bb-context`, referred to from here by its number only.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: GitHub's native issue dependencies. Add an edge with `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Where dependencies are not available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Count open blockers**: `gh api repos/binary-bridges-co/my-pets-page/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers only; 0 means startable).
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`. The label names are in [triage-labels.md](triage-labels.md).
- **Close**: post the explanation with `gh issue comment <number> --body "..."`, then `gh issue close <number>`. On an already closed issue, `gh issue close --comment` drops the comment and still exits 0.

`gh` infers the repository from the clone it runs in. A session usually starts in `bb-context` and works here from a worktree: run `gh` inside that worktree or pass `-R binary-bridges-co/my-pets-page`, and check the target with `gh repo view --json nameWithOwner` before the first `gh issue create`.

## Pull requests as a triage surface

**PRs as a request surface: no.** External pull requests are not requests here; `/triage` reads this flag and looks at issues only.

## When a skill says "publish to the issue tracker"

Create a GitHub issue here when the files that change are here. The spec of work that spans several repositories is an issue in `bb-context`, and the tickets here link back to it.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

This repository has no `wayfinder:` labels. A wayfinder map for work here is charted in `binary-bridges-co/bb-context`, which has them: follow "Wayfinding operations" in `../bb-context/docs/agents/issue-tracker.md`. The tickets that build something are issues here.

## The workspace

This repository is part of the Binary Bridges workspace. Sessions start in `../bb-context`, and the flow is its `AGENTS.md` §3. The tracker and labels of every other repository are in `../bb-context/docs/agents/issue-tracker.md`.
