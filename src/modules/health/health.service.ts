import { Injectable, Logger, Inject } from '@nestjs/common';
import { HealthDto } from './dto/health.dto';
import { DATABASE_PROVIDER } from '@database/database.module';
import type { Database } from '@database/database.module';
import { sql } from 'drizzle-orm';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DATABASE_PROVIDER) private db: Database) {}

  /**
   * Check overall API health
   */
  async check(): Promise<HealthDto> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }

  /**
   * Check database connection using Drizzle ORM
   */
  async checkDatabase(): Promise<HealthDto> {
    try {
      // Use SQL raw query to test connection
      const result = await this.db.execute(sql`SELECT NOW()`);

      if (result) {
        this.logger.log('Database connection verified');
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          message: 'Database connection successful',
          database: 'connected',
        };
      }

      // If result is falsy, still return error
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Database returned empty result',
        database: 'disconnected',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Database connection failed',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check service readiness (all dependencies ready)
   */
  async readiness(): Promise<HealthDto> {
    const dbHealth = await this.checkDatabase();
    const isReady = dbHealth.status === 'ok';

    return {
      status: isReady ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
      message: isReady ? 'Service is ready' : 'Service is not ready',
      ready: isReady,
    };
  }
}
