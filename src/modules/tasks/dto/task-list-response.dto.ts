import { ApiProperty } from '@nestjs/swagger';

import { TaskResponseDto } from './task-response.dto';

class TaskListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class TaskListResponseDto {
  @ApiProperty({ type: TaskResponseDto, isArray: true })
  data!: TaskResponseDto[];

  @ApiProperty({ type: TaskListMetaDto })
  meta!: TaskListMetaDto;
}
