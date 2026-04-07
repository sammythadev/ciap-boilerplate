# Environment Configuration Guide

Complete guide for managing environments in this NestJS project.

**Last Updated**: 2026-04-07

---

## Overview

The project supports three environments controlled by the `NODE_ENV` variable:

- **development** — Local development with verbose logging and relaxed CORS
- **staging** — Pre-production testing with structured logging and staging services
- **production** — Live environment with strict security and minimal logging

---

## Environment Files

### Structure

```
.env                   # Development defaults (loaded first)
.env.example          # Template with all variables documented
.env.staging          # Staging configuration
.env.production       # Production configuration ⚠️ DO NOT COMMIT
.env.*.local          # Local overrides (git-ignored) — Optional
```

### Loading Order

1. `.env` is always loaded first (default values)
2. `.env.{NODE_ENV}` is loaded and overwrites `.env` values
3. `.env.{NODE_ENV}.local` is loaded if it exists (for personal overrides)

### Git Strategy

```bash
# Version control
✅ .env.example       (template, always commit)
✅ .env              (development defaults, can commit)
✅ .env.staging      (template-like config, can commit)

# Do NOT commit
❌ .env.production   (has secrets)
❌ .env.*.local      (personal overrides)
❌ .env.development.local  (personal secrets)
```

---

## Using NODE_ENV

### Development (Default)

```bash
# Development automatically when not set
npm run start:dev

# Or explicitly:
export NODE_ENV=development
pnpm run start:dev
```

**Configuration:**
- `LOG_LEVEL=debug` — Verbose logging
- `LOG_FORMAT=pretty` — Human-readable logs
- `CORS_ORIGIN=http://localhost:3000` — Allow localhost
- `DATABASE_URL=local/dev database` — Local database
- `JWT_SECRET=dev key` — Simple secret (not secure)

---

### Staging

```bash
# Set environment before running
export NODE_ENV=staging
pnpm run build
pnpm start

# Or as environment variable
NODE_ENV=staging pnpm start
```

**Configuration:**
- `LOG_LEVEL=log` — Standard logging
- `LOG_FORMAT=json` — Structured JSON logs
- `CORS_ORIGIN=https://staging.yourdomain.com` — Staging domain
- `DATABASE_URL=staging database` — Staging database
- `JWT_SECRET=staging secret` — Secure random secret
- `STRIPE_SECRET_KEY=sk_test_...` — Test keys

**Use Cases:**
- Testing before production
- Integration testing
- UAT (User Acceptance Testing)
- Load testing with realistic data

---

### Production

```bash
# Set environment before running
export NODE_ENV=production
pnpm run build
pnpm start

# Or in Docker
docker run -e NODE_ENV=production ...

# Or on platform (Vercel, Heroku, AWS, etc.)
# Set NODE_ENV environment variable in platform settings
```

**Configuration:**
- `LOG_LEVEL=error` — Errors only
- `LOG_FORMAT=json` — Structured JSON for parsers
- `CORS_ORIGIN=https://yourdomain.com` — Production domain only
- `DATABASE_URL=prod database` — Production database
- `JWT_SECRET=strong random secret` — Very secure
- `STRIPE_SECRET_KEY=sk_live_...` — Live keys

---

## Environment Variables Reference

### Core

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `PORT` | 3000 | 3000 | 3000 |
| `HOST` | localhost | 0.0.0.0 | 0.0.0.0 |

### Database

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `DATABASE_URL` | local/dev DB | staging DB | prod DB (HA) |
| SSL Mode | disable/require | require | require |

### Logging

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `LOG_LEVEL` | debug | log | error |
| `LOG_FORMAT` | pretty | json | json |

### API

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `CORS_ORIGIN` | http://localhost:3000 | https://staging.* | https://yourdomain.com |
| `CORS_CREDENTIALS` | true | true | false |
| `API_PREFIX` | /api | /api | /api |

### Security

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `JWT_SECRET` | any string | secure random | VERY secure random |
| `JWT_EXPIRATION` | 24h | 24h | 24h |
| Rate Limiting | 100 req/min | 100 req/min | 50 req/min |

### Payment (if using Stripe)

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `STRIPE_SECRET_KEY` | sk_test_... | sk_test_... | sk_live_... |
| `STRIPE_PUBLIC_KEY` | pk_test_... | pk_test_... | pk_live_... |

---

## Local Development Setup

### Initial Setup

```bash
# 1. Copy template
cp .env.example .env

# 2. Update for your local setup if needed
# Most defaults work out of the box for local development

# 3. Start development server
pnpm run start:dev

# Logs should show:
# 🚀 Server running on http://localhost:3000
# 📚 Swagger docs available at http://localhost:3000/api
# 📡 Environment: development
# 📊 Log Level: debug
```

### Personal Overrides (Local Only)

Create `.env.development.local` for personal settings (git-ignored):

```bash
# .env.development.local (git-ignored)
DATABASE_URL=postgresql://user:pass@localhost:5432/my_db
MAIL_PASSWORD=my-personal-app-password
```

This file is git-ignored and will override `.env.development` locally.

---

## Docker & Production Deployment

### Docker Run

```bash
docker build -t myapi .

# Development
docker run -e NODE_ENV=development myapi

# Staging
docker run -e NODE_ENV=staging \
  -e DATABASE_URL="postgresql://..." \
  myapi

# Production
docker run -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="very-secure-secret" \
  myapi
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
```

```bash
# Development
docker-compose up

# Production
NODE_ENV=production DATABASE_URL=... JWT_SECRET=... docker-compose up
```

### Cloud Deployment (Vercel, Heroku, AWS, etc.)

Set environment variables in platform settings:

**Vercel:**
```
Settings → Environment Variables
NODE_ENV: production
DATABASE_URL: postgresql://...
JWT_SECRET: ...
```

**Heroku:**
```bash
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://...
heroku config:set JWT_SECRET=...
```

**AWS Lambda / Elastic Beanstalk:**
- Set in environment configuration
- Or use AWS Secrets Manager for sensitive values

---

## Security Best Practices

### Development
- ✅ Simple JWT secrets (not used in production)
- ✅ Local database
- ✅ Debug logging
- ✅ Relaxed CORS (localhost only)

### Staging
- ✅ Strong JWT secrets (rotate regularly)
- ✅ Staging database (separate from production)
- ✅ Test API keys (Stripe, etc.)
- ✅ Standard logging
- ✅ Configured CORS

### Production
- ✅ EXTREMELY strong, random JWT secrets (minimum 32 characters)
- ✅ NEVER store secrets in `.env` file
- ✅ Use secrets vault (AWS Secrets Manager, HashiCorp Vault, etc.)
- ✅ Rotate secrets regularly (every 90 days minimum)
- ✅ Error-only logging
- ✅ Strict CORS (production domain only)
- ✅ HTTPS/TLS enforced
- ✅ Database with high availability
- ✅ Regular security audits

---

## Troubleshooting

### Wrong Environment Being Used

```bash
# Check current environment
echo $NODE_ENV

# Check what was loaded
# Look at startup logs:
# "📡 Environment: production"

# Make sure environment is set BEFORE npm start
export NODE_ENV=staging
pnpm run start:dev
```

### Database Connection Fails

```bash
# Check NODE_ENV
echo $NODE_ENV

# Check which DATABASE_URL is being used:
echo $DATABASE_URL

# Verify credentials match the environment
# Development: local database
# Staging: staging database
# Production: production database
```

### Logging Appears Wrong

```bash
# If you see debug logs but NODE_ENV=production, you might be in development
echo $NODE_ENV
echo $LOG_LEVEL

# Check that .env.production exists and is loaded
ls -la .env*

# Restart application
```

### Secrets Not Working in Production

```bash
# DO NOT use .env.production for production deployment
# Instead, set environment variables on your platform:

# ✅ Use AWS Secrets Manager
# ✅ Use HashiCorp Vault
# ✅ Use platform environment variables (Vercel, Heroku, etc.)

# ❌ Never commit .env.production
# ❌ Never commit secrets to git
```

---

## Creating a New Environment

If you need a fourth environment (e.g., `qa`):

1. Create `.env.qa`
2. Add to startup script if needed
3. Update documentation
4. Add to deployment pipeline
5. Set appropriate log levels and secrets

---

## Quick Reference

```bash
# Development (default)
pnpm run start:dev
# Uses: .env → .env.development → .env.development.local

# Staging
NODE_ENV=staging pnpm start
# Uses: .env → .env.staging → .env.staging.local

# Production
NODE_ENV=production pnpm start
# Uses: .env → .env.production → .env.production.local
```

---

## Related Documentation

- [Findings](./findings.md) — Environment variable names and setup
- [API Guide](./api.md) — API endpoints
- [Database Guide](./database.md) — Connection and migrations

---

**Important**: Never commit `.env.production` or any `.env.*.local` files.  
Always use `.env.example` as the template for environment setup.
