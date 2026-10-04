import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const localUsers = sqliteTable('local_users', {
  id: text('id', { length: 26 }).primaryKey(),
  companyId: text('company_id', { length: 26 }).notNull(),
  username: text('username', { length: 100 }).notNull().unique(),
  email: text('email', { length: 255 }),
  fullName: text('full_name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  pinHash: text('pin_hash'),
  rolesJson: text('roles_json').notNull().default('[]'),
  permissionsJson: text('permissions_json').notNull().default('[]'),
  branchesJson: text('branches_json').notNull().default('[]'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  offlineAccessEnabled: integer('offline_access_enabled', { mode: 'boolean' }).notNull().default(true),
  credentialsExpireAt: text('credentials_expire_at'),
  cachedAt: text('cached_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const localSessions = sqliteTable('local_sessions', {
  id: text('id', { length: 26 }).primaryKey(),
  userId: text('user_id', { length: 26 }).notNull().references(() => localUsers.id),
  token: text('token').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});
