import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TaskController } from './controllers/task.controller';
import { TaskEntity } from './entities/task.entity';
import { TaskRepository } from './repositories/task.repository';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  controllers: [TaskController],
  providers: [TasksService, TaskRepository],
})
export class TasksModule {}
