import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for all custom exceptions.
 * Extends HttpException to integrate with NestJS error handling.
 *
 * @abstract
 * @extends {HttpException}
 */
export abstract class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly code: string,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        message,
        error: HttpStatus[statusCode],
        timestamp: new Date().toISOString(),
        details,
      },
      statusCode,
    );

    // Set prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get safe error response (no stack trace, internal details safe)
   */
  getResponse(): Record<string, any> {
    return super.getResponse() as Record<string, any>;
  }

  /**
   * Get full error details including stack trace (for logging only)
   */
  getFullDetails() {
    return {
      ...this.getResponse(),
      stack: this.stack,
    };
  }
}
