# API Documentation

**Last Updated**: April 7, 2026  
**Version**: 1.0.0

---

## Overview

This API is documented with Swagger/OpenAPI. Access at:
- **Dev**: http://localhost:3001/api
- **Staging**: https://staging-api.example.com/api
- **Production**: https://api.example.com/api

---

## Authentication

### JWT Bearer Token

All protected endpoints require a valid JWT token in the `Authorization` header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. Call the `/auth/login` endpoint with email and password
2. Response includes access token (24-hour expiry) and refresh token (7-day expiry)
3. Use access token in Authorization header for subsequent requests

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

### Refreshing Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Authorization: Bearer <refresh-token>"
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PUT/PATCH request |
| 201 | Created | Successful POST request |
| 204 | No Content | Successful DELETE request |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Insufficient permissions (role-based) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 500 | Server Error | Unexpected server error |
| 503 | Unavailable | Database/external service error |

---

## Error Response Format

All errors return JSON with consistent structure (no stack traces):

```json
{
  "statusCode": 400,
  "message": "Email must be a valid email address",
  "error": "Bad Request",
  "timestamp": "2026-04-07T10:30:45.123Z",
  "path": "/users",
  "details": {
    "field": "email",
    "value": "invalid-email"
  }
}
```

See `/docs/exceptions.md` for complete error handling patterns.

---

## Endpoints

### Users Module

#### Create User
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success (201)**:
```json
{
  "id": 1,
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2026-04-07T10:30:45.123Z"
}
```

**Error (400)**: Invalid input
**Error (409)**: Email already exists

---

#### Get User by ID
```http
GET /users/:id
Authorization: Bearer <token>
```

**Success (200)**: User object
**Error (401)**: Unauthorized
**Error (404)**: User not found

---

#### List Users (Paginated)
```http
GET /users?page=1&limit=10&sort=createdAt:desc
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 10, max: 100)
- `sort` (optional, format: `field:asc|desc`)

**Success (200)**:
```json
{
  "data": [
    {"id": 1, "email": "john@example.com", ...},
    {"id": 2, "email": "jane@example.com", ...}
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

---

#### Update User
```http
PATCH /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Johnny",
  "lastName": "Doe"
}
```

**Success (200)**: Updated user object
**Error (404)**: User not found
**Error (409)**: Email conflict (if updating email)

---

#### Delete User
```http
DELETE /users/:id
Authorization: Bearer <token>
```

**Success (204)**: No content
**Error (404)**: User not found

---

### Products Module

*Similar structure to Users module*

---

## Pagination

All list endpoints support pagination:

```typescript
// Response format
{
  "data": [...items],
  "meta": {
    "total": 100,        // Total items in database
    "page": 1,           // Current page
    "limit": 10,         // Items per page
    "pages": 10          // Total pages
  }
}
```

### Pagination Query

```bash
GET /users?page=2&limit=20
```

---

## Filtering

Most list endpoints support filtering:

```bash
# Filter by status
GET /users?status=active

# Filter by role
GET /users?role=admin

# Multiple filters (AND logic)
GET /users?status=active&role=admin
```

---

## Sorting

List endpoints support sorting:

```bash
# Sort ascending (default)
GET /users?sort=createdAt:asc

# Sort descending
GET /users?sort=createdAt:desc

# Multiple sort fields
GET /users?sort=role:asc,createdAt:desc
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Public endpoints | 100 requests | 1 hour |
| Authenticated endpoints | 1000 requests | 1 hour |
| Auth endpoints | 10 requests | 1 hour |

### Headers

Rate limit info is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1617859200
```

When limit is exceeded, API returns `429 Too Many Requests`.

---

## Webhook Events

*Document webhook events if applicable*

### User Created Event

```json
{
  "event": "user.created",
  "timestamp": "2026-04-07T10:30:45.123Z",
  "data": {
    "id": 1,
    "email": "john@example.com",
    "firstName": "John"
  }
}
```

---

## Versioning

The API currently uses **v1** (implicit).

Future versions will use:
- `GET /v2/users` for v2 endpoints
- `/v1/users` continues to work
- Deprecation warnings in v1 responses

---

## Deprecations

No endpoints are currently deprecated.

---

## Support & Issues

- **Documentation**: See `/docs/` folder
- **Bug Reports**: GitHub Issues
- **Support**: support@example.com

