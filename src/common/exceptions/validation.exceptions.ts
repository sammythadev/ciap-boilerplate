import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@bases/base.exception';

/**
 * Thrown when validation fails
 */
export class ValidationException extends BaseException {
  constructor(message?: string, details?: Record<string, any>) {
    super(
      message || 'Validation failed',
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      details,
    );
  }
}

/**
 * Thrown when email format is invalid
 */
export class InvalidEmailException extends BaseException {
  constructor(email?: string, details?: Record<string, any>) {
    super(
      'Email format is invalid',
      HttpStatus.BAD_REQUEST,
      'INVALID_EMAIL',
      { ...details, email },
    );
  }
}

/**
 * Thrown when password doesn't meet requirements
 */
export class WeakPasswordException extends BaseException {
  constructor(requirements?: string[], details?: Record<string, any>) {
    super(
      'Password does not meet security requirements',
      HttpStatus.BAD_REQUEST,
      'WEAK_PASSWORD',
      { ...details, requirements },
    );
  }
}

/**
 * Thrown when required field is missing
 */
export class MissingFieldException extends BaseException {
  constructor(field?: string, details?: Record<string, any>) {
    super(
      field ? `Missing required field: ${field}` : 'Missing required field',
      HttpStatus.BAD_REQUEST,
      'MISSING_FIELD',
      { ...details, field },
    );
  }
}

/**
 * Thrown when field value is out of acceptable range
 */
export class InvalidRangeException extends BaseException {
  constructor(field?: string, min?: number, max?: number, details?: Record<string, any>) {
    super(
      field
        ? `${field} must be between ${min} and ${max}`
        : `Value must be between ${min} and ${max}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_RANGE',
      { ...details, field, min, max },
    );
  }
}

/**
 * Thrown when input length is invalid
 */
export class InvalidLengthException extends BaseException {
  constructor(field?: string, expected?: number | Record<string, number>, details?: Record<string, any>) {
    let message = 'Invalid length';
    if (field && typeof expected === 'number') {
      message = `${field} must have exactly ${expected} characters`;
    } else if (field && typeof expected === 'object') {
      message = `${field} must be between ${expected.min} and ${expected.max} characters`;
    }

    super(message, HttpStatus.BAD_REQUEST, 'INVALID_LENGTH', { ...details, field, expected });
  }
}

/**
 * Thrown when enum value is invalid
 */
export class InvalidEnumException extends BaseException {
  constructor(field?: string, validValues?: string[], details?: Record<string, any>) {
    super(
      field
        ? `${field} must be one of: ${validValues?.join(', ')}`
        : `Invalid enum value. Valid values: ${validValues?.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_ENUM',
      { ...details, field, validValues },
    );
  }
}
