# Exception Handling Best Practices

**NestJS v11 + TypeScript Error Management Standards**

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Built-in HTTP Exceptions](#built-in-http-exceptions)
3. [Custom Exceptions](#custom-exceptions)
4. [Exception Filters](#exception-filters)
5. [Error Response Format](#error-response-format)
6. [Stack Trace Management](#stack-trace-management)
7. [Logging Best Practices](#logging-best-practices)
8. [Try-Catch Patterns](#try-catch-patterns)
9. [Common Error Scenarios](#common-error-scenarios)
10. [Testing Exception Handling](#testing-exception-handling)

---

## Core Principles

### ⚡ Golden Rule: NEVER Leak Stack Traces

```typescript
// ❌ WRONG - Exposes stack trace to client
{
  message: "Error occurred",
  stack: "at UserService.create (.../users.service.ts:42:15)",
}

// ✅ CORRECT - Safe error response
{
  statusCode: 500,
  message: "Internal server error",
  error: "Internal Server Error"
}
```

### 🎯 Error Response Structure

All errors follow this format:

```typescript
{
  statusCode: number,      // HTTP status code (400, 404, 500, etc.)
  message: string,         // User-friendly error message
  error: string,           // Error type (e.g., "Bad Request", "Unauthorized")
  timestamp?: string,      // ISO timestamp
  path?: string,           // Request path
  details?: object,        // Additional context (safe for client)
}
```

### 🔒 Safety Rules

1. **Always catch errors** - No uncaught exceptions
2. **Never expose internals** - No file paths, function names, or system info
3. **Always log details** - Log full error for debugging
4. **Always respond** - Send proper HTTP status + safe error message
5. **Always validate** - Catch errors from external APIs
6. **Always document** - Document expected errors for each endpoint

---

## Built-in HTTP Exceptions

### Status Codes & Usage

```typescript
import {
  BadRequestException,      // 400 - Invalid request
  UnauthorizedException,    // 401 - No authentication
  ForbiddenException,       // 403 - No permission
  NotFoundException,        // 404 - Resource not found
  ConflictException,        // 409 - Duplicate/conflict
  UnprocessableEntityException, // 422 - Validation failed
  InternalServerErrorException, // 500 - Server error
  ServiceUnavailableException,  // 503 - Unavailable
} from '@nestjs/common';

// ✅ Correct usage
throw new BadRequestException('Email is required');
throw new NotFoundException(`User with id ${id} not found`);
throw new ConflictException('Email already registered');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Insufficient permissions');
```

### HTTP Status Code Reference

| Code | Exception | When to Use |
|------|-----------|-----------|
| 400 | BadRequestException | Invalid input, validation failed |
| 401 | UnauthorizedException | No auth token, invalid token |
| 403 | ForbiddenException | Authenticated but no permission |
| 404 | NotFoundException | Resource doesn't exist |
| 409 | ConflictException | Duplicate email, constraint violation |
| 422 | UnprocessableEntityException | Semantically invalid |
| 500 | InternalServerErrorException | Server error (database, external API) |
| 503 | ServiceUnavailableException | Service down, maintenance |

---

## Custom Exceptions

### Location: `src/common/exceptions/`

### Base Exception Class

```typescript
// src/common/exceptions/base.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    readonly errorCode: string,
    readonly details?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        message,
        error: HttpStatus[statusCode],
        errorCode,
        timestamp: new Date().toISOString(),
        details, // Only include safe details
      },
      statusCode,
    );
  }
}
```

### Domain-Specific Exceptions

```typescript
// src/common/exceptions/user.exceptions.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class UserAlreadyExistsException extends BaseException {
  constructor(email: string) {
    super(
      `User with email ${email} already exists`,
      HttpStatus.CONFLICT,
      'USER_ALREADY_EXISTS',
      { email }, // Safe to expose email
    );
  }
}

export class UserNotFoundException extends BaseException {
  constructor(userId: string | number) {
    super(
      `User not found`,
      HttpStatus.NOT_FOUND,
      'USER_NOT_FOUND',
      { userId: String(userId) }, // Safe identifier
    );
  }
}

export class InvalidPasswordException extends BaseException {
  constructor() {
    super(
      'Invalid password',
      HttpStatus.UNAUTHORIZED,
      'INVALID_PASSWORD',
    );
  }
}

export class EmailNotVerifiedException extends BaseException {
  constructor(email: string) {
    super(
      'Email not verified',
      HttpStatus.FORBIDDEN,
      'EMAIL_NOT_VERIFIED',
      { email },
    );
  }
}
```

### Database Exceptions

```typescript
// src/common/exceptions/database.exceptions.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class DatabaseException extends BaseException {
  constructor(message: string, originalError?: Error) {
    super(
      'Database operation failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR',
      { originalCode: (originalError as any)?.code }, // Safely log code
    );
    // ⚠️ Log full error internally only
    console.error('[DatabaseException]', originalError);
  }
}

export class UniqueConstraintException extends BaseException {
  constructor(field: string) {
    super(
      `${field} must be unique`,
      HttpStatus.CONFLICT,
      'UNIQUE_CONSTRAINT_VIOLATION',
      { field },
    );
  }
}

export class ForeignKeyException extends BaseException {
  constructor(field: string, reference: string) {
    super(
      'Invalid reference',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'FOREIGN_KEY_CONSTRAINT',
      { field, reference },
    );
  }
}
```

### Authentication Exceptions

```typescript
// src/common/exceptions/auth.exceptions.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class InvalidCredentialsException extends BaseException {
  constructor() {
    super(
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
    );
  }
}

export class TokenExpiredException extends BaseException {
  constructor() {
    super(
      'Token has expired',
      HttpStatus.UNAUTHORIZED,
      'TOKEN_EXPIRED',
    );
  }
}

export class InvalidTokenException extends BaseException {
  constructor() {
    super(
      'Invalid or malformed token',
      HttpStatus.UNAUTHORIZED,
      'INVALID_TOKEN',
    );
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(permission: string) {
    super(
      'Insufficient permissions',
      HttpStatus.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS',
      { required: permission },
    );
  }
}
```

### Validation Exceptions

```typescript
// src/common/exceptions/validation.exceptions.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ValidationException extends BaseException {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      { fields: errors }, // Safe field-level errors
    );
  }
}

export class InvalidEmailFormatException extends BaseException {
  constructor(email: string) {
    super(
      'Invalid email format',
      HttpStatus.BAD_REQUEST,
      'INVALID_EMAIL_FORMAT',
      // ❌ Don't expose email in details, just generic message
    );
  }
}

export class PasswordTooWeakException extends BaseException {
  constructor() {
    super(
      'Password does not meet requirements',
      HttpStatus.BAD_REQUEST,
      'WEAK_PASSWORD',
      { requirements: ['Minimum 8 characters', 'Must contain uppercase, lowercase, number'] },
    );
  }
}
```

### External API Exceptions

```typescript
// src/common/exceptions/external.exceptions.ts
import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class ExternalServiceException extends BaseException {
  constructor(service: string, originalError?: Error) {
    super(
      `${service} service is temporarily unavailable`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'EXTERNAL_SERVICE_ERROR',
      { service },
    );
    // Log error details internally
    console.error(`[${service}Exception]`, originalError);
  }
}

export class PaymentProcessingException extends BaseException {
  constructor(reason: string) {
    super(
      'Payment processing failed',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PAYMENT_ERROR',
      { reason: 'Contact support' }, // Don't leak payment details
    );
  }
}

export class EmailSendingException extends BaseException {
  constructor() {
    super(
      'Email delivery failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'EMAIL_ERROR',
    );
  }
}
```

---

## Exception Filters

### Global Exception Filter

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Construct safe response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
          ? exceptionResponse['message']
          : exception.message,
      error:
        typeof exceptionResponse === 'object' &&
        'error' in exceptionResponse
          ? exceptionResponse['error']
          : HttpStatus[status],
      ...(typeof exceptionResponse === 'object' &&
      'details' in exceptionResponse
        ? { details: exceptionResponse['details'] }
        : {}),
    };

    // ✅ Log full exception internally (with stack trace)
    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status}`,
      exception.stack,
    );

    // ✅ Send safe response to client (NO stack trace)
    response.status(status).json(errorResponse);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ✅ Log full error internally
    this.logger.error(
      `[${request.method}] ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // ✅ Send safe generic error to client
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      // ❌ NEVER include exception details
    });
  }
}
```

### Register Global Filter

```typescript
// src/main.ts
import { HttpExceptionFilter, AllExceptionsFilter } from '@common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register exception filters (order matters)
  app.useGlobalFilters(
    new AllExceptionsFilter(),    // Catch all
    new HttpExceptionFilter(),    // Catch HTTP exceptions
  );

  await app.listen(3000);
}

bootstrap();
```

---

## Error Response Format

### Success Response

```typescript
// Status 200/201
{
  id: 1,
  email: "user@example.com",
  name: "John Doe",
  createdAt: "2026-04-07T10:30:00Z"
}
```

### Bad Request (400)

```typescript
{
  statusCode: 400,
  message: "Validation failed",
  error: "Bad Request",
  timestamp: "2026-04-07T10:30:00Z",
  path: "/users",
  details: {
    fields: {
      email: ["Invalid email format", "Email is required"],
      password: ["Password must be at least 8 characters"]
    }
  }
}
```

### Unauthorized (401)

```typescript
{
  statusCode: 401,
  message: "Invalid credentials",
  error: "Unauthorized",
  timestamp: "2026-04-07T10:30:00Z",
  path: "/auth/login"
}
```

### Forbidden (403)

```typescript
{
  statusCode: 403,
  message: "Insufficient permissions",
  error: "Forbidden",
  timestamp: "2026-04-07T10:30:00Z",
  path: "/admin/users",
  details: {
    required: "ADMIN"
  }
}
```

### Not Found (404)

```typescript
{
  statusCode: 404,
  message: "User not found",
  error: "Not Found",
  timestamp: "2026-04-07T10:30:00Z",
  path: "/users/999"
}
```

### Conflict (409)

```typescript
{
  statusCode: 409,
  message: "User with email test@example.com already exists",
  error: "Conflict",
  timestamp: "2026-04-07T10:30:00Z",
  path: "/users",
  details: {
    email: "test@example.com"
  }
}
```

### Internal Server Error (500)

```typescript
{
  statusCode: 500,
  message: "Internal server error",
  error: "Internal Server Error",
  timestamp: "2026-04-07T10:30:00Z",
  path: "/users",
  // ❌ NO details, NO stack trace
}
```

---

## Stack Trace Management

### ❌ NEVER INCLUDE STACK TRACES IN RESPONSES

```typescript
// ❌ WRONG - Leaks internals
response.status(500).json({
  error: error.message,
  stack: error.stack,  // ⚠️ Security risk!
  file: error.fileName,
  line: error.lineNumber,
});

// ✅ CORRECT - Safe response
response.status(500).json({
  statusCode: 500,
  message: 'Internal server error',
  error: 'Internal Server Error',
  timestamp: new Date().toISOString(),
});
```

### Internal Logging (Safe)

```typescript
// ✅ Log full stack trace internally (server logs only)
this.logger.error(
  'Database query failed',
  error.stack, // Full stack trace in logs
);

// ✅ Log with context
this.logger.error(
  `Failed to create user with email: ${email}`,
  error,
);

// ✅ Structured logging
this.logger.error({
  message: 'Payment processing failed',
  error: error.message,
  code: error.code,
  stack: error.stack,
  userId: userId,
  amount: amount,
});
```

---

## Logging Best Practices

### Logging Levels

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('UserService');

// 📋 Info - General information
logger.log('User created successfully', { userId: 1, email: 'user@example.com' });

// ⚠️ Warn - Warning conditions
logger.warn('Email verification taking longer than usual', { userId: 1 });

// ❌ Error - Error conditions WITH full details
logger.error('Database connection failed', 'Full error stack here', 'DatabaseModule');

// 🐛 Debug - Debugging information
logger.debug('Query parameters:', { limit: 10, offset: 0 });

// Verbose - Very low level
logger.verbose('HTTP request started', { method: 'POST', path: '/users' });
```

### What to Log

✅ **DO Log**:
- Error messages with context
- User IDs (safe identifier)
- Operation status (success/failure)
- Performance metrics
- External API calls (request/response)
- Authentication events

❌ **DON'T Log**:
- Passwords or tokens
- Full error stack traces in responses
- Credit card numbers
- PII beyond IDs
- Email contents
- API keys

### Structured Logging Pattern

```typescript
// src/common/utils/logger.util.ts
export class LoggerUtil {
  static logOperation(
    logger: Logger,
    operation: string,
    status: 'start' | 'success' | 'error',
    metadata?: Record<string, any>,
  ) {
    const message = `[${operation.toUpperCase()}] ${status}`;
    
    if (status === 'error') {
      logger.error(message, metadata);
    } else if (status === 'success') {
      logger.log(message, metadata);
    } else {
      logger.debug(message, metadata);
    }
  }
}

// Usage
LoggerUtil.logOperation(logger, 'user_creation', 'start', { email });
LoggerUtil.logOperation(logger, 'user_creation', 'success', { userId, email });
LoggerUtil.logOperation(logger, 'user_creation', 'error', { email, reason: error.message });
```

---

## Try-Catch Patterns

### Service Layer Pattern

```typescript
// src/modules/users/users.service.ts
import { Logger } from '@nestjs/common';
import { UserAlreadyExistsException, DatabaseException } from '@common/exceptions';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    try {
      // Check if user exists
      const existing = await this.repository.findByEmail(dto.email);
      if (existing) {
        throw new UserAlreadyExistsException(dto.email);
      }

      // Create user
      const user = await this.repository.create(dto);
      
      this.logger.log(`User created successfully`, { userId: user.id, email: user.email });
      return this.mapToDto(user);
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof UserAlreadyExistsException) {
        throw error;
      }

      // Handle database errors
      if (error instanceof Error && error.message.includes('database')) {
        this.logger.error('User creation failed - database error', error.stack);
        throw new DatabaseException('Failed to create user', error);
      }

      // Handle unexpected errors
      this.logger.error(`Unexpected error creating user`, error.stack);
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}
```

### Controller Layer Pattern

```typescript
// src/modules/users/users.controller.ts
@Post()
async create(@Body() dto: CreateUserDto): Promise<UserDto> {
  // ✅ Service handles exceptions
  // Controller just calls service
  try {
    return await this.usersService.createUser(dto);
  } catch (error) {
    // Exception filter handles response
    throw error;
  }
}

// Better: Let exception filter handle it
@Post()
async create(@Body() dto: CreateUserDto): Promise<UserDto> {
  // Service throws exception → Exception filter catches → Safe response sent
  return this.usersService.createUser(dto);
}
```

### Repository Layer Pattern

```typescript
// src/modules/users/users.repository.ts
async create(data: CreateUserInput): Promise<User> {
  try {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .returning();
    return user;
  } catch (error) {
    // Handle specific database errors
    if ((error as any).code === '23505') {
      // Unique constraint violation
      throw new UniqueConstraintException('email');
    }

    if ((error as any).code === '23503') {
      // Foreign key constraint
      throw new ForeignKeyException('userId', 'users');
    }

    // Re-throw unknown errors
    throw error;
  }
}
```

### Async Operation Pattern

```typescript
async sendVerificationEmail(email: string, token: string): Promise<void> {
  try {
    await this.emailService.send({
      to: email,
      subject: 'Verify your email',
      template: 'verify-email',
      data: { token },
    });

    this.logger.log('Verification email sent', { email });
  } catch (error) {
    this.logger.error(`Failed to send verification email`, error.stack);
    // Don't throw - email failure shouldn't block user creation
    // But log for monitoring
    throw new EmailSendingException();
  }
}
```

---

## Common Error Scenarios

### Duplicate Email Registration

```typescript
async createUser(dto: CreateUserDto): Promise<UserDto> {
  try {
    // Check if email exists
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      // ✅ Throw specific exception
      throw new UserAlreadyExistsException(dto.email);
    }

    const user = await this.repository.create(dto);
    return this.mapToDto(user);
  } catch (error) {
    // ✅ Re-throw known exceptions
    if (error instanceof UserAlreadyExistsException) {
      throw error;
    }

    // ✅ Handle unexpected
    this.logger.error('User creation failed', error.stack);
    throw new InternalServerErrorException('Failed to create user');
  }
}

// Response: 409 Conflict
{
  statusCode: 409,
  message: "User with email test@example.com already exists",
  error: "Conflict",
  details: { email: "test@example.com" }
}
```

### Authentication Failure

```typescript
async login(email: string, password: string): Promise<LoginDto> {
  try {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    const token = this.generateToken(user);
    return { token, user: this.mapToDto(user) };
  } catch (error) {
    if (error instanceof InvalidCredentialsException) {
      throw error;
    }

    this.logger.error('Login attempt failed', error.stack);
    throw new InternalServerErrorException('Login failed');
  }
}

// Response: 401 Unauthorized
{
  statusCode: 401,
  message: "Invalid email or password",
  error: "Unauthorized"
}
```

### External API Timeout

```typescript
async processPayment(amount: number, stripeToken: string): Promise<PaymentDto> {
  try {
    const charge = await this.stripeService.createCharge({
      amount,
      currency: 'usd',
      source: stripeToken,
    });

    return this.mapToDto(charge);
  } catch (error) {
    this.logger.error('Stripe API call failed', error.stack);
    throw new ExternalServiceException('Stripe', error as Error);
  }
}

// Response: 503 Service Unavailable
{
  statusCode: 503,
  message: "Stripe service is temporarily unavailable",
  error: "Service Unavailable",
  details: { service: "Stripe" }
}
```

### Database Constraint Violation

```typescript
async updateUserEmail(userId: number, newEmail: string): Promise<UserDto> {
  try {
    const user = await this.repository.update(userId, { email: newEmail });
    return this.mapToDto(user);
  } catch (error) {
    // Database error with code 23505 = unique constraint
    if ((error as any).code === '23505') {
      this.logger.warn('Email already in use', { userId, newEmail });
      throw new UniqueConstraintException('email');
    }

    this.logger.error('Update failed', error.stack);
    throw new DatabaseException('Failed to update user', error as Error);
  }
}

// Response: 409 Conflict
{
  statusCode: 409,
  message: "email must be unique",
  error: "Conflict",
  details: { field: "email" }
}
```

---

## Testing Exception Handling

### Unit Test Pattern

```typescript
describe('UsersService', () => {
  describe('createUser - error handling', () => {
    it('should throw UserAlreadyExistsException if email exists', async () => {
      const dto = { email: 'test@example.com', name: 'Test', password: 'Pass123!' };
      const existing = { id: 1, ...dto, passwordHash: 'hash' };

      jest.spyOn(repository, 'findByEmail').mockResolvedValue(existing);

      await expect(service.createUser(dto)).rejects.toThrow(
        UserAlreadyExistsException
      );
    });

    it('should throw DatabaseException on query failure', async () => {
      jest.spyOn(repository, 'findByEmail').mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(service.createUser(dto)).rejects.toThrow(
        DatabaseException
      );
    });

    it('should log error on unexpected failure', async () => {
      const error = new Error('Unexpected');
      jest.spyOn(repository, 'findByEmail').mockRejectedValue(error);

      try {
        await service.createUser(dto);
      } catch (e) {
        // Error logged internally
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });
  });
});
```

### E2E Test Pattern

```typescript
describe('POST /users (E2E - Error Handling)', () => {
  it('should return 400 for invalid email', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'invalid', name: 'Test', password: 'Pass123!' })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: expect.any(String),
      })
    );

    // ✅ Verify NO stack trace
    expect(response.body.stack).toBeUndefined();
  });

  it('should return 409 for duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send(validDto)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/users')
      .send(validDto)
      .expect(409);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'Conflict',
        message: expect.stringContaining('already exists'),
      })
    );
  });

  it('should return 500 for unhandled errors (no stack trace)', async () => {
    // Force an error (e.g., database down)
    // Response should be generic
    const response = await request(app.getHttpServer())
      .post('/users')
      .send(validDto);

    if (response.status === 500) {
      expect(response.body.message).toBe('Internal server error');
      expect(response.body.stack).toBeUndefined();
      expect(response.body.details).toBeUndefined();
    }
  });
});
```

---

## Exception Checklist

When implementing error handling:

- [ ] All exceptions thrown from services
- [ ] All exceptions caught and logged (internally)
- [ ] Safe responses sent to client (no internals)
- [ ] HTTP status codes correct
- [ ] Error messages user-friendly
- [ ] Details field only contains safe info
- [ ] NO stack traces in responses
- [ ] All error paths tested
- [ ] External API calls wrapped in try-catch
- [ ] Database errors handled specifically
- [ ] Validation errors detailed (by field)
- [ ] Logs include context (userId, email, etc.)
- [ ] Exception filters registered globally
- [ ] Tests verify error responses (status + format)

---

**Last Updated**: April 7, 2026  
**Version**: 1.0.0
