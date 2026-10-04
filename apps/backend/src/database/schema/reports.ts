import { pgTable, varchar, integer, bigint, timestamp, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';
import { products } from './products.js';

export const dailySalesSummary = pgTable(
  'daily_sales_summary',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    totalSales: bigint('total_sales', { mode: 'number' }).notNull().default(0),
    totalTransactions: integer('total_transactions').notNull().default(0),
    totalRefunds: bigint('total_refunds', { mode: 'number' }).notNull().default(0),
    refundCount: integer('refund_count').notNull().default(0),
    totalDiscount: bigint('total_discount', { mode: 'number' }).notNull().default(0),
    totalTax: bigint('total_tax', { mode: 'number' }).notNull().default(0),
    netRevenue: bigint('net_revenue', { mode: 'number' }).notNull().default(0),
    cashSales: bigint('cash_sales', { mode: 'number' }).notNull().default(0),
    cardSales: bigint('card_sales', { mode: 'number' }).notNull().default(0),
    otherSales: bigint('other_sales', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyBranchDateIdx: uniqueIndex('idx_pg_daily_summary_unique').on(
      table.companyId,
      table.branchId,
      table.date,
    ),
  }),
);

export const productSalesSummary = pgTable(
  'product_sales_summary',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    period: date('period', { mode: 'string' }).notNull(),
    periodType: varchar('period_type', { length: 10 }).notNull(), // DAILY, WEEKLY, MONTHLY
    quantitySold: integer('quantity_sold').notNull().default(0),
    revenue: bigint('revenue', { mode: 'number' }).notNull().default(0),
    cost: bigint('cost', { mode: 'number' }).notNull().default(0),
    profit: bigint('profit', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    productPeriodIdx: uniqueIndex('idx_pg_prod_summary_unique').on(
      table.companyId,
      table.branchId,
      table.productId,
      table.period,
      table.periodType,
    ),
    prodIdx: index('idx_pg_prod_summary_product').on(table.productId),
  }),
);
