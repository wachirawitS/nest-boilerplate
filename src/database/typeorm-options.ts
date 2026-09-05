import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import type { EnvironmentVariables } from '../config/environment';

export function createTypeOrmOptions(
  environment: EnvironmentVariables,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: environment.DATABASE_URL,
    entities: [join(__dirname, '../modules/*/entities/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    synchronize: false,
    migrationsRun: false,
    logging: environment.NODE_ENV === 'development' ? ['error'] : false,
  };
}
