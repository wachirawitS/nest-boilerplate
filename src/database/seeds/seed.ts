import { readEnvironment } from '../../config/environment';
import { TaskSeedRepository } from '../../modules/tasks/repositories/task-seed.repository';
import { applicationDataSource } from '../typeorm-data-source';

async function seed(): Promise<void> {
  const environment = readEnvironment();
  if (!['development', 'test'].includes(environment.NODE_ENV)) {
    throw new Error('Seeds may run only in development or test');
  }

  await applicationDataSource.initialize();
  try {
    const taskSeedRepository = new TaskSeedRepository(applicationDataSource);
    await taskSeedRepository.upsertExample();
  } finally {
    await applicationDataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
