# Environment Variables & Configuration

**Last Updated**: April 7, 2026  
**Version**: 1.0.0

---

## Overview

Environment variables manage **secrets** (API keys, passwords), **configuration** (URLs, timeouts), and **constants** (ports, retry counts).

### CRITICAL RULE: Never Hardcode Environment-Dependent Values

❌ **Forbidden**:
```typescript
const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
const API_KEY = 'sk-1234567890abcdef';
const SMTP_PASSWORD = 'mySecurePassword123';
const PORT = 3000;
const FRONTEND_URL = 'http://localhost:3000';
```

✅ **Correct**:
```typescript
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;
```

---

## Required Environment Variables

### Database (Required)

| Variable | Type | Required | Example | Notes |
|----------|------|----------|---------|-------|
| `DATABASE_URL` | String | Yes | `postgresql://user:pass@host:5432/dbname` | NeonDB connection string |
| `DATABASE_POOL_SIZE` | Number | No | `20` | Connection pool size (default: 10) |
| `DATABASE_TIMEOUT` | Number | No | `5000` | Query timeout in ms (default: 5000) |

### Application (Required)

| Variable | Type | Required | Example | Notes |
|----------|------|----------|---------|-------|
| `NODE_ENV` | String | No | `development` | development, staging, production (default: development) |
| `PORT` | Number | No | `3000` | Server port (default: 3000) |
| `LOG_LEVEL` | String | No | `info` | debug, info, warn, error (default: info) |

### Authentication (Required if using JWT)

| Variable | Type | Required | Example | Notes |
|----------|------|----------|---------|-------|
| `JWT_SECRET` | String | Yes | `your-super-secret-key-min-32-chars` | Minimum 32 characters for security |
| `JWT_EXPIRY` | String | No | `24h` | Token expiration (default: 24h) |
| `JWT_REFRESH_SECRET` | String | No | `your-refresh-secret-key` | For refresh token strategy |

### External APIs (Conditional)

| Variable | Type | Required | Example | Notes |
|----------|------|----------|---------|-------|
| `SMTP_HOST` | String | If using email | `smtp.gmail.com` | Email server host |
| `SMTP_PORT` | Number | If using email | `587` | Typically 587 (TLS) or 465 (SSL) |
| `SMTP_USER` | String | If using email | `your-email@gmail.com` | Sender email |
| `SMTP_PASSWORD` | String | If using email | `app-specific-password` | Use app-specific password for Gmail |
| `STRIPE_API_KEY` | String | If using Stripe | `sk_live_xxxxx` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | String | If using Stripe | `whsec_xxxxx` | Stripe webhook signing secret |

### Application URLs (Configuration)

| Variable | Type | Required | Example | Notes |
|----------|------|----------|---------|-------|
| `FRONTEND_URL` | String | No | `http://localhost:3000` | Frontend URL for CORS, email links |
| `API_URL` | String | No | `http://localhost:3001` | API URL for docs, external references |

---

## `.env.example` Template

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=5000

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Authentication
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
JWT_EXPIRY=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-minimum-32-characters

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password

# Stripe (Optional)
STRIPE_API_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
```

---

## Multi-Environment Setup

### File Organization

```
project/
├── .env                    # Development (git-ignored)
├── .env.example            # Template (committed)
├── .env.staging            # Staging (in pipeline)
├── .env.production         # Production (in secrets manager)
└── ...
```

### Load Correct Environment File

In `main.ts`:

```typescript
import * as dotenv from 'dotenv';

// Load .env based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

// Then validate
validateEnvironment();
```

### Environment-Specific Values

**Development** (`.env`):
```bash
DATABASE_URL=postgresql://dev:dev@localhost:5432/testapi_dev
NODE_ENV=development
LOG_LEVEL=debug
FRONTEND_URL=http://localhost:3000
STRIPE_API_KEY=sk_test_xxxxx  # Test mode
```

**Staging** (`.env.staging`):
```bash
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/testapi_staging
NODE_ENV=staging
LOG_LEVEL=info
FRONTEND_URL=https://staging.example.com
STRIPE_API_KEY=sk_test_xxxxx  # Still test mode
```

**Production** (`.env.production` - in secrets manager, not in repo):
```bash
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/testapi_prod
NODE_ENV=production
LOG_LEVEL=warn
FRONTEND_URL=https://example.com
STRIPE_API_KEY=sk_live_xxxxx  # Live mode
```

---

## Runtime Validation

**ALWAYS validate environment variables at startup**:

```typescript
// src/config/validation.ts
import { Logger } from '@nestjs/common';

export function validateEnvironment() {
  const logger = new Logger('EnvironmentValidation');

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}. Check .env file.`;
    logger.error(message);
    throw new Error(message);
  }

  logger.log('✅ All required environment variables are set');

  // Optional: Validate format
  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    throw new Error('PORT must be a number');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️ JWT_SECRET is less than 32 characters (weak)');
  }
}
```

Usage in `main.ts`:

```typescript
import { validateEnvironment } from '@config/validation';

async function bootstrap() {
  validateEnvironment();  // Validate before creating app
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

---

## Configuration in Services

### Example: Database Service

```typescript
import { Database } from '@database/database.module';
import { Logger } from '@nestjs/common';

@Injectable()
export class DatabaseService {
  private logger = new Logger('DatabaseService');

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      const message = 'DATABASE_URL environment variable is not set. Check .env file.';
      this.logger.error(message);
      throw new Error(message);
    }

    // Use environment variable safely
    this.db = this.createConnection(databaseUrl);
  }

  private createConnection(url: string): Database {
    // Connection logic here
  }
}
```

### Example: Auth Service

```typescript
@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
  }

  signToken(payload: Record<string, any>): string {
    return sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }
}
```

---

## Category Reference

### Secrets (Never commit, use environment)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `SMTP_PASSWORD`, `STRIPE_API_KEY`
- `DATABASE_URL`
- `STRIPE_WEBHOOK_SECRET`

### Configuration (Different per environment)
- `NODE_ENV`, `PORT`, `LOG_LEVEL`
- `DATABASE_POOL_SIZE`, `DATABASE_TIMEOUT`
- `JWT_EXPIRY`
- `FRONTEND_URL`, `API_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`

### Constants (Rarely change)
- `PORT` (if default is acceptable)
- `LOG_LEVEL` (if default is acceptable)

---

## Common Mistakes to Avoid

| Mistake | Problem | Fix |
|---------|---------|-----|
| Checking `.env` in git with real values | Exposes secrets | Add `.env` to `.gitignore`, use `.env.example` |
| Hardcoding URLs/keys with "defaults" | Different per environment | Everything from `process.env` with defaults only for non-critical |
| Not validating env vars | Missing vars cause runtime crashes | Validate all required vars at startup |
| Different var names in code vs docs | Team confusion | Document consistently in `.env.example` |
| Forgetting to add new vars to `.env.example` | Others can't run app | Always update `.env.example` with every new var |
| Using implicit `any` for env vars | Type errors | Use proper typing: `process.env.PORT as string` |

---

## Checklist: Adding New Environment Variable

When adding a new environment variable:

1. ✅ Determine if **secret** (never commit) or **config** (varies by env)
2. ✅ Add to `.env.example` with placeholder value
3. ✅ Add to this document with name, type, required, example, notes
4. ✅ Add to validation schema (if using @nestjs/config)
5. ✅ Add runtime validation in code (if critical)
6. ✅ Update development `.env` file
7. ✅ Document in pipeline/secrets manager config
8. ✅ Test on local machine and staging

---

## References

- JWT RFC: https://tools.ietf.org/html/rfc7519
- 12-Factor App: https://12factor.net/config
- NeonDB Docs: https://neon.tech/docs

