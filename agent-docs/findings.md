# Findings Log

Append-only notes for discoveries, decisions, and gotchas.

## How To Use

- Add a short dated entry when you discover a durable project fact.
- Record architectural decisions that affect future tasks.
- Prefer concise notes over long narratives.
- Update this file after meaningful repo searches when you confirm a reusable fact or pattern.

## Suggested Entry Format

```md
## Title (YYYY-MM-DD)

- Context:
- Finding:
- Impact:
- Follow-up:
```

## Current Findings

## Initial NestJS + Drizzle Bootstrap (2026-04-07)

- Context: Project was scaffolded as a NestJS API with PostgreSQL and Drizzle.
- Finding: Core runtime pieces include `src/main.ts`, `src/swagger.ts`, `src/database/database.module.ts`, and feature modules under `src/modules/`.
- Impact: New work should follow the existing controller -> service -> repository split.

## Strict TypeScript + Path Aliases (2026-04-07)

- Context: Compiler settings were tightened early.
- Finding: `tsconfig.json` enables strict mode and multiple path aliases such as `@modules/*`, `@common/*`, and `@database/*`.
- Impact: Prefer aliases and explicit types in new code.

## Database Module Contract (2026-04-07)

- Context: Database access was centralized.
- Finding: The app exposes a shared Drizzle connection via the `DATABASE_CONNECTION` provider token.
- Impact: Repositories should inject the shared database provider rather than create connections directly.

## Validation + Swagger Bootstrapping (2026-04-07)

- Context: API bootstrap was configured in the main app entrypoint.
- Finding: Global validation is enabled in `src/main.ts` and Swagger is configured in `src/swagger.ts`.
- Impact: New endpoints should use DTOs, pipes, and Swagger decorators consistently.
