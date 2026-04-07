import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@bases/base.exception';

/**
 * Thrown when database query fails
 */
export class DatabaseException extends BaseException {
  constructor(message?: string, details?: Record<string, any>) {
    super(
      message || 'Database error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR',
      details,
    );
  }
}

/**
 * Thrown when database connection fails
 */
export class DatabaseConnectionException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Failed to connect to database',
      HttpStatus.SERVICE_UNAVAILABLE,
      'DATABASE_CONNECTION_ERROR',
      details,
    );
  }
}

/**
 * Thrown when transaction fails
 */
export class TransactionFailedException extends BaseException {
  constructor(operation?: string, details?: Record<string, any>) {
    super(
      operation ? `Transaction failed: ${operation}` : 'Transaction failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTION_FAILED',
      { ...details, operation },
    );
  }
}

/**
 * Thrown when database constraint is violated
 */
export class ConstraintViolationException extends BaseException {
  constructor(constraint?: string, details?: Record<string, any>) {
    super(
      constraint ? `Constraint violation: ${constraint}` : 'Data constraint violation',
      HttpStatus.CONFLICT,
      'CONSTRAINT_VIOLATION',
      { ...details, constraint },
    );
  }
}

/**
 * Thrown when database query times out
 */
export class QueryTimeoutException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Database query timed out',
      HttpStatus.GATEWAY_TIMEOUT,
      'QUERY_TIMEOUT',
      details,
    );
  }
}

/**
 * Thrown when database is locked (usually during migration)
 */
export class DatabaseLockedException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Database is locked',
      HttpStatus.SERVICE_UNAVAILABLE,
      'DATABASE_LOCKED',
      details,
    );
  }
}
