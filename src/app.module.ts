import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationExceptionFilter } from './common/filters/application-exception.filter';
import { AuthenticationGuard } from './common/guards/authentication.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { HealthController } from './common/health/health.controller';
import { HealthService } from './common/health/health.service';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { databaseConfig } from './config/database.config';
import { validateEnvironment } from './config/environment';
import { HealthRepository } from './database/repositories/health.repository';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
      load: [appConfig, authConfig, databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        url: config.url,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        manualInitialization: config.isManualInitialization,
      }),
    }),
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    HealthRepository,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_FILTER, useClass: ApplicationExceptionFilter },
  ],
})
export class AppModule {}
