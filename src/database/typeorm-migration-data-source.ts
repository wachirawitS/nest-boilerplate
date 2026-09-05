import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { readEnvironment } from '../config/environment';
import { createMigrationTypeOrmOptions } from './typeorm-options';

export const migrationDataSource = new DataSource(
  createMigrationTypeOrmOptions(readEnvironment()),
);
