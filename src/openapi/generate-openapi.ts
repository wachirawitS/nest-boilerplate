import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from '../app.module';
import { configureApplication } from '../common/configure-application';
import { createOpenApiDocument } from '../common/openapi/create-openapi-document';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  configureApplication(app);

  const document = createOpenApiDocument(app);
  await writeFile(
    resolve('openapi.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8',
  );
  await app.close();
}

void generateOpenApi();
