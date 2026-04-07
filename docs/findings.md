# Findings & Architecture Decisions

**Last Updated**: April 7, 2026  
**Version**: 1.0.0

---

## Overview

This document tracks discoveries, decisions, and lessons learned during development. Auto-updated as new patterns are discovered.

---

## Architecture Decisions

### DECIDED: 22 Path Aliases for Import Organization

**Decision**: Configured 22 path aliases in `tsconfig.json` to organize imports by functionality, not directory depth.

**Aliases**:
- `@/*` → `src/*` (general imports)
- `@modules/*` → `src/modules/*` (feature modules)
- `@common/*` → `src/common/*` (shared utilities)
- `@database/*` → `src/database/*` (database layer)
- `@config/*` → `src/config/*` (configuration)
- `@types/*` → `src/types/*` (TypeScript types)
- `@decorators/*`, `@exceptions/*`, `@filters/*`, `@guards/*`, `@interceptors/*`, `@middlewares/*`, `@pipes/*`, `@validators/*`, `@utils/*`, `@interfaces/*`, `@constants/*`, `@factories/*`, `@bases/*` (common subfolders)
- `@migrations/*` → `src/database/migrations/*` (database migrations)
- `@generated/*` → `src/generated/*` (auto-generated code)
- `@test/*` → `test/*` (E2E tests)

**Benefit**: No more relative paths like `../../../`, clear origin of imports, IDE autocomplete works.

**Reference**: `tsconfig.json` compilerOptions.paths

---

### DECIDED: 18 Component Types in Common Module

**Decision**: Organized common module into 18 focused subdirectories instead of one large folder.

**Component Types**:
1. `bases/` - Base classes (BaseException, BaseRepository, BaseDTO, BaseEntity)
2. `constants/` - Application constants (HTTP codes, regex, validation rules)
3. `decorators/` - Custom decorators (@Public, @Roles, @CurrentUser, @Throttle)
4. `exceptions/` - Exception hierarchy (AuthExceptions, UserExceptions, etc.)
5. `factories/` - Test data factories
6. `filters/` - Exception filters (HttpExceptionFilter, AllExceptionsFilter)
7. `guards/` - Route guards (JwtAuthGuard, RolesGuard, etc.)
8. `interceptors/` - HTTP interceptors (LoggingInterceptor, TimeoutInterceptor)
9. `interfaces/` - Reusable TypeScript interfaces (IPaginated, IRequestUser)
10. `middlewares/` - Express middlewares (LoggerMiddleware, CorsMiddleware)
11. `pipes/` - Validation pipes (ValidationPipe, ParseIntPipe)
12. `processors/` - Background job processors
13. `utils/` - Utility functions (Logger, Crypto, Password, Pagination)
14. `validators/` - Custom validators (EmailValidator, PasswordStrength)
15. `repositories/` - *Reserved for base repository patterns*
16. `services/` - *Reserved for shared services*
17. `mappers/` - *Reserved for DTO/entity mappers*

**Benefit**: Easy to locate components, prevents mega-folders, encourages modular thinking.

**Reference**: `src/common/` directory structure

---

### DECIDED: Decorator Order (Class & Method Level)

**Decision**: Established strict decorator ordering to maintain consistency.

**Class Level Order**:
1. Swagger: `@ApiTags()`
2. Route: `@Controller()`, `@Module()`
3. Guards: `@UseGuards()`
4. Interceptors: `@UseInterceptors()`
5. Pipes: `@UsePipes()`

**Method Level Order**:
1. Swagger: `@ApiOperation()`, `@ApiResponse()`
2. HTTP: `@Get()`, `@Post()`, `@HttpCode()`
3. Guards: `@UseGuards()`
4. Interceptors: `@UseInterceptors()`
5. Pipes: `@UsePipes()`

**Benefit**: Predictable code structure, easier to read, consistent across codebase.

**Reference**: `/docs/project-structure.md#decorator-order`, `agent.md`

---

### DECIDED: Never Leak Stack Traces to Clients

**Decision**: All error responses sent to clients must be safe, structured JSON with no stack traces, file paths, or internal details.

**Pattern**:
```typescript
// Client receives (safe)
{
  "statusCode": 500,
  "message": "An error occurred processing your request",
  "error": "Internal Server Error",
  "timestamp": "2026-04-07T10:30:45.123Z",
  "path": "/api/users"
}

// Logged internally (full details)
{
  "timestamp": "2026-04-07T10:30:45.123Z",
  "level": "error",
  "message": "Database query failed",
  "stack": "Error: connection refused\n  at ...",
  "context": "UserRepository",
  "userId": 123,
  "query": "SELECT * FROM users WHERE id = $1"
}
```

**Benefit**: Security (no information leakage), consistency, better debugging (internal logs have full details).

**Reference**: `/docs/exceptions.md`, `src/common/filters/`

---

### DECIDED: Environment Variables Never Hardcoded

**Decision**: All configuration that varies by environment comes from `process.env` with validation at startup.

**Categories**:
- **Secrets** (never commit): API keys, passwords, JWT secrets
- **Configuration** (varies per env): Database URL, ports, log levels, feature flags
- **Constants** (rarely change): Default timeouts, max retry counts

**Validation**:
```typescript
function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

**Benefit**: Different configs per environment, no accidental secret commits, clear requirements.

**Reference**: `/docs/environment.md`, `.env.example`

---

### DECIDED: Exception Hierarchy with BaseException

**Decision**: Created custom exception hierarchy extending BaseException for domain-specific errors.

**Hierarchy**:
```
BaseException (abstract)
├── AuthException (401 Unauthorized)
│   ├── InvalidCredentialsException
│   └── TokenExpiredException
├── UserException (400/409)
│   ├── UserNotFoundException
│   └── DuplicateEmailException
├── DatabaseException (500)
├── ValidationException (400)
└── ExternalException (503)
```

**Benefits**: Type-safe error handling, specific HTTP status codes, domain-specific logic.

**Reference**: `/docs/exceptions.md`, `src/common/exceptions/`

---

## Development Patterns Discovered

### PATTERN: Service Returns DTO, Never Entity

**Discovery**: Services should always return DTOs to clients, never database entities. This prevents:
- Exposing internal database fields
- Breaking API contracts when schema changes
- Returning sensitive fields accidentally

**Pattern**:
```typescript
// ✅ Correct
async getUser(id: number): Promise<UserDto> {
  const user = await this.repository.findById(id);
  return this.mapToDto(user); // Remove sensitive fields
}

// ❌ Wrong
async getUser(id: number): Promise<User> {
  return this.repository.findById(id); // Exposes passwordHash, etc.
}
```

**Where Used**: All service methods, all controllers

---

### PATTERN: Repository Returns Entity or Null

**Discovery**: Repositories should never throw exceptions or validate business logic. Their job is purely data access.

**Pattern**:
```typescript
// ✅ Correct (repository)
async findById(id: number): Promise<User | null> {
  return this.db.query.users.findFirst({ where: eq(users.id, id) });
}

// ✅ Correct (service)
async getUser(id: number): Promise<UserDto> {
  const user = await this.repository.findById(id);
  if (!user) {
    throw new NotFoundException(); // Service decides what to do
  }
  return this.mapToDto(user);
}

// ❌ Wrong (repository shouldn't validate)
async findById(id: number): Promise<User> {
  const user = await this.db.query.users.findFirst(...);
  if (!user) throw new NotFoundException(); // Wrong layer
  return user;
}
```

**Where Used**: All repositories, all services

---

### PATTERN: Pagination Metadata

**Discovery**: Paginated responses should include metadata for client UI navigation.

**Pattern**:
```typescript
// Response format
{
  "data": [...items],
  "meta": {
    "total": 100,      // Total items in database
    "page": 1,         // Current page (1-indexed)
    "limit": 10,       // Items per page
    "pages": 10        // Total pages available
  }
}
```

**Benefits**: Client can build pagination UI, show total counts, handle boundary cases.

**Reference**: `/docs/api.md#pagination`, `/docs/patterns.md`

---

## Testing Discoveries

### DISCOVERY: Test-First Approach for Endpoints

**Finding**: Writing tests before implementation catches bugs and clarifies requirements.

**Workflow**:
1. Write controller tests (mock service)
2. Write service tests (mock repository)
3. Write repository tests (mock DB)
4. Implement features

**Benefits**: Clear specifications, fewer bugs, easier refactoring.

**Reference**: `/docs/testing.md`

---

## Performance Notes

### NOTE: N+1 Query Prevention

**Pattern**: Use Drizzle's `with` clause to load relationships in a single query.

**Bad**:
```typescript
const users = await db.query.users.findMany();
for (const user of users) {
  user.posts = await db.query.posts.findMany({ where: eq(posts.userId, user.id) });
}
// N+1 queries: 1 for users + N for each user's posts
```

**Good**:
```typescript
const users = await db.query.users.findMany({
  with: {
    posts: true, // All posts loaded in single query
  },
});
```

**Reference**: `/docs/database.md#relationships`

---

## Documentation Decisions

### DECIDED: Comprehensive Documentation Structure

**Decision**: Create 8 documentation files covering all aspects of the project.

**Files**:
1. `/docs/project-structure.md` - Architecture & file organization (this doc)
2. `/docs/exceptions.md` - Exception handling best practices (600+ lines)
3. `/docs/testing.md` - Jest/unit/integration/E2E testing standards (500+ lines)
4. `/docs/environment.md` - Environment variables & configuration
5. `/docs/api.md` - API endpoints, status codes, examples
6. `/docs/database.md` - Drizzle schema, migrations, seeding
7. `/docs/patterns.md` - Common code patterns & templates
8. `/docs/findings.md` - This file, decisions & discoveries

**Benefits**: Single source of truth for all patterns, reduced duplication, easy onboarding.

---

## Open Questions & Future Decisions

1. **Caching Strategy**: Should we implement Redis caching for frequently accessed data?
2. **Event Sourcing**: Should we implement event sourcing for audit trails?
3. **GraphQL**: Should we add GraphQL alongside REST API?
4. **Microservices**: Should we split into microservices as app grows?

---

## Lessons Learned

1. ✅ Clear decorator order prevents bugs and improves readability
2. ✅ Strict layering (controller → service → repository) makes code testable and maintainable
3. ✅ DTOs protect API contracts from internal schema changes
4. ✅ Documentation reduces onboarding time and prevents mistakes
5. ✅ Path aliases make code more readable than relative paths
6. ✅ Comprehensive exception handling improves security and UX
7. ✅ Type safety catches errors at compile time, not runtime
8. ✅ Pagination metadata improves UX and performance

---

## Contributors

- Initial Setup: April 7, 2026
- Architecture Expansion: April 7, 2026

---

## References

- [Project Structure](./project-structure.md)
- [Exception Handling](./exceptions.md)
- [Testing Standards](./testing.md)
- [Environment Configuration](./environment.md)
- [API Documentation](./api.md)
- [Database Schema](./database.md)
- [Code Patterns](./patterns.md)

