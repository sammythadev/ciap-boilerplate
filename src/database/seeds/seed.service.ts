import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE_PROVIDER } from '../database.module';
import type { Database } from '../database.module';
import { users, profiles, SEED_USERS, SEED_PROFILES } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(@Inject(DATABASE_PROVIDER) private db: Database) {}

  /**
   * Seed test data to database
   * Follows Drizzle ORM standard practices:
   * - Uses schema-defined seed data
   * - Handles existing data gracefully
   * - Uses typed queries for safety
   */
  async seedTestData(): Promise<void> {
    try {
      this.logger.log('Starting database seed...');

      // Check if data already exists
      const existingUsers = await this.db.query.users.findMany();
      if (existingUsers.length > 0) {
        this.logger.warn(`Database already has ${existingUsers.length} users. Skipping seed.`);
        return;
      }

      // Insert users
      this.logger.log(`Inserting ${SEED_USERS.length} test users...`);
      await this.db.insert(users).values(SEED_USERS);
      this.logger.log('✅ Users inserted successfully');

      // Insert profiles
      this.logger.log(`Inserting ${SEED_PROFILES.length} test profiles...`);
      await this.db.insert(profiles).values(SEED_PROFILES);
      this.logger.log('✅ Profiles inserted successfully');

      this.logger.log('✅ Database seed completed successfully');
    } catch (error) {
      this.logger.error('❌ Database seed failed:', error);
      throw error;
    }
  }

  /**
   * Clear all test data (use with caution)
   * Follows referential integrity by deleting in correct order
   */
  async clearTestData(): Promise<void> {
    try {
      this.logger.warn('⚠️  Clearing all test data...');

      // Delete in reverse order of foreign key dependencies
      await this.db.delete(profiles);
      this.logger.log('Cleared profiles table');

      await this.db.delete(users);
      this.logger.log('Cleared users table');

      this.logger.log('✅ Test data cleared');
    } catch (error) {
      this.logger.error('❌ Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Get seed status
   */
  async getStatus(): Promise<{
    seeded: boolean;
    userCount: number;
    profileCount: number;
    timestamp: string;
  }> {
    try {
      const userCount = await this.db.query.users.findMany();
      const profileCount = await this.db.query.profiles.findMany();

      return {
        seeded: userCount.length > 0,
        userCount: userCount.length,
        profileCount: profileCount.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get seed status:', error);
      throw error;
    }
  }
}
