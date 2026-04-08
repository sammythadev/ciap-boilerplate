# Testing Guide

Testing expectations for this repository.

## Default Strategy

- Add unit tests for logic changes.
- Add e2e coverage for critical endpoint flows only.
- Keep tests near the code they validate when possible.

## File Placement

- Unit tests: `src/**/**/*.spec.ts`
- E2E tests: `test/*.e2e-spec.ts`

## What To Test

- Services: business rules, branching, failure cases
- Controllers: parameter handling and service delegation when behavior is non-trivial
- Repositories: query behavior only when a unit-level test is useful
- DTOs: validation rules when they are custom or error-prone
- E2E: critical happy path and key failure path

## Service Test Pattern

- Mock repositories and external providers.
- Assert business behavior, not implementation trivia.
- Cover not-found, conflict, validation, and success cases.

## Controller Test Pattern

- Mock the service.
- Verify parsed inputs and returned outputs.
- Keep controller tests thin.

## Repository Test Pattern

- Prefer mocking the database layer in unit tests.
- Use integration or e2e only when query confidence matters more than speed.

## E2E Scope

- Health checks
- Core user endpoints
- Validation failure on malformed requests
- Exception formatting for important endpoints

## Test Hygiene

- Clear mocks between tests.
- Keep fixtures small and readable.
- Use stable assertions on response shape and status codes.
- Avoid coupling tests to log text or incidental implementation details.

## Minimum Checklist

1. Did behavior change?
2. Is there a unit test for the changed logic?
3. Does a critical endpoint need e2e coverage?
4. Are error paths covered where risk is meaningful?

## Useful Commands

- `pnpm run test`
- `pnpm run test:cov`
- `pnpm run test:e2e`
