import { pgTable, varchar, text, boolean, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';
import { cashSessions } from './cash.js';
import { users } from './users.js';

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    nameAr: varchar('name_ar', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_exp_cats_company').on(table.companyId),
  }),
);

export const expenses = pgTable(
  'expenses',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 26 }).references(() => cashSessions.id),
    categoryId: varchar('category_id', { length: 26 })
      .notNull()
      .references(() => expenseCategories.id),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    description: text('description').notNull(),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull().default('CASH'),
    recipient: varchar('recipient', { length: 255 }),
    receiptNumber: varchar('receipt_number', { length: 100 }),
    createdBy: varchar('created_by', { length: 26 })
      .notNull()
      .references(() => users.id),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    branchIdx: index('idx_pg_expenses_branch').on(table.branchId),
    sessionIdx: index('idx_pg_expenses_session').on(table.sessionId),
  }),
);
