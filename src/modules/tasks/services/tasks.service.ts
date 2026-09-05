import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TaskEntity } from '../entities/task.entity';
import { TaskPage, TaskRepository } from '../repositories/task.repository';

export type CreateTaskInput = {
  title: string;
  description?: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
};

@Injectable()
export class TasksService {
  constructor(private readonly taskRepository: TaskRepository) {}

  list(page: number, limit: number): Promise<TaskPage> {
    return this.taskRepository.findPage(page, limit);
  }

  async findOne(id: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw this.taskNotFound();
    }

    return task;
  }

  create(input: CreateTaskInput): Promise<TaskEntity> {
    return this.taskRepository.create({
      title: input.title,
      description: input.description ?? null,
    });
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskEntity> {
    const task = await this.findOne(id);

    if (input.title !== undefined) {
      task.title = input.title;
    }
    if (input.description !== undefined) {
      task.description = input.description;
    }

    return this.taskRepository.save(task);
  }

  async complete(id: string): Promise<TaskEntity> {
    const completedTask = await this.taskRepository.completeById(id);
    if (completedTask) {
      return completedTask;
    }

    await this.findOne(id);
    throw new ConflictException({
      code: 'TASK_ALREADY_COMPLETED',
      message: 'The task is already completed',
    });
  }

  async delete(id: string): Promise<void> {
    const isDeleted = await this.taskRepository.deleteById(id);
    if (!isDeleted) {
      throw this.taskNotFound();
    }
  }

  private taskNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'TASK_NOT_FOUND',
      message: 'Task was not found',
    });
  }
}
