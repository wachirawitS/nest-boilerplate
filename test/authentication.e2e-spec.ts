import type { Server } from 'node:http';

import { Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ApplicationExceptionFilter } from '../src/common/filters/application-exception.filter';
import { AuthenticationGuard } from '../src/common/guards/authentication.guard';
import { authConfig } from '../src/config/auth.config';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

@Controller('protected')
class ProtectedController {
  @Get()
  read(): { status: string } {
    return { status: 'ok' };
  }
}

describe('Authentication (e2e)', () => {
  let app: NestExpressApplication;
  let httpServer: Server;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProtectedController],
      providers: [
        {
          provide: authConfig.KEY,
          useValue: {
            issuer: 'https://identity.example.com/',
            audience: 'https://api.example.com',
            jwksUri: 'https://identity.example.com/.well-known/jwks.json',
            algorithm: 'RS256',
            clientId: 'example-bff',
          },
        },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
      ],
    }).compile();

    app = module.createNestApplication<NestExpressApplication>();
    app.useGlobalFilters(new ApplicationExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies a route without a bearer token by default', async () => {
    await request(httpServer)
      .get('/protected')
      .expect(401)
      .expect(({ body }: { body: { code?: unknown; requestId?: unknown } }) => {
        expect(body.code).toBe('UNAUTHORIZED');
        expect(body.requestId).toEqual(expect.any(String));
      });
  });
});
