import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const customers = sqliteTable(
  'customers',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    name: text('name', { length: 255 }).notNull(),
    nameAr: text('name_ar', { length: 255 }),
    phone: text('phone', { length: 50 }),
    email: text('email', { length: 255 }),
    code: text('code', { length: 50 }),
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    creditBalance: integer('credit_balance').notNull().default(0), // in minor units
    creditLimit: integer('credit_limit').notNull().default(0),
    address: text('address'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    companyIdx: index('idx_customers_company').on(table.companyId),
    phoneIdx: index('idx_customers_phone').on(table.phone),
    codeIdx: index('idx_customers_code').on(table.code),
    nameIdx: index('idx_customers_name').on(table.name),
  }),
);
