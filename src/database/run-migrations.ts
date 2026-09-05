import { migrationDataSource } from './typeorm-migration-data-source';

async function runMigrations(): Promise<void> {
  await migrationDataSource.initialize();
  try {
    const migrations = await migrationDataSource.runMigrations({
      transaction: 'all',
    });

    if (migrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    for (const migration of migrations) {
      console.log(`Applied migration: ${migration.name}`);
    }
  } finally {
    await migrationDataSource.destroy();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exitCode = 1;
});
