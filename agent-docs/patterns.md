# Code Patterns

Default implementation patterns for this NestJS + Drizzle codebase.

## Core Defaults

- Keep modules thin and cohesive.
- Controllers should not talk directly to the database.
- Services should not return raw transport concerns unless required.
- Repositories should not contain business decisions.
- Prefer explicit DTOs and explicit return types.

## Controller Pattern

- Use controllers for routing, params/query/body extraction, and Swagger decorators.
- Validate input with DTOs and Nest pipes.
- Return DTOs or clearly shaped response objects.

```ts
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.getUserById(id);
  }
}
```

## Service Pattern

- Services coordinate repositories and other providers.
- Check domain invariants here.
- Map database results into DTO-ready shapes when needed.

```ts
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserById(id: number): Promise<UserDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return UserDto.fromEntity(user);
  }
}
```

## Repository Pattern

- Keep Drizzle usage here.
- Accept typed inputs and return typed records.
- Prefer small, composable query methods.

```ts
@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_PROVIDER) private readonly db: Database) {}

  findById(id: number) {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }
}
```

## DTO Pattern

- Request DTOs use `class-validator` and Swagger decorators.
- Response DTOs expose only public fields.
- Do not leak internal database-only fields to controllers by default.

## Exception Pattern

- Throw domain-specific exceptions for expected failures.
- Let unexpected failures bubble to global filters after logging as needed.
- Keep error messages useful but safe.

## Async Pattern

- Use `Promise.all` for independent async work.
- Avoid unnecessary sequential awaits.
- Keep async methods typed as `Promise<...>`.

## Type Safety

- No `any`.
- Prefer narrow unions or interfaces when behavior varies.
- Add explicit return types on exported functions and public methods.
- Check third-party method signatures before using them.

## Dependency Injection

- Inject collaborators through constructors.
- Prefer tokens/constants for infra providers like the database connection.
- Keep providers single-purpose.

## Practical Checklist

1. Does the controller only handle HTTP concerns?
2. Does the service own the business rule?
3. Does the repository own the query?
4. Are DTOs the external contract?
5. Are errors typed and safe?
