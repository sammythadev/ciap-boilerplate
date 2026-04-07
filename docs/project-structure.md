# Project Structure & Architecture

**Last Updated**: April 7, 2026  
**Version**: 1.0.0

---

## Complete Directory Structure

```
test-api/
├── src/
│   ├── app.controller.ts          # Root controller
│   ├── app.service.ts             # Root service
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Application entry point
│   ├── modules/                   # Feature modules
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── enums/
│   │   │   ├── exceptions/
│   │   │   ├── factories/
│   │   │   ├── interfaces/
│   │   │   ├── validators/
│   │   │   └── users.spec.ts
│   │   └── products/
│   │       └── [same structure as users]
│   ├── common/                    # Reusable components
│   │   ├── bases/                 # Base classes
│   │   │   ├── base.exception.ts
│   │   │   ├── base.repository.ts
│   │   │   ├── base.dto.ts
│   │   │   └── base.entity.ts
│   │   ├── constants/             # App constants
│   │   │   ├── http.constants.ts
│   │   │   ├── regex.constants.ts
│   │   │   ├── messages.constants.ts
│   │   │   └── validation.constants.ts
│   │   ├── decorators/            # Custom decorators
│   │   │   ├── public.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   ├── current-user.decorator.ts
│   │   │   └── throttle.decorator.ts
│   │   ├── exceptions/            # Custom exceptions
│   │   │   ├── auth.exceptions.ts
│   │   │   ├── user.exceptions.ts
│   │   │   ├── database.exceptions.ts
│   │   │   ├── validation.exceptions.ts
│   │   │   ├── external.exceptions.ts
│   │   │   └── index.ts
│   │   ├── factories/             # Test data factories
│   │   │   ├── user.factory.ts
│   │   │   ├── product.factory.ts
│   │   │   └── index.ts
│   │   ├── filters/               # Exception filters
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── all-exceptions.filter.ts
│   │   │   └── index.ts
│   │   ├── guards/                # Route guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   ├── optiona l-jwt.guard.ts
│   │   │   └── index.ts
│   │   ├── interceptors/          # HTTP interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── index.ts
│   │   ├── interfaces/            # TS interfaces
│   │   │   ├── paginated.interface.ts
│   │   │   ├── request-user.interface.ts
│   │   │   ├── api-response.interface.ts
│   │   │   └── index.ts
│   │   ├── middlewares/           # Express middleware
│   │   │   ├── logger.middleware.ts
│   │   │   ├── cors.middleware.ts
│   │   │   └── index.ts
│   │   ├── pipes/                 # Validation pipes
│   │   │   ├── validation.pipe.ts
│   │   │   ├── parse-int.pipe.ts
│   │   │   └── index.ts
│   │   ├── processors/            # Background processors
│   │   │   ├── email.processor.ts
│   │   │   ├── notification.processor.ts
│   │   │   └── index.ts
│   │   ├── utils/                 # Utility functions
│   │   │   ├── logger.util.ts
│   │   │   ├── crypto.util.ts
│   │   │   ├── password.util.ts
│   │   │   ├── email.util.ts
│   │   │   ├── date.util.ts
│   │   │   ├── pagination.util.ts
│   │   │   └── index.ts
│   │   ├── validators/            # Custom validators
│   │   │   ├── email.validator.ts
│   │   │   ├── password-strength.validator.ts
│   │   │   ├── unique.validator.ts
│   │   │   ├── phone.validator.ts
│   │   │   └── index.ts
│   │   └── common.module.ts       # Common module definition
│   ├── database/                  # Database configuration
│   │   ├── drizzle/
│   │   │   ├── schema.ts          # Table definitions
│   │   │   └── migrations/        # SQL migrations
│   │   ├── seeds/
│   │   │   └── seed.ts            # Seed script
│   │   └── database.module.ts
│   ├── config/                    # Configuration
│   │   ├── database.config.ts
│   │   ├── app.config.ts
│   │   ├── auth.config.ts
│   │   └── validation.ts
│   └── types/                     # TypeScript types
│       ├── index.ts
│       └── custom-types.ts
├── test/                          # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── docs/                          # Documentation
│   ├── project-structure.md       # This file
│   ├── exceptions.md              # Exception handling
│   ├── environment.md             # Environment vars
│   ├── testing.md                 # Testing standards
│   ├── api.md                     # API documentation
│   ├── database.md                # Database schema
│   ├── patterns.md                # Code patterns
│   └── findings.md                # Auto-updated discoveries
├── src/app.controller.spec.ts
├── src/app.controller.ts
├── src/app.module.ts
├── src/app.service.ts
├── src/main.ts
├── agent.md                       # Agent guidelines
├── drizzle.config.ts              # Drizzle ORM config
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.build.json
├── tsconfig.json
├── tsconfig.seed.json
└── .env.example
```

---

## Folder Organization by Type

### Feature Module Structure

Each feature module (e.g., `users/`, `products/`) contains:

**Core Files**:
- `{feature}.module.ts` — NestJS module definition
- `{feature}.controller.ts` — HTTP route handlers
- `{feature}.service.ts` — Business logic
- `{feature}.repository.ts` — Database access layer
- `{feature}.spec.ts` — Unit tests

**Subdirectories**:
- `dto/` — Data Transfer Objects
  - `create-{feature}.dto.ts`
  - `update-{feature}.dto.ts`
  - `query-{feature}.dto.ts`
- `entities/` — Database entity types
  - `{feature}.entity.ts`
- `enums/` — TypeScript enums
  - `{feature}-status.enum.ts`
- `exceptions/` — Feature-specific exceptions
  - `{feature}.exceptions.ts`
- `factories/` — Test data factories
  - `{feature}.factory.ts`
- `interfaces/` — TypeScript interfaces
  - `{feature}.interface.ts`
- `validators/` — Custom validators
  - `{feature}.validator.ts`

### Common Module Structure

Organized by functionality (not feature):

| Folder | Purpose | Examples |
|--------|---------|----------|
| `bases/` | Base classes for reuse | `BaseException`, `BaseRepository`, `BaseDTO`, `BaseEntity` |
| `constants/` | Application constants | HTTP codes, regex patterns, validation rules, error messages |
| `decorators/` | Custom decorators | `@Public()`, `@Roles()`, `@CurrentUser()`, `@Throttle()` |
| `exceptions/` | Global exception hierarchy | Auth, User, Database, Validation, External exception classes |
| `factories/` | Test data factories | User factory, Product factory for unit/E2E tests |
| `filters/` | Exception filters | `HttpExceptionFilter`, `AllExceptionsFilter` for global error handling |
| `guards/` | Route guards | JWT authentication, role-based access, throttling |
| `interceptors/` | HTTP interceptors | Logging, response transformation, timeout, error handling |
| `interfaces/` | Reusable interfaces | `IPaginated`, `IRequestUser`, `IApiResponse` |
| `middlewares/` | Express middleware | Logger, CORS, Helmet configuration |
| `pipes/` | Validation pipes | Custom parse pipes, validation transformation |
| `processors/` | Background processors | Email sending, notifications, queue jobs |
| `utils/` | Utility functions | Logger, crypto, password hashing, email validation, pagination |
| `validators/` | Custom validators | Email validator, password strength, unique field constraint |

### Database Module Structure

```
database/
├── drizzle/
│   ├── schema.ts              # All table definitions
│   └── migrations/            # Generated SQL migrations
│       ├── 0001_init.sql
│       ├── 0002_add_users.sql
│       └── meta/
├── seeds/
│   └── seed.ts                # Database seeding
└── database.module.ts         # Database provider setup
```

### Config Module Structure

```
config/
├── database.config.ts         # Database URL, pool settings
├── app.config.ts              # App port, environment, debug settings
├── auth.config.ts             # JWT secrets, token expiry
└── validation.ts              # Joi/class-validator schemas
```

---

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Module | `{feature}.module.ts` | `users.module.ts`, `products.module.ts` |
| Controller | `{feature}.controller.ts` | `users.controller.ts` |
| Service | `{feature}.service.ts` | `users.service.ts` |
| Repository | `{feature}.repository.ts` | `users.repository.ts` |
| DTO | `{action}-{feature}.dto.ts` | `create-user.dto.ts`, `update-user.dto.ts` |
| Entity | `{feature}.entity.ts` | `user.entity.ts` |
| Enum | `{feature}-{type}.enum.ts` | `user-role.enum.ts`, `user-status.enum.ts` |
| Filter | `{name}.filter.ts` | `http-exception.filter.ts`, `all-exceptions.filter.ts` |
| Guard | `{name}.guard.ts` | `jwt-auth.guard.ts`, `roles.guard.ts` |
| Interceptor | `{name}.interceptor.ts` | `logging.interceptor.ts`, `timeout.interceptor.ts` |
| Pipe | `{name}.pipe.ts` | `validation.pipe.ts`, `parse-int.pipe.ts` |
| Decorator | `{name}.decorator.ts` | `public.decorator.ts`, `current-user.decorator.ts` |
| Validator | `{name}.validator.ts` | `email.validator.ts`, `unique.validator.ts` |
| Test | `{feature}.spec.ts` | `users.spec.ts`, `authentication.spec.ts` |

### Classes & Functions

| Type | Pattern | Example |
|------|---------|---------|
| Classes | PascalCase | `UserService`, `CreateUserDto`, `JwtAuthGuard` |
| Methods | camelCase | `findById()`, `validateEmail()`, `sendWelcomeEmail()` |
| Constants | UPPER_SNAKE_CASE | `DATABASE_URL`, `MAX_RETRIES`, `JWT_SECRET` |
| Functions | camelCase | `hashPassword()`, `formatDate()`, `paginate()` |
| Variables | camelCase | `userId`, `userData`, `isActive` |
| Interfaces | PascalCase + I prefix (optional) | `IRequestUser`, `IPaginated`, `IApiResponse` |
| Enums | PascalCase | `UserRole`, `UserStatus`, `HttpStatus` |

---

## Decorator Order (Critical)

### Class-Level Decorators

```typescript
@ApiTags('users')                          // 1. Swagger - grouping
@Controller('users')                       // 2. Route - path
@UseGuards(JwtAuthGuard)                   // 3. Guards - authentication
@UseInterceptors(LoggingInterceptor)       // 4. Interceptors - logging/transformation
@UsePipes(new ValidationPipe())            // 5. Pipes - validation
export class UsersController {
  // Methods follow order below
}
```

### Method-Level Decorators

```typescript
@ApiOperation({ summary: 'Create user' })              // 1. Swagger - operation
@ApiResponse({ status: 201, type: UserDto })          // 2. Swagger - response docs
@Post()                                                 // 3. HTTP method
@HttpCode(HttpStatus.CREATED)                          // 4. Status override
@UseGuards(JwtAuthGuard)                               // 5. Guards - endpoint-specific
@UseInterceptors(LoggingInterceptor)                   // 6. Interceptors - endpoint-specific
@UsePipes(new ValidationPipe())                        // 7. Pipes - endpoint-specific
async create(
  @Body() dto: CreateUserDto,
  @CurrentUser() user: User,
): Promise<UserDto> {
  // Implementation
}
```

**Order Summary**: Swagger → HTTP → Guards → Interceptors → Pipes

---

## Module Architecture

### Feature Module Example: Users

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  imports: [DatabaseModule],              // Only import needed modules
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],                // Export for other modules
})
export class UsersModule {}
```

### Common Module

```typescript
// common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Global()
@Module({
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
  exports: [],
})
export class CommonModule {}
```

### Root Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    DatabaseModule,
    UsersModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## Data Flow

### Request → Response Flow

```
HTTP Request
    ↓
Middleware (Logger, CORS, etc.)
    ↓
Guard (Authentication, Authorization)
    ↓
Pipe (Validation, Transformation)
    ↓
Interceptor (Before - Logging)
    ↓
Controller (Route handler)
    ↓
Service (Business logic)
    ↓
Repository (Database access)
    ↓
Database (Query execution)
    ↓
Interceptor (After - Response transformation)
    ↓
Filter (Exception handling if error)
    ↓
HTTP Response
```

### Error Handling Flow

```
Exception thrown
    ↓
Caught by Guard → HttpException (403/401)
    ↓
Caught by Pipe → BadRequestException (400)
    ↓
Caught by Service → Custom exceptions
    ↓
Caught by Filter (HttpExceptionFilter)
    ↓
Format error response (no stack traces)
    ↓
Log error (with stack trace internally)
    ↓
Send to client (safe JSON response)
```

---

## Import Paths (Path Aliases)

Use path aliases defined in `tsconfig.json`:

```typescript
// ✅ Correct - Use path aliases
import { UserService } from '@modules/users/users.service';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { Database } from '@database/database.module';
import { AppConfig } from '@config/app.config';
import { PUBLIC_KEY } from '@constants/auth.constants';
import { UserException } from '@exceptions/user.exceptions';

// ❌ Avoid - Relative paths
import { UserService } from '../../../../modules/users/users.service';
import { ValidationPipe } from '../../../common/pipes/validation.pipe';
```

### Available Aliases

| Alias | Maps To | Usage |
|-------|---------|-------|
| `@/*` | `src/*` | General imports |
| `@modules/*` | `src/modules/*` | Feature modules |
| `@common/*` | `src/common/*` | Shared utilities |
| `@database/*` | `src/database/*` | Database (Drizzle) |
| `@config/*` | `src/config/*` | Configuration |
| `@types/*` | `src/types/*` | TypeScript types |
| `@decorators/*` | `src/common/decorators/*` | Decorators |
| `@exceptions/*` | `src/common/exceptions/*` | Exception classes |
| `@filters/*` | `src/common/filters/*` | Exception filters |
| `@guards/*` | `src/common/guards/*` | Route guards |
| `@interceptors/*` | `src/common/interceptors/*` | HTTP interceptors |
| `@middlewares/*` | `src/common/middlewares/*` | Middleware |
| `@pipes/*` | `src/common/pipes/*` | Validation pipes |
| `@validators/*` | `src/common/validators/*` | Custom validators |
| `@utils/*` | `src/common/utils/*` | Utility functions |
| `@interfaces/*` | `src/common/interfaces/*` | Interfaces |
| `@constants/*` | `src/common/constants/*` | Constants |
| `@factories/*` | `src/common/factories/*` | Test factories |
| `@bases/*` | `src/common/bases/*` | Base classes |
| `@migrations/*` | `src/database/migrations/*` | Database migrations |
| `@generated/*` | `src/generated/*` | Generated code |
| `@test/*` | `test/*` | E2E tests |

---

## Best Practices

### Service Layer
- Keep services focused on business logic only
- Inject dependencies via constructor
- Use dependency injection for all external services
- Return DTOs, never entities
- Throw custom exceptions for errors
- Keep methods short and testable

### Repository Layer
- Handle all database queries
- Return entities or null (never throw)
- Keep queries simple and reusable
- Accept filter/pagination objects
- Always use prepared statements
- Never hardcode values

### Controller Layer
- Map between routes and services
- Handle request validation (via pipes/DTOs)
- Catch service exceptions and convert to HTTP responses
- Return DTOs, never entities
- Use Swagger decorators for documentation
- Keep logic minimal (delegate to service)

### Exception Handling
- ✅ Always use custom exceptions for domain logic
- ✅ Never leak stack traces to clients
- ✅ Log full errors (with stack) internally
- ✅ Send safe, sanitized responses to clients
- ✅ Use appropriate HTTP status codes
- ❌ Never expose database errors to clients
- ❌ Never expose file paths in error messages
- ❌ Never expose API secrets in errors

### Testing
- Write unit tests for services (mock repositories)
- Write integration tests for repositories (real DB)
- Write E2E tests only for critical endpoints
- Test happy paths and error scenarios
- Aim for 70%+ coverage on business logic
- See `/docs/testing.md` for complete guidelines

---

## File Import Order Convention

Within each file, import order should be:

1. Node.js built-ins
2. External libraries (NestJS, third-party)
3. Local imports (absolute paths with aliases)
4. Relative imports (should be minimal)

```typescript
// 1. Built-ins
import { randomUUID } from 'crypto';

// 2. External
import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';

// 3. Local (absolute paths)
import { UserService } from '@modules/users/users.service';
import { UserException } from '@exceptions/user.exceptions';
import { USER_ROLES } from '@constants/auth.constants';

// 4. Relative (minimal)
import { CreateUserDto } from './dto/create-user.dto';
```

---

## Documentation Files Reference

| File | Purpose |
|------|---------|
| `/docs/project-structure.md` | This file - complete architecture guide |
| `/docs/exceptions.md` | Exception handling best practices & patterns |
| `/docs/testing.md` | Jest unit/integration/E2E testing standards |
| `/docs/environment.md` | Environment variables & configuration |
| `/docs/api.md` | API endpoints & Swagger documentation |
| `/docs/database.md` | Drizzle schema & migration procedures |
| `/docs/patterns.md` | Common code patterns & examples |
| `/docs/findings.md` | Auto-updated discoveries & decisions |

---

## Environment Setup

Refer to `/docs/environment.md` for:
- Required environment variables
- `.env.example` template
- `.env.staging` and `.env.production` setup
- Runtime validation
- Database connection strings

---

## Next Steps

1. **Review** this structure guide
2. **Reference** path aliases in all imports
3. **Follow** decorator order (Swagger → HTTP → Guards → Interceptors → Pipes)
4. **Use** feature modules for scalability
5. **Keep** common module organized by functionality
6. **Read** specific documentation files (`/docs/exceptions.md`, `/docs/testing.md`, etc.)
7. **Ask** questions if structure is unclear

