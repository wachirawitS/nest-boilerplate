import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApplication } from './common/configure-application';
import { appConfig } from './config/app.config';
import { createApplicationLogger } from './config/application-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: createApplicationLogger(),
  });
  configureApplication(app);
  const config = app.get<ReturnType<typeof appConfig>>(appConfig.KEY);
  await app.listen(config.port);
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Application failed to start',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
