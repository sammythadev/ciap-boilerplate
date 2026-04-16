[![Contributors][ciap-contributors-shield]][ref-ciap-contributors]
[![Forks][ciap-forks-shield]][ref-ciap-forks]
[![Stargazers][ciap-stars-shield]][ref-ciap-stars]
[![Issues][ciap-issues-shield]][ref-ciap-issues]
[![License][ciap-license-shield]][ref-license]

[![NestJS][nestjs-shield]][ref-nestjs]
[![Node.js][nodejs-shield]][ref-nodejs]
[![TypeScript][typescript-shield]][ref-typescript]
[![PostgreSQL][postgresql-shield]][ref-postgresql]
[![Drizzle ORM][drizzle-shield]][ref-drizzle]
[![JWT][jwt-shield]][ref-jwt]
[![Jest][jest-shield]][ref-jest]
[![PNPM][pnpm-shield]][ref-pnpm]
[![Docker][docker-shield]][ref-docker]

# CIAP Boilerplate

Production-oriented NestJS v11 API boilerplate for the Creative Influence and Analytics Platform (CIAP), built with strict TypeScript, Drizzle ORM, PostgreSQL, JWT auth, Google OAuth onboarding, RBAC policies, tenant-aware access control, and session-backed refresh token security.

## Table Of Contents

- [Important Notes](#important-notes)
- [Must Read: Setup And Usage](#must-read-setup-and-usage)
- [Current Scope](#current-scope)
- [Prerequisites](#prerequisites)
- [Built With](#built-with)
- [Features](#features)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Database Workflow](#database-workflow)
- [Authentication Flow](#authentication-flow)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Important Notes

- Access tokens use `ES256`; refresh tokens use `ES512`.
- Refresh tokens are persisted as hashes in the `sessions` table.
- OAuth onboarding currently supports Google (`/auth/google` and callback flow).
- Swagger docs are served at `/api-docs`.
- This project uses `pnpm` exclusively.
- Exception filters are configured to avoid stack-trace noise for expected `4xx` responses.

## Must Read: Setup And Usage

### 1) Configure Environment

At minimum, set these values in `.env` (see `.env.example` for the template):

- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_ACCESS_PRIVATE_KEY` / `JWT_ACCESS_PUBLIC_KEY`
- `JWT_REFRESH_PRIVATE_KEY` / `JWT_REFRESH_PUBLIC_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GOOGLE_LOGIN_REDIRECT_URI` and `GOOGLE_YOUTUBE_REDIRECT_URI`
- `ADMIN_SIGNUP_KEY` (required for `/auth/admin/signup`)

If you are running Redis (local or Docker), configure:

- `REDIS_URL` (example: `redis://:password@localhost:6379/0`)
- `REDIS_PASSWORD` (required if your Redis instance enforces auth)

### 2) Setup Database

```bash
pnpm install
pnpm run db:generate
pnpm run db:migrate
```

### 3) Run The App

```bash
pnpm run start:dev
```

### 4) Run Tests

```bash
pnpm run test
pnpm run test:e2e
```

`pnpm run test` uses `TZ=UTC` and runs Jest with `test/jest-e2e.json` plus open-handle detection.

### 5) Commit Messages

Commits are validated by Commitlint. Use conventional commits:

```
feat(auth): add refresh token rotation
fix(users): handle missing tenant
docs: update readme
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `hotfix`, `perf`, `refactor`, `revert`, `style`, `test`.

## Current Scope

This boilerplate currently focuses on:

- API-first backend with NestJS modules
- JWT + session-based authentication
- Google OAuth sign-in onboarding
- Role-based access (`admin`, `user`, `sme`, `creator`)
- Ability policies and tenant-scoped access behavior
- Auditable security events through `audit_logs`
- Drizzle schema-driven migrations with PostgreSQL

## Prerequisites

1. Node.js `>= 24.11.0`
2. pnpm `>= 10.25.0`
3. PostgreSQL database (local, Docker, or managed)
4. Basic familiarity with NestJS, TypeScript, and SQL migrations

## Built With

| Technology | Version (from repo) | Purpose |
| --- | --- | --- |
| NestJS | 11.x | Core API framework |
| Node.js | >= 24.11.x | Runtime |
| TypeScript | 5.x | Type-safe development |
| Drizzle ORM | 0.45.x | Schema + query layer |
| PostgreSQL (`pg`) | 8.20.x | Database driver |
| Passport/JWT | 11.x / 4.x | Authentication |
| google-auth-library | 10.x | Google sign-in token verification |
| Helmet | 8.x | HTTP security headers |
| Jest | 30.x | Testing |

## Features

### Architecture

- Modular NestJS codebase (`auth`, `users`, `health`, `sessions`, `rbac`)
- Shared common layers for guards, decorators, filters, and exceptions
- Repository-style data access with Drizzle database providers
- Strict TypeScript config and path aliases

### Authentication And Authorization

- Email/password signup and login
- Google OAuth sign-in support
- JWT access token verification via Passport strategy
- Refresh token rotation with session revocation
- Role-based route protection (`Roles` + `RolesGuard`)
- Ability-based policy checks (`RequireAbilities` + `AbilitiesGuard`)

### Security

- Asymmetric JWT key strategy:
  - Access token: `ES256`
  - Refresh token: `ES512`
- `helmet` enabled in bootstrap
- Structured exception responses
- Audit logging table for auth/security-sensitive events

### Multitenancy

- Tenant model in schema (`tenants` table)
- User-to-tenant relationship (`users.tenant_id`)
- Tenant-aware user access logic for non-admin roles

### Developer Experience

- SWC dev/watch compilation for 20x faster builds than the typescript compiler 
- Swagger/OpenAPI at `/api-docs`
- Drizzle migration and studio tooling
- Typecheck and lint scripts
- Structured project docs under `agent-docs/` and `docs/`

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run start:dev
```

App defaults:

- API base: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`
- Health: `http://localhost:3000/health`

## Environment Setup

At minimum configure:

- `DATABASE_URL`
- `JWT_ACCESS_PRIVATE_KEY`
- `JWT_ACCESS_PUBLIC_KEY`
- `JWT_REFRESH_PRIVATE_KEY`
- `JWT_REFRESH_PUBLIC_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_LOGIN_REDIRECT_URI` (default: `http://localhost:3000/auth/socials/google/login/callback`)
- `GOOGLE_YOUTUBE_REDIRECT_URI` (default: `http://localhost:3000/ingestion/youtube/oauth2/callback`)
- `ADMIN_SIGNUP_KEY`
- `REDIS_URL` (if running Redis/BullMQ)
- `REDIS_PASSWORD` (if Redis requires auth)

See [.env.example](./.env.example) for full template.

## Database Workflow

Schema source of truth:

- `src/database/drizzle/schema.ts`

Common commands:

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:studio
pnpm run db:seed
```

Recommended workflow:

1. Edit `schema.ts`
2. Generate migration
3. Review SQL
4. Apply migration
5. Verify app boot and auth flows

## Authentication Flow

### Email/Password

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/verify`

### Google OAuth

- Prepare URL: `GET /auth/oauth2/google`
- Callback: `GET /auth/google/callback` or `GET /auth/oauth2/google/callback`
- Direct token login: `POST /auth/google` with Google ID token

## Project Structure

```text
src/
  modules/
    auth/
    health/
    rbac/
    sessions/
    users/
  common/
    constants/
    decorators/
    exceptions/
    filters/
    guards/
  database/
    drizzle/
      schema.ts
      migrations/
    seeds/
  types/
```

Additional docs:

- [`agent-docs/project-structure.md`](./agent-docs/project-structure.md)
- [`agent-docs/patterns.md`](./agent-docs/patterns.md)
- [`agent-docs/testing.md`](./agent-docs/testing.md)
- [`docs/project-structure.md`](./docs/project-structure.md)

## Scripts

```bash
pnpm run start:dev
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

## Testing

- Unit tests: `pnpm run test`
- E2E tests: `pnpm run test:e2e`
- Coverage: `pnpm run test:cov`

Note: `pnpm run test` uses `test/jest-e2e.json` and detects open handles.

## Roadmap

- Expand OAuth providers beyond Google (e.g. X, Apple)
- Add stronger tenant policy boundaries for additional modules
- Add auth and policy focused integration/e2e tests
- Introduce rate-limit and abuse-control defaults for auth endpoints

## Contributing

Contributions are welcome. Please keep changes:

- small and scoped
- tested and type-safe
- aligned with existing module boundaries and documented patterns

## License

Current package license is `UNLICENSED` in `package.json`.  
If you plan to open-source this repo, define a formal license file and update metadata.

<!-- REFERENCES -->

[ciap-contributors-shield]: https://img.shields.io/github/contributors/munachielvis815-svg/ciap-boilerplate?style=for-the-badge
[ciap-forks-shield]: https://img.shields.io/github/forks/munachielvis815-svg/ciap-boilerplate?style=for-the-badge
[ciap-stars-shield]: https://img.shields.io/github/stars/munachielvis815-svg/ciap-boilerplate?style=for-the-badge
[ciap-issues-shield]: https://img.shields.io/github/issues/munachielvis815-svg/ciap-boilerplate?style=for-the-badge
[ciap-license-shield]: https://img.shields.io/github/license/munachielvis815-svg/ciap-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[postgresql-shield]: https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white
[drizzle-shield]: https://img.shields.io/badge/Drizzle%20ORM-C5F74F?style=for-the-badge&logoColor=black
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white
[pnpm-shield]: https://img.shields.io/badge/PNPM-F69220?style=for-the-badge&logo=pnpm&logoColor=white
[docker-shield]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[ref-ciap-contributors]: https://github.com/munachielvis815-svg/ciap-boilerplate/graphs/contributors
[ref-ciap-forks]: https://github.com/munachielvis815-svg/ciap-boilerplate/network/members
[ref-ciap-stars]: https://github.com/munachielvis815-svg/ciap-boilerplate/stargazers
[ref-ciap-issues]: https://github.com/munachielvis815-svg/ciap-boilerplate/issues
[ref-license]: ./LICENSE
[ref-nestjs]: https://nestjs.com
[ref-nodejs]: https://nodejs.org
[ref-typescript]: https://www.typescriptlang.org
[ref-postgresql]: https://www.postgresql.org
[ref-drizzle]: https://orm.drizzle.team
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io
[ref-pnpm]: https://pnpm.io
[ref-docker]: https://docs.docker.com
