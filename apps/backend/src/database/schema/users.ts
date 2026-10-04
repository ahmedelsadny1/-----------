import { pgTable, varchar, text, boolean, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 }).references(() => companies.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 100 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    phone: varchar('phone', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    isLocked: boolean('is_locked').notNull().default(false),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
    offlineAccessEnabled: boolean('offline_access_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_users_company').on(table.companyId),
    usernameIdx: index('idx_pg_users_username').on(table.username),
  }),
);

export const roles = pgTable(
  'roles',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 }).references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_roles_company').on(table.companyId),
  }),
);

export const permissions = pgTable('permissions', {
  id: varchar('id', { length: 26 }).primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  module: varchar('module', { length: 50 }).notNull(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: varchar('role_id', { length: 26 })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 26 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: varchar('role_id', { length: 26 })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

export const userBranches = pgTable(
  'user_branches',
  {
    userId: varchar('user_id', { length: 26 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.branchId] }),
  }),
);
