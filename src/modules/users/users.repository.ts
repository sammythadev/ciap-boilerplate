import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_PROVIDER } from '@database/database.module';
import type { Database } from '@database/database.module';
import { users } from '@database/drizzle/schema';
import type { User } from '@database/drizzle/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_PROVIDER) private db: Database) {}

  /**
   * Find a user by ID
   */
  async findById(id: number): Promise<User | null> {
    const result = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return result || null;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    return result || null;
  }

  /**
   * Get all users (pagination ready)
   */
  async findAll(limit = 10, offset = 0): Promise<User[]> {
    return this.db.query.users.findMany({
      limit,
      offset,
    });
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    const result = await this.db.query.users.findMany();
    return result.length;
  }
}
