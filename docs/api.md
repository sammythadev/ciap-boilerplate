# API Documentation

Updated for the current NestJS codebase on 2026-04-09.

## Base URLs

- Local API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`

## Auth Model

- Access token: JWT signed with `ES256`
- Refresh token: JWT signed with `ES512`
- Refresh tokens are session-backed:
  - raw token is returned once to client
  - SHA-256 hash is stored in `sessions.refresh_token_hash`
  - refresh rotates by revoking old session and creating a new one

Use bearer auth on protected endpoints:

```http
Authorization: Bearer <access_token>
```

## Endpoint Index

### Root and health

- `GET /` - API metadata
- `GET /health` - basic API health
- `GET /health/db` - database connectivity health
- `GET /health/ready` - readiness status

### Auth

- `POST /auth/signup` - create account (public)
- `POST /auth/login` - login with email/password (public)
- `POST /auth/admin/signup` - create admin account (public endpoint, protected by `ADMIN_SIGNUP_KEY`)
- `POST /auth/admin/login` - admin login (public)
- `POST /auth/refresh` - rotate refresh token (public)
- `GET /auth/verify` - verify access token + session (protected)
- `POST /auth/logout` - revoke current session (protected)
- `GET /auth/roles` - list roles (protected, `admin` only)

### Auth social providers

- `GET /auth/socials/oauth2/google/login` - build Google OAuth authorization URL for login (public)
- `GET /auth/socials/google/login/callback` - Google OAuth login callback endpoint (public)
- `POST /auth/socials/google/token/refresh` - refresh stored Google OAuth token for current user (protected)
- `GET /auth/socials/google/youtube/metrics` - pull channel + latest 10 videos + analytics metrics (protected, no persistence)
  - Response may include `analyticsStatus` and `analyticsWarning` when analytics access is unavailable.
  - Returns `404` when the authenticated account has no YouTube channel.
- `GET /auth/socials/google/youtube/metrics/job-payload` - prepare BullMQ job payload contract (protected, no enqueue)

Deprecated (excluded from Swagger):

- `POST /auth/socials/google` - legacy Google ID token login
- `GET /auth/socials/oauth2/google` - legacy Google OAuth prepare endpoint
- `GET /auth/socials/google/callback` - legacy Google OAuth callback endpoint

### Ingestion

- `GET /ingestion/youtube/metrics` - pull authenticated user channel + latest 10 videos + analytics metrics (protected, no persistence)
  - Response may include `analyticsStatus` and `analyticsWarning` when analytics access is unavailable.
  - Returns `200` with `ingestionStatus=warning` when the authenticated account has no YouTube channel.
- `GET /ingestion/youtube/oauth2` - prepare Google OAuth flow for YouTube connect (protected)
- `GET /ingestion/youtube/oauth2/callback` - Google OAuth callback for YouTube connect + immediate sync (public)
- `POST /ingestion/youtube/permissions/approve` - approve YouTube permissions (protected)
- `POST /ingestion/youtube/approve` - approve YouTube channel for analytics tracking (protected)

### Creator insights

- `GET /creators/insights/audience` - audience insights (protected, creator only)
- `GET /creators/insights/content` - content insights (protected, creator only)

### SME creator discovery

- `GET /sme/creators/discovery` - creator discovery (protected, sme only)
- `GET /sme/creators/compare` - compare creators by IDs or search (protected, sme only)

### Users

- `GET /users/:id` - get user by id (protected + RBAC + abilities)
- `GET /users?limit=10&offset=0` - list tenant users (protected, `sme` only)
- `GET /users/admin/all?limit=10&offset=0` - list users across tenants (protected, `admin` only)

## Request and Response Examples

### Signup

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.user@example.com",
    "name": "New User",
    "password": "StrongPassword123!",
    "role": "creator"
  }'
```

Response shape:

```json
{
  "user": {
    "id": 7,
    "email": "new.user@example.com",
    "name": "New User",
    "role": "user",
    "tenantId": 2,
    "isEmailVerified": false
  },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "expiresIn": 900
}
```

### Login

`POST /auth/login` does not accept admin accounts. Admin must use `/auth/admin/login`.

### Refresh

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

### Verify session

```bash
curl http://localhost:3000/auth/verify \
  -H "Authorization: Bearer <access_token>"
```

Response shape:

```json
{
  "valid": true,
  "userId": 1,
  "email": "admin@example.com",
  "tenantId": 1,
  "role": "admin",
  "sessionId": "7b4e5e22-0a69-4de5-93b9-e46d9454b0f8"
}
```

### Start Google OAuth in browser

```text
GET http://localhost:3000/auth/socials/oauth2/google/login?role=creator
```

It returns an `authorizationUrl`. Open it in a browser, approve consent, then Google redirects to:

```text
http://localhost:3000/auth/socials/google/login/callback?code=...&state=...
```

Callback error cases:

- `400` when `code` query param is missing
- `401` when Google returns `invalid_grant` (expired/invalid/reused authorization code)

### Connect YouTube via OAuth

```text
GET http://localhost:3000/ingestion/youtube/oauth2
```

Open the `authorizationUrl`. Google redirects to:

```text
http://localhost:3000/ingestion/youtube/oauth2/callback?code=...&state=...&iss=...&scope=...&authuser=...&prompt=...
```

The callback immediately runs the YouTube ingestion sync and queues influence scoring.

Important:

- Google sign-in (`/auth/socials/oauth2/google/login`) is only for app authentication.
- YouTube ingestion requires the separate `/ingestion/youtube/oauth2` consent flow because the login flow does not grant YouTube scopes.

### Pull YouTube metrics

```bash
curl "http://localhost:3000/auth/socials/google/youtube/metrics?days=30&maxVideos=10" \
  -H "Authorization: Bearer <access_token>"
```

Notes:

- Pulls channel-level and video-level metrics for the latest videos (`maxVideos <= 10`).
- Pulls Analytics API data for the requested date window (`days <= 90`).
- Metrics are returned directly and are not persisted.
- Response includes BullMQ queue/job payload contract for later queue integration.
- Requires a linked Google OAuth token for the authenticated user; otherwise returns `401` with `oauth2-link-required` details.
- Returns `404` when the authenticated account has no YouTube channel.
- Use `/ingestion/youtube/oauth2` to connect YouTube if missing.

### Ingest YouTube metrics

```bash
curl "http://localhost:3000/ingestion/youtube/metrics?days=30&maxVideos=10" \
  -H "Authorization: Bearer <access_token>"
```

Notes:

- Uses the authenticated user's stored Google OAuth token (linked via `/ingestion/youtube/oauth2`).
- If the stored Google token lacks YouTube scopes, the API returns `401` with `oauth2-link-required` details so the user can reconnect through `/ingestion/youtube/oauth2`.
- Returns channel info including `statistics.viewCount` and a top-level `channelViews`.
- Pulls analytics metrics for the requested date window (`days <= 90`).
- Returns `401` with `oauth2-link-required` details if no Google OAuth token is available.
- Returns `200` with `ingestionStatus=warning` when the authenticated account has no YouTube channel.

### Approve YouTube permissions

```bash
curl -X POST http://localhost:3000/ingestion/youtube/permissions/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"youtubeChannelId":"UC123456789"}'
```

### Approve YouTube channel

```bash
curl -X POST http://localhost:3000/ingestion/youtube/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"youtubeChannelId":"UC123456789"}'
```

### Protected users endpoint

```bash
curl http://localhost:3000/users/1 \
  -H "Authorization: Bearer <access_token>"
```

## RBAC and Ability Enforcement

- Roles: `admin`, `user`, `sme`, `creator`
- Guards on protected user endpoints:
  - `JwtAuthGuard`
  - `RolesGuard`
  - `AbilitiesGuard`
- Example:
  - `/users/:id` accepts abilities `users:read:any`, `users:read:tenant`, `users:read:self`
  - `/users` list requires `users:list:tenant` (`sme`)
  - `/users/admin/all` requires `users:list:any` (`admin`)
  - social token refresh + YouTube pull endpoints enforce dedicated social abilities

## Error Contract

The global filters return safe JSON. Typical shape:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2026-04-08T15:30:00.000Z",
  "path": "/auth/verify"
}
```

- 4xx errors are logged as warnings.
- 5xx errors are logged with server-side stack details.
- Internal stack traces are not returned to clients.

## Implementation Notes

- `GET /auth/verify` is intentionally a `GET` endpoint using bearer token auth.
- OAuth callback routes are `GET` because providers redirect with query params (`code`, etc.).
- API version prefix is not currently applied in route registration.
- Duplicate Google auth route overlap was removed:
  - old mixed routes under `/auth/google*` and `/auth/oauth2/*` were replaced with `/auth/socials/*`.
  - health functionality is owned by `HealthModule` routes under `/health*`.

## When API Changes

If routes, DTOs, guards, or auth flow change, update in the same pull request:

1. this file (`docs/api.md`)
2. `docs/implementation-guide.md` (if workflow or conventions changed)
3. Swagger decorators in controllers
