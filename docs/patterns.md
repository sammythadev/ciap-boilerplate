# Code Patterns & Best Practices

**Last Updated**: April 7, 2026  
**Version**: 1.0.0

---

## Service Layer Pattern

### Template

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UserDto } from './dto';
import { User } from '@database/drizzle/schema';

@Injectable()
export class UserService {
  constructor(private repository: UserRepository) {}

  // CREATE
  async createUser(dto: CreateUserDto): Promise<UserDto> {
    // 1. Validate (check business logic)
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // 2. Execute business logic
    const user = await this.repository.create(dto);

    // 3. Side effects (send email, publish event, etc.)
    // await this.emailService.sendWelcomeEmail(user.email);

    // 4. Return DTO (never return entity)
    return this.mapToDto(user);
  }

  // READ
  async getUserById(id: number): Promise<UserDto> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return this.mapToDto(user);
  }

  // UPDATE
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    // Check for conflicts (e.g., email collision)
    if (dto.email && dto.email !== user.email) {
      const existing = await this.repository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    const updated = await this.repository.update(id, dto);
    return this.mapToDto(updated);
  }

  // DELETE
  async deleteUser(id: number): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    await this.repository.delete(id);
  }

  // HELPER: Map entity to DTO (never expose entity structure)
  private mapToDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    };
  }
}
```

### Key Points

- ✅ Inject repository or external services
- ✅ Validate business logic (check constraints)
- ✅ Throw custom exceptions for errors
- ✅ Return DTOs, never entities
- ✅ Keep methods focused on single responsibility
- ❌ Never query database directly (use repository)
- ❌ Never expose entity fields to clients

---

## Repository Layer Pattern

### Template

```typescript
import { Injectable } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';
import { Database } from '@database/database.module';
import { users } from '@database/drizzle/schema';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UserRepository {
  constructor(private db: Database) {}

  async findById(id: number) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findAll(limit = 10, offset = 0) {
    return this.db.query.users.findMany({
      limit,
      offset,
      orderBy: [desc(users.createdAt)],
    });
  }

  async count() {
    const result = await this.db
      .select({ count: count() })
      .from(users);
    return result[0]?.count || 0;
  }

  async create(dto: CreateUserDto) {
    const [user] = await this.db
      .insert(users)
      .values(dto)
      .returning();
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const [user] = await this.db
      .update(users)
      .set(dto)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async delete(id: number) {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
```

### Key Points

- ✅ Handle all database queries
- ✅ Return entities or null (never throw)
- ✅ Accept DTOs or plain objects
- ✅ Keep queries reusable and simple
- ✅ Use Drizzle's query builder
- ❌ Never handle business logic (let service decide)
- ❌ Never throw custom exceptions (repository's job is data access)

---

## Controller Layer Pattern

### Template

```typescript
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  HttpStatus,
  ApiTags,
  ApiOperation,
  ApiResponse,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { UserService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserDto } from './dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  constructor(private service: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, type: UserDto, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.service.createUser(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getOne(@Param('id') id: string): Promise<UserDto> {
    return this.service.getUserById(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.service.updateUser(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.deleteUser(Number(id));
  }
}
```

### Key Points

- ✅ Use decorators for routing and validation
- ✅ Include Swagger decorators for documentation
- ✅ Delegate all logic to service
- ✅ Return DTOs, never entities
- ✅ Let guards/interceptors/filters handle errors
- ❌ Never query database directly
- ❌ Never catch or handle custom exceptions (let filters handle)

---

## DTO Pattern

### Template

```typescript
import { IsEmail, IsString, MinLength, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'John Updated' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe Updated' })
  @IsString()
  @IsOptional()
  lastName?: string;
}

export class UserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'John' })
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  lastName?: string;

  @ApiProperty()
  createdAt!: Date;
}
```

### Key Points

- ✅ Use validators (`@IsEmail()`, `@MinLength()`, etc.)
- ✅ Non-optional fields use `!` operator
- ✅ Optional fields use `?`
- ✅ Include `@ApiProperty()` for Swagger docs
- ✅ Separate create, update, and response DTOs
- ❌ Never include database internals in DTOs
- ❌ Never expose passwords or secrets

---

## Error Handling Pattern

See `/docs/exceptions.md` for complete patterns.

Quick example:

```typescript
@Injectable()
export class UserService {
  async getUserById(id: number): Promise<UserDto> {
    const user = await this.repository.findById(id);
    
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return this.mapToDto(user);
  }
}

// Exception filter catches NotFoundException
// Formats as 404 JSON response
// Logs full error internally
// No stack trace sent to client
```

---

## Testing Pattern

See `/docs/testing.md` for complete patterns.

Quick example:

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
    } as any;

    service = new UserService(repository);
  });

  it('should create a user', async () => {
    const dto = { email: 'test@example.com', password: 'secret' };
    const expected = { id: 1, email: 'test@example.com', ...dto };

    jest.spyOn(repository, 'create').mockResolvedValue(expected);

    const result = await service.createUser(dto);

    expect(result).toEqual(expected);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
});
```

---

## Module Pattern

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## References

- See `/docs/project-structure.md` for complete architecture
- See `/docs/exceptions.md` for error handling
- See `/docs/testing.md` for testing patterns

