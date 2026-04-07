import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { SeedService } from './seed.service';

const logger = new Logger('Seed');

async function seed() {
  try {
    logger.log('🌱 Starting database seed script...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const seedService = app.get(SeedService);

    await seedService.seedTestData();

    logger.log('✅ Seed completed successfully');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
