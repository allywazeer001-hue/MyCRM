import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as any;
        message = b.message ?? b.error ?? 'Request failed';
        if (Array.isArray(b.message)) {
          errors = b.message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      // Log unexpected errors but don't leak internals
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
      // Check for known Prisma errors to give useful feedback
      const msg = exception.message || '';
      if (msg.includes('Unique constraint')) {
        status = HttpStatus.CONFLICT;
        message = 'A record with that value already exists';
      } else if (msg.includes('Foreign key constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Referenced record does not exist';
      } else if (msg.includes('does not exist in the current database')) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database schema out of sync — run prisma migrate dev';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
