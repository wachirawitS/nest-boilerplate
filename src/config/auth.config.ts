import { registerAs } from '@nestjs/config';

import { readEnvironment } from './environment';

export const authConfig = registerAs('auth', () => {
  const environment = readEnvironment();

  return {
    enabled: environment.AUTH_ENABLED === 'true',
    issuer: environment.AUTH_ISSUER,
    audience: environment.AUTH_AUDIENCE,
    jwksUri: environment.AUTH_JWKS_URI,
    algorithm: environment.AUTH_ALGORITHM,
    clientId: environment.AUTH_CLIENT_ID,
  };
});
