import { randomUUID } from 'node:crypto';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const incomingRequestId = request.header('x-request-id');
    const requestId =
      incomingRequestId && isUUID(incomingRequestId)
        ? incomingRequestId
        : randomUUID();
    const startedAt = performance.now();

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      finalize(() => {
        this.logger.log({
          requestId,
          method: request.method,
          route: this.readRoute(request),
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
          subject: request.principal?.subject,
        });
      }),
    );
  }

  private readRoute(request: AuthenticatedRequest): string {
    const route: unknown = request.route;
    if (typeof route === 'object' && route !== null && 'path' in route) {
      const path = route.path;
      if (typeof path === 'string') {
        return path;
      }
    }

    return request.path;
  }
}
