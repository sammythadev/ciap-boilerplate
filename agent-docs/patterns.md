# Code Patterns & Best Practices

Standard patterns and best practices for consistent, high-quality code.

**Last Updated**: 2026-04-07  
**Framework**: NestJS v11 + TypeScript + Drizzle ORM

---

## SOLID Principles in NestJS

### Single Responsibility Principle
Each class has one reason to change.

**Bad:**
```typescript
@Injectable()
export class UserService {
  constructor(private db: Database) {}
  
  // Too many responsibilities!
  async createUser(data) { /* db insert */ }
  async sendEmail(email) { /* email logic */ }
  async logActivity(action) { /* logging */ }
  async validateEmail(email) { /* validation */ }
}
```

**Good:**
```typescript
// Service: Business logic
@Injectable()
export class UserService {
  constructor(private repository: UserRepository) {}
  
  async createUser(data): Promise<User> {
    return this.repository.create(data);
  }
}

// Repository: Data access
@Injectable()
export class UserRepository {
  constructor(@Inject('DATABASE') private db: Database) {}
  
  async create(data): Promise<User> {
    return this.db.insert(users).values(data).returning();
  }
}

// Email Service: Email handling
@Injectable()
export class EmailService {
  async sendWelcomeEmail(email: string): Promise<void> {
    // Email logic here
  }
}

// Logger Service: Logging
@Injectable()
export class LoggerService {
  log(action: string): void {
    // Logging here
  }
}
```

### Open/Closed Principle
Classes should be open for extension, closed for modification.

**Bad:**
```typescript
// Adding new authentication method requires modifying this class
@Injectable()
export class AuthService {
  authenticate(strategy: string, credentials: any) {
    if (strategy === 'jwt') { /* JWT logic */ }
    if (strategy === 'oauth') { /* OAuth logic */ }
    if (strategy === 'password') { /* Password logic */ }
  }
}
```

**Good:**
```typescript
interface AuthStrategy {
  authenticate(credentials: any): Promise<User>;
}

@Injectable()
export class JwtStrategy implements AuthStrategy {
  async authenticate(token: string): Promise<User> {
    // JWT logic
  }
}

@Injectable()
export class PasswordStrategy implements AuthStrategy {
  async authenticate(credentials: Credentials): Promise<User> {
    // Password logic
  }
}

@Injectable()
export class AuthService {
  constructor(
    private jwtStrategy: JwtStrategy,
    private passwordStrategy: PasswordStrategy,
  ) {}
  
  async authenticate(strategy: 'jwt' | 'password', credentials: any): Promise<User> {
    const strategyImpl = strategy === 'jwt' ? this.jwtStrategy : this.passwordStrategy;
    return strategyImpl.authenticate(credentials);
  }
}
```

### Liskov Substitution Principle
Subtypes must be substitutable for their base types.

```typescript
interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
}

@Injectable()
export class UserRepository implements Repository<User> {
  // All methods must work exactly as interface promises
  async findAll(): Promise<User[]> { /* */ }
  async findById(id: string): Promise<User | null> { /* */ }
  async create(data: Partial<User>): Promise<User> { /* */ }
}

@Injectable()
export class ProductRepository implements Repository<Product> {
  // Same contract, different implementation
  async findAll(): Promise<Product[]> { /* */ }
  async findById(id: string): Promise<Product | null> { /* */ }
  async create(data: Partial<Product>): Promise<Product> { /* */ }
}
```

### Interface Segregation Principle
Depend on specific interfaces, not broad ones.

**Bad:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  password: string;  // Controller shouldn't know about password
  passwordHash: string;
  role: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Controller('users')
export class UserController {
  // Controller gets full User interface with sensitive data
  constructor(private service: UserService) {}
}
```

**Good:**
```typescript
// Domain interface
interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Response DTO - only public fields
export class UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

@Controller('users')
export class UserController {
  constructor(private service: UserService) {}
  
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto> {
    // Only expose what's necessary
    const user = await this.service.getUser(id);
    return this.mapToDto(user);
  }
}
```

### Dependency Inversion Principle
Depend on abstractions, not concrete implementations.

**Bad:**
```typescript
import { PostgresUserRepository } from './repositories/postgres-user.repository';

@Injectable()
export class UserService {
  // Tightly coupled to PostgreSQL implementation
  constructor(private repository: PostgresUserRepository) {}
}
```

**Good:**
```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(data: Partial<User>): Promise<User>;
}

@Injectable()
export class UserService {
  // Depends on abstraction, not concrete implementation
  constructor(
    @Inject('USER_REPOSITORY') private repository: IUserRepository,
  ) {}
}

// Implementation can be swapped
@Module({
  providers: [
    {
      provide: 'USER_REPOSITORY',
      useClass: PostgresUserRepository, // Can change to MongoUserRepository
    },
  ],
})
export class UserModule {}
```

---

## Dependency Injection Pattern

### Provider Definition
```typescript
@Module({
  providers: [
    // Class provider (most common)
    UserService,
    
    // Factory provider
    {
      provide: 'CONFIG',
      useFactory: () => ({
        apiUrl: process.env.API_URL,
      }),
    },
    
    // Value provider
    {
      provide: 'DATABASE_URL',
      useValue: process.env.DATABASE_URL,
    },
    
    // Alias provider
    {
      provide: 'USER_REPOSITORY',
      useExisting: UserRepository,
    },
  ],
})
export class AppModule {}
```

### Injection Examples
```typescript
@Injectable()
export class UserService {
  constructor(
    private repository: UserRepository,        // Class provider
    @Inject('CONFIG') private config: any,     // Named provider
    @Inject('DATABASE_URL') private dbUrl: string,
    @Optional() private logger?: LoggerService, // Optional
  ) {}
}
```

---

## Service Layer Pattern

```typescript
@Injectable()
export class UserService {
  constructor(
    private repository: UserRepository,
    private emailService: EmailService,
    private logger: LoggerService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    // Validation
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Business logic
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.repository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    // Side effects
    await this.emailService.sendWelcomeEmail(user.email);
    this.logger.log(`User created: ${user.id}`);

    // Return DTO
    return this.mapToDto(user);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private mapToDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
```

---

## Repository Pattern

```typescript
@Injectable()
export class UserRepository {
  constructor(@Inject('DATABASE') private db: Database) {}

  async findAll(limit = 10, offset = 0): Promise<User[]> {
    return this.db.query.users.findMany({
      limit,
      offset,
      orderBy: (users) => desc(users.createdAt),
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
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
      .set({ ...data, updatedAt: new Date() })
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

## DTO Validation Pattern

```typescript
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

// In controller
@Post()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
async create(@Body() dto: CreateUserDto): Promise<UserDto> {
  // DTO is validated automatically
  return this.service.createUser(dto);
}
```

---

## Exception Handling Pattern

```typescript
// Custom exceptions
export class UserNotFoundException extends HttpException {
  constructor(id: string) {
    super(`User with ID ${id} not found`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEmailException extends HttpException {
  constructor(email: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Email already in use',
        email,
      },
      HttpStatus.CONFLICT,
    );
  }
}

// Usage in service
async getUser(id: string): Promise<UserDto> {
  const user = await this.repository.findById(id);
  if (!user) {
    throw new UserNotFoundException(id);
  }
  return this.mapToDto(user);
}

// Global exception filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      message: exceptionResponse['message'],
      timestamp: new Date().toISOString(),
    });
  }
}

// Register in AppModule
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

---

## Async/Await Best Practices

```typescript
// ✅ Good: Parallel when independent
async function getUser(id: string) {
  const [user, posts, comments] = await Promise.all([
    this.repository.findById(id),
    this.postService.findByUserId(id),
    this.commentService.findByUserId(id),
  ]);
  return { user, posts, comments };
}

// ❌ Bad: Sequential when can be parallel
async function getUser(id: string) {
  const user = await this.repository.findById(id);
  const posts = await this.postService.findByUserId(id);  // Waits for user
  const comments = await this.commentService.findByUserId(id);  // Waits for posts
  return { user, posts, comments };
}

// ✅ Good: Error handling
async function createUser(data: CreateUserDto) {
  try {
    return await this.repository.create(data);
  } catch (error) {
    if (error.code === '23505') {  // Unique violation
      throw new ConflictException('Email already exists');
    }
    throw error;
  }
}
```

---

## Type Safety Pattern

```typescript
// ✅ Always specify return types
async getUser(id: string): Promise<UserDto> { /* */ }
findUsers(ids: string[]): User[] { /* */ }
private mapToDto(user: User): UserDto { /* */ }

// ❌ Avoid implicit any
async getUser(id) { /* */ }  // return type inferred
function map(data) { /* */ }  // any parameter

// ✅ Use strict types for functions
type UserFilter = {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
};

async findUsers(filter: UserFilter): Promise<User[]> { /* */ }

// ❌ Avoid object spreads with unknown types
const user = { ...unknownObject };  // Could be anything
```

---

## Testing Pattern

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  it('should create a user', async () => {
    const dto: CreateUserDto = { /* */ };
    const expectedUser: User = { /* */ };

    jest.spyOn(repository, 'create').mockResolvedValue(expectedUser);

    const result = await service.createUser(dto);

    expect(result).toEqual(expectedUser);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
});
```

---

## Update Schedule
This file is updated when:
- New patterns are discovered
- Best practices change
- Common issues are identified
- Framework versions require pattern updates
