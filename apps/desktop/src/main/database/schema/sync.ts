import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const syncQueue = sqliteTable(
  'sync_queue',
  {
    id: text('id', { length: 26 }).primaryKey(), // ULID
    entityType: text('entity_type', { length: 50 }).notNull(), // SALE, INVENTORY_MOVEMENT, CUSTOMER, EXPENSE, CASH_SESSION
    entityId: text('entity_id', { length: 26 }).notNull(),
    operation: text('operation', { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
    payload: text('payload').notNull(), // JSON string
    idempotencyKey: text('idempotency_key', { length: 100 }).notNull().unique(),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(10),
    status: text('status', { length: 20 }).notNull().default('PENDING'), // PENDING, PROCESSING, COMPLETED, FAILED
    lastError: text('last_error'),
    nextRetryAt: text('next_retry_at'),
    createdAt: text('created_at').notNull(),
    processedAt: text('processed_at'),
  },
  (table) => ({
    statusIdx: index('idx_sync_queue_status').on(table.status),
    entityIdx: index('idx_sync_queue_entity').on(table.entityType, table.entityId),
    idempotencyIdx: index('idx_sync_queue_idempotency').on(table.idempotencyKey),
    createdAtIdx: index('idx_sync_queue_created').on(table.createdAt),
  }),
);

export const syncLog = sqliteTable(
  'sync_log',
  {
    id: text('id', { length: 26 }).primaryKey(),
    direction: text('direction', { length: 10 }).notNull(), // UPLOAD, DOWNLOAD
    entityType: text('entity_type', { length: 50 }).notNull(),
    recordsCount: integer('records_count').notNull().default(0),
    status: text('status', { length: 20 }).notNull(), // SUCCESS, PARTIAL, FAILED
    error: text('error'),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    startedAtIdx: index('idx_sync_log_started').on(table.startedAt),
    statusIdx: index('idx_sync_log_status').on(table.status),
  }),
);

export const syncCheckpoints = sqliteTable('sync_checkpoints', {
  entityType: text('entity_type', { length: 50 }).primaryKey(),
  lastSyncTimestamp: text('last_sync_timestamp').notNull(),
  lastSyncId: text('last_sync_id', { length: 26 }),
  recordsSynced: integer('records_synced').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
