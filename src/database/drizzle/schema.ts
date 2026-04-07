import { pgTable, text, timestamp, boolean, integer, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users Table
 * Core user entity with authentication and profile information
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

/**
 * Profiles Table (Optional: for extended user information)
 * One-to-One relationship with users table
 */
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatar: text('avatar'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

/**
 * Relations
 */
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/**
 * Seed Data (for testing/development)
 * This data can be used by the seeding service
 */
export const SEED_USERS: NewUser[] = [
  {
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // "admin" hashed (for testing only)
    isActive: true,
    isEmailVerified: true,
  },
  {
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '9f86d081884c7d6d9ffd60014fc7f93c0ef726e7d3d27c6b0d2abc44c2c15bc8', // "test" hashed (for testing only)
    isActive: true,
    isEmailVerified: false,
  },
  {
    email: 'user@example.com',
    name: 'Regular User',
    passwordHash: '04f8996da763b7a969b1028ee3007569eaf3a145b4c1cbba5aa2119f957053c3', // "password" hashed (for testing only)
    isActive: true,
    isEmailVerified: true,
  },
];

export const SEED_PROFILES: NewProfile[] = [
  {
    userId: 1,
    bio: 'System administrator',
    avatar: 'https://api.example.com/avatars/admin.jpg',
    phone: '+1-555-0100',
  },
  {
    userId: 2,
    bio: 'Test account for development',
    avatar: null,
    phone: null,
  },
  {
    userId: 3,
    bio: 'Regular user account',
    avatar: 'https://api.example.com/avatars/user.jpg',
    phone: '+1-555-0101',
  },
];
