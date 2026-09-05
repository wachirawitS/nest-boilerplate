import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import type { EnvironmentVariables } from '../config/environment';

type PostgresDataSourceOptions = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>;

export function createBootstrapTypeOrmOptions(
  environment: EnvironmentVariables,
): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: environment.DATABASE_HOST,
    port: environment.DATABASE_PORT,
    username: environment.DATABASE_USERNAME,
    password: environment.DATABASE_PASSWORD,
    database: environment.DATABASE_NAME,
    logging: false,
  };
}

export function createTypeOrmOptions(
  environment: EnvironmentVariables,
): PostgresDataSourceOptions {
  return {
    ...createBootstrapTypeOrmOptions(environment),
    schema: environment.DATABASE_SCHEMA,
    entities: [join(__dirname, '../modules/*/entities/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    synchronize: false,
    migrationsRun: false,
    logging: environment.NODE_ENV === 'development' ? ['error'] : false,
  };
}

export function createMigrationTypeOrmOptions(
  environment: EnvironmentVariables,
): PostgresDataSourceOptions {
  return {
    ...createBootstrapTypeOrmOptions(environment),
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    logging: environment.NODE_ENV === 'development' ? ['error'] : false,
  };
}
