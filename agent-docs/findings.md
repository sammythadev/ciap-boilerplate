# Project Findings & Discoveries

Auto-updating log of repository searches, architectural decisions, and implementation notes.

**Last Updated**: 2026-04-07  
**Version**: 1.0.0

## Archive

### Initial Setup (2026-04-07)
- **Decision**: Established NestJS v11 + TypeScript + Drizzle ORM + PostgreSQL architecture
- **Path Aliases**: Configured in tsconfig.json for modular imports
  - `@/*`: Root src reference
  - `@modules/*`: Feature modules
  - `@common/*`: Shared utilities
  - `@database/*`: Database layer
  - `@config/*`: Configuration
  - `@types/*`: Type definitions
  
- **Database**: NeonDB connection via `@neondatabase/serverless`
  - Schema location: `src/database/drizzle/schema.ts`
  - Migrations: `src/database/drizzle/migrations/`
  - Configuration: drizzle.config.ts updated with timestamp prefix

- **API Documentation**: Swagger/OpenAPI integrated
  - Added `@nestjs/swagger` and `swagger-ui-express`
  - Endpoint: `/api` (configure in main.ts)

- **TypeScript Strictness**: Enabled all strict flags
  - `noImplicitAny: true`, `strict: true`
  - `strictNullChecks`, `strictFunctionTypes`, `noImplicitReturns` enabled

- **pnpm Scripts**: Organized and standardized
  - Development: `pnpm run start:dev`
  - Database: `pnpm run db:generate`, `pnpm run db:migrate`, `pnpm run db:studio`
  - Testing: `pnpm run test`, `pnpm run test:e2e`, `pnpm run test:cov`

- **Module Structure**: Directory layout established
  - `src/modules/` - Feature modules
  - `src/common/` - Shared decorators, filters, guards, interceptors, etc.
  - `src/database/` - Database configuration and schema
  - `src/config/` - Application configuration

### Swagger & Logging Setup (2026-04-07)
- **Swagger/OpenAPI Documentation**: Configured in `main.ts`
  - Endpoint: `http://localhost:3000/api`
  - Bearer token authentication configured
  - Tags available: `health`
  - Persistent authorization enabled (remember token)
  
- **Logging System**: 
  - NestJS built-in logger with configurable log levels
  - Log levels: `error`, `warn`, `log`, `debug`, `verbose`
  - Environment variable: `LOG_LEVEL` (default: `debug`)
  - Bootstrap logs server startup info with port, Swagger URL, environment

- **CORS Configuration**:
  - Configurable via `CORS_ORIGIN` env variable
  - Methods: GET, POST, PUT, PATCH, DELETE
  - Headers: Content-Type, Authorization
  - Credentials: enabled

- **Global Validation Pipe**:
  - Whitelist enabled (strips unknown properties)
  - Forbid non-whitelisted properties enabled
  - Auto-transforms types when possible
  - Implicit conversion enabled

- **Health Check Endpoints**:
  - `GET /health` - Returns API health status and uptime
  - `GET /` - Returns API information and version
  - Both endpoints documented in Swagger

- **Environment Variables** (`.env` and `.env.example`):
  - `DATABASE_URL` - PostgreSQL connection string
  - `PORT` - Server port (default: 3000)
  - `HOST` - Server host (default: 0.0.0.0)
  - `NODE_ENV` - Environment (development, staging, production)
  - `LOG_LEVEL` - Logging level (error, warn, log, debug, verbose)
  - `LOG_FORMAT` - Log format (pretty for dev, json for prod)
  - `CORS_ORIGIN` - CORS allowed origin
  - `CORS_CREDENTIALS` - Allow credentials in CORS
  - `API_VERSION` - API version (default: v1)
  - `API_PREFIX` - API route prefix (default: /api)
  - `JWT_SECRET` - JWT signing secret (minimum 32 chars)
  - `JWT_EXPIRATION` - JWT expiration time
  - `JWT_REFRESH_SECRET` - JWT refresh secret (minimum 32 chars)
  - `JWT_REFRESH_EXPIRATION` - Refresh token expiration
  
### Comprehensive Environment Configuration (2026-04-07)
- **Environment Files**:
  - `.env` — Development defaults (committed to git)
  - `.env.example` — Template with all variables documented (committed to git)
  - `.env.staging` — Staging config with test keys (can be committed)
  - `.env.production` — Production config (⚠️ NEVER commit, use secrets vault instead)
  - `.env.*.local` — Personal local overrides (git-ignored)

- **NODE_ENV Usage**:
  - **Development**: `NODE_ENV=development` (default)
    - Debug logging, local database, relaxed CORS
    - 100 req/min rate limit
  - **Staging**: `NODE_ENV=staging`
    - Standard logging in JSON, staging database, test keys
    - 100 req/min rate limit
  - **Production**: `NODE_ENV=production`
    - Error-only logging in JSON, prod database, live keys
    - 50 req/min rate limit

- **Preseeded Environment Variables** (for future integrations):
  - **Email**: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM
  - **AWS S3**: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
  - **Stripe**: STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY
  - **OAuth2**: GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET, MICROSOFT_CLIENT_ID/SECRET
  - **Monitoring**: SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_TRACE_SAMPLE_RATE
  - **Rate Limiting**: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS
  - **Cache**: CACHE_TTL, CACHE_MAX_SIZE
  - **File Upload**: MAX_FILE_SIZE, UPLOAD_DIR

- **Security**: 
  - `.env.production` explicitly added to `.gitignore`
  - `.env.*.local` git-ignored for personal secrets
  - JWT secrets require minimum 32 characters in staging/production
  - Production: Use secrets vault (AWS Secrets Manager, HashiCorp Vault, etc.)
  - See `docs/environment.md` for complete environment guide

### SWC Compiler Configuration (2026-04-07)

### Type Declarations Repository-Wide (2026-04-07)
- **Added Missing @types Packages**:
  - `@types/body-parser` - Types for body-parser middleware
  - `@types/cors` - Types for CORS package
  - `@types/jsonwebtoken` - Types for JWT handling
  - `@types/passport` - Types for Passport authentication
  - `@types/passport-jwt` - Types for JWT strategy
  
- **TypeScript Configuration**:
  - `tsconfig.json`: Strict mode enabled, path aliases configured
  - `tsconfig.build.json`: Extends main config, excludes test files
  - `types` field includes `["node", "jest"]` for proper type resolution
  - `declaration: true` generates `.d.ts` files for distribution
  
- **Type Safety Standards**:
  - `strict: true` - All strict type checks enabled
  - `noImplicitAny: true` - Disallow implicit any types
  - `strictNullChecks: true` - Null/undefined type checking
  - `noImplicitReturns: true` - Disallow implicit undefined returns
  - `forceConsistentCasingInFileNames: true` - Case-sensitive module resolution

### SWC Compiler Configuration (2026-04-07)
- **SWC Packages Added**: `@swc/cli`, `@swc/core`, `@swc/jest`
  - Fast TypeScript/JavaScript compiler alternative to ts-loader
  - Used for faster builds and test execution
  - Source maps enabled for debugging
  - External helpers enabled for code optimization

- **`.swcrc` Configuration Highlights**:
  - **Parse**: TypeScript with decorators support (NestJS requirement)
    - `decorators: true` and `decoratorsBeforeExport: true` for NestJS
    - Top-level await enabled
    - Dynamic imports enabled
    - Class fields and private methods supported
  
  - **Transform**:
    - `decoratorMetadata: true` - Reflect metadata for NestJS DI
    - `legacyDecorator: true` - Support legacy decorator syntax
    - `useDefineForClassFields: true` - ES2022 field initialization
  
  - **Module**: CommonJS output with proper interop
    - `type: "commonjs"` - Node.js compatible output
    - `strictMode: true` - Strict mode enabled
    - External helpers enabled
  
  - **Source Maps**: Enabled for development and debugging
    - `sourceMap: true`
    - `inlineSourcesContent: true`
  
  - **Build Optimization**:
    - Dead code elimination enabled
    - Keep class names (needed for reflection)
    - Keep function names (for debugging)
    - Node target: ES2021

---

## Discovery Log

Add entries as you discover patterns, dependencies, or make architectural decisions.

### Format
```
### Discovery Title (YYYY-MM-DD)
- **File(s)**: path/to/file.ts
- **Finding**: What you discovered
- **Action**: What will be done about it
- **Impact**: How it affects the project
```

### Example
```
### Circular Dependency in User Module (2026-04-08)
- **File(s)**: src/modules/users/users.service.ts, src/modules/users/users.repository.ts
- **Finding**: Service imports Repository which imports Service
- **Action**: Break circular dependency by using abstract interface
- **Impact**: Enables proper DI and testing
```

---

## Architecture Decisions

### ADR-001: Modular Service Repository Pattern
- Use Repository pattern for data access
- Services handle business logic
- Controllers expose HTTP endpoints
- Each feature gets its own module

### ADR-002: Path Aliases for Clarity
- Absolute imports via `@/*` instead of relative paths
- Cleaner refactoring when moving files
- Type safety with TypeScript resolution

### ADR-003: Database Schema First
- Drizzle ORM with explicit schema
- Migrations version-controlled
- NeonDB serverless connection

---

## Health Check & Database Module (2026-04-07)

### Health Module Implementation
- **Location**: `src/modules/health/`
- **Endpoints**:
  - `GET /health` - Overall API health status with uptime
  - `GET /health/db` - Database connection health check
  - `GET /health/ready` - Service readiness probe (checks all dependencies)
- **Response Format**: HealthDto with status, timestamp, and optional metadata
- **Features**:
  - Returns uptime, environment, and version
  - Database connection validation (to be expanded after schema)
  - Readiness check for Kubernetes/Docker deployments
  - Swagger documentation included

### Database Module Setup
- **Location**: `src/database/`
- **Features**:
  - PostgreSQL connection pool using `pg` package
  - Drizzle ORM integration with typed schema
  - Connection error handling with logging
  - Runtime DATABASE_URL validation
  - Proper connection lifecycle management

### Database Seeding Feature
- **Location**: `src/database/seeds/`
- **Files**:
  - `seed.service.ts` - Seed logic service
  - `seed.module.ts` - NestJS module for DI
  - `seed.ts` - CLI entry point (runnable with `pnpm run db:seed`)
- **Features**:
  - Test data generation capability
  - Password hashing for user credentials (SHA256 for testing only)
  - Clear functionality for development cleanup
  - Status checking capability
  - TODO: Implement actual seeding after schema definition

### New pnpm Scripts
- `pnpm run db:seed` - Run seeding in development (using ts-node)
- `pnpm run db:seed:prod` - Run seeding in production (using compiled JS)

### Swagger Configuration Extraction
- **New File**: `src/swagger.ts`
- **Purpose**: Centralized Swagger/OpenAPI configuration
- **Features**:
  - DocumentBuilder setup with API metadata
  - Contact and license information
  - Bearer token authentication configuration
  - Tags for endpoint organization
  - SwaggerModule setup with custom options
  - Removed from main.ts for cleaner bootstrap
- **Benefit**: Separation of concerns, easier testing, reusable configuration

### App Module Imports
- Updated `src/app.module.ts` to import:
  - `DatabaseModule` - Initializes database connection
  - `SeedModule` - Provides seed service
  - `HealthModule` - Provides health endpoints
- Module order follows NestJS best practices: core modules first, feature modules last

### Updated Logging
- Health check URL added to bootstrap logs
- Cleaner startup messages with emoji indicators
- Database module logs connection status

---

## TypeScript Compiler Errors & Strict Mode Fixes (2026-04-07)

### Errors Encountered & Solutions

#### ❌ Error TS7016: Could not find declaration file for module 'pg'
- **Error**: "Could not find a declaration file for module 'pg'"
- **Files**: `src/database/database.module.ts`
- **Root Cause**: `@types/pg` not installed in devDependencies
- **Solution**: Added `"@types/pg": "^8.11.8"` to package.json devDependencies
- **Why**: PostgreSQL driver needs type definitions for TypeScript strict mode
- **Prevention**: Always add @types packages for external dependencies before use

#### ❌ Error TS1272: Type referenced in decorated signature (isolatedModules issue)
- **Error**: "A type referenced in a decorated signature must be imported with 'import type'"
- **Files**: `src/database/seeds/seed.service.ts`, `src/modules/health/health.service.ts`
- **Root Cause**: Regular `import { Database }` in `@Inject` decorated constructor with strict mode
- **Solution**: Changed to `import type { Database }`
  - Before: `import { DATABASE_PROVIDER, Database } from '../database.module';`
  - After: 
    ```typescript
    import { DATABASE_PROVIDER } from '../database.module';
    import type { Database } from '../database.module';
    ```
- **Key Insight**: When `isolatedModules: true` + `emitDecoratorMetadata: true`, types in decorated signatures must use `import type`
- **Rule Established**: 
  - Use `import type` for types used in decorated parameters
  - Use regular `import` for runtime values (constructor values, used with `new`, etc.)

#### ❌ Error TS2366: Function lacks ending return statement
- **Error**: "Function lacks ending return statement and return type does not include 'undefined'"
- **File**: `src/modules/health/health.service.ts` - checkDatabase() method
- **Root Cause**: Try-catch block without guaranteed return on all paths
- **Original Code**:
  ```typescript
  async checkDatabase(): Promise<HealthDto> {
    try {
      const result = await this.db.execute(sql`SELECT NOW()`);
      if (result) {
        return { ... };  // Returns here
      }
      // Falls through without return if result is falsy!
    } catch (error) {
      return { ... };  // Returns here
    }
    // No return here if promise resolves but result is falsy
  }
  ```
- **Solution**: Added explicit return for all code paths:
  ```typescript
  async checkDatabase(): Promise<HealthDto> {
    try {
      const result = await this.db.execute(sql`SELECT NOW()`);
      if (result) {
        return { status: 'ok', ... };
      }
      // Explicitly handle falsy result
      return { status: 'error', message: 'Empty result' };
    } catch (error) {
      return { status: 'error', ... };
    }
  }
  ```
- **Rule**: All code paths in a function must return the promised type
- **Prevention**: Strict type checking catches these automatically

### Import Type Pattern Rules

**When to use `import type`** (erased at runtime):
- Types used only in type annotations
- Interface definitions
- Type aliases
- Parameters to decorators (@Inject, @Body, @Param, etc.)

**When to use regular `import`** (available at runtime):
- Classes used with `new` operator (e.g., `new Pool()`)
- Functions/values used in code
- Re-exporting from a module
- Constants and enums

**Special Case - Mixed**:
```typescript
import { DATABASE_PROVIDER } from '../database.module';  // Runtime value
import type { Database } from '../database.module';       // Type only
```

### Updated devDependencies

Added to ensure TypeScript strict mode compilation:
- `@types/pg` ^8.11.8 - PostgreSQL driver types

### Compilation Configuration Impact

These errors highlight how NestJS strict mode settings interact:
- `isolatedModules: true` - Requires explicit type vs runtime distinction
- `emitDecoratorMetadata: true` - Enables reflection for DI, requires proper imports
- `strictNullChecks: true` - Requires all code paths to return
- `noImplicitReturns: true` - Enforces return statements

---

## Drizzle ORM Standard Practices & Implementation (2026-04-07)

### Schema-First Approach

**Standard Drizzle ORM Practice**: Define all tables and seed data in `schema.ts`

#### Schema File Structure (`src/database/drizzle/schema.ts`)
- **Location**: Centralized schema definition (required by drizzle-kit)
- **Includes**:
  - Table definitions using `pgTable()`
  - Column definitions with constraints
  - Relations using `relations()`
  - Type exports using `$inferSelect` and `$inferInsert`
  - Seed data constants (`SEED_USERS`, `SEED_PROFILES`)

#### Key Patterns Implemented

**1. Table Definition**
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
```

**2. Relationships**
```typescript
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));
```

**3. Type Safety**
```typescript
export type User = typeof users.$inferSelect;  // For SELECT queries
export type NewUser = typeof users.$inferInsert;  // For INSERT/UPDATE
```

**4. Seed Data**
```typescript
export const SEED_USERS: NewUser[] = [
  {
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: '...',
    isActive: true,
  },
];
```

### Database Module with Proper Typing

**File**: `src/database/database.module.ts`

**Key Changes**:
1. Used `NodePgDatabase<typeof schema>` type from drizzle-orm
2. Exported `Database` type for dependency injection
3. Imported schema as namespace for type inference
4. Passed schema to drizzle initialization: `drizzle(pool, { schema })`
5. Added error handling for connection failures

**Type Export**:
```typescript
export type Database = NodePgDatabase<typeof schema>;
```

**Benefits**:
- Full type inference for all queries
- Autocomplete in IDEs
- Compile-time query validation
- Type-safe repository methods

### Seed Service Following Drizzle Standards

**File**: `src/database/seeds/seed.service.ts`

**Standard Practices Implemented**:
1. **Uses schema-defined data**: Imports `SEED_USERS`, `SEED_PROFILES` from schema.ts
2. **Idempotent seeding**: Checks if data exists before inserting
3. **Referential integrity**: Deletes profiles before users (respects FK constraints)
4. **Typed queries**: All database operations are fully type-safe
5. **Batch operations**: Uses `.values()` for multiple inserts

**Methods**:
- `seedTestData()` - Insert predefined test data
- `clearTestData()` - Remove test data safely
- `getStatus()` - Check seed status with counts

### Health Check with Drizzle ORM

**File**: `src/modules/health/health.service.ts`

**Changes**:
1. Injected typed `Database` instance
2. Uses Drizzle's `sql` helper for raw queries
3. Returns database connection status
4. Type-safe error handling

```typescript
const result = await this.db.execute(sql`SELECT NOW()`);
```

### Migration Workflow

**Standard Drizzle Pattern**:
```bash
# 1. Define schema in src/database/drizzle/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Review migration in src/database/drizzle/migrations/
# 4. Run migration
pnpm run db:migrate

# 5. Seed test data (when needed)
pnpm run db:seed
```

### Lessons Learned

#### ✅ Correct Practices
1. **Schema as single source of truth** - All table definitions in one file
2. **Seed data in schema** - Makes it discoverable and easy to update
3. **Type inference** - Use `$inferSelect` and `$inferInsert` for safety
4. **Relations as metadata** - Define relationships in schema, not queries
5. **Proper typing in module** - Export `Database` type for injection

#### ❌ Anti-Patterns to Avoid
- Defining tables in multiple files
- Hardcoded seed data in seed service
- Using `any` type for database instance
- Forgetting to pass schema to drizzle()
- Not using type inference for SELECT/INSERT types

#### 🔧 TypeScript Strict Mode
- `pg` types now properly imported: `import { Pool, PoolClient } from 'pg';`
- Database type fully exported and reusable
- No implicit types in service injections

### File Structure Summary

```
src/database/
├── database.module.ts          # Database provider with proper typing
├── drizzle/
│   ├── schema.ts               # ✅ Tables, relations, types, seed data
│   └── migrations/             # Auto-generated migrations
└── seeds/
    ├── seed.module.ts
    ├── seed.service.ts         # Uses schema for seed data
    └── seed.ts
```

---

## New Features Log

When implementing new features, document here:

### Feature: User Authentication (Not Yet Implemented)
- Status: Planned
- Module Location: `src/modules/auth/`
- Dependencies: Required JWT, bcrypt
- Swagger Documentation: Required

---

## Code Quality Notes

- **Type Coverage**: Aim for 100% (no `any` types)
- **Testing**: Maintain >80% unit test coverage
- **E2E Tests**: Write for critical user flows
- **Documentation**: Swagger decorators on all endpoints


