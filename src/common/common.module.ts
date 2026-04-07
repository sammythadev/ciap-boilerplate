import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter, AllExceptionsFilter } from './filters';

/**
 * Global Common Module
 *
 * Provides shared utilities and global error handling.
 * Automatically imported and available to all other modules.
 *
 * Includes:
 * - Exception filters (catches all HTTP exceptions and unexpected errors)
 * - Custom decorators
 * - Guards, interceptors, pipes
 * - Utilities and validators
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [],
})
export class CommonModule {}
