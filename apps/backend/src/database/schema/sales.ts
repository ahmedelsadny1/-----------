import { pgTable, varchar, text, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches, posTerminals } from './branches.js';
import { users } from './users.js';
import { customers } from './customers.js';
import { cashSessions } from './cash.js';
import { products } from './products.js';

export const sales = pgTable(
  'sales',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    terminalId: varchar('terminal_id', { length: 26 })
      .notNull()
      .references(() => posTerminals.id),
    cashierId: varchar('cashier_id', { length: 26 })
      .notNull()
      .references(() => users.id),
    customerId: varchar('customer_id', { length: 26 }).references(() => customers.id),
    cashSessionId: varchar('cash_session_id', { length: 26 }).references(() => cashSessions.id),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('COMPLETED'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('PAID'),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
    discountAmount: bigint('discount_amount', { mode: 'number' }).notNull().default(0),
    discountType: varchar('discount_type', { length: 20 }),
    discountReason: text('discount_reason'),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    paidAmount: bigint('paid_amount', { mode: 'number' }).notNull(),
    changeAmount: bigint('change_amount', { mode: 'number' }).notNull().default(0),
    notes: text('notes'),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull().unique(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_sales_company').on(table.companyId),
    branchIdx: index('idx_pg_sales_branch').on(table.branchId),
    invoiceIdx: index('idx_pg_sales_invoice').on(table.invoiceNumber),
    createdAtIdx: index('idx_pg_sales_created_at').on(table.createdAt),
    idempotencyIdx: index('idx_pg_sales_idempotency').on(table.idempotencyKey),
  }),
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    saleId: varchar('sale_id', { length: 26 })
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id),
    barcode: varchar('barcode', { length: 100 }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productNameAr: varchar('product_name_ar', { length: 255 }),
    unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
    unitCost: bigint('unit_cost', { mode: 'number' }).notNull().default(0),
    quantity: integer('quantity').notNull(),
    discountAmount: bigint('discount_amount', { mode: 'number' }).notNull().default(0),
    discountPercent: integer('discount_percent').notNull().default(0),
    taxRateBasisPoints: integer('tax_rate_basis_points').notNull().default(0),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    totalPrice: bigint('total_price', { mode: 'number' }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    saleIdx: index('idx_pg_sale_items_sale').on(table.saleId),
    productIdx: index('idx_pg_sale_items_product').on(table.productId),
  }),
);

export const payments = pgTable(
  'payments',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    saleId: varchar('sale_id', { length: 26 })
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('EGP'),
    referenceNumber: varchar('reference_number', { length: 100 }),
    notes: text('notes'),
    status: varchar('status', { length: 20 }).notNull().default('COMPLETED'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    saleIdx: index('idx_pg_payments_sale').on(table.saleId),
  }),
);

export const refunds = pgTable(
  'refunds',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    terminalId: varchar('terminal_id', { length: 26 })
      .notNull()
      .references(() => posTerminals.id),
    originalSaleId: varchar('original_sale_id', { length: 26 })
      .notNull()
      .references(() => sales.id),
    cashierId: varchar('cashier_id', { length: 26 })
      .notNull()
      .references(() => users.id),
    refundNumber: varchar('refund_number', { length: 100 }).notNull().unique(),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('COMPLETED'),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull().unique(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_refunds_company').on(table.companyId),
    saleIdx: index('idx_pg_refunds_sale').on(table.originalSaleId),
  }),
);

export const refundItems = pgTable(
  'refund_items',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    refundId: varchar('refund_id', { length: 26 })
      .notNull()
      .references(() => refunds.id, { onDelete: 'cascade' }),
    saleItemId: varchar('sale_item_id', { length: 26 }).notNull(),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id),
    unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
    quantity: integer('quantity').notNull(),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    totalPrice: bigint('total_price', { mode: 'number' }).notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    refundIdx: index('idx_pg_refund_items_refund').on(table.refundId),
  }),
);
