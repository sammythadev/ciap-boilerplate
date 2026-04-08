# Exception Handling

Rules for expected errors, unexpected failures, and response safety.

## Core Rules

- Never leak stack traces or internal details in API responses.
- Use typed HTTP or domain-specific exceptions for expected failures.
- Keep user-facing messages clear and safe.
- Log operational context internally when needed.

## Current Location

- Exception classes: `src/common/exceptions/`
- Base exception: `src/common/bases/base.exception.ts`
- Filters: `src/common/filters/`

## When To Throw

- `BadRequest`: invalid request shape or domain validation failure
- `Unauthorized`: missing or invalid auth
- `Forbidden`: authenticated but not allowed
- `NotFound`: requested resource does not exist
- `Conflict`: duplicate or incompatible state
- `InternalServerError`: only when translating an unexpected lower-level failure intentionally

## Layer Rules

- Controller: avoid broad try/catch unless translating framework input errors
- Service: throw domain exceptions for expected business failures
- Repository: surface database failures or translate known constraint issues when helpful

## Response Shape

Preferred error payload fields:

- `statusCode`
- `message`
- `error`

Keep the payload consistent with Nest and existing filters.

## Logging

- Log enough context to debug the issue.
- Do not log secrets, tokens, or full stack traces to clients.
- Log unexpected infrastructure failures close to where context exists.

## Testing

- Unit-test important expected exceptions.
- E2E-test at least one representative error response for public endpoints.

## Quick Checklist

1. Is the exception type correct?
2. Is the message safe for clients?
3. Is internal context logged where needed?
4. Will the global filter format the response consistently?
