# Database Guide

Compact reference for Drizzle schema, migrations, and database access.

## Current Setup

- Database module: `src/database/database.module.ts`
- Schema: `src/database/drizzle/schema.ts`
- Migrations: `src/database/drizzle/migrations/`
- Seeds: `src/database/seeds/`
- Provider token: `DATABASE_CONNECTION`

## Rules

- Update schema first.
- Generate migrations after schema changes.
- Review generated SQL before applying it.
- Keep Drizzle queries in repositories, not controllers.
- Do not hardcode connection details; use `DATABASE_URL`.

## Workflow

1. Edit `src/database/drizzle/schema.ts`.
2. Run `pnpm run db:generate`.
3. Review the generated migration.
4. Run `pnpm run db:migrate`.
5. Update repository code and tests.
6. Seed data only when needed.

## Query Guidance

- Prefer typed Drizzle query helpers.
- Use explicit `where` clauses.
- Parallelize independent reads with `Promise.all`.
- Keep repository methods focused and named by intent.

## Seeding

- Development seed entrypoint: `pnpm run db:seed`
- Production seed entrypoint: `pnpm run db:seed:prod`

Use seeds for local setup or deterministic test/demo data, not business migrations.

## Failure Handling

- Fail fast when `DATABASE_URL` is missing.
- Surface connection issues clearly in logs.
- Translate known data conflicts into typed exceptions at the appropriate layer.
