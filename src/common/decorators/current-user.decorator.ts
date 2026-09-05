import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../auth/authenticated-principal';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.principal) {
      throw new Error('Authenticated principal is unavailable');
    }

    return request.principal;
  },
);
