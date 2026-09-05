import { randomUUID } from 'node:crypto';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/authenticated-request';

type ApplicationErrorPayload = {
  code?: unknown;
  message?: unknown;
  fieldErrors?: unknown;
};

@Catch()
export class ApplicationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<AuthenticatedRequest>();
    const response = context.getResponse<Response>();
    const requestId = request.requestId ?? randomUUID();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.readPayload(exception);

    response.setHeader('X-Request-Id', requestId);
    response.status(statusCode).json({
      statusCode,
      code:
        typeof payload.code === 'string'
          ? payload.code
          : statusCode === 500
            ? 'INTERNAL_ERROR'
            : 'REQUEST_FAILED',
      message:
        typeof payload.message === 'string'
          ? payload.message
          : statusCode === 500
            ? 'An unexpected error occurred'
            : 'The request could not be completed',
      ...(this.isFieldErrors(payload.fieldErrors)
        ? { fieldErrors: payload.fieldErrors }
        : {}),
      requestId,
    });

    const logEntry = {
      requestId,
      method: request.method,
      path: request.path,
      statusCode,
    };
    if (statusCode >= 500) {
      this.logger.error(
        logEntry,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logEntry);
    }
  }

  private readPayload(exception: unknown): ApplicationErrorPayload {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();
    return typeof response === 'object' && response !== null
      ? response
      : { message: response };
  }

  private isFieldErrors(value: unknown): value is Record<string, unknown[]> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
