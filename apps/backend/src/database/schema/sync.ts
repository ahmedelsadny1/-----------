import { pgTable, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches, devices } from './branches.js';
import { users } from './users.js';

export const syncOperations = pgTable(
  'sync_operations',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    deviceId: varchar('device_id', { length: 26 })
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 26 }).notNull(),
    operation: varchar('operation', { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PROCESSED'), // PROCESSED, CONFLICT, REJECTED
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => ({
    companyIdx: index('idx_pg_sync_ops_company').on(table.companyId),
    idempotencyIdx: index('idx_pg_sync_ops_idempotency').on(table.idempotencyKey),
    entityIdx: index('idx_pg_sync_ops_entity').on(table.entityType, table.entityId),
  }),
);

export const syncLogs = pgTable(
  'sync_logs',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    deviceId: varchar('device_id', { length: 26 })
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    direction: varchar('direction', { length: 10 }).notNull(), // UPLOAD, DOWNLOAD
    entityType: varchar('entity_type', { length: 50 }),
    recordsCount: integer('records_count').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull(), // SUCCESS, PARTIAL, FAILED
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    deviceIdx: index('idx_pg_sync_logs_device').on(table.deviceId),
    startedAtIdx: index('idx_pg_sync_logs_started').on(table.startedAt),
  }),
);

export const syncConflicts = pgTable(
  'sync_conflicts',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    deviceId: varchar('device_id', { length: 26 })
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 26 }).notNull(),
    conflictType: varchar('conflict_type', { length: 50 }).notNull(),
    localData: jsonb('local_data').notNull(),
    serverData: jsonb('server_data').notNull(),
    resolution: varchar('resolution', { length: 30 }), // SERVER_WINS, LOCAL_WINS, MERGED, ADMIN_RESOLVED
    resolvedBy: varchar('resolved_by', { length: 26 }).references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_sync_conflicts_company').on(table.companyId),
    entityIdx: index('idx_pg_sync_conflicts_entity').on(table.entityType, table.entityId),
  }),
);
