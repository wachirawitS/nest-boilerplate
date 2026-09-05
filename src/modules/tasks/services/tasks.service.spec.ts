import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { TaskEntity } from '../entities/task.entity';
import { TaskRepository } from '../repositories/task.repository';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const taskRepository = {
    findPage: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    completeById: jest.fn(),
    deleteById: jest.fn(),
  };
  let service: TasksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TaskRepository, useValue: taskRepository },
      ],
    }).compile();
    service = module.get(TasksService);
  });

  it('creates a task with a null description when omitted', async () => {
    const task = makeTask();
    taskRepository.create.mockResolvedValue(task);

    await expect(service.create({ title: task.title })).resolves.toBe(task);
    expect(taskRepository.create).toHaveBeenCalledWith({
      title: task.title,
      description: null,
    });
  });

  it('rejects completing an already completed task', async () => {
    taskRepository.completeById.mockResolvedValue(null);
    taskRepository.findById.mockResolvedValue(makeTask({ isCompleted: true }));

    await expect(service.complete('task-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(taskRepository.completeById).toHaveBeenCalledWith('task-id');
  });

  it('returns a stable not-found error for an unknown task', async () => {
    taskRepository.findById.mockResolvedValue(null);

    await expect(service.findOne('task-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function makeTask(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return Object.assign(new TaskEntity(), {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Review pull request',
    description: null,
    isCompleted: false,
    createdAt: new Date('2026-09-05T00:00:00.000Z'),
    updatedAt: new Date('2026-09-05T00:00:00.000Z'),
    ...overrides,
  });
}
