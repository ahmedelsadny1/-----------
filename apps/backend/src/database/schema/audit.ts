import { pgTable, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 26 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 26 }),
    branchId: varchar('branch_id', { length: 26 }),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    deviceId: varchar('device_id', { length: 26 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_audit_company').on(table.companyId),
    userActionIdx: index('idx_pg_audit_user_action').on(table.userId, table.action),
    entityIdx: index('idx_pg_audit_entity').on(table.entityType, table.entityId),
    createdAtIdx: index('idx_pg_audit_created').on(table.createdAt),
  }),
);

export const notifications = pgTable(
  'notifications',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 }).references(() => branches.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    severity: varchar('severity', { length: 20 }).notNull().default('INFO'), // INFO, WARNING, ERROR, SUCCESS
    isRead: boolean('is_read').notNull().default(false),
    data: jsonb('data'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_notif_company').on(table.companyId),
    branchIdx: index('idx_pg_notif_branch').on(table.branchId),
    isReadIdx: index('idx_pg_notif_read').on(table.isRead),
  }),
);
