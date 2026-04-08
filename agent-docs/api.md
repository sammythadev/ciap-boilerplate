# API Conventions

Reference for controllers, DTOs, Swagger, and response behavior.

## Current Setup

- Swagger is configured in `src/swagger.ts`.
- Docs are served at `/api`.
- Global validation is configured in `src/main.ts`.

## Controller Conventions

- Tag controllers with `@ApiTags`.
- Document operations with `@ApiOperation`.
- Add `@ApiResponse` for main success and important failure cases.
- Use Nest pipes for typed params and queries.

## DTO Conventions

- Request DTOs: validation decorators plus Swagger metadata
- Response DTOs: explicit public fields only
- Keep examples realistic and small

## Endpoint Design

- Use plural resource names for collection routes
- Use route params for identity, query params for filtering/pagination
- Keep controller methods thin and descriptive

## Pagination

Prefer:

- `limit`
- `offset`

Document defaults and max values in Swagger when used.

## Error Responses

Document key failure codes when the endpoint has meaningful branches:

- `400`
- `401`
- `403`
- `404`
- `409`

## Auth Documentation

- Use bearer auth in Swagger when an endpoint is protected.
- Keep auth naming consistent with the Swagger setup in `src/swagger.ts`.

## Testing API Changes

At minimum:

1. Unit-test non-trivial controller/service logic.
2. Verify Swagger decorators still match the contract.
3. Add e2e coverage for critical new routes.
