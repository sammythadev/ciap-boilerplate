import { HttpStatus } from '@nestjs/common';
import { BaseException } from '@bases/base.exception';

/**
 * Thrown when external API request fails
 */
export class ExternalApiException extends BaseException {
  constructor(service?: string, details?: Record<string, any>) {
    super(
      service ? `${service} API request failed` : 'External API request failed',
      HttpStatus.SERVICE_UNAVAILABLE,
      'EXTERNAL_API_ERROR',
      { ...details, service },
    );
  }
}

/**
 * Thrown when external API request times out
 */
export class ExternalApiTimeoutException extends BaseException {
  constructor(service?: string, details?: Record<string, any>) {
    super(
      service ? `${service} API request timed out` : 'External API request timed out',
      HttpStatus.GATEWAY_TIMEOUT,
      'EXTERNAL_API_TIMEOUT',
      { ...details, service },
    );
  }
}

/**
 * Thrown when external API returns error response
 */
export class ExternalApiResponseException extends BaseException {
  constructor(service?: string, statusCode?: number, details?: Record<string, any>) {
    super(
      service
        ? `${service} API returned error (${statusCode})`
        : `External API returned error (${statusCode})`,
      HttpStatus.BAD_GATEWAY,
      'EXTERNAL_API_ERROR_RESPONSE',
      { ...details, service, statusCode },
    );
  }
}

/**
 * Thrown when email sending fails
 */
export class EmailSendingException extends BaseException {
  constructor(recipient?: string, details?: Record<string, any>) {
    super(
      recipient ? `Failed to send email to ${recipient}` : 'Failed to send email',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'EMAIL_SENDING_ERROR',
      { ...details, recipient },
    );
  }
}

/**
 * Thrown when file upload fails
 */
export class FileUploadException extends BaseException {
  constructor(reason?: string, details?: Record<string, any>) {
    super(
      reason ? `File upload failed: ${reason}` : 'File upload failed',
      HttpStatus.BAD_REQUEST,
      'FILE_UPLOAD_ERROR',
      { ...details, reason },
    );
  }
}

/**
 * Thrown when third-party integration fails
 */
export class IntegrationException extends BaseException {
  constructor(provider?: string, message?: string, details?: Record<string, any>) {
    super(
      message || (provider ? `${provider} integration error` : 'Integration error'),
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTEGRATION_ERROR',
      { ...details, provider },
    );
  }
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitExceededException extends BaseException {
  constructor(retryAfter?: number, details?: Record<string, any>) {
    super(
      'Too many requests',
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      { ...details, retryAfter },
    );
  }
}
