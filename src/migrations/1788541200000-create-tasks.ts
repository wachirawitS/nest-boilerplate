import { Table } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { readEnvironment } from '../config/environment';

export class CreateTasks1788541200000 implements MigrationInterface {
  name = 'CreateTasks1788541200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = this.readSchema();
    await queryRunner.createTable(
      new Table({
        name: `${schema}.tasks`,
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
            default: 'gen_random_uuid()',
            primaryKeyConstraintName: 'pk_tasks',
          },
          { name: 'title', type: 'varchar', length: '120', isNullable: false },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_completed',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
        ],
        checks: [
          {
            name: 'chk_tasks_title_not_blank',
            expression: 'char_length(trim("title")) > 0',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(`${this.readSchema()}.tasks`);
  }

  private readSchema(): string {
    return readEnvironment().DATABASE_SCHEMA;
  }
}
