import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { ListTasksQueryDto } from '../dto/list-tasks-query.dto';
import { TaskListResponseDto } from '../dto/task-list-response.dto';
import { TaskResponseDto } from '../dto/task-response.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksService } from '../services/tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Controller('tasks')
export class TaskController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions('tasks:read')
  @ApiOperation({
    summary: 'List tasks',
    description: 'Permission: tasks:read',
  })
  @ApiOkResponse({ type: TaskListResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async list(@Query() query: ListTasksQueryDto): Promise<TaskListResponseDto> {
    const result = await this.tasksService.list(query.page, query.limit);
    return {
      data: result.data.map((task) => TaskResponseDto.fromEntity(task)),
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }

  @Get(':id')
  @RequirePermissions('tasks:read')
  @ApiOperation({
    summary: 'Get a task',
    description: 'Permission: tasks:read',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TaskResponseDto> {
    return TaskResponseDto.fromEntity(await this.tasksService.findOne(id));
  }

  @Post()
  @RequirePermissions('tasks:create')
  @ApiOperation({
    summary: 'Create a task',
    description: 'Permission: tasks:create',
  })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async create(@Body() body: CreateTaskDto): Promise<TaskResponseDto> {
    return TaskResponseDto.fromEntity(await this.tasksService.create(body));
  }

  @Patch(':id')
  @RequirePermissions('tasks:update')
  @ApiOperation({
    summary: 'Update a task',
    description: 'Permission: tasks:update',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return TaskResponseDto.fromEntity(await this.tasksService.update(id, body));
  }

  @Post(':id/complete')
  @RequirePermissions('tasks:complete')
  @ApiOperation({
    summary: 'Complete a task',
    description: 'Permission: tasks:complete',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  async complete(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TaskResponseDto> {
    return TaskResponseDto.fromEntity(await this.tasksService.complete(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('tasks:delete')
  @ApiOperation({
    summary: 'Delete a task',
    description: 'Permission: tasks:delete',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.tasksService.delete(id);
  }
}
