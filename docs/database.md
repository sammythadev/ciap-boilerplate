# Database Schema & Migrations

**Last Updated**: April 7, 2026  
**Version**: 1.0.0

---

## Overview

- **ORM**: Drizzle ORM v0.45
- **Database**: PostgreSQL (NeonDB serverless)
- **Connection**: `pg` + `@neondatabase/serverless` adapters
- **Migrations**: SQL-based with version control

---

## Schema Definition

All tables are defined in `src/database/drizzle/schema.ts`:

```typescript
import { pgTable, serial, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Type Safety

Use Drizzle's type inference for maximum type safety:

```typescript
import { User, NewUser } from '@database/drizzle/schema';

// User: Full type (includes all fields)
const user: User = { id: 1, email: '...', ... };

// NewUser: Insert/update type (excludes auto-generated fields like id, createdAt)
const newUser: NewUser = { email: '...', passwordHash: '...' };
```

---

## Migrations

### Generate Migration

When you modify `schema.ts`, generate a migration:

```bash
pnpm run db:generate
```

This creates a new SQL file in `src/database/drizzle/migrations/`:

```sql
-- migration: 0001_add_users_table.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Run Migrations

```bash
pnpm run db:migrate
```

This applies all pending migrations to the database.

### Workflow

```
1. Edit src/database/drizzle/schema.ts
2. Run: pnpm run db:generate
3. Review generated SQL in migrations/
4. Run: pnpm run db:migrate
5. Test your code against new schema
6. Commit schema.ts + generated migration files
```

---

## Seeding

### Seed Data

Define seed data in `src/database/drizzle/schema.ts`:

```typescript
export const SEED_USERS: NewUser[] = [
  {
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Admin',
    lastName: 'User',
  },
  {
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
  },
];
```

### Seed Script

Create `src/database/seeds/seed.ts`:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Starting seed...');

  // Clear existing data (careful in production!)
  await db.delete(schema.users);

  // Insert seed data
  await db.insert(schema.users).values(schema.SEED_USERS);

  console.log('✅ Seed completed');

  await pool.end();
}

seed().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
```

### Run Seeds

```bash
pnpm run db:seed
```

---

## Relationships

### One-to-Many

Example: User has many Posts

```typescript
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.userId], references: [users.id] }),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Query with Relations

```typescript
// Get user with all posts
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: true, // Load related posts
  },
});
```

---

## Query Examples

### Insert

```typescript
const [newUser] = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    passwordHash: 'hashed',
    firstName: 'John',
  })
  .returning();

return newUser;
```

### Select (Find One)

```typescript
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});
```

### Select (Find Many)

```typescript
const allUsers = await db.query.users.findMany({
  limit: 10,
  offset: 0,
});
```

### Update

```typescript
const [updated] = await db
  .update(users)
  .set({ firstName: 'Jane' })
  .where(eq(users.id, userId))
  .returning();
```

### Delete

```typescript
await db.delete(users).where(eq(users.id, userId));
```

---

## Database Tools

### Drizzle Studio (GUI)

Inspect your database with a visual interface:

```bash
pnpm run db:studio
```

Opens at `http://localhost:5555`

### Format SQL

```bash
pnpm run db:format
```

---

## Best Practices

1. **Always use migrations** — Never execute raw SQL against production
2. **Test migrations locally** — Run `db:migrate` and test thoroughly
3. **Seed test data** — Use seed files for development/testing
4. **Use transactions** — For multi-step operations
5. **Index foreign keys** — Improves join performance
6. **Add constraints** — NOT NULL, UNIQUE, CHECK for data integrity
7. **Version control schema** — Commit schema.ts and migrations
8. **Type-safe queries** — Use Drizzle's type inference
9. **Avoid N+1 queries** — Load relationships with `with` clause
10. **Handle timestamps** — Always include `createdAt` and `updatedAt`

---

## Common Patterns

### Pagination Repository Method

```typescript
async findPaginated(page = 1, limit = 10): Promise<{ items: User[]; total: number }> {
  const offset = (page - 1) * limit;

  const items = await this.db.query.users.findMany({
    limit,
    offset,
    orderBy: desc(schema.users.createdAt),
  });

  const result = await this.db
    .select({ count: count() })
    .from(schema.users);

  const total = result[0]?.count || 0;

  return { items, total };
}
```

### Transaction Example

```typescript
async createUserWithProfile(userData: CreateUserDto): Promise<User> {
  const [user] = await this.db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values(userData)
      .returning();

    await tx.insert(userProfiles).values({
      userId: newUser.id,
      bio: '',
    });

    return [newUser];
  });

  return user;
}
```

---

## References

- Drizzle Docs: https://orm.drizzle.team
- PostgreSQL Docs: https://www.postgresql.org/docs
- NeonDB Docs: https://neon.tech/docs

