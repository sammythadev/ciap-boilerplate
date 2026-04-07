import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import * as schema from './drizzle/schema';

const logger = new Logger('DatabaseModule');

export const DATABASE_PROVIDER = 'DATABASE_CONNECTION';

export type Database = NodePgDatabase<typeof schema>;

@Module({
  providers: [
    {
      provide: DATABASE_PROVIDER,
      useFactory: async (): Promise<Database> => {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
          throw new Error(
            'DATABASE_URL environment variable is not set. Check your .env file.',
          );
        }

        logger.debug(`Connecting to database...`);

        const pool = new Pool({
          connectionString,
        });

        // Test connection
        let client: PoolClient | null = null;
        try {
          client = await pool.connect();
          const result = await client.query('SELECT NOW()');
          logger.log(`Database connected successfully at ${result.rows[0].now}`);
        } catch (error) {
          logger.error('Failed to connect to database', error);
          throw error;
        } finally {
          if (client) {
            client.release();
          }
        }

        const db = drizzle(pool, { schema });
        return db;
      },
    },
  ],
  exports: [DATABASE_PROVIDER],
})
export class DatabaseModule implements OnModuleInit {
  async onModuleInit() {
    logger.log('Database module initialized');
  }
}
