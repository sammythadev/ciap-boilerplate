# Lessons Log

Reusable lessons, mistakes, debugging notes, and tooling cautions.

## How To Use

- Add short entries when a lesson would save future work.
- Record mistakes in a blameless way: what happened, why it mattered, and how to avoid it.
- Prefer practical guidance over long stories.
- Keep entries concise and easy to scan.

## Suggested Entry Format

```md
## Title (YYYY-MM-DD)

- Situation:
- Lesson:
- Avoid:
- Apply:
```

## Current Lessons

## Bootstrap Docs Should Stay In Sync (2026-04-08)

- Situation: Agent-facing guidance was split between `AGENTS.md`, `.github/copilot-instructions.md`, and several `agent-docs/*` files.
- Lesson: A single bootstrap file plus compact supporting docs is easier to keep current than multiple long overlapping manuals.
- Avoid: Letting one instruction file evolve while the others drift.
- Apply: When updating coding guidance, update both entry points and the relevant supporting doc in the same pass.

## Compact, Do Not Over-Delete (2026-04-08)

- Situation: The repo docs had valuable guidance, but much of it was duplicated across large files.
- Lesson: Compact docs by preserving rules, examples, and update triggers while removing repetition.
- Avoid: Deleting useful detail just to shorten a file.
- Apply: Replace long prose with checklists, scoped sections, and targeted examples.
