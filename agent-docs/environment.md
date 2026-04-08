# Environment Guide

Short reference for env files and runtime configuration.

## Main Variables In Use

- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`
- `DATABASE_URL`
- `CORS_ORIGIN`

## Current Behavior

- `src/main.ts` defaults `NODE_ENV` to `development`
- `PORT` defaults to `3000`
- `LOG_LEVEL` defaults to `debug`
- `CORS_ORIGIN` defaults to `http://localhost:3000`
- `DATABASE_URL` is required for database startup

## Files Present In Repo

- `.env`
- `.env.example`
- `.env.staging`
- `.env.production`
- `.env.production.local`

## Rules

- Keep secrets out of committed docs and examples.
- Treat `.env.example` as the public template.
- Use platform-managed secrets in deployed environments when possible.
- Set env vars before starting the app.

## Common Tasks

### Local development

1. Copy from `.env.example` if needed.
2. Set a valid `DATABASE_URL`.
3. Run `pnpm run start:dev`.

### Production or staging

1. Set env vars in the deployment platform.
2. Confirm `DATABASE_URL`, `PORT`, and `LOG_LEVEL`.
3. Avoid depending on local-only files in hosted environments.

## Troubleshooting

- App fails at startup: check `DATABASE_URL`
- Wrong port or log level: check `PORT` and `LOG_LEVEL`
- CORS problems: check `CORS_ORIGIN`
