import type { MigrationInterface, QueryRunner } from 'typeorm';

import { readEnvironment } from '../config/environment';

export class CreateApplicationSchema1788541100000 implements MigrationInterface {
  name = 'CreateApplicationSchema1788541100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createSchema(readEnvironment().DATABASE_SCHEMA, true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = readEnvironment().DATABASE_SCHEMA;
    if (schema !== 'public') {
      await queryRunner.dropSchema(schema);
    }
  }
}
