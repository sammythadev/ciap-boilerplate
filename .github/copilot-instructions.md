# Copilot Instructions

You are an expert coding agent specialized in NestJS v11 with TypeScript, Drizzle ORM, and PostgreSQL. Your role is to maintain code quality, architectural patterns, and project consistency.

## Project Context

- **Framework**: NestJS v11 + TypeScript
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: NeonDB (serverless PostgreSQL)
- **Package Manager**: pnpm (exclusive)
- **API Documentation**: Swagger/OpenAPI

## Core Principles

1. **Minimize Impact**: Only touch what's necessary. No side effects, no unnecessary refactoring.
2. **No Laziness**: Avoid shortcuts. Use proper typing, follow patterns, implement completely.
3. **Simplicity First**: Choose the clearest, most maintainable solution.
4. **Type Safety**: Limit `any` types. Use proper types everywhere. Leverage TypeScript strictly.
5. **SOLID Principles**: Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion.
6. **Research First**: Always verify with latest documentation. Never assume API usage or dependency patterns.

## Documentation & Tools Research

### When Adding New Dependencies
**Always research before implementing:**
- Fetch official documentation from the library's repository
- Check official examples and usage patterns
- Verify the version installed matches documentation
- Review recent issues/discussions for known patterns
- Look for TypeScript/type definitions if needed

### Example: Adding OAuth2
```
❌ Don't: Assume how to implement OAuth2 based on memory
✅ Do: 
  1. Identify the OAuth2 library (e.g., `@nestjs/passport`, `passport-oauth2`)
  2. Fetch official documentation for that *exact* version
  3. Find official examples from the library repo
  4. Check TypeScript types and interfaces
  5. Verify with the latest GitHub issues/discussions
  6. Implement based on verified documentation
```

### Documentation Sources (In Priority Order)
1. **Official Library Repository** — GitHub repo's README and docs/
2. **Official Documentation Site** — Library's dedicated docs
3. **NPM Package Page** — Links to docs and examples
4. **Official Examples** — Example implementations in repo
5. **TypeScript Definitions** — Check `.d.ts` files for interfaces
6. **Recent GitHub Issues** — Discussions about specific use cases
7. **Community Examples** — Only after verifying official docs

### Research Commands
Use tools to fetch documentation:
- `fetch_webpage` — Download and analyze official docs pages
- `github_repo` — Search for code patterns in official repositories
- `grep_search` — Search workspace for similar implementations
- `semantic_search` — Find related code patterns

### Common Patterns to Research

#### Authentication (OAuth2, JWT)
- Fetch: Official NestJS docs on `@nestjs/passport`
- Fetch: Specific strategy docs (passport-oauth2, passport-jwt)
- Verify: Current version's implementation examples
- Check: TypeScript types for strategy configuration

#### Database Integrations
- Fetch: Drizzle ORM official docs
- Fetch: NeonDB specific connection guides
- Verify: Migration patterns for current version
- Check: Type definitions for schema builders

#### Third-party APIs (Payment, Email, etc.)
- Fetch: Official API documentation
- Fetch: SDK/library documentation if available
- Verify: Authentication methods (API keys, OAuth, tokens)
- Check: Error handling patterns in docs
- Research: Rate limiting and best practices

### Documentation Process

When planning a feature:
```
1. Break down requirement
2. Identify dependencies/tools needed
3. RESEARCH each dependency:
   - Official docs
   - Exact version being used
   - TypeScript types
   - Example implementations
4. Document findings in `/docs/findings.md`
5. Plan implementation based on verified docs
6. Code following the official patterns
7. Test against documented behavior
```

### TypeScript Type Research
- Check package.json version
- Visit `node_modules/@library/index.d.ts`
- Look for exported interfaces
- Verify generic type parameters
- Use IDE IntelliSense to explore types

### Never Assume
❌ **Don't assume:**
- How to configure a library
- Default values or options
- API response structures
- Error handling patterns
- Type definitions
- That type packages (@types/*) are installed

✅ **Always verify from:**
- Official documentation
- Library's own examples
- TypeScript type definitions
- Recent version's releases/changelogs
- package.json for required @types packages

### Import Type vs Runtime Distinction
⚠️ **Critical for TypeScript Strict Mode + emitDecoratorMetadata:**

When using `@Inject` with decorated constructors, distinguish carefully:

**Type-only imports** (for types only, erased at runtime):
```typescript
// ✅ CORRECT: Use import type when only needed for typing
import type { Database } from './database.module';

@Injectable()
export class MyService {
  constructor(@Inject(TOKEN) private db: Database) {}  // Type annotation only
}
```

**Runtime imports** (used with new operator or assignments):
```typescript
// ✅ CORRECT: Regular import for runtime values
import { Pool } from 'pg';  // Used with: new Pool({...})

// ✅ CORRECT: Type-only for types
import type { PoolClient } from 'pg'; // Used only for typing: client: PoolClient
```

**Error to avoid (TS1272)**:
```typescript
// ❌ WRONG: Decorated signature with regular import causes TS1272
import { Database } from './database.module';

@Injectable()
export class MyService {
  constructor(@Inject(TOKEN) private db: Database) {}  // Error TS1272
}

// ✅ FIX: Use import type for decorated signatures
import type { Database } from './database.module';
```

## Code Standards

### Naming Conventions
- **Classes**: PascalCase (e.g., `UserService`, `CreateUserDto`)
- **Functions/Methods**: camelCase (e.g., `getUserById`, `validateEmail`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DATABASE_URL`, `MAX_RETRIES`)
- **Files**: kebab-case for most files (e.g., `user.service.ts`, `create-user.dto.ts`)
- **Folders**: kebab-case (e.g., `src/users`, `src/common`)

### Module Structure
```
src/
├── modules/           # Feature modules
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── enums/
│   │   ├── exceptions/
│   │   ├── factories/
│   │   ├── interfaces/
│   │   ├── processors/
│   │   ├── services/
│   │   ├── validators/
│   │   └── [*.spec.ts tests]
│   └── products/
├── common/            # Shared/reusable code
│   ├── bases/         # Base classes
│   ├── constants/     # App constants
│   ├── decorators/    # Custom decorators
│   ├── exceptions/    # Custom exceptions
│   ├── factories/     # Object factories
│   ├── filters/       # Exception filters
│   ├── guards/        # Route guards
│   ├── interceptors/  # HTTP interceptors
│   ├── interfaces/    # TypeScript interfaces
│   ├── middlewares/   # Express middleware
│   ├── pipes/         # Validation pipes
│   ├── processors/    # Background job processors
│   ├── utils/         # Utility functions
│   ├── validators/    # Custom validators
│   └── common.module.ts
├── database/          # Database configuration
│   ├── drizzle/
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── seeds/
│   └── database.module.ts
├── config/            # Configuration
│   ├── database.config.ts
│   ├── app.config.ts
│   └── validation.ts
├── types/             # TypeScript types
├── generated/         # Generated code (DO NOT EDIT)
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

**See `/docs/project-structure.md` for complete details on:**
- All folder purposes (decorators, entities, enums, exceptions, factories, filters, guards, pipes, interceptors, interfaces, middlewares, processors, repositories, services, utils, validations, bases, constants)
- File organization patterns
- Decorator order for classes and methods
- Path aliases (20+ aliases)
- Data flow diagrams

### Decorator Order (NestJS Classes)
```typescript
@Controller('users')
@UseInterceptors(...)
@UseGuards(...)
@UsePipes(...)
export class UsersController {
  @Post()
  @UseInterceptors(...)
  @UseGuards(...)
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {}
}
```

Order: `@Controller / @Module / @Injectable` → `@UseInterceptors` → `@UseGuards` → `@UsePipes`

### Path Aliases (tsconfig.json)
```json
"paths": {
  "@app/*": ["src/*"],
  "@/*": ["src/*"],
  "@modules/*": ["src/modules/*"],
  "@common/*": ["src/common/*"],
  "@database/*": ["src/database/*"],
  "@config/*": ["src/config/*"],
  "@types/*": ["src/types/*"],
  "@decorators/*": ["src/common/decorators/*"],
  "@exceptions/*": ["src/common/exceptions/*"],
  "@filters/*": ["src/common/filters/*"],
  "@guards/*": ["src/common/guards/*"],
  "@interceptors/*": ["src/common/interceptors/*"],
  "@middlewares/*": ["src/common/middlewares/*"],
  "@pipes/*": ["src/common/pipes/*"],
  "@validators/*": ["src/common/validators/*"],
  "@utils/*": ["src/common/utils/*"],
  "@interfaces/*": ["src/common/interfaces/*"],
  "@constants/*": ["src/common/constants/*"],
  "@factories/*": ["src/common/factories/*"],
  "@bases/*": ["src/common/bases/*"],
  "@migrations/*": ["src/database/migrations/*"],
  "@generated/*": ["src/generated/*"],
  "@test/*": ["test/*"]
}
```

### Type Safety Rules
- **No implicit `any`**: `strictNullChecks: true`, `noImplicitAny: true`
- **DTOs**: Always use Data Transfer Objects for request/response bodies
  - Use TypeScript non-null assertion operator `!` for required DTO properties with initializers
  - Example: `email!: string;` (tells TypeScript this is required and will be initialized via deserialization)
  - Optional properties use `?`: `description?: string;`
  - Never declare required DTO properties without `!` or a default initializer
- **Entities**: Separate from DTOs. Use proper typing for database entities.
- **Return Types**: Always specify explicit return types for functions/methods
- **Errors**: Use custom exception classes extending `HttpException`

## Package Management & Dependencies

### Drizzle ORM + PostgreSQL

#### Required Dependencies
- `drizzle-orm` - ORM framework
- `pg` - PostgreSQL client driver (required by Drizzle)
- `@neondatabase/serverless` - NeonDB serverless adapter
- `drizzle-kit` - CLI for migrations (devDependency)

#### Standard Drizzle ORM Practices

**1. Schema-First Approach**
- Define ALL tables and relations in `src/database/drizzle/schema.ts`
- This is the single source of truth for database structure
- Seed data constants should be in the schema file, not service files
- Use `export type` with `$inferSelect` and `$inferInsert` for type safety

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const SEED_DATA: NewUser[] = [{ email: '...', /* ... */ }];
```

**2. Database Module Typing**
- Import schema as namespace: `import * as schema from './drizzle/schema'`
- Pass schema to drizzle: `drizzle(pool, { schema })`
- Export typed Database: `export type Database = NodePgDatabase<typeof schema>;`
- Provides full IDE autocomplete and compile-time validation

```typescript
export type Database = NodePgDatabase<typeof schema>;

const db = drizzle(pool, { schema });
return db as Database;
```

**3. Service Injection**
- Inject Database as typed provider: `@Inject(DATABASE_PROVIDER) private db: Database`
- All queries are type-safe and validated
- No `any` types needed

**4. Seed Data Management**
- Define seed data in schema.ts: `export const SEED_USERS: NewUser[] = [...]`
- Import and use in seed service
- Make seeding idempotent (check before inserting)
- Respect foreign key constraints (delete in reverse order)

**5. Query Security**
- Always verify** `pg` and `@neondatabase/serverless` are in package.json before using Drizzle
- **Database connection**: Pass schema to drizzle for type inference
- **NEVER hardcode URLs**: Always use `process.env.DATABASE_URL` with runtime validation
- Use typed queries (no raw SQL unless necessary)
- Use `sql` helper for raw queries when needed

## Environment Variables Management

### ⚠️ CRITICAL RULE: Never Hardcode Environment-Dependent Values

**Forbidden Examples**:
```typescript
❌ const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
❌ const API_KEY = 'sk-1234567890abcdef';
❌ const SMTP_PASSWORD = 'mySecurePassword123';
❌ const PORT = 3000;
❌ const FRONTEND_URL = 'http://localhost:3000';
❌ const LOG_LEVEL = 'debug';
```

**Correct Approach**:
```typescript
✅ const DATABASE_URL = process.env.DATABASE_URL;
✅ const API_KEY = process.env.API_KEY;
✅ const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
✅ const PORT = process.env.PORT || 3000;
✅ const FRONTEND_URL = process.env.FRONTEND_URL;
✅ const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
```

### Environment Variable Documentation

**For EVERY new environment variable used in code:**

1. **Update `.env.example`** — Template with placeholder values
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   API_KEY=your-api-key-here
   SMTP_PASSWORD=your-email-password
   PORT=3000
   FRONTEND_URL=http://localhost:3000
   LOG_LEVEL=info
   ```

2. **Document in `/docs/environment.md`** — Complete reference including:
   - Variable name
   - Description
   - Required (yes/no)
   - Default value
   - Example value
   - When it's used
   - Security notes (if sensitive)

3. **Create validation schema** (if using @nestjs/config):
   ```typescript
   export const envSchema = Joi.object({
     DATABASE_URL: Joi.string().required(),
     API_KEY: Joi.string().required(),
     PORT: Joi.number().default(3000),
   });
   ```

### Environment Variable Categories

**Secrets** (sensitive, never commit):
- API keys, passwords, tokens
- Database credentials
- Private keys
- JWT secrets
- **Action**: Add to `.gitignore`, document in `.env.example` without real values

**Configuration** (varies by environment):
- Database URL
- URLs (frontend, API endpoints)
- Feature flags
- Log levels
- Timeouts, retries
- **Action**: Different values per (dev, staging, prod)

**Constants** (rarely change):
- PORT, MAX_RETRIES, TIMEOUT
- **Action**: Use ENV vars with sensible defaults: `process.env.PORT || 3000`

### Runtime Validation

**ALWAYS validate environment variables at startup:**

```typescript
// src/config/validation.ts
function validateEnvironment() {
  const required = ['DATABASE_URL', 'API_KEY', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

// src/main.ts
validateEnvironment();
const app = await NestFactory.create(AppModule);
```

**In modules/services:**
```typescript
@Injectable()
export class DatabaseService {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Check your .env file.');
    }
    // Use DATABASE_URL safely
  }
}
```

### Multi-Environment Setup

**Files**:
- `.env` — Development (git-ignored)
- `.env.example` — Template (in git)
- `.env.staging` — Staging (in pipeline)
- `.env.production` — Production (in secrets manager)

**Load correct env file**:
```typescript
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
require('dotenv').config({ path: envFile });
```

**Documentation hierarchy**:
1. `.env.example` shows what vars are needed
2. `/docs/environment.md` documents each variable
3. Runtime validation ensures nothing is missing

### Common Mistakes to Avoid

❌ **Mistake 1**: Checking in `.env` with real values
✅ **Fix**: Add `.env` to `.gitignore`, always commit `.env.example`

❌ **Mistake 2**: Using env vars without validation
✅ **Fix**: Validate all required vars at startup

❌ **Mistake 3**: Hardcoding URLs/keys with "defaults"
✅ **Fix**: Everything comes from process.env, with defaults only for non-critical values

❌ **Mistake 4**: Forgetting to document new env vars
✅ **Fix**: Update `.env.example` AND `/docs/environment.md` with every new var

❌ **Mistake 5**: Different env var names in code vs documentation
✅ **Fix**: Keep names consistent, document all variations

#### Migration Workflow

```bash
# 1. Update schema in src/database/drizzle/schema.ts
# 2. Generate migration (creates file in migrations/)
pnpm run db:generate

# 3. Review generated migration
# 4. Run migration against database
pnpm run db:migrate

# 5. Seed test data (optional)
pnpm run db:seed

# 6. Open Drizzle Studio to verify
pnpm run db:studio
```

### Swagger/OpenAPI Configuration
- **Important**: Check method signatures for `DocumentBuilder` methods
  - `.setContact(name: string, url: string, email: string)` - Requires 3 separate string arguments, NOT an object
  - `.setLicense(name: string, url: string)` - Requires 2 string arguments
  - `.setSecurity(name: string, scheme: SecuritySchemeObject)` - Different from others
- **Always verify** @nestjs/swagger version in package.json and check official docs for method signatures
- **Common mistake**: Passing objects to methods that expect separate arguments

## Workflow for Agent Tasks

### 1. Plan First
- **Research new dependencies** — Fetch official docs for any new libraries/APIs
- Understand the requirement fully
- Break down into atomic steps
- Document assumptions and findings in `/docs/findings.md`
- Verify against official documentation (not assumptions)

### 2. Verify Plan
- Check for architectural consistency
- Review impact on other modules
- Confirm with best practices and official examples
- Validate implementation approach against documentation

### 3. Track Progress
- Use `/docs/findings.md` to document discoveries
- Update `/docs/project-structure.md` when structure changes
- Log new features/patterns in findings.md
- Record documentation sources and verified patterns

### 4. Implement Changes
- Make minimal, focused changes
- Update only affected files
- Maintain consistency with existing patterns
- Follow patterns verified from official documentation

### 5. Document & Capture Lessons
- Add JSDoc comments for public APIs
- Update relevant documentation
- Record decisions in findings.md
- Document which official docs were followed

## Documentation Files

### /docs/testing.md
**CRITICAL FOR TESTING**: Industry-standard Jest guidelines covering:
- Unit testing (services, controllers, repositories)
- Integration testing with real DB interactions
- E2E testing (critical paths only)
- Mocking strategies for consistency
- Edge cases and error handling
- Test isolation patterns
- Coverage standards (70-90% target)
- Endpoint testing workflow (tests first!)
- JSON response validation
- HTTP status code verification
- DTO validation patterns

### /docs/exceptions.md
**CRITICAL FOR ERROR HANDLING**: Best practices for exception management:
- Custom exception hierarchy (BaseException pattern)
- Built-in HTTP exceptions (400, 401, 403, 404, 409, 500, 503)
- Exception filters (global error catching)
- Error response format (safe, no stack traces)
- Stack trace management (logged internally only)
- Logging best practices (what to log, what to hide)
- Try-catch patterns (service, controller, repository layers)
- Common error scenarios with code examples
- Testing exception handling
- **CRITICAL**: Never leak stack traces to client

### /docs/findings.md
Auto-updating log of:
- Wide repository searches and findings
- New feature implementations
- Pattern discoveries
- Architecture decisions

### /docs/project-structure.md
Complete architecture guide including:
- Full directory structure (300+ lines)
- Module organization (common, features)
- File organization by type (DTOs, entities, exceptions, etc.)
- Decorator order for classes and methods
- Path aliases reference (20+ aliases)
- Naming conventions
- Data flow diagrams
- Best practices

### /docs/api.md
- API endpoints and DTOs
- Authentication/authorization flows
- Error handling strategy

### /docs/database.md
- Drizzle schema explanation
- Migration procedures
- NeonDB connection details

### /docs/environment.md
- All environment variables documented
- Required vs optional
- Defaults
- Security notes

## pnpm Scripts (Standard)
```bash
pnpm install          # Install dependencies
pnpm run build        # Build for production
pnpm run start        # Start server
pnpm run start:dev    # Development with watch
pnpm run start:debug  # Debugging mode
pnpm run start:prod   # Production mode
pnpm run lint         # Lint and fix code
pnpm run format       # Format code with Prettier
pnpm run test         # Run unit tests
pnpm run test:watch   # Watch mode
pnpm run test:cov     # Coverage report
pnpm run test:e2e     # E2E tests
pnpm run db:generate  # Generate Drizzle migrations
pnpm run db:migrate   # Run migrations
pnpm run db:studio    # Open Drizzle Studio
pnpm run db:format    # Format SQL
pnpm run db:seed      # Seed database (if added)
```

## Search & Context Strategy

### Limiting Repository Search
- Use specific file patterns (e.g., `src/modules/*/service.ts`)
- Search by feature module first
- Keep findings documented in `/docs/findings.md`
- Avoid full repo scans; be targeted

### Context Management
- Store findings in `/docs/` folder  
- Update project structure map frequently
- Use file-specific documentation
- Reference by path aliases in mentions

## Swagger/OpenAPI Integration

- Controllers should have `@ApiTags()`
- DTOs should have `@ApiProperty()` decorators
- All endpoints documented with `@ApiOperation()` and responses
- Swagger setup at `/api` endpoint
- Use `SwaggerModule` with `DocumentBuilder`

## TypeScript Strictness

Enforce at compilation:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "noImplicitThis": true,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "noImplicitReturns": true
}
```

## Important Constraints

1. **pnpm only**: Never use npm or yarn
2. **NestJS proper patterns**: Dependency injection, modules, decorators
3. **Drizzle ORM**: Use typed schema, migrations tracked in version control
4. **PostgreSQL**: Leverage advanced features (JSONB, arrays, custom types)
5. **No God classes**: Split large modules
6. **Interface-based**: Use interfaces for contracts
7. **Services as singletons**: Leverage NestJS provider pattern
8. **⚠️ NEVER hardcode environment values**: All URLs, keys, secrets, ports from process.env with validation
9. **Environment documentation**: Every env var in code must be in `.env.example` and `/docs/environment.md`
10. **Runtime validation**: Validate all required env vars at application startup

## When Stuck or Creating New Features

**Research First Approach:**
1. **Identify new dependencies or APIs needed** — List all external tools/libraries
2. **Fetch official documentation** — Get latest docs for each dependency
3. **Check current versions** — Verify versions in package.json match docs
4. **Find examples** — Look for official examples in repos
5. **Check TypeScript types** — Review type definitions for safety
6. **Document findings** — Record discoveries in `/docs/findings.md`
7. **Plan implementation** — Design based on verified docs, not assumptions
8. **Check environment requirements** — If feature needs new config/secrets, document in `.env.example` and `/docs/environment.md`

### Testing-First Approach for Endpoints

**ALWAYS generate unit tests BEFORE implementation:**

1. **Plan the endpoint** — Method, path, request/response structure
2. **Write unit tests FIRST** — Controller, service, repository tests (follow `/docs/testing.md`)
3. **Write the implementation** — Make tests pass
4. **Add E2E test ONLY if critical** (not all endpoints)
5. **Validate response structure** — JSON format, HTTP status codes
6. **Verify coverage** — Run `pnpm run test:cov`, aim for 70%+ service/controller

### Endpoint Testing Checklist

When adding new endpoint:
- [ ] Read `/docs/testing.md` for patterns and examples
- [ ] Write controller.spec.ts tests (test happy path + errors)
- [ ] Write service.spec.ts tests (mock repository, test business logic)
- [ ] Write repository.spec.ts tests (mock DB, test queries)
- [ ] Write DTO validation tests if complex validation
- [ ] Run tests: `pnpm run test`
- [ ] Add E2E test ONLY if critical endpoint (authentication, payments, etc.)
- [ ] E2E test validates: status code + JSON response structure
- [ ] E2E test validates: error responses with proper status + JSON format
- [ ] No E2E tests needed for: helper endpoints, non-critical reads, etc.
- [ ] Run E2E tests: `pnpm run test:e2e`
- [ ] Check coverage: `pnpm run test:cov`

### Response Structure Validation (E2E)

Always validate JSON response structure in E2E tests:

```typescript
// ✅ Validate successful response
const response = await request(app.getHttpServer())
  .post('/endpoint')
  .send(payload)
  .expect(201);

expect(response.body).toEqual(
  expect.objectContaining({
    id: expect.any(Number),
    email: expect.any(String),
    createdAt: expect.any(String),
    // ... all expected fields
  })
);

// ✅ Validate error response
const error = await request(app.getHttpServer())
  .post('/endpoint')
  .send(invalidPayload)
  .expect(400);

expect(error.body).toEqual(
  expect.objectContaining({
    statusCode: 400,
    message: expect.any(String),
    error: 'Bad Request',
  })
);
```

### E2E Test Guidelines

**Critical endpoints** (add E2E tests):
- Authentication (login, logout, refresh)
- User creation (business-critical)
- Payment processing (business-critical)
- Core business workflows

**Non-critical endpoints** (skip E2E, unit test only):
- Utility endpoints
- Helper getters
- Non-essential reads
- Non-critical updates

**Rule**: One happy path + main error scenario per critical endpoint. Do NOT test every combination.

**Standard Checklist:**
1. Check `/docs/findings.md` for previous decisions
2. Check `/docs/project-structure.md` for module layout
3. Research any new libraries using official docs
4. Follow the naming/structure conventions above
5. Document your approach in findings.md before implementing
6. Use path aliases for imports
7. Include Swagger decorators for endpoints
8. Add proper types/interfaces
9. Consider SOLID principles
10. Test implementation matches documentation

## Common Patterns

### Repository Pattern
```typescript
@Injectable()
export class UserRepository {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<User | null> {
    return this.db.query.users.findFirst({ where: ... });
  }
}
```

### Service Layer
```typescript
@Injectable()
export class UserService {
  constructor(private repository: UserRepository) {}
  
  async getUser(id: string): Promise<UserDto> {
    // Service logic here
  }
}
```

### Controller with Swagger
```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserDto })
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto> {
    return this.userService.getUser(id);
  }
}
```

---

**Last Updated**: Generated on project init
**Version**: 1.0.0
