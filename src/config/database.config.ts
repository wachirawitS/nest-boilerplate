import { registerAs } from '@nestjs/config';

import { readEnvironment } from './environment';

export const databaseConfig = registerAs('database', () => {
  const environment = readEnvironment();

  return {
    url: environment.DATABASE_URL,
    isManualInitialization: environment.OPENAPI_GENERATION === 'true',
  };
});
