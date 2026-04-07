import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@bases/base.exception';

/**
 * Thrown when requested user is not found
 */
export class UserNotFoundException extends BaseException {
  constructor(userId?: number | string, details?: Record<string, any>) {
    super(
      userId ? `User #${userId} not found` : 'User not found',
      HttpStatus.NOT_FOUND,
      'USER_NOT_FOUND',
      { ...details, userId },
    );
  }
}

/**
 * Thrown when email already exists in database
 */
export class DuplicateEmailException extends BaseException {
  constructor(email?: string, details?: Record<string, any>) {
    super(
      'Email already exists',
      HttpStatus.CONFLICT,
      'DUPLICATE_EMAIL',
      { ...details, email },
    );
  }
}

/**
 * Thrown when attempting to create user with invalid data
 */
export class InvalidUserDataException extends BaseException {
  constructor(field?: string, details?: Record<string, any>) {
    super(
      field ? `Invalid user data: ${field}` : 'Invalid user data',
      HttpStatus.BAD_REQUEST,
      'INVALID_USER_DATA',
      { ...details, field },
    );
  }
}

/**
 * Thrown when user profile is incomplete
 */
export class IncompleteUserProfileException extends BaseException {
  constructor(missingFields?: string[], details?: Record<string, any>) {
    super(
      missingFields
        ? `Incomplete profile. Missing: ${missingFields.join(', ')}`
        : 'Incomplete user profile',
      HttpStatus.BAD_REQUEST,
      'INCOMPLETE_PROFILE',
      { ...details, missingFields },
    );
  }
}

/**
 * Thrown when user tries to perform action on another user without permission
 */
export class UnauthorizedUserActionException extends BaseException {
  constructor(action?: string, details?: Record<string, any>) {
    super(
      action ? `Not authorized to ${action}` : 'Not authorized to perform this action',
      HttpStatus.FORBIDDEN,
      'UNAUTHORIZED_USER_ACTION',
      { ...details, action },
    );
  }
}

/**
 * Thrown when user limit exceeded (e.g., max users per organization)
 */
export class UserLimitExceededException extends BaseException {
  constructor(limit?: number, details?: Record<string, any>) {
    super(
      limit ? `User limit exceeded (${limit})` : 'User limit exceeded',
      HttpStatus.CONFLICT,
      'USER_LIMIT_EXCEEDED',
      { ...details, limit },
    );
  }
}
