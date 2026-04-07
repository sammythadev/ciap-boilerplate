import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { DatabaseModule } from '../database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
