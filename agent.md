# Project Guidelines & Agent Instructions

**Project**: NestJS v11 API with Drizzle ORM + PostgreSQL  
**Last Updated**: 2026-04-07  
**Version**: 1.0.0

---

## Quick Reference

- **Framework**: NestJS v11 + TypeScript
- **ORM**: Drizzle ORM v0.45
- **Database**: PostgreSQL (NeonDB)
- **Package Manager**: pnpm (exclusive)
- **API Docs**: Swagger/OpenAPI at `/api`
- **Documentation**: See `/docs/` folder

---

## Core Principles

### 1. Minimize Impact
- **Only touch what's necessary** — no unnecessary refactoring
- **No side effects** — changes must be isolated
- **Single responsibility** — each change addresses one concern
- **Backward compatible** — don't break existing functionality

### 2. No Laziness
- **Complete implementations** — don't take shortcuts
- **Proper typing** — no `any` types
- **Full test coverage** — especially for critical paths
- **Documentation** — document as you code
- **Error handling** — handle errors explicitly

### 3. Simplicity First
- **Choose clarity over cleverness** — readability is king
- **KISS principle** — Keep It Simple, Stupid
- **Don't over-engineer** — avoid unnecessary complexity
- **Obvious solutions** — prefer the most obvious implementation
- **Self-documenting code** — names, types, and structure should be clear

### 4. Type Safety
- **Strict TypeScript** — no implicit any
- **Interface-based** — contracts over implementations
- **Exhaustive checks** — handle all cases
- **Null safety** — strict null checks enabled
- **Return types** — always explicitly specified

### 5. SOLID Principles
- **Single Responsibility** — one reason to change
- **Open/Closed** — open for extension, closed for modification
- **Liskov Substitution** — subtypes must be substitutable
- **Interface Segregation** — depend on specific interfaces
- **Dependency Inversion** — depend on abstractions, not concretions

---

## Project Structure

```
src/
├── modules/          # Feature modules
├── common/           # Shared utilities
├── database/         # Drizzle configuration
├── config/           # Configuration
├── app.module.ts     # Root module
├── main.ts           # Entry point
└── types/            # TypeScript types

docs/
├── findings.md       # Auto-updated discoveries
├── project-structure.md  # Architecture guide
├── testing.md        # Testing standards
├── exceptions.md     # Exception handling
├── environment.md    # Environment vars
├── api.md            # API endpoints
├── database.md       # Database schema
└── patterns.md       # Code patterns
```

Full structure in [project-structure.md](../docs/project-structure.md).

---

## Common Module Structure

```
src/common/
├── bases/            # Base classes (entities, DTOs, repositories)
├── constants/        # HTTP codes, regex, validation constants
├── decorators/       # @Public(), @Roles(), @CurrentUser(), @Throttle()
├── exceptions/       # Custom exceptions hierarchy
├── factories/        # Test data factories
├── filters/          # Exception filters (HttpException, AllExceptions)
├── guards/           # JWT, Roles, Throttle guards
├── interceptors/     # Logging, Transform, Timeout, Error interceptors
├── interfaces/       # Paginated, RequestUser, API response interfaces
├── middlewares/      # Logger, CORS, Helmet middlewares
├── pipes/            # Parse pipes, Validation pipe
├── processors/       # Email processor, Notification processor
├── utils/            # Logger util, Crypto, Password, Email, Date, Pagination utils
├── validators/       # Email validator, Password strength, Unique, Phone validators
└── common.module.ts
```

---

## Naming Conventions

| Item | Pattern | Example |
|------|---------|---------|
| Classes | PascalCase | `UserService`, `CreateUserDto` |
| Functions/Methods | camelCase | `getUserById()`, `validateEmail()` |
| Constants | UPPER_SNAKE_CASE | `DATABASE_URL`, `MAX_RETRIES` |
| Files | kebab-case | `user.service.ts`, `create-user.dto.ts` |
| Folders | kebab-case | `src/users`, `src/common/filters` |
| Variables | camelCase | `userId`, `userData` |
| Enums | PascalCase | `UserRole`, `HttpStatus` |

---

## Path Aliases

Use path aliases for all imports:

```typescript
// ✅ Do This
import { UserService } from '@modules/users/users.service';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { Database } from '@database/database.module';
import { AppConfig } from '@config/app.config';

// ❌ Don't Do This
import { UserService } from '../../../../modules/users/users.service';
```

Aliases defined in `tsconfig.json`:
- `@/*` → `src/*`
- `@modules/*` → `src/modules/*`
- `@common/*` → `src/common/*`
- `@database/*` → `src/database/*`
- `@config/*` → `src/config/*`
- `@types/*` → `src/types/*`

---

## Module Architecture

### Feature Module Example (Users)

```
src/modules/users/
├── users.module.ts           # Module definition
├── users.controller.ts        # HTTP routes
├── users.service.ts           # Business logic
├── users.repository.ts        # Data access
├── users.spec.ts              # Unit tests
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/
│   └── user.entity.ts
└── interfaces/
    └── user.interface.ts
```

### Module Declaration

```typescript
@Module({
  imports: [DatabaseModule], // Only import needed modules
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // Export for other modules
})
export class UsersModule {}
```

### Decorator Order (Critical)

**Class-Level Order:**
```typescript
@ApiTags('users')                        // 1. Swagger
@Controller('users')                     // 2. Route
@UseGuards(JwtAuthGuard)                 // 3. Guards
@UseInterceptors(LoggingInterceptor)     // 4. Interceptors
@UsePipes(new ValidationPipe())          // 5. Pipes
export class UsersController {
  // Methods follow order below
}
```

**Method-Level Order:**
```typescript
@ApiOperation({ summary: 'Create user' })        // 1. Swagger operation
@ApiResponse({ status: 201, type: UserDto })    // 2. Swagger responses
@Post()                                           // 3. HTTP method
@HttpCode(HttpStatus.CREATED)                    // 4. Status override
@UseGuards(JwtAuthGuard)                         // 5. Guards
@UseInterceptors(LoggingInterceptor)             // 6. Interceptors
@UsePipes(new ValidationPipe())                  // 7. Pipes
async create(
  @Body(ValidationPipe) dto: CreateUserDto,
  @CurrentUser() user: User,
): Promise<UserDto> {
  // Implementation
}
```

**Order Summary**: Swagger → HTTP → Guards → Interceptors → Pipes

### Service Template

```typescript
@Injectable()
export class UserService {
  constructor(
    private repository: UserRepository,
    private emailService: EmailService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    // Validation
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email exists');
    }

    // Business logic
    const user = await this.repository.create(dto);

    // Side effects
    await this.emailService.sendWelcomeEmail(user.email);

    // Return DTO
    return this.mapToDto(user);
  }

  private mapToDto(user: User): UserDto {
    // Map entity to DTO
  }
}
```

### Repository Template

```typescript
@Injectable()
export class UserRepository {
  constructor(@Inject('DATABASE') private db: Database) {}

  async findAll(limit = 10, offset = 0): Promise<User[]> {
    return this.db.query.users.findMany({ limit, offset });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .returning();
    return user;
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set(data)
      .where((users, { eq }) => eq(users.id, id))
      .returning();
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(users)
      .where((users, { eq }) => eq(users.id, id));
  }
}
```

---

## Type Safety Rules

1. **No implicit `any`**: TypeScript strict mode enforced
2. **Explicit return types**: All functions must have return types
3. **DTOs for I/O**: Use Data Transfer Objects for all I/O
   - ✅ Use `!` operator for required properties: `email!: string;`
   - ✅ Use `?` for optional properties: `description?: string;`
   - ❌ Never omit initializer for required properties
4. **Entities separate**: Database entities differ from DTOs
5. **Interfaces as contracts**: Use interfaces for dependencies
6. **Error types**: Create custom HttpException classes
7. **Library signatures**: Always check actual method signatures
   - ✅ Swagger `.setContact(name, url, email)` expects 3 separate arguments
   - ✅ `.setLicense(name, url)` expects 2 separate arguments
   - ❌ Don't pass objects when method expects separate args
8. **Dependencies**: Verify required packages in package.json
   - ✅ Drizzle ORM requires `pg` (PostgreSQL driver)
   - ✅ NeonDB connection requires `@neondatabase/serverless`
   - ❌ Don't assume packages are installed without checking package.json

```typescript
// ✅ Good
async getUser(id: string): Promise<UserDto | null> {
  const user = await this.repository.findById(id);
  return user ? this.mapToDto(user) : null;
}

// ❌ Bad
async getUser(id: any): any {
  return this.repository.findById(id);
}
```

---

## Swagger/API Documentation

### Add Swagger to Endpoints

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    // Implementation
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserDto> {
    // Implementation
  }
}
```

### DTO with Swagger Decorators

```typescript
export class CreateUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
  })
  @IsString()
  @MinLength(2)
  name: string;
}
```

---

## Database & Drizzle ORM

### Schema Location
`src/database/drizzle/schema.ts` — all tables defined here

### Migrations
```bash
pnpm run db:generate   # Create migration from schema changes
pnpm run db:migrate    # Run migrations against database
pnpm run db:studio     # Open Drizzle Studio UI
```

### Query Tips

```typescript
// ✅ Good: Parallel queries
const [users, count] = await Promise.all([
  db.query.users.findMany(),
  db.query.users.count(),
]);

// ✅ Good: Explicit where clauses
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.email, email),
});

// ❌ Bad: Sequential when should be parallel
const users = await db.query.users.findMany();
const count = await db.query.users.count();  // Unnecessary wait
```

---

## pnpm Scripts

```bash
pnpm install          # Install dependencies
pnpm run build        # Build for production
pnpm run start        # Start server
pnpm run start:dev    # Development with watch
pnpm run start:debug  # Debugging
pnpm run lint         # Lint and fix
pnpm run format       # Format with Prettier
pnpm run test         # Run unit tests
pnpm run test:watch   # Watch mode
pnpm run test:e2e     # E2E tests
pnpm run db:generate  # Generate migrations
pnpm run db:migrate   # Run migrations
pnpm run db:studio    # Open database UI
```

---

## Task Workflow

### 1. Plan First
- Read relevant documentation
- Search codebase if needed
- Document discovery in `/docs/findings.md`
- Outline implementation steps
- Consider impact on other modules

### 2. Verify Plan
- Check architectural consistency
- Confirm no side effects
- Review existing patterns
- Get approval for major changes

### 3. Implement
- Make focused, minimal changes
- Follow naming conventions
- Add TypeScript types throughout
- Include Swagger decorators
- Add unit tests for new logic

### 4. Document
- Update `/docs/findings.md` 
- Add inline comments for complex logic
- Update `/docs/api.md` if endpoints changed
- Update `/docs/database.md` if schema changed

### 5. Test
- Run unit tests: `pnpm run test`
- Run E2E tests: `pnpm run test:e2e`
- Check coverage: `pnpm run test:cov`
- Test in Swagger UI: `/api`

---

## Common Workflows

### Add New Feature Module

```bash
# 1. Create module structure
mkdir -p src/modules/feature-name/{dto,entities}

# 2. Use NestJS CLI
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name

# 3. Create Repository
# (Manual file: src/modules/feature-name/feature-name.repository.ts)

# 4. Create DTOs in dto/ folder
# (Manual files: src/modules/feature-name/dto/create-*.dto.ts)

# 5. Update AppModule to import FeatureModule

# 6. Generate database migration if needed
pnpm run db:generate
pnpm run db:migrate
```

### Query Database in Repository

```typescript
async findByFilter(email: string, isActive?: boolean): Promise<User[]> {
  const conditions = [];
  
  if (email) {
    conditions.push(eq(users.email, email));
  }
  
  if (isActive !== undefined) {
    conditions.push(eq(users.isActive, isActive));
  }

  return this.db.query.users.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
  });
}
```

### Add Authentication Guard

```typescript
@UseGuards(JwtAuthGuard)
@Controller('protected')
export class ProtectedController {
  @Get()
  async get(@Request() req): Promise<any> {
    // User available via req.user
    console.log(req.user.id);
  }
}
```

---

## Search & Context Commands

### When to Check Findings
```
- Before implementing new feature
- When dealing with similar patterns
- If unsure about architectural decision
- To avoid duplicate work
```

### How to Update Findings
```
1. Document new discoveries in /docs/findings.md
2. Record architectural decisions (ADR-###)
3. Log features and their locations
4. Capture patterns and best practices
```

### Limiting Repository Search
- Use specific module paths: `src/modules/users/*`
- Search by file type: `**/*.service.ts`
- Search by pattern: `*repository.ts`
- Avoid full repo scans: be targeted

---

## Code Quality Standards

### Unit Tests
- Aim for >80% coverage
- Test business logic in services
- Mock repositories in tests
- Test error scenarios

### Type Coverage
- No `any` types allowed
- All function parameters typed
- All return types explicit
- Use interfaces for dependencies

### Documentation
- Swagger decorators on endpoints
- JSDoc for public methods
- Comments for complex logic
- Inline types, not comments for clarity

---

## Common Errors & Prevention

### ❌ Error 1: Uninitialized DTO Properties (TS2564)
**Problem**: Property has no initializer in strict mode
```typescript
// ❌ WRONG
export class HealthDto {
  status: 'ok' | 'error';  // Error TS2564
  timestamp: string;        // Error TS2564
}

// ✅ CORRECT
export class HealthDto {
  status!: 'ok' | 'error';  // Non-null assertion
  timestamp!: string;        // Non-null assertion
}

// ✅ ALSO CORRECT (for optional)
export class HealthDto {
  status?: 'ok' | 'error';  // Optional with ?
  timestamp?: string;        // Optional with ?
}
```
**Rule**: Use `!` for required properties, `?` for optional. Never omit both.

### ❌ Error 2: Swagger Method Signature Mismatch
**Problem**: Passing object to method that expects separate arguments
```typescript
// ❌ WRONG
.setContact({
  name: 'API Support',
  url: 'https://github.com',
})

// ✅ CORRECT
.setContact('API Support', 'https://github.com', 'support@example.com')

// ✅ Also .setLicense takes 2 args, not object
.setLicense('MIT', 'https://opensource.org/licenses/MIT')
```
**Rule**: Always check actual method signature in @nestjs/swagger docs. Don't assume object syntax.

### ❌ Error 3: Missing Required Dependencies
**Problem**: Using library without required peer dependency
```typescript
// ❌ WRONG - pg is required by drizzle-orm but not installed
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';  // Error: Cannot find module 'pg'

// ✅ CORRECT
// Ensure package.json has:
// "pg": "^8.20.0",
// "drizzle-orm": "^0.45.2",
// "pg" is the PostgreSQL driver required by Drizzle
```
**Rule**: Before using any ORM/database lib, verify all required drivers in package.json.

### ❌ Error 4: Decorated Signature Type Error (TS1272)
**Problem**: Type in `@Inject` decorated constructor with regular import
```typescript
// ❌ WRONG - Regular import in decorated signature
import { Database } from './database.module';

@Injectable()
export class MyService {
  constructor(@Inject(TOKEN) private db: Database) {}  // TS1272 error
}

// ✅ CORRECT - Use import type
import type { Database } from './database.module';

@Injectable()
export class MyService {
  constructor(@Inject(TOKEN) private db: Database) {}  // OK
}
```
**Why**: `isolatedModules + emitDecoratorMetadata` requires type-only imports in decorated signatures
**Rule**: When using `@Inject` with typed constructor parameters, use `import type` for that type

### ❌ Error 5: Missing @types Packages (TS7016)
**Problem**: TypeScript complains about missing declarations for runtime packages
```typescript
// ❌ WRONG - Missing @types/pg in devDependencies
import { Pool } from 'pg';  // TS7016: Could not find declaration file

// ✅ CORRECT - Install @types package
// In package.json devDependencies: "@types/pg": "^8.11.8"
```
**Rule**: Always add @types/* packages for any external dependencies that use types

### ❌ Error 6: Missing Return Statement in Async Function (TS2366)
**Problem**: Function promises to return a value but doesn't in all code paths
```typescript
// ❌ WRONG - No return if condition is false
async checkDatabase(): Promise<HealthDto> {
  try {
    const result = await this.db.query();
    if (result) {
      return { status: 'ok' };
    }
    // Missing return here!
  } catch (error) {
    return { status: 'error' };
  }
}

// ✅ CORRECT - Return in all paths
async checkDatabase(): Promise<HealthDto> {
  try {
    const result = await this.db.query();
    if (result) {
      return { status: 'ok' };
    }
    // Explicitly handle empty result
    return { status: 'error', message: 'Empty result' };
  } catch (error) {
    return { status: 'error' };
  }
}
```
**Rule**: Ensure all code paths return the promised type - no fall-through without return

### ❌ Error 7: Hardcoded Environment Values
**Problem**: Hardcoding URLs, ports, API keys, or configuration-dependent values
```typescript
// ❌ WRONG - Hardcoded values
const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
const API_KEY = 'sk-1234567890abcdef';
const PORT = 3000;
const FRONTEND_URL = 'http://localhost:3000';
const LOG_LEVEL = 'debug';

// ❌ WRONG - "Defaults" that still bypass environment
const dbUrl = 'postgresql://...' || process.env.DATABASE_URL;

// ✅ CORRECT - All from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY not set');

const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
```
**Rule**: 
- ❌ Never hardcode URLs, API keys, secrets, ports, hosts, log levels
- ✅ Always use `process.env.VARIABLE_NAME`
- ✅ Validate required vars at startup
- ✅ Document in `.env.example` and `/docs/environment.md`

### Prevention Checklist
- [ ] Check if property has `!` or `?` (no bare declarations)
- [ ] Verify method signatures in official docs before calling
- [ ] Check package.json for required peer dependencies
- [ ] Check package.json for required @types packages
- [ ] Use `import type` for types in decorated signatures (@Inject, @Body, etc.)
- [ ] Use regular import for runtime values (new Class(), const x = value)
- [ ] Ensure all async functions return in every code path
- [ ] **NEVER hardcode URLs, keys, secrets, or configuration values**
- [ ] Validate all required environment variables at startup
- [ ] Document new env vars in `.env.example` and `/docs/environment.md`
- [ ] Run `pnpm run typecheck` to catch errors early

---

## Error Handling

### Use Custom Exceptions

```typescript
// Define custom exceptions
export class UserNotFoundException extends HttpException {
  constructor(id: string) {
    super(
      { message: `User ${id} not found`, error: 'Not Found' },
      HttpStatus.NOT_FOUND,
    );
  }
}

// Use in service
async getUser(id: string): Promise<UserDto> {
  const user = await this.repository.findById(id);
  if (!user) {
    throw new UserNotFoundException(id);
  }
  return this.mapToDto(user);
}
```

### HTTP Status Codes
- **200** — Success (GET, PUT, PATCH)
- **201** — Created (POST)
- **204** — No Content (DELETE)
- **400** — Bad Request (validation)
- **401** — Unauthorized (no auth)
- **403** — Forbidden (insufficient permissions)
- **404** — Not Found
- **409** — Conflict (duplicate, constraint violation)
- **500** — Internal Server Error

---

## Testing Best Practices

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(UserRepository);
  });

  it('should find user by id', async () => {
    const expected = { id: '1', name: 'test' };
    jest.spyOn(repository, 'findById').mockResolvedValue(expected);

    const result = await service.getUser('1');

    expect(result).toEqual(expected);
  });
});
```

---

## Environment Variables Best Practices

### ❌ What NOT to Do

```typescript
// ❌ Hardcoded values - NEVER!
const DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
const API_PORT = 3000;
const JWT_SECRET = 'my-super-secret-key-12345';
const SENDGRID_API_KEY = 'SG.1234567890abcdef';
const FRONTEND_URL = 'http://localhost:5173';
const LOG_LEVEL = 'debug';

// ❌ "Defaults" that bypass environment
const port = 3000 || process.env.PORT;  // Always uses 3000!
const dbUrl = 'postgres://...' || process.env.DATABASE_URL;  // Defaults to value
```

### ✅ What YOU MUST Do

1. **Use process.env everywhere configuration is needed**:
```typescript
const DATABASE_URL = process.env.DATABASE_URL;
const API_PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
```

2. **Validate at startup**:
```typescript
// src/config/validate-environment.ts
export function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SENDGRID_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Check your .env file and .env.example for required values.`
    );
  }
}

// src/main.ts
import 'dotenv/config';
import { validateEnvironment } from './config/validate-environment';

validateEnvironment();
const app = await NestFactory.create(AppModule);
```

3. **Document everything**:
   - Add to `.env.example` (template with placeholder)
   - Add to `/docs/environment.md` (detailed description)
   - Update `/docs/findings.md` when adding feature that needs env vars

### `.env.example` Template

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:password@host.neon.tech:5432/neondb

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx

# External APIs
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### When Adding New Feature with Configuration

1. **Write code using process.env**:
```typescript
const apiKey = process.env.FEATURE_API_KEY;
if (!apiKey) {
  throw new Error('FEATURE_API_KEY environment variable is required');
}
```

2. **Update `.env.example`**:
```bash
# Feature
FEATURE_API_KEY=feature-api-key-here
FEATURE_WEBHOOK_URL=https://feature-provider.com/webhook
```

3. **Document in `/docs/environment.md`**:
```markdown
### FEATURE_API_KEY
- **Type**: String (API Key)
- **Required**: Yes
- **Used in**: src/modules/feature/feature.service.ts
- **How to get**: Create account at feature-provider.com
- **Security**: 🔐 Never commit real values
```

4. **Validate at startup** if adding critical feature:
```typescript
export function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'FEATURE_API_KEY'];
  // ...
}
```

---

## Testing Standards

### Reference Documentation

**All testing guidance is in `/docs/testing.md`** — This includes:
- Unit test patterns (services, controllers, repositories)
- Mocking strategies and best practices
- E2E testing for critical paths only
- Edge cases and error handling
- Test isolation and cleanup
- Coverage standards (70-90%)
- Response structure validation
- HTTP status code verification

### Testing Workflow

**For EVERY new endpoint:**

1. **Write tests first** (before implementation):
   - Controller test: Happy path + error scenarios
   - Service test: Business logic + edge cases
   - Repository test (if needed): Mock DB interactions

2. **Implement code** to make tests pass

3. **Add E2E test** ONLY for critical endpoints:
   - Authentication flows
   - User creation
   - Payment processing
   - Core business logic

4. **Validate response structures**:
   - Success: Status 200/201 + correct JSON properties
   - Error: Status 400/404/409 + error JSON structure

5. **Check coverage**:
   ```bash
   pnpm run test        # Run unit tests
   pnpm run test:e2e    # Run E2E tests
   pnpm run test:cov    # Check coverage (aim for 70%+)
   ```

### Quick Testing Template

```bash
# Run tests while developing
pnpm run test:watch

# Run specific test file
pnpm run test -- users.service.spec

# Run E2E tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov
```

---

1. **pnpm exclusively** — Never npm or yarn
2. **TypeScript strict mode** — `noImplicitAny: true`
3. **NestJS patterns** — Use proper DI, modules, decorators
4. **Drizzle ORM** — Use schema, migrations in version control
5. **PostgreSQL** — Use appropriate column types
6. **No `.ts` files in import paths** — Always `from '@modules/users'`
7. **Separate DTOs from entities** — Different concerns
8. **Repository pattern** — All DB access through repositories
9. **Services as singletons** — NestJS provider pattern
10. **Swagger documentation** — All endpoints documented
11. **🔐 NEVER hardcode environment values** — All URLs, keys, secrets from `process.env`
12. **Environment documentation** — Any env var in code must be in `.env.example` AND `/docs/environment.md`
13. **Validation at startup** — Validate all required environment variables before app starts

---

## When Implementing Something New

### Checklist
- [ ] Read relevant doc files (`/docs/*`) - **ESPECIALLY `/docs/testing.md`**
- [ ] Check `/docs/findings.md` for patterns
- [ ] Plan in comments or findings before coding
- [ ] **Write unit tests FIRST** (controller, service, repository)
- [ ] Use proper naming conventions
- [ ] Add complete TypeScript types
- [ ] Add Swagger decorators
- [ ] Implement code to make tests pass
- [ ] Add E2E test **ONLY for critical endpoints**
- [ ] Validate E2E response structure (status + JSON format)
- [ ] Create unit tests for new logic
- [ ] Add try-catch/error handling
- [ ] **If adding configuration**: Update `.env.example`, add to `/docs/environment.md`, validate at startup
- [ ] Document discoveries in findings.md
- [ ] Run `pnpm run test` and `pnpm run lint`
- [ ] Check coverage: `pnpm run test:cov` (aim for 70%+ services/controllers)

---

## Documentation Files Reference

- **copilot-instructions.md** — AI agent coding guidelines
- **docs/project-structure.md** — Architecture & directory tree
- **docs/findings.md** — Discoveries & decisions
- **docs/api.md** — API endpoints & DTOs
- **docs/database.md** — Database schema & migrations
- **docs/patterns.md** — Code patterns & best practices
- **README.md** — Getting started guide

---

## Contact

For questions about architecture or patterns, check:
1. `/docs/` folder (specific guidance)
2. `copilot-instructions.md` (general rules)
3. Code examples in `src/` (existing patterns)

---

**This project prioritizes clarity, safety, and simplicity.**  
**Make code that's easy to understand, test, and maintain.**