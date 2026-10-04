import Database, { Database as DatabaseType } from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as schema from './schema/index.js';

let sqliteDb: DatabaseType | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;

export interface DbConfig {
  dbPath?: string;
  inMemory?: boolean;
}

/**
 * Initializes and returns the SQLite database connection with Drizzle ORM.
 * Configures optimal production settings (WAL mode, normal synchronous, foreign keys).
 */
export function initDatabase(config?: DbConfig): {
  sqlite: DatabaseType;
  db: BetterSQLite3Database<typeof schema>;
} {
  if (sqliteDb && drizzleDb) {
    return { sqlite: sqliteDb, db: drizzleDb };
  }

  let finalPath = ':memory:';

  if (!config?.inMemory) {
    if (config?.dbPath) {
      finalPath = config.dbPath;
    } else {
      // In electron environment, could be app.getPath('userData')
      // Fallback for Node/electron processes:
      const defaultDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      finalPath = path.join(defaultDir, 'supermarket_pos.db');
    }
  }

  const dbDir = path.dirname(finalPath);
  if (finalPath !== ':memory:' && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new Database(finalPath);

  // Set performance and durability PRAGMAs
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('synchronous = NORMAL');
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('busy_timeout = 5000');
  sqliteDb.pragma('cache_size = -64000'); // 64MB cache

  drizzleDb = drizzle(sqliteDb, { schema });

  return { sqlite: sqliteDb, db: drizzleDb };
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!drizzleDb) {
    return initDatabase().db;
  }
  return drizzleDb;
}

export function getSqlite(): DatabaseType {
  if (!sqliteDb) {
    return initDatabase().sqlite;
  }
  return sqliteDb;
}

export function closeDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    drizzleDb = null;
  }
}
