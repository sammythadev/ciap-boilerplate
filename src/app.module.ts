import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from '@modules/health/health.module';
import { UsersModule } from '@modules/users/users.module';
import { DatabaseModule } from '@database/database.module';
import { SeedModule } from '@database/seeds/seed.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [DatabaseModule, SeedModule, HealthModule, UsersModule,CommonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
