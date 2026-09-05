import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasks1788541200000 implements MigrationInterface {
  name = 'CreateTasks1788541200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(120) NOT NULL,
        "description" varchar(500),
        "is_completed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "chk_tasks_title_not_blank"
          CHECK (char_length(trim("title")) > 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tasks"');
  }
}
