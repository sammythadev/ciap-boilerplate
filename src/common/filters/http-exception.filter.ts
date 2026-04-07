import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Filter for handling HttpException and subclasses.
 * Catches exceptions with known HTTP status codes and formats response.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private logger = new Logger('HttpExceptionFilter');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Get error details (may include custom fields for known exceptions)
    const errorResponse =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, any>)
        : { message: exceptionResponse };

    // Ensure response structure
    const formattedResponse = {
      statusCode,
      message: errorResponse.message || HttpStatus[statusCode] || 'Unknown Error',
      error: errorResponse.error || HttpStatus[statusCode],
      timestamp: errorResponse.timestamp || new Date().toISOString(),
      path: request.url,
      ...(errorResponse.details && { details: errorResponse.details }),
    };

    // Log error (include stack trace for debugging)
    this.logger.warn(
      `${request.method} ${request.url} - ${statusCode}: ${formattedResponse.message}`,
      {
        statusCode,
        path: request.url,
        method: request.method,
        details: errorResponse.details,
        stack: exception.stack,
      },
    );

    // Send response (no stack trace to client)
    response.status(statusCode).json(formattedResponse);
  }
}
