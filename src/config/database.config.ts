import { registerAs } from '@nestjs/config';

import { readEnvironment } from './environment';

export const databaseConfig = registerAs('database', () => {
  const environment = readEnvironment();

  return {
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    username: environment.DATABASE_USERNAME,
    password: environment.DATABASE_PASSWORD,
    name: environment.DATABASE_NAME,
    schema: environment.DATABASE_SCHEMA,
    isManualInitialization: environment.OPENAPI_GENERATION === 'true',
  };
});
