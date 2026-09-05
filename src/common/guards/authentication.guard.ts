import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { authConfig } from '../../config/auth.config';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {
    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!this.config.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readBearerToken(request.headers.authorization);

    if (!token) {
      throw this.unauthorized();
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        payload.client_id !== this.config.clientId
      ) {
        throw this.unauthorized();
      }

      request.principal = this.toPrincipal(payload);
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private readBearerToken(header: string | undefined): string | null {
    if (!header) {
      return null;
    }

    const match = /^Bearer ([^\s]+)$/.exec(header);
    return match?.[1] ?? null;
  }

  private toPrincipal(payload: {
    iss?: string;
    sub?: string;
    client_id?: unknown;
    scope?: unknown;
  }): AuthenticatedPrincipal {
    if (
      typeof payload.iss !== 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.client_id !== 'string'
    ) {
      throw this.unauthorized();
    }

    const scopes =
      typeof payload.scope === 'string'
        ? new Set(payload.scope.split(' ').filter(Boolean))
        : new Set<string>();

    return {
      issuer: payload.iss,
      subject: payload.sub,
      clientId: payload.client_id,
      scopes,
    };
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: 'Authentication is required',
    });
  }
}
