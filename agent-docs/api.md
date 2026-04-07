# API Endpoints & DTOs

Comprehensive guide to API structure, DTOs, and endpoint documentation.

**Last Updated**: 2026-04-07  
**Framework**: NestJS v11 with Swagger/OpenAPI

---

## API Documentation Setup

All endpoints are automatically documented in Swagger/OpenAPI at `/api/docs`.

### Swagger Configuration (main.ts)
```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// In bootstrap function:
const config = new DocumentBuilder()
  .setTitle('Test API')
  .setDescription('API Documentation')
  .setVersion('1.0.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    'access-token',
  )
  .addTag('users', 'User management endpoints')
  .addTag('products', 'Product management endpoints')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## DTO Structure

### Best Practices
1. **Separate Creation & Update**: `CreateUserDto` vs `UpdateUserDto`
2. **Use Decorators**: `@ApiProperty()`, `@IsNotEmpty()`, `@IsEmail()`
3. **Documentation**: Describe each field
4. **Type Safety**: No `any` types

### Example DTO
```typescript
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 8 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
```

---

## Response DTOs

### Standard Response Format
```typescript
export class UserDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
```

---

## Endpoint Examples

### Users Module

#### Get All Users
```http
GET /users
```

**Response** (200 OK):
```json
[
  {
    "id": "uuid-1",
    "email": "user1@example.com",
    "name": "User One",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

#### Get User by ID
```http
GET /users/:id
```

**Response** (200 OK):
```json
{
  "id": "uuid-1",
  "email": "user1@example.com",
  "name": "User One",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

#### Create User
```http
POST /users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "securepassword123"
}
```

**Response** (201 Created):
```json
{
  "id": "new-uuid",
  "email": "newuser@example.com",
  "name": "New User",
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

## Controller Decorator Order

```typescript
@ApiTags('users')                        // Swagger grouping
@Controller('users')                     // Route path
@UseGuards(JwtAuthGuard)                // Authentication
@UseInterceptors(LoggingInterceptor)     // Logging
@UsePipes(new ValidationPipe())          // Validation
export class UsersController {
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a paginated list of users',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [UserDto],
  })
  @Get()
  async findAll(
    @Query('page') page?: number,
  ): Promise<UserDto[]> {
    // Implementation
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserDto> {
    // Implementation
  }

  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, type: UserDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    // Implementation
  }
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Common HTTP Status Codes
- **200 OK**: Successful GET request
- **201 Created**: Successful POST request
- **204 No Content**: Successful DELETE request
- **400 Bad Request**: Invalid input/validation error
- **401 Unauthorized**: Missing/invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **500 Internal Server Error**: Server error

---

## Authentication

### JWT Bearer Token
Add header to requests:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Setup in Swagger:
```typescript
.addBearerAuth(
  { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  'access-token',
)
```

Controllers requiring auth:
```typescript
@UseGuards(JwtAuthGuard)
export class UsersController { ... }
```

---

## Pagination

### Query Parameters
```http
GET /users?page=1&limit=10&sort=createdAt&order=desc
```

### Response Format
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

---

## Filtering & Searching

### Example: Find Users by Email
```http
GET /users?email=john@example.com
```

### Example: Search by Name
```http
GET /users?search=John
```

Implement in Service:
```typescript
async findByEmail(email: string): Promise<UserDto | null> {
  return this.repository.findFirstBy({
    email,
  });
}
```

---

## Rate Limiting (Optional)

If implemented:
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,      // 1 minute
        limit: 10,       // 10 requests
      },
    ]),
  ],
})
export class AppModule {}
```

---

## CORS Configuration

In `main.ts`:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Testing API Endpoints

### Using cURL
```bash
# Get users
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/users

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","password":"pass123"}'
```

### Using Postman
1. Set base URL: `http://localhost:3000`
2. Import Swagger from `/api-json`
3. Set Bearer token in authorization
4. Test endpoints

### Using Thunder Client
1. Collections → Import → Swagger/OpenAPI
2. Paste: `http://localhost:3000/api-json`
3. Auto-generates request templates

---

## API Versioning (Future)

When needed, prefix routes:
```typescript
@Controller('v1/users')
export class UsersControllerV1 {}

@Controller('v2/users')
export class UsersControllerV2 {}
```

---

## Update Schedule
This file is updated when:
- New endpoints are added
- DTOs change structure
- API breaking changes occur
- Response formats change
