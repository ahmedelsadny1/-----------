import { pgTable, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  name: varchar('name', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  logoUrl: text('logo_url'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  taxNumber: varchar('tax_number', { length: 50 }),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('EGP'),
  currencySubunit: integer('currency_subunit').notNull().default(100), // e.g. 100 for piasters
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
});

export const companySettings = pgTable('company_settings', {
  id: varchar('id', { length: 26 }).primaryKey(),
  companyId: varchar('company_id', { length: 26 })
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: 'cascade' }),
  settings: jsonb('settings').notNull().default('{}'), // Receipt template, tax mode, sync policy, etc.
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
