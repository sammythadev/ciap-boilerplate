import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Catch-all exception filter for unexpected errors.
 * Handles any exception that wasn't caught by HttpExceptionFilter.
 * Returns safe JSON response without exposing internal details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Get error message and stack
    let errorMessage = 'An unexpected error occurred';
    let errorStack = '';

    if (exception instanceof Error) {
      errorMessage = exception.message;
      errorStack = exception.stack || '';
    } else if (typeof exception === 'string') {
      errorMessage = exception;
    } else if (typeof exception === 'object') {
      errorMessage = (exception as Record<string, any>)?.message || errorMessage;
    }

    // Safe response to client (no internal details)
    const formattedResponse = {
      statusCode,
      message: 'An error occurred processing your request',
      error: 'Internal Server Error',
      timestamp,
      path,
    };

    // Log full error details internally
    this.logger.error(
      `${method} ${path} - 500: ${errorMessage}`,
      {
        statusCode,
        path,
        method,
        errorMessage,
        errorType: (exception as any)?.constructor?.name || 'Unknown',
        stack: errorStack,
        fullException: exception,
      },
    );

    // Send safe response
    response.status(statusCode).json(formattedResponse);
  }
}
