import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import type { EnvironmentVariables } from '../config/environment';

export function createTypeOrmOptions(
  environment: EnvironmentVariables,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    username: environment.DATABASE_USERNAME,
    password: environment.DATABASE_PASSWORD,
    database: environment.DATABASE_NAME,
    schema: environment.DATABASE_SCHEMA,
    entities: [join(__dirname, '../modules/*/entities/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    synchronize: false,
    migrationsRun: false,
    logging: environment.NODE_ENV === 'development' ? ['error'] : false,
  };
}
