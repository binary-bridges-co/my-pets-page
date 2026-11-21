# Domain docs

How the skills read and write this repository's domain documentation. It is a single context.

## Before exploring, read these

- **`GLOSSARY.md`** at the repository root, when it exists. It is created only when the first term is settled; until then, proceed without it and do not suggest creating it.
- **[docs/DESIGN.md](../DESIGN.md)**: the architecture and the decisions of the page, by numbered section. It is the decision log.
- **The contract**: Spec §15 of `my-pets-ios` and `test/spec/public-card.json`, the copy pinned here. A change to the card's format starts there.
- **Product names** are fixed by the workspace: `../bb-context/docs/foundations/content-icons-marks.md`. The glossary does not redefine them.

There is no `GLOSSARY-MAP.md` and no per-context glossary.

## Decisions

Decisions are recorded in `docs/DESIGN.md`, in the numbered section they belong to. There is no `docs/adr/`. Where a skill says "ADR" or `docs/adr/`, it means that document.

## Use the glossary's vocabulary

When the output names a concept (an issue title, a proposal, a test name), use the term as `GLOSSARY.md` defines it. If the concept is not in the glossary, either the word is not this project's (reconsider it) or there is a gap: settle the term with `/domain-modeling`, which then creates or updates `GLOSSARY.md`.

## Flag conflicts with a decision

If the output contradicts a recorded decision, say so instead of overriding it, and name the decision:

> Contradicts `docs/DESIGN.md` §6 (what the script does, and only this), but worth reopening because...
