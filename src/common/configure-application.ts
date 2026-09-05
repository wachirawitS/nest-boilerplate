import type { ConfigType } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { appConfig } from '../config/app.config';
import { createOpenApiDocument } from './openapi/create-openapi-document';
import { createValidationPipe } from './pipes/validation.pipe';

export function configureApplication(app: NestExpressApplication): void {
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.use(helmet());
  app.set('trust proxy', config.trustProxy);
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  if (config.environment === 'development') {
    const document = createOpenApiDocument(app);
    SwaggerModule.setup('docs', app, document);
  }
}
