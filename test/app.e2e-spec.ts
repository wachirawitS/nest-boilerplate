import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApplication } from '../src/common/configure-application';
import { ApplicationExceptionFilter } from '../src/common/filters/application-exception.filter';
import { HealthController } from '../src/common/health/health.controller';
import { HealthService } from '../src/common/health/health.service';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { appConfig } from '../src/config/app.config';
import { TaskController } from '../src/modules/tasks/controllers/task.controller';
import { TaskEntity } from '../src/modules/tasks/entities/task.entity';
import { TasksService } from '../src/modules/tasks/services/tasks.service';

describe('HTTP API (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  const task = Object.assign(new TaskEntity(), {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Review pull request',
    description: null,
    isCompleted: false,
    createdAt: new Date('2026-09-05T00:00:00.000Z'),
    updatedAt: new Date('2026-09-05T00:00:00.000Z'),
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController, TaskController],
      providers: [
        {
          provide: appConfig.KEY,
          useValue: {
            environment: 'test',
            port: 3000,
            trustProxy: 'loopback',
          },
        },
        {
          provide: HealthService,
          useValue: {
            live: () => ({ status: 'ok' }),
            ready: () => Promise.resolve({ status: 'ok' }),
          },
        },
        {
          provide: TasksService,
          useValue: {
            create: () => Promise.resolve(task),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication<NestExpressApplication>();
    configureApplication(app as NestExpressApplication);
    app.useGlobalInterceptors(new RequestIdInterceptor());
    app.useGlobalFilters(new ApplicationExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the version-neutral liveness endpoint', async () => {
    await request(httpServer)
      .get('/api/health/live')
      .expect(200)
      .expect({ status: 'ok' })
      .expect('X-Request-Id', /.+/);
  });

  it('creates a task through the versioned route', async () => {
    await request(httpServer)
      .post('/api/v1/tasks')
      .send({ title: 'Review pull request' })
      .expect(201)
      .expect(({ body }: { body: { id?: unknown } }) => {
        expect(body.id).toBe(task.id);
      });
  });

  it('returns the shared validation error shape', async () => {
    await request(httpServer)
      .post('/api/v1/tasks')
      .send({ title: '   ', unexpected: true })
      .expect(422)
      .expect(({ body }: { body: { code?: unknown; requestId?: unknown } }) => {
        expect(body.code).toBe('VALIDATION_FAILED');
        expect(body.requestId).toEqual(expect.any(String));
      });
  });
});
import type { Server } from 'node:http';
