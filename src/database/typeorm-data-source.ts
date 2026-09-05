import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { readEnvironment } from '../config/environment';
import { createTypeOrmOptions } from './typeorm-options';

export const applicationDataSource = new DataSource(
  createTypeOrmOptions(readEnvironment()),
);
