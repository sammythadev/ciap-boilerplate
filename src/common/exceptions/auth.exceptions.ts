import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@bases/base.exception';

/**
 * Thrown when user provides invalid credentials
 */
export class InvalidCredentialsException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
      details,
    );
  }
}

/**
 * Thrown when JWT token has expired
 */
export class TokenExpiredException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Token has expired',
      HttpStatus.UNAUTHORIZED,
      'TOKEN_EXPIRED',
      details,
    );
  }
}

/**
 * Thrown when JWT token is invalid or malformed
 */
export class InvalidTokenException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Invalid or malformed token',
      HttpStatus.UNAUTHORIZED,
      'INVALID_TOKEN',
      details,
    );
  }
}

/**
 * Thrown when user lacks required permissions
 */
export class InsufficientPermissionsException extends BaseException {
  constructor(requiredRole?: string, details?: Record<string, any>) {
    super(
      requiredRole
        ? `Insufficient permissions. Required role: ${requiredRole}`
        : 'Insufficient permissions',
      HttpStatus.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS',
      details,
    );
  }
}

/**
 * Thrown when user account is locked
 */
export class AccountLockedException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Account is locked',
      HttpStatus.FORBIDDEN,
      'ACCOUNT_LOCKED',
      details,
    );
  }
}

/**
 * Thrown when user account is disabled
 */
export class AccountDisabledException extends BaseException {
  constructor(details?: Record<string, any>) {
    super(
      'Account is disabled',
      HttpStatus.FORBIDDEN,
      'ACCOUNT_DISABLED',
      details,
    );
  }
}
