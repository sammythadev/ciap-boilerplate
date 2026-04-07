# Jest Testing Guide

**NestJS v11 + Drizzle ORM Testing Standards**

---

## Table of Contents

1. [Test Structure](#test-structure)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [E2E Testing](#e2e-testing)
5. [Mocking Strategies](#mocking-strategies)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [Test Isolation](#test-isolation)
8. [Test Coverage Standards](#test-coverage-standards)
9. [Common Patterns](#common-patterns)
10. [Endpoint Testing Workflow](#endpoint-testing-workflow)

---

## Test Structure

### File Organization

```
src/
├── modules/
│   ├── users/
│   │   ├── users.service.ts
│   │   ├── users.service.spec.ts          # Unit tests (60-80% coverage)
│   │   ├── users.controller.ts
│   │   ├── users.controller.spec.ts       # Unit tests (80-100% coverage)
│   │   ├── users.repository.ts
│   │   ├── users.repository.spec.ts       # Unit tests with mocked DB
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── create-user.dto.spec.ts    # DTO validation tests
│   └── users.e2e-spec.ts                  # E2E tests (ONLY for critical paths)

test/
├── jest-e2e.json                          # E2E config
└── [module].e2e-spec.ts                   # Full E2E tests with real DB
```

### Test File Naming
- **Unit tests**: `module.spec.ts` (same folder as source)
- **E2E tests**: `module.e2e-spec.ts` (in test/ folder)
- **DTO tests**: `dto.spec.ts` (in dto/ folder)

---

## Unit Testing

### Service Template with Mocking

```typescript
// src/modules/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@database/drizzle/schema';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;

  // Mock data
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed_password',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createUserDto: CreateUserDto = {
    email: 'new@example.com',
    name: 'New User',
    password: 'SecurePass123!',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const result: User = { ...mockUser, email: createUserDto.email };
      
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockResolvedValue(result);

      const created = await service.createUser(createUserDto);

      expect(repository.findByEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          name: createUserDto.name,
        })
      );
      expect(created.email).toBe(createUserDto.email);
    });

    it('should throw ConflictException if email already exists', async () => {
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(mockUser);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should hash password before creating user', async () => {
      const result: User = { ...mockUser, email: createUserDto.email };
      
      jest.spyOn(repository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockResolvedValue(result);

      await service.createUser(createUserDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: expect.not.stringContaining(createUserDto.password),
        })
      );
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockUser);

      const result = await service.getUser(mockUser.id.toString());

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith(mockUser.id.toString());
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.getUser('999')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return null for inactive user when includeInactive is false', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      jest.spyOn(repository, 'findById').mockResolvedValue(inactiveUser);

      await expect(
        service.getUser(mockUser.id.toString(), { includeInactive: false })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      jest
        .spyOn(repository, 'findById')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.getUser('1')).rejects.toThrow('Database error');
    });
  });
});
```

### Controller Template

```typescript
// src/modules/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDto } from './dto/user.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserDto: UserDto = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            getUser: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            listUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('POST /users', () => {
    it('should create user and return 201 with UserDto', async () => {
      const dto: CreateUserDto = {
        email: 'new@example.com',
        name: 'New User',
        password: 'Pass123!',
      };

      jest.spyOn(service, 'createUser').mockResolvedValue(mockUserDto);

      const result = await controller.create(dto);

      expect(result).toEqual(mockUserDto);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('passwordHash');
      expect(service.createUser).toHaveBeenCalledWith(dto);
    });

    it('should return 409 when email already exists', async () => {
      const dto: CreateUserDto = {
        email: 'existing@example.com',
        name: 'Test',
        password: 'Pass123!',
      };

      jest
        .spyOn(service, 'createUser')
        .mockRejectedValue(new ConflictException('Email already exists'));

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should validate request body (handled by ValidationPipe)', async () => {
      // ValidationPipe catches issues before controller
      // Test verifies controller handles valid data
      const validDto: CreateUserDto = {
        email: 'test@example.com',
        name: 'Test',
        password: 'Pass123!',
      };

      jest.spyOn(service, 'createUser').mockResolvedValue(mockUserDto);
      const result = await controller.create(validDto);

      expect(result).toBeDefined();
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id with 200', async () => {
      jest.spyOn(service, 'getUser').mockResolvedValue(mockUserDto);

      const result = await controller.getById('1');

      expect(result).toEqual(mockUserDto);
      expect(result.id).toBe(1);
    });

    it('should return 404 when user not found', async () => {
      jest
        .spyOn(service, 'getUser')
        .mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getById('999')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return UserDto without sensitive fields', async () => {
      jest.spyOn(service, 'getUser').mockResolvedValue(mockUserDto);

      const result = await controller.getById('1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('isEmailVerified');
    });
  });

  describe('GET /users (listing)', () => {
    it('should return paginated users list', async () => {
      const users = [mockUserDto, { ...mockUserDto, id: 2, email: 'user2@example.com' }];
      jest.spyOn(service, 'listUsers').mockResolvedValue(users);

      const result = await controller.list({ limit: 10, offset: 0 });

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      result.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      });
    });

    it('should handle empty results', async () => {
      jest.spyOn(service, 'listUsers').mockResolvedValue([]);

      const result = await controller.list({ limit: 10, offset: 0 });

      expect(result).toEqual([]);
    });
  });
});
```

### Repository Template (with Mocked DB)

```typescript
// src/modules/users/users.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { Database } from '@database/database.module';
import { User } from '@database/drizzle/schema';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let db: Database;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: 'DATABASE_CONNECTION',
          useValue: {
            query: {
              users: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
              },
            },
            insert: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    db = module.get<Database>('DATABASE_CONNECTION');
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      jest.spyOn(db.query.users, 'findFirst').mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(db.query.users.findFirst).toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      jest.spyOn(db.query.users, 'findFirst').mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user in database', async () => {
      const newUser = { email: 'new@example.com', name: 'New', passwordHash: 'hash' };
      const created = { ...mockUser, ...newUser };

      jest.spyOn(db, 'insert').mockReturnValue({
        into: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([created]),
          }),
        }),
      });

      const result = await repository.create(newUser);

      expect(result).toEqual(created);
    });
  });
});
```

---

## Integration Testing

### Database Integration Tests

```typescript
// src/modules/users/users.service.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DatabaseModule } from '@database/database.module';
import { UsersRepository } from './users.repository';

describe('UsersService (Integration)', () => {
  let service: UsersService;
  let repository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [UsersService, UsersRepository],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
  });

  // Only test actual interactions with database structures
  it('should handle concurrent user creation attempts', async () => {
    const dto = { email: 'concurrent@example.com', name: 'Test', password: 'Pass123!' };
    
    const results = await Promise.allSettled([
      service.createUser(dto),
      service.createUser(dto),
    ]);

    // One should succeed, one should conflict
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(1);
  });
});
```

---

## E2E Testing

### Critical Path E2E Tests Only

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateUserDto } from '../src/modules/users/dto/create-user.dto';
import { UserDto } from '../src/modules/users/dto/user.dto';

describe('Users API (E2E)', () => {
  let app: INestApplication;
  let userId: number;

  const createUserPayload: CreateUserDto = {
    email: `test-${Date.now()}@example.com`,
    name: 'E2E Test User',
    password: 'SecurePass123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CRITICAL PATH: User Lifecycle', () => {
    it('POST /users - should create user with 201 and valid response body', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserPayload)
        .expect(201);

      // Validate response structure
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          email: createUserPayload.email,
          name: createUserPayload.name,
          isActive: expect.any(Boolean),
          createdAt: expect.any(String),
        })
      );

      // Validate NO sensitive fields
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');

      userId = response.body.id;
    });

    it('GET /users/:id - should retrieve created user with 200', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      // Validate response structure
      expect(response.body).toEqual(
        expect.objectContaining({
          id: userId,
          email: createUserPayload.email,
          name: createUserPayload.name,
        })
      );

      expect(response.body).toHaveProperty('createdAt');
    });

    it('POST /users - should return 409 for duplicate email', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserPayload)
        .expect(409);

      // Validate error response structure
      expect(response.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
          error: 'Conflict',
          statusCode: 409,
        })
      );
    });

    it('GET /users/:id - should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/99999')
        .expect(404);

      // Validate error response
      expect(response.body.statusCode).toBe(404);
      expect(response.body.message).toBeDefined();
    });

    it('POST /users - should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          ...createUserPayload,
          email: 'invalid-email',
        })
        .expect(400);

      // Validate validation error structure
      expect(response.body).toEqual(
        expect.objectContaining({
          error: 'Bad Request',
          statusCode: 400,
        })
      );
      expect(response.body.message).toBeDefined();
    });
  });

  // ONLY add more tests for critical business logic
  // Do NOT test every possible combination
});
```

---

## Mocking Strategies

### Mock Repository Pattern

```typescript
// Pattern for consistent mocking
const mockRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});
```

### Mock Service Pattern

```typescript
// For controller tests
const mockService = {
  createUser: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  listUsers: jest.fn(),
};

// Usage
jest.spyOn(service, 'createUser').mockResolvedValue(mockData);
// or
jest.spyOn(service, 'createUser').mockRejectedValue(new Error('...'));
```

### Mock Database Query Results

```typescript
// Drizzle ORM query mocking
const mockDbQuery = {
  query: {
    users: {
      findFirst: jest.fn().mockResolvedValue(mockUser),
      findMany: jest.fn().mockResolvedValue([mockUser, mockUser2]),
    },
  },
  insert: jest.fn().mockReturnValue({
    into: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([newUser]),
      }),
    }),
  }),
};
```

### Mock HTTP Requests (E2E)

```typescript
// Standard request structure
await request(app.getHttpServer())
  .post('/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .send({ key: 'value' })
  .expect(expectedStatus);
```

---

## Edge Cases & Error Handling

### Common Edge Cases to Test

```typescript
describe('Edge Cases', () => {
  it('should handle null/undefined inputs', async () => {
    await expect(service.getUser(null)).rejects.toThrow();
    await expect(service.getUser(undefined)).rejects.toThrow();
  });

  it('should handle empty strings', async () => {
    await expect(service.getUser('')).rejects.toThrow();
  });

  it('should handle negative IDs', async () => {
    await expect(service.getUser('-1')).rejects.toThrow();
  });

  it('should handle very large numbers', async () => {
    await expect(service.getUser('9999999999999')).rejects.toThrow();
  });

  it('should handle special characters in email', async () => {
    const invalidEmail = 'test+special@example.com';
    // Test if valid or invalid based on requirements
    const result = await service.validateEmail(invalidEmail);
    expect(result).toBe(true); // or false
  });

  it('should handle concurrent requests', async () => {
    const promises = Array(10).fill(null).map(() => 
      service.createUser(dto)
    );
    
    const results = await Promise.allSettled(promises);
    // Verify all resolved or expected failures
  });

  it('should handle timeout scenarios', async () => {
    jest.spyOn(repository, 'findById').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(null), 10000))
    );

    await expect(service.getUser('1')).rejects.toThrow();
  });

  it('should trim whitespace from strings', async () => {
    const result = await service.updateUser(1, {
      name: '  John Doe  ',
    });
    
    expect(result.name).toBe('John Doe');
  });

  it('should handle unicode and special characters', async () => {
    const result = await service.updateUser(1, {
      name: '日本語 特殊文字 🎉',
    });
    
    expect(result.name).toBe('日本語 特殊文字 🎉');
  });
});
```

---

## Test Isolation

### Setup and Teardown

```typescript
describe('Service', () => {
  let service: Service;
  let repository: Repository;

  // Setup before each test
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [Service, { provide: Repository, useValue: mockRepository }],
    }).compile();

    service = module.get(Service);
    repository = module.get(Repository);

    // Reset all mocks
    jest.clearAllMocks();
  });

  // Teardown after each test
  afterEach(() => {
    jest.resetAllMocks();
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Close connections, cleanup files, etc.
  });
});
```

### Isolation Strategies

```typescript
// 1. Fresh mock data per test
const createMockUser = (overrides?) => ({
  id: Math.random(),
  email: `test-${Date.now()}@example.com`,
  ...overrides,
});

// 2. Individual test mocking
it('test 1', () => {
  jest.spyOn(repo, 'find').mockResolvedValue(mockUser1);
  // test code
});

it('test 2', () => {
  jest.spyOn(repo, 'find').mockResolvedValue(mockUser2);
  // test code - no interference from test 1
});

// 3. Factory functions for complex objects
const createTestModule = async (overrides = {}) => {
  return Test.createTestingModule({
    providers: [Service, { provide: Repo, useValue: mockRepo }],
    ...overrides,
  }).compile();
};
```

---

## Test Coverage Standards

### Coverage Goals

| Type | Minimum | Target |
|------|---------|--------|
| Services | 70% | 85-90% |
| Controllers | 80% | 90-95% |
| Repositories | 60% | 75-80% |
| Utilities | 80% | 95%+ |
| DTOs | 50% | 70% |

### Run Coverage Report

```bash
pnpm run test:cov
pnpm run test:cov -- --collectCoverageFrom="src/**/*.ts"
```

### Coverage Configuration (jest.config.js)

```typescript
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.dto.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    './src/modules/**/*.service.ts': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};
```

---

## Common Patterns

### Testing Async/Await

```typescript
// ✅ Good - Using async/await
it('should handle async operations', async () => {
  const result = await service.getUser('1');
  expect(result).toBeDefined();
});

// ✅ Also good - Using .resolves
it('should resolve promise', () => {
  return expect(service.getUser('1')).resolves.toBeDefined();
});

// ❌ Avoid - Not waiting for promise
it('should not do this', () => {
  service.getUser('1');
  // No expectation, test passes immediately
});
```

### Testing Exceptions

```typescript
// ✅ Good - Using rejects
it('should throw NotFoundException', async () => {
  jest.spyOn(repo, 'findById').mockResolvedValue(null);
  
  await expect(service.getUser('999')).rejects.toThrow(
    NotFoundException
  );
});

// ✅ Also good - Using try/catch
it('should throw NotFoundException', async () => {
  jest.spyOn(repo, 'findById').mockResolvedValue(null);
  
  try {
    await service.getUser('999');
    fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundException);
  }
});
```

### Testing Multiple Scenarios

```typescript
// ✅ Parameterized tests
describe.each([
  [1, 'active user'],
  [2, 'inactive user'],
  [3, 'deleted user'],
])('getUser with id %i (%s)', (userId, description) => {
  it('should return appropriate status', async () => {
    const user = await service.getUser(userId.toString());
    expect(user).toBeDefined();
  });
});

// Or use table-driven tests
const testCases = [
  { input: 1, expected: 'active' },
  { input: 2, expected: 'inactive' },
];

testCases.forEach(({ input, expected }) => {
  it(`should handle case: ${expected}`, async () => {
    const result = await service.getUser(input);
    expect(result.status).toBe(expected);
  });
});
```

### Testing DTO Validation

```typescript
// src/modules/users/dto/create-user.dto.spec.ts
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('should validate correct DTO', async () => {
    const dto = new CreateUserDto();
    dto.email = 'test@example.com';
    dto.name = 'Test User';
    dto.password = 'SecurePass123!';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation for invalid email', async () => {
    const dto = new CreateUserDto();
    dto.email = 'invalid-email';
    dto.name = 'Test';
    dto.password = 'Pass123!';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation for empty fields', async () => {
    const dto = new CreateUserDto();
    // Don't set any fields

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

---

## Endpoint Testing Workflow

### Step 1: Create Endpoint with Unit Tests First

When adding a new endpoint:

```typescript
// 1. Write the endpoint test in controller.spec.ts
describe('POST /feature', () => {
  it('should create feature with 201', async () => {
    const dto: CreateFeatureDto = {...};
    jest.spyOn(service, 'create').mockResolvedValue(featureDto);

    const result = await controller.create(dto);

    expect(result).toHaveProperty('id');
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});

// 2. Ensure service tests cover the business logic
describe('FeatureService', () => {
  describe('create', () => {
    it('should validate input', async () => {...});
    it('should check for duplicates', async () => {...});
    it('should persist to database', async () => {...});
  });
});

// 3. Add repository tests if needed
describe('FeatureRepository', () => {
  describe('create', () => {
    it('should insert and return created entity', async () => {...});
  });
});
```

### Step 2: Validate JSON Structure and HTTP Responses

```typescript
// E2E test for CRITICAL endpoints only
describe('POST /feature (E2E)', () => {
  it('should return proper response structure and status', async () => {
    const response = await request(app.getHttpServer())
      .post('/feature')
      .send(validPayload)
      .expect(201);

    // Validate JSON structure
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        createdAt: expect.any(String),
      })
    );

    // Validate HTTP headers
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('should return proper error structure for validation failure', async () => {
    const response = await request(app.getHttpServer())
      .post('/feature')
      .send(invalidPayload)
      .expect(400);

    // Validate error JSON structure
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
        error: 'Bad Request',
      })
    );
  });
});
```

### Step 3: Test Only Critical Paths for E2E

```typescript
// Only test critical business flows
const CRITICAL_ENDPOINTS = [
  'POST /auth/login',        // Authentication
  'POST /users',             // User creation
  'GET /users/:id',          // Critical read
  'POST /payment/charge',    // Business critical
];

// Do NOT test every combination:
// ❌ Don't: Test every GET parameter combination
// ❌ Don't: Test every error message
// ✅ Do: Test happy path + main error scenarios
// ✅ Do: Test response structure validation
// ✅ Do: Test HTTP status codes
```

### Checklist: Adding New Endpoint

- [ ] Create service method with unit tests (70%+ coverage)
- [ ] Create controller method with unit tests (90%+ coverage)
- [ ] Create repository method with mocked DB tests
- [ ] Validate DTO with unit tests
- [ ] Add E2E test for critical business path ONLY
- [ ] E2E test validates: status code + response JSON structure
- [ ] E2E test validates: error handling with proper status + error JSON
- [ ] Run `pnpm run test` - all tests pass
- [ ] Run `pnpm run test:cov` - check coverage
- [ ] Run `pnpm run test:e2e` - E2E tests pass

---

## Best Practices Summary

### ✅ DO

- Test behavior, not implementation
- Use descriptive test names
- Isolate tests from each other
- Mock external dependencies
- Test error scenarios
- Validate response structures in E2E
- Use factories for test data
- Clear mocks between tests
- Test edge cases
- Keep E2E tests minimal (critical paths only)

### ❌ DON'T

- Test implementation details (private methods)
- Share state between tests
- Hardcode test data
- Test third-party libraries
- Write E2E tests for non-critical endpoints
- Mock everything (only dependencies)
- Test types (TypeScript handles this)
- Create interdependent tests
- Ignore error cases
- Write slow or flaky tests

---

**Last Updated**: April 7, 2026  
**Version**: 1.0.0
