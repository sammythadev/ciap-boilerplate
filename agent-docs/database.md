# Database Schema & Migrations

Guide to Drizzle ORM schema, migrations, and NeonDB connection.

**Last Updated**: 2026-04-07  
**ORM**: Drizzle v0.45  
**Database**: PostgreSQL (NeonDB)

---

## Database Configuration

### Connection Setup
File: `src/database/drizzle.config.ts`

```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/drizzle/schema.ts',
  out: './src/database/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    prefix: 'timestamp',
  },
});
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Example NeonDB connection:
DATABASE_URL=postgresql://user:passwordtoken@ep-quiet-bird-123.us-east-1.neon.tech/dbname?sslmode=require
```

---

## Schema Definition

### Location
`src/database/drizzle/schema.ts`

### Example: Users Table
```typescript
import { pgTable, text, timestamp, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: index('email_idx').on(table.email),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
  }),
);

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));
```

### Example: Posts Table
```typescript
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('posts_user_id_idx').on(table.userId),
  }),
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments),
}));
```

---

## Data Types

### Supported Types
```typescript
// Text
text('field_name')
varchar('field_name', { length: 255 })

// Numbers
integer('field_name')
serial('field_name')
bigint('field_name')
decimal('field_name', { precision: 10, scale: 2 })
real('field_name')

// UUID
uuid('field_name')

// Boolean
boolean('field_name')

// Dates
timestamp('created_at', { withTimezone: true })
date('birth_date')

// JSON
jsonb('metadata')  // PostgreSQL-specific

// Arrays (PostgreSQL)
text('tags').array()
integer('scores').array()

// Enums
pgEnum('user_role')('admin', 'user', 'guest')
```

---

## Migrations

### Auto-Generate Migrations
```bash
pnpm run db:generate
```

Generates migration files in `src/database/drizzle/migrations/`

### Run Migrations
```bash
pnpm run db:migrate
```

### Migration File Example
```sql
-- Migration: 1704067200_initial.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX email_idx ON users (email);
CREATE INDEX created_at_idx ON users (created_at);
```

### Migration Workflow
1. **Update schema** in `schema.ts`
2. **Generate** migration: `pnpm run db:generate`
3. **Review** generated SQL
4. **Run** migration: `pnpm run db:migrate`
5. **Commit** migration files to git

---

## Database Module Setup

### File: `src/database/database.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './drizzle/schema';

@Module({
  providers: [
    {
      provide: 'DATABASE',
      useFactory: async () => {
        const db = drizzle(
          sql`${process.env.DATABASE_URL}`,
          { schema },
        );
        return db;
      },
    },
  ],
  exports: ['DATABASE'],
})
export class DatabaseModule {}
```

---

## Using in Services/Repositories

### Repository Pattern
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Database } from 'drizzle-orm/neon-http';
import { users } from '@database/drizzle/schema';

@Injectable()
export class UserRepository {
  constructor(@Inject('DATABASE') private db: Database) {}

  async findAll() {
    return this.db.query.users.findMany();
  }

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }

  async create(data: CreateUserInput) {
    const [result] = await this.db
      .insert(users)
      .values(data)
      .returning();
    return result;
  }

  async update(id: string, data: UpdateUserInput) {
    const [result] = await this.db
      .update(users)
      .set(data)
      .where((users, { eq }) => eq(users.id, id))
      .returning();
    return result;
  }

  async delete(id: string) {
    await this.db
      .delete(users)
      .where((users, { eq }) => eq(users.id, id));
  }
}
```

---

## Relationships

### One-to-Many
```typescript
// User has many Posts
const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));
```

### Many-to-One
```typescript
// Post belongs to User
const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

### Many-to-Many
```typescript
// Usually requires junction table
export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'cascade' }),
});
```

---

## Query Examples

### Select All
```typescript
const allUsers = await db.query.users.findMany();
```

### Select with Filter
```typescript
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.email, 'john@example.com'),
});
```

### Select with Relations
```typescript
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, userId),
  with: {
    posts: true,
    comments: true,
  },
});
```

### Insert
```typescript
const newUser = await db.insert(users).values({
  email: 'new@example.com',
  name: 'New User',
  passwordHash: hashedPassword,
}).returning();
```

### Update
```typescript
await db
  .update(users)
  .set({ name: 'Updated Name' })
  .where((users, { eq }) => eq(users.id, userId));
```

### Delete
```typescript
await db
  .delete(users)
  .where((users, { eq }) => eq(users.id, userId));
```

---

## Drizzle Studio

### Open Web UI
```bash
pnpm run db:studio
```

Provides GUI for:
- Viewing data
- Managing tables
- Executing queries
- Inspecting schema

---

## Constraints

### Primary Key
```typescript
id: uuid('id').primaryKey()
```

### Unique
```typescript
email: text('email').unique()
```

### Not Null
```typescript
name: text('name').notNull()
```

### Foreign Key with Actions
```typescript
userId: uuid('user_id')
  .notNull()
  .references(() => users.id, {
    onDelete: 'cascade',  // Delete posts if user deleted
    onUpdate: 'cascade',  // Update posts if user id changes
  })
```

### Default Values
```typescript
isActive: boolean('is_active').default(true)
createdAt: timestamp('created_at').defaultNow()
```

---

## Indexes

### Single Column Index
```typescript
email: text('email').indexing('btree'),
```

### Composite Index
```typescript
(table) => ({
  userEmailIdx: index('user_email_idx')
    .on(table.userId, table.email),
})
```

### Unique Index
```typescript
(table) => ({
  emailUnique: uniqueIndex('email_unique').on(table.email),
})
```

---

## Performance Considerations

1. **Index Frequently Queried Columns**
   - Foreign keys
   - Filter/sort columns
   - Search fields (email, username)

2. **Normalize Data**
   - Avoid data duplication
   - Use relationships properly
   - Keep tables focused

3. **Query Optimization**
   - Load only needed relations
   - Use pagination for large datasets
   - Batch operations when possible

4. **Connection Pooling**
   - NeonDB handles automatically
   - Set `maxConnections` if needed

---

## Troubleshooting

### Migration Error
```bash
# Reset migrations (development only!)
pnpm run db:drop  # If available in drizzle-kit version

# Manual recovery:
1. Fix schema.ts
2. Generate new migration
3. Review SQL
4. Run migration
```

### Connection Issues
```bash
# Test connection
npx drizzle-kit test

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Schema Drift
```bash
# Regenerate migrations to sync with schema
pnpm run db:generate
```

---

## Update Schedule
This file is updated when:
- New tables are added
- Schema changes occur
- Relationships change
- Migration strategies evolve
