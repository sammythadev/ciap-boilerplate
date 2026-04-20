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

## Env-Driven Pino Logger Wiring (2026-04-08)

- Context: Logging dependencies were already installed but not integrated into app bootstrap.
- Finding: `AppModule` now configures `nestjs-pino` with env-driven controls (`LOG_ENABLED`, `LOG_LEVEL`, `LOG_FORMAT`, `LOG_TO_FILE`, file rotation vars) and enforces `LOG_FORMAT` to `pretty` or `json`.
- Impact: Logging behavior can be changed without code edits, and file logging with rotation is available via `pino-roll` for local/container observability.

## Google OAuth Callback Error Translation (2026-04-09)

- Context: Google OAuth callback failures were returning HTTP 500 when token exchange returned `invalid_grant`.
- Finding: `AuthService.loginWithGoogleAuthorizationCode` now validates missing `code` and maps Google `invalid_grant` failures to `InvalidTokenException` instead of bubbling an unhandled error.
- Impact: OAuth callback routes return typed 4xx responses for invalid/expired/reused authorization codes, reducing noisy 500s and keeping client error handling predictable.

## Social Auth Split + Admin/Auth Route Separation (2026-04-09)

- Context: Auth flows were reviewed for role escalation risk, duplicated route responsibilities, and OAuth token lifecycle needs for YouTube API calls.
- Finding: Google/social routes now live under `src/modules/auth/socials` and expose dedicated endpoints under `/auth/socials/*`; local auth routes remain in `AuthController`, with separate admin signup/login endpoints. `/users` list is now tenant-scoped (`sme`), while cross-tenant listing moved to `/users/admin/all` (`admin`).
- Impact: API boundaries are clearer, role-safe onboarding is enforced (no public admin role assignment), and social OAuth token refresh/YouTube metrics pull can evolve independently without mixing local auth concerns.

## YouTube Metrics Use Stored OAuth Tokens (2026-04-10)

- Context: YouTube metrics endpoints needed to rely on Google OAuth tokens after onboarding without requiring client-supplied Google access tokens.
- Finding: `GET /auth/socials/google/youtube/metrics` and `GET /ingestion/youtube/metrics` now resolve Google access/refresh tokens from `oauth_accounts` and return actionable `oauth2-link-required` details when missing.
- Impact: Clients can use only the app JWT once OAuth is linked; YouTube calls no longer accept `x-google-access-token` headers.

## Drizzle onConflictDoUpdate Must Use sql`excluded.*` for Batch Upserts (2026-04-20)

- Context: Multiple repositories used `onConflictDoUpdate({ set: { field: values[0]?.field } })`.
- Finding: When inserting multiple rows, Drizzle's `onConflictDoUpdate` `set` clause runs once per conflict. Using `values[0]?.field` sets ALL conflicting rows to the first inserted row's data. The correct pattern is `sql\`excluded.column_name\`` to reference each row's own incoming values.
- Impact: All four upsert repositories had this bug causing silent data overwrite with first-row values. Fixed with `sql\`excluded.*\`` pattern.
- Follow-up: Review any new `onConflictDoUpdate` code to ensure it uses `sql\`excluded.*\`` for batch operations.

## OAuth2Client Must Not Be Shared Across Concurrent Refresh Calls (2026-04-20)

- Context: `refreshGoogleOauthTokensForUser` mutated a singleton OAuth2Client with `setCredentials()`.
- Finding: Two concurrent refresh requests share the same client object. `setCredentials()` overwrites credentials on the shared instance; the first caller's `refreshAccessToken()` may execute with the second caller's refresh token (race condition).
- Impact: Could return wrong access token per user. Fixed by creating a fresh `OAuth2Client` per refresh call.
- Follow-up: Any future OAuth client usage that calls `setCredentials()` must use a per-request instance.

## isApproved Must Be Persisted in DB, Not Only in Cache (2026-04-20)

- Context: YouTube channel approval (`approveChannel`, `approvePermissions`) only wrote to Redis.
- Finding: Redis is ephemeral; cache flush loses approval state permanently. Added `isApproved` + `approvedAt` columns to `youtube_channels` table. Migration: `20260420092341_steady_wonder_man.sql`.
- Impact: Approval is now durable. Re-sync via `upsertChannel` preserves existing approval (not overwritten).

## ForbiddenException vs NotFoundException for Ownership Checks (2026-04-20)

- Context: Ownership checks on YouTube channels threw `NotFoundException` for wrong-user access.
- Finding: Throwing `NotFoundException` leaks resource existence. For resources the caller has no right to, use `ForbiddenException`.
- Impact: Changed in `approveChannel` and `approvePermissions`. `NotFoundException` is still correct when the resource genuinely does not exist.
