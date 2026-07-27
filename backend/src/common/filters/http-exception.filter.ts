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
    let extra: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as any;
        if (Array.isArray(b.message)) {
          errors = b.message;
          message = 'Validation failed';
        } else if (typeof b.message === 'object' && b.message !== null) {
          // Structured exception: { code, ...extraFields } — flatten into response
          const { code, ...extraFields } = b.message as any;
          message = code ?? b.error ?? 'Request failed';
          extra = extraFields;
        } else {
          message = b.message ?? b.error ?? 'Request failed';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
      message = exception.message || 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...extra,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
