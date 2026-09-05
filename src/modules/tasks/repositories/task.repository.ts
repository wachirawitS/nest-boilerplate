import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskEntity } from '../entities/task.entity';

export type TaskPage = {
  data: TaskEntity[];
  total: number;
};

@Injectable()
export class TaskRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repository: Repository<TaskEntity>,
  ) {}

  async findPage(page: number, limit: number): Promise<TaskPage> {
    const [data, total] = await this.repository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  findById(id: string): Promise<TaskEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  create(input: {
    title: string;
    description: string | null;
  }): Promise<TaskEntity> {
    const task = this.repository.create(input);
    return this.repository.save(task);
  }

  save(task: TaskEntity): Promise<TaskEntity> {
    return this.repository.save(task);
  }

  async completeById(id: string): Promise<TaskEntity | null> {
    const result = await this.repository.update(
      { id, isCompleted: false },
      { isCompleted: true },
    );

    return result.affected === 1 ? this.findById(id) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected === 1;
  }
}
