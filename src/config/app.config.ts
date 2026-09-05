import { registerAs } from '@nestjs/config';

import { readEnvironment } from './environment';

export const appConfig = registerAs('app', () => {
  const environment = readEnvironment();

  return {
    environment: environment.NODE_ENV,
    port: environment.PORT,
    trustProxy: environment.TRUST_PROXY,
  };
});
