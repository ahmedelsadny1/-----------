import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const localDevice = sqliteTable('local_device', {
  id: text('id', { length: 26 }).primaryKey(), // ULID
  companyId: text('company_id', { length: 26 }).notNull(),
  branchId: text('branch_id', { length: 26 }).notNull(),
  terminalId: text('terminal_id', { length: 26 }).notNull(),
  terminalCode: text('terminal_code', { length: 50 }).notNull(),
  deviceName: text('device_name', { length: 100 }).notNull(),
  hardwareFingerprint: text('hardware_fingerprint', { length: 255 }).notNull(),
  appVersion: text('app_version', { length: 20 }).notNull().default('0.1.0'),
  dbVersion: integer('db_version').notNull().default(1),
  registeredAt: text('registered_at').notNull(),
  lastSyncAt: text('last_sync_at'),
  status: text('status', { length: 20 }).notNull().default('ACTIVE'), // ACTIVE, INACTIVE, REVOKED
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const localSettings = sqliteTable('local_settings', {
  key: text('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const backupMetadata = sqliteTable('backup_metadata', {
  id: text('id', { length: 26 }).primaryKey(),
  filename: text('filename', { length: 255 }).notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  backupType: text('backup_type', { length: 20 }).notNull().default('AUTOMATIC'), // MANUAL, AUTOMATIC, PRE_UPDATE
  status: text('status', { length: 20 }).notNull().default('COMPLETED'), // PENDING, COMPLETED, FAILED
  triggerSource: text('trigger_source', { length: 50 }).notNull().default('USER'),
  checksumSha256: text('checksum_sha256', { length: 64 }).notNull(),
  createdAt: text('created_at').notNull(),
});
