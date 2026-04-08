# Environment Configuration

Updated for the current runtime config on 2026-04-08.

## Loading Behavior

- `src/main.ts` uses `import 'dotenv/config'`, so `.env` values are loaded at startup.
- `ConfigModule.forRoot({ isGlobal: true, cache: true, expandVariables: true })` is enabled in `AppModule`.
- `ConfigService` is used in modules/services where needed (`AuthService`, `DatabaseModule`, OAuth scaffolding).

## Core Variables

### Required

- `DATABASE_URL`
- `JWT_ACCESS_PRIVATE_KEY`
- `JWT_ACCESS_PUBLIC_KEY`
- `JWT_REFRESH_PRIVATE_KEY`
- `JWT_REFRESH_PUBLIC_KEY`
- `GOOGLE_CLIENT_ID` (required for Google OAuth flows)

### Common runtime

- `NODE_ENV` (default `development`)
- `PORT` (default `3000`)
- `APP_PORT` (compose host/container app port, default `3000`)
- `LOG_LEVEL` (comma-separated levels, default `log,error,warn,debug`)
- `CORS_ORIGIN` (default `http://localhost:3000`)

### Auth and security

- `BCRYPT_ROUNDS` (default `10`)
- `JWT_ACCESS_EXPIRES_IN` (default `15m`)
- `JWT_REFRESH_EXPIRES_IN` (default `7d`)
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (default fallback: `http://localhost:3000/auth/google/callback`)

### Present but optional/future-facing in `.env.example`

- `API_VERSION`
- `API_PREFIX`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `CACHE_TTL`
- `CACHE_MAX_SIZE`
- `MAX_FILE_SIZE`
- `UPLOAD_DIR`
- `MAIL_*`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SENTRY_*`

### Container stack (`docker-compose.yml`)

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `BULLMQ_PREFIX`
- `BULLBOARD_PORT`
- `BULLBOARD_ROOT_PATH`

## Security Notes

- Keep `.env` and real secrets out of version control.
- Key values in PEM format are expected as escaped newlines (`\n`) and normalized at runtime.
- Do not log raw JWT keys, OAuth secrets, or database credentials.

## Runtime Features That Depend on Env

- Logger levels in NestFactory bootstrap are derived from `LOG_LEVEL`.
- CORS origin is derived from `CORS_ORIGIN`.
- JWT signing and verification keys are pulled from env.
- Google OAuth client and redirect URI come from env.
- Database connection uses `DATABASE_URL`.
- BullMQ/Redis compose wiring uses `REDIS_HOST`, `REDIS_PORT`, and `REDIS_URL` values passed by Docker Compose.

## Setup Checklist

1. Copy `.env.example` to `.env`.
2. Provide valid PostgreSQL `DATABASE_URL` for your target runtime.
3. Generate/insert real ES256 and ES512 key pairs.
4. Set Google OAuth credentials if using `/auth/google` or `/auth/oauth2/google`.
5. Start app with `pnpm run start:dev`.
6. Verify:
   - `GET /health`
   - Swagger at `/api-docs`
   - auth routes under `/auth/*`

### Docker Compose quick start

1. Ensure `.env` contains non-placeholder JWT keys and OAuth values.
2. Run `docker compose up --build`.
3. Verify endpoints:
   - API: `http://localhost:${APP_PORT}/health`
   - Swagger: `http://localhost:${APP_PORT}/api-docs`
   - Bull Board: `http://localhost:${BULLBOARD_PORT}${BULLBOARD_ROOT_PATH}`
