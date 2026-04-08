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

## Runtime Seed Isolation + Endpoint-Specific Health DTOs (2026-04-08)

- Context: Runtime imports and Swagger health docs were reviewed during wiring cleanup.
- Finding: Importing `SeedModule` in `AppModule` couples seed tooling to normal runtime boot; seed execution should bootstrap `SeedModule` directly instead. Health endpoints are clearer in Swagger when each route uses a DTO matching only its actual response fields.
- Impact: Keep seed logic out of runtime module graph, and avoid broad shared response DTOs when endpoint payloads differ materially.

## Auth + RBAC + Session/Audit Baseline (2026-04-08)

- Context: Authentication and authorization foundations were added for role-based access and secure session lifecycle.
- Finding: The project now uses an `AuthModule` with JWT access tokens, refresh-token-backed sessions (`sessions` table), RBAC via `Roles` + `RolesGuard`, and activity tracking via `audit_logs`.
- Impact: Future auth features should build on persisted sessions and audit entries rather than stateless-only tokens; role checks should use decorators/guards consistently.
- Follow-up: Complete provider-specific OAuth2 integration once credentials/callback details are finalized, ideally with `passport-oauth2` or provider-specific passport strategies.

## ES JWT + Sessions Module + Tenant/Ability Enforcement (2026-04-08)

- Context: Security hardening and multitenancy enforcement were added after initial auth baseline.
- Finding: Access tokens now use ES256 and refresh tokens use ES512 with key pairs from env; session lifecycle moved to a dedicated `SessionsModule`; users are tenant-scoped and ability checks are enforced through `RequireAbilities` + `AbilitiesGuard`; Google sign-in uses `google-auth-library` and links identities in `oauth_accounts`.
- Impact: Environments must provide asymmetric JWT key material (`JWT_ACCESS_*`, `JWT_REFRESH_*`) and OAuth callback settings; tenant-aware endpoints should use request user tenant context by default unless explicitly admin-global.

## Container Runtime Baseline (2026-04-08)

- Context: Production-style containerization was added for local/prod parity.
- Finding: The repository now uses a multi-stage pnpm Docker build (`dockerfile`) and a compose stack with `api`, `postgres`, `redis`, and `redis-bullboard` on a dedicated internal bridge network.
- Impact: Local container startup should prefer `docker compose up --build` with env-driven `DATABASE_URL`, Redis settings, and JWT key variables instead of hardcoded service credentials.
