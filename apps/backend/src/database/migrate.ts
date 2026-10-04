import { getPgPool, closePgConnection } from './connection.js';
import * as initialMigration from './migrations/0001_initial.js';

interface Migration {
  id: string;
  up: (client: any) => Promise<void>;
}

const migrations: Migration[] = [
  {
    id: initialMigration.id,
    up: initialMigration.up,
  },
];

export async function runMigrations(): Promise<void> {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    console.log('[PostgreSQL Migration] Initializing migration engine...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const result = await client.query('SELECT id FROM _migrations');
    const appliedSet = new Set(result.rows.map((r: { id: string }) => r.id));

    for (const migration of migrations) {
      if (!appliedSet.has(migration.id)) {
        console.log(`[PostgreSQL Migration] Applying migration: ${migration.id}`);
        await client.query('BEGIN');
        try {
          await migration.up(client);
          await client.query('INSERT INTO _migrations (id) VALUES ($1)', [migration.id]);
          await client.query('COMMIT');
          console.log(`[PostgreSQL Migration] Successfully applied: ${migration.id}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[PostgreSQL Migration] Failed applying migration ${migration.id}:`, err);
          throw err;
        }
      } else {
        console.log(`[PostgreSQL Migration] Already applied: ${migration.id}`);
      }
    }

    console.log('[PostgreSQL Migration] All migrations completed successfully.');
  } finally {
    client.release();
  }
}

// When run directly as a script via `tsx src/database/migrate.ts`
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(async () => {
      await closePgConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[PostgreSQL Migration] Fatal error:', err);
      await closePgConnection();
      process.exit(1);
    });
}
