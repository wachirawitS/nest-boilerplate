import { ApiProperty } from '@nestjs/swagger';

import { TaskEntity } from '../entities/task.entity';

export class TaskResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Review pull request' })
  title!: string;

  @ApiProperty({
    type: String,
    example: 'Check module boundaries',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: false })
  isCompleted!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  static fromEntity(task: TaskEntity): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      isCompleted: task.isCompleted,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
