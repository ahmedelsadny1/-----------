import { pgTable, varchar, text, boolean, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';

export const customers = pgTable(
  'customers',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    nameAr: varchar('name_ar', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    code: varchar('code', { length: 50 }),
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    creditBalance: bigint('credit_balance', { mode: 'number' }).notNull().default(0), // minor units
    creditLimit: bigint('credit_limit', { mode: 'number' }).notNull().default(0),
    address: text('address'),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_customers_company').on(table.companyId),
    phoneIdx: index('idx_pg_customers_phone').on(table.companyId, table.phone),
    codeIdx: index('idx_pg_customers_code').on(table.companyId, table.code),
    nameIdx: index('idx_pg_customers_name').on(table.name),
  }),
);
