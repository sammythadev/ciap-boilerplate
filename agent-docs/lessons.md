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

## Re-Plan As Soon As Evidence Changes (2026-04-08)

- Situation: A plan can become wrong as soon as logs, errors, or failing tests reveal new information.
- Lesson: Stop and re-plan immediately when evidence contradicts the working hypothesis.
- Avoid: Continuing with a stale implementation path after the failure mode has changed.
- Apply: Use logs, runtime errors, and failing tests as re-plan triggers.

## User Corrections Must Become Future Rules (2026-04-08)

- Situation: Some mistakes are avoidable if the user correction is turned into a durable instruction.
- Lesson: Convert user corrections into explicit prevention rules in this file.
- Avoid: Treating corrections as one-off comments that are forgotten next session.
- Apply: Record the correction, the mistake pattern, and the rule that should prevent recurrence.

## Drizzle Batch Upsert Pattern: Always Use sql`excluded.*` (2026-04-20)

- Mistake: Using `set: { field: array[0]?.field }` in `onConflictDoUpdate` for batch inserts.
- Lesson: This sets ALL conflicting rows to the first item's values. For batch upserts, always use `sql\`excluded.column_name\`` to reference each row's own incoming value.
- Rule: Before committing any `onConflictDoUpdate`, verify the `set` clause uses `sql\`excluded.*\`` for field-level updates, not JavaScript variable references.

## Schema Must Have Unique Constraints Before Using Them as Conflict Targets (2026-04-20)

- Mistake: Writing `onConflictDoUpdate({ target: [col1, col2] })` without a corresponding unique index in the schema.
- Lesson: PostgreSQL requires the conflict target columns to have a unique constraint. Without it the upsert throws at runtime. Check `schema.ts` for `uniqueIndex` before using column(s) as conflict target.
- Rule: Every `onConflictDoUpdate` target must have a matching `uniqueIndex` in the schema.

## Singleton Service + setCredentials() Is a Race Condition (2026-04-20)

- Mistake: Calling `googleClient.setCredentials(refreshToken)` on a singleton OAuth2Client instance.
- Lesson: Concurrent requests sharing one client overwrite each other's credentials.
- Rule: Create a fresh `OAuth2Client` per request when calling `setCredentials()`.
