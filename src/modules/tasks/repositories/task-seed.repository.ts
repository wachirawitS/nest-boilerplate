import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TaskSeedRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsertExample(): Promise<void> {
    await this.dataSource.query(
      `
        INSERT INTO "tasks" ("id", "title", "description")
        VALUES ($1, $2, $3)
        ON CONFLICT ("id") DO UPDATE SET
          "title" = EXCLUDED."title",
          "description" = EXCLUDED."description",
          "updated_at" = now()
      `,
      [
        '11111111-1111-4111-8111-111111111111',
        'Explore the boilerplate',
        'Follow the tasks module from controller to repository',
      ],
    );
  }
}
