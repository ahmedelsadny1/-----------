import type { Database as DatabaseType } from 'better-sqlite3';
import * as initialMigration from './migrations/0001_initial.js';

export interface Migration {
  id: string;
  up: (db: DatabaseType) => void;
}

const migrations: Migration[] = [
  {
    id: initialMigration.id,
    up: initialMigration.up,
  },
];

/**
 * Runs all pending migrations against the SQLite database.
 */
export function runMigrations(sqlite: DatabaseType): void {
  // Ensure migrations tracking table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = sqlite.prepare('SELECT id FROM _migrations').all() as { id: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.id));

  for (const migration of migrations) {
    if (!appliedSet.has(migration.id)) {
      console.log(`[SQLite Migration] Applying migration: ${migration.id}`);
      sqlite.transaction(() => {
        migration.up(sqlite);
        sqlite
          .prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)')
          .run(migration.id, new Date().toISOString());
      })();
      console.log(`[SQLite Migration] Successfully applied: ${migration.id}`);
    }
  }
}
