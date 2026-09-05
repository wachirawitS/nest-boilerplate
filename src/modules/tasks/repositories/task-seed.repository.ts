import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { TaskEntity } from '../entities/task.entity';

@Injectable()
export class TaskSeedRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsertExample(): Promise<void> {
    const repository = this.dataSource.getRepository(TaskEntity);
    await repository.upsert(
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Explore the boilerplate',
        description: 'Follow the tasks module from controller to repository',
        isCompleted: false,
      },
      ['id'],
    );
  }
}
