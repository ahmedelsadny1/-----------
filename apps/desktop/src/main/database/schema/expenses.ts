import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { cashSessions } from './cash.js';

export const expenseCategories = sqliteTable(
  'expense_categories',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    name: text('name', { length: 255 }).notNull(),
    nameAr: text('name_ar', { length: 255 }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    companyIdx: index('idx_expense_cats_company').on(table.companyId),
  }),
);

export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    branchId: text('branch_id', { length: 26 }).notNull(),
    sessionId: text('session_id', { length: 26 }).references(() => cashSessions.id),
    categoryId: text('category_id', { length: 26 })
      .notNull()
      .references(() => expenseCategories.id),
    amount: integer('amount').notNull(), // minor units (piasters)
    description: text('description').notNull(),
    paymentMethod: text('payment_method', { length: 30 }).notNull().default('CASH'),
    recipient: text('recipient', { length: 255 }),
    receiptNumber: text('receipt_number', { length: 100 }),
    createdBy: text('created_by', { length: 26 }).notNull(),
    syncStatus: text('sync_status', { length: 20 }).notNull().default('PENDING'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    branchIdx: index('idx_expenses_branch').on(table.branchId),
    sessionIdx: index('idx_expenses_session').on(table.sessionId),
    categoryIdx: index('idx_expenses_category').on(table.categoryId),
    syncIdx: index('idx_expenses_sync').on(table.syncStatus),
  }),
);
