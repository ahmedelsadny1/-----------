import { pgTable, varchar, text, boolean, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const branches = pgTable(
  'branches',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    nameAr: varchar('name_ar', { length: 255 }),
    code: varchar('code', { length: 50 }).notNull(),
    address: text('address'),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_branches_company').on(table.companyId),
    codeIdx: index('idx_pg_branches_code').on(table.companyId, table.code),
  }),
);

export const branchSettings = pgTable('branch_settings', {
  id: varchar('id', { length: 26 }).primaryKey(),
  branchId: varchar('branch_id', { length: 26 })
    .notNull()
    .unique()
    .references(() => branches.id, { onDelete: 'cascade' }),
  settings: jsonb('settings').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const devices = pgTable(
  'devices',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    deviceName: varchar('device_name', { length: 100 }).notNull(),
    hardwareFingerprint: varchar('hardware_fingerprint', { length: 255 }).notNull(),
    appVersion: varchar('app_version', { length: 20 }).notNull().default('0.1.0'),
    dbVersion: integer('db_version').notNull().default(1),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'string' }),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true, mode: 'string' }),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE, REVOKED
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_devices_company').on(table.companyId),
    branchIdx: index('idx_pg_devices_branch').on(table.branchId),
    fingerprintIdx: index('idx_pg_devices_fingerprint').on(table.hardwareFingerprint),
  }),
);

export const posTerminals = pgTable(
  'pos_terminals',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    deviceId: varchar('device_id', { length: 26 }).references(() => devices.id),
    terminalCode: varchar('terminal_code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    branchIdx: index('idx_pg_terminals_branch').on(table.branchId),
    codeIdx: index('idx_pg_terminals_code').on(table.branchId, table.terminalCode),
  }),
);
