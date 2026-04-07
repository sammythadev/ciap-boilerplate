# Project Structure Guide

Visual and detailed guide to the NestJS project architecture.

**Last Updated**: 2026-04-07  
**Framework**: NestJS v11 + TypeScript + Drizzle ORM + PostgreSQL

---

## Directory Tree

```
test-api/
├── docs/                           # Documentation (auto-generated and manual)
│   ├── findings.md                 # Discovery log & architectural decisions
│   ├── project-structure.md        # This file
│   ├── api.md                      # API endpoints & DTOs
│   ├── database.md                 # Database schema & migrations
│   └── patterns.md                 # Code patterns & best practices
│
├── src/                            # Application source code
│   ├── modules/                    # Feature modules (Lazy loaded)
│   │   ├── users/                  # Example: User feature module
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts   # HTTP routes
│   │   │   ├── users.service.ts      # Business logic
│   │   │   ├── users.repository.ts   # Data access
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts     # Database entity
│   │   │   └── users.spec.ts          # Unit tests
│   │   │
│   │   └── products/               # Additional modules follow same pattern
│   │       ├── products.module.ts
│   │       ├── products.controller.ts
│   │       ├── products.service.ts
│   │       └── ...
│   │
│   ├── common/                     # Shared/cross-cutting concerns
│   │   ├── decorators/             # Custom decorators
│   │   │   ├── is-public.decorator.ts
│   │   │   ├── validate-body.decorator.ts
│   │   │   └── owner-only.decorator.ts
│   │   │
│   │   ├── filters/                # Exception filters
│   │   │   ├── http-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   │
│   │   ├── guards/                 # Route guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── owner.guard.ts
│   │   │
│   │   ├── interceptors/           # Request/response interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── timeout.interceptor.ts
│   │   │
│   │   ├── middleware/             # Express middleware
│   │   │   ├── logger.middleware.ts
│   │   │   └── cors.middleware.ts
│   │   │
│   │   ├── pipes/                  # Validation/transformation pipes
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-uuid.pipe.ts
│   │   │
│   │   ├── utils/                  # Utility functions
│   │   │   ├── hasher.util.ts      # Password hashing
│   │   │   ├── jwt.util.ts         # JWT helper
│   │   │   └── validators.ts       # Custom validators
│   │   │
│   │   └── constants.ts            # Shared constants
│   │
│   ├── database/                   # Database configuration & ORM
│   │   ├── drizzle/
│   │   │   ├── schema.ts           # Database schema definition
│   │   │   └── migrations/         # Generated migrations (git tracked)
│   │   │       ├── 0001_initial.sql
│   │   │       └── meta/
│   │   │
│   │   └── database.module.ts      # Database provider setup
│   │
│   ├── config/                     # Application configuration
│   │   ├── database.config.ts      # DB config
│   │   ├── app.config.ts           # App settings
│   │   ├── security.config.ts      # Security settings
│   │   └── validation.ts           # Config validation schema
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── common.types.ts
│   │   ├── api-response.types.ts
│   │   └── error.types.ts
│   │
│   ├── app.module.ts               # Root module
│   ├── app.controller.ts           # Root controller (health check)
│   ├── app.service.ts              # Root service
│   └── main.ts                     # App entry point
│
├── test/                           # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .github/                        # GitHub configuration
│   ├── instructions/               # File-level instructions (optional)
│   └── agents/                     # Custom agents (optional)
│
├── copilot-instructions.md         # AI agent instructions for this project
├── drizzle.config.ts               # Drizzle ORM configuration
├── eslint.config.mjs               # ESLint rules
├── nest-cli.json                   # NestJS CLI configuration
├── package.json                    # Dependencies & scripts
├── pnpm-lock.yaml                  # Lock file (commit this)
├── tsconfig.json                   # TypeScript compiler options + path aliases
├── tsconfig.build.json             # Build-specific TS config
└── README.md                       # Project documentation
```

---

## Module Architecture

### Core Modules

#### `AppModule` (Root)
- Imports all feature modules
- Global configuration
- Global filters, interceptors, guards
- Database module setup

#### Feature Modules (e.g., `UsersModule`)
```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // Export for other modules
})
export class UsersModule {}
```

Structure:
- **Controller**: HTTP endpoints
- **Service**: Business logic & orchestration
- **Repository**: Data access (Drizzle ORM)
- **DTO**: Data validation & serialization
- **Entity**: Database entity mapping
- **Spec.ts**: Unit tests

#### `DatabaseModule`
- Provides database connection
- Singleton pattern
- Available to all services via DI

#### `CommonModule` (Optional)
- Global pipes, filters, guards
- Shared utilities
- Re-exported for easy access

---

## Data Flow

```
HTTP Request
    ↓
[Middleware] → logger
    ↓
[Guard] → JWT validation, role checking
    ↓
[Pipe] → Validation & transformation (@Body() with validation decorator)
    ↓
[Controller] → Route handler
    ↓
[Service] → Business logic
    ↓
[Repository] → Database query (Drizzle ORM)
    ↓
[Database] → PostgreSQL (NeonDB)
    ↓
[Response] → Entity → DTO
    ↓
[Interceptor] → Transform response format
    ↓
HTTP Response (200, 404, 500, etc.)
```

---

## Naming Conventions

| Item | Pattern | Example |
|------|---------|---------|
| **Classes** | PascalCase | `UserService`, `CreateUserDto` |
| **Methods** | camelCase | `getUserById()`, `findAll()` |
| **Constants** | UPPER_SNAKE_CASE | `DATABASE_URL`, `MAX_RETRY_ATTEMPTS` |
| **Files** | kebab-case | `create-user.dto.ts`, `user.service.ts` |
| **Folders** | kebab-case | `src/users`, `src/common/filters` |
| **Variables** | camelCase | `userId`, `userData` |
| **Enums** | PascalCase | `UserRole`, `HttpStatus` |
| **Interfaces** | PascalCase + `I` prefix (optional) | `IUserRepository` or `UserRepository` |

---

## Path Aliases

All absolute imports use configured path aliases:

```typescript
// ✅ Good
import { UserService } from '@modules/users/users.service';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { database } from '@database/database.module';
import { AppConfig } from '@config/app.config';

// ❌ Avoid
import { UserService } from '../../../../modules/users/users.service';
```

---

## Key Files

### Configuration Files
- **tsconfig.json**: TypeScript compilation + path aliases
- **drizzle.config.ts**: Drizzle ORM migrations & schema
- **nest-cli.json**: NestJS CLI project structure
- **eslint.config.mjs**: ESLint rules & Prettier formatting
- **package.json**: Dependencies, scripts, Jest config

### Documentation
- **copilot-instructions.md**: AI coding instructions for this project
- **README.md**: Getting started, setup guide
- **docs/findings.md**: Architectural decisions & discoveries
- **docs/api.md**: API endpoints (auto-generate from Swagger)
- **docs/database.md**: Schema & migration guide

---

## Database Schema Location

- **Schema Definition**: `src/database/drizzle/schema.ts`
- **Migrations**: `src/database/drizzle/migrations/` (auto-generated, version-controlled)
- **Configuration**: `drizzle.config.ts`

### Drizzle Commands
```bash
pnpm run db:generate   # Create migrations
pnpm run db:migrate    # Run pending migrations
pnpm run db:studio     # Open Drizzle Studio UI
pnpm run db:format     # Format SQL in schema
```

---

## Dependency Injection Flow

```
UsersModule
├── DatabaseModule (provider: Database)
├── UsersController (depends: UsersService)
├── UsersService (depends: UsersRepository)
└── UsersRepository (depends: Database)
     ↓
     Database singleton from DatabaseModule
```

NestJS automatically resolves dependencies if providers are properly exported.

---

## Testing Structure

- **Unit Tests**: `src/modules/**/*.spec.ts`
- **E2E Tests**: `test/app.e2e-spec.ts`
- **Coverage**: `pnpm run test:cov`

Jest Configuration (in package.json):
- Root Dir: `src`
- Test Pattern: `**/*.spec.ts`
- Coverage: `../coverage`

---

## Environment Variables

Create `.env` file:
```env
DATABASE_URL=postgres://user:pass@host:5432/dbname
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret
JWT_EXPIRATION=24h
```

Reference in code via `process.env.DATABASE_URL`

---

## Common Tasks

### Add New Feature Module
1. Create `src/modules/feature-name/` folder
2. Generate: `nest g module modules/feature-name`
3. Add subdirectories: `dto/`, `entities/`
4. Implement: controller, service, repository
5. Export from `UsersModule` if needed
6. Import in `AppModule`

### Add Database Entity
1. Update `src/database/drizzle/schema.ts`
2. Generate migration: `pnpm run db:generate`
3. Run migration: `pnpm run db:migrate`
4. Create repository method
5. Use in service

### Add API Endpoint
1. Create controller method
2. Add `@ApiOperation()` and `@ApiResponse()` decorators
3. Validate with pipes
4. Implement service logic
5. Test with E2E suite

---

## Continuous Update
This file is updated whenever:
- New modules are added
- Architecture changes
- New patterns are established
- Directory structure evolves

See `/docs/findings.md` for implementation notes.
