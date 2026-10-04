import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { products } from './products.js';
import { customers } from './customers.js';
import { cashSessions } from './cash.js';

export const sales = sqliteTable(
  'sales',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    branchId: text('branch_id', { length: 26 }).notNull(),
    terminalId: text('terminal_id', { length: 26 }).notNull(),
    cashierId: text('cashier_id', { length: 26 }).notNull(),
    customerId: text('customer_id', { length: 26 }).references(() => customers.id),
    cashSessionId: text('cash_session_id', { length: 26 }).references(() => cashSessions.id),
    invoiceNumber: text('invoice_number', { length: 100 }).notNull().unique(),
    status: text('status', { length: 20 }).notNull().default('COMPLETED'), // COMPLETED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED
    paymentStatus: text('payment_status', { length: 20 }).notNull().default('PAID'), // PAID, PARTIALLY_PAID, UNPAID
    subtotal: integer('subtotal').notNull(), // minor units (piasters)
    discountAmount: integer('discount_amount').notNull().default(0),
    discountType: text('discount_type', { length: 20 }), // FIXED, PERCENTAGE
    discountReason: text('discount_reason'),
    taxAmount: integer('tax_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    paidAmount: integer('paid_amount').notNull(),
    changeAmount: integer('change_amount').notNull().default(0),
    notes: text('notes'),
    syncStatus: text('sync_status', { length: 20 }).notNull().default('PENDING'), // PENDING, SYNCED, FAILED
    idempotencyKey: text('idempotency_key', { length: 100 }).notNull().unique(),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    branchIdx: index('idx_sales_branch').on(table.branchId),
    terminalIdx: index('idx_sales_terminal').on(table.terminalId),
    invoiceIdx: index('idx_sales_invoice').on(table.invoiceNumber),
    idempotencyIdx: index('idx_sales_idempotency').on(table.idempotencyKey),
    syncIdx: index('idx_sales_sync').on(table.syncStatus),
    createdAtIdx: index('idx_sales_created_at').on(table.createdAt),
  }),
);

export const saleItems = sqliteTable(
  'sale_items',
  {
    id: text('id', { length: 26 }).primaryKey(),
    saleId: text('sale_id', { length: 26 })
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: text('product_id', { length: 26 })
      .notNull()
      .references(() => products.id),
    barcode: text('barcode', { length: 100 }),
    productName: text('product_name', { length: 255 }).notNull(),
    productNameAr: text('product_name_ar', { length: 255 }),
    unitPrice: integer('unit_price').notNull(), // minor units
    unitCost: integer('unit_cost').notNull().default(0),
    quantity: integer('quantity').notNull(), // unit or minor unit (e.g. grams)
    discountAmount: integer('discount_amount').notNull().default(0),
    discountPercent: integer('discount_percent').notNull().default(0), // basis points (1000 = 10%)
    taxRateBasisPoints: integer('tax_rate_basis_points').notNull().default(0),
    taxAmount: integer('tax_amount').notNull().default(0),
    totalPrice: integer('total_price').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    saleIdx: index('idx_sale_items_sale').on(table.saleId),
    productIdx: index('idx_sale_items_product').on(table.productId),
  }),
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id', { length: 26 }).primaryKey(),
    saleId: text('sale_id', { length: 26 })
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    paymentMethod: text('payment_method', { length: 30 }).notNull(), // CASH, CARD, SPLIT, CREDIT, WALLET
    amount: integer('amount').notNull(), // minor units
    currencyCode: text('currency_code', { length: 3 }).notNull().default('EGP'),
    referenceNumber: text('reference_number', { length: 100 }),
    notes: text('notes'),
    status: text('status', { length: 20 }).notNull().default('COMPLETED'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    saleIdx: index('idx_payments_sale').on(table.saleId),
    methodIdx: index('idx_payments_method').on(table.paymentMethod),
  }),
);

export const refunds = sqliteTable(
  'refunds',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    branchId: text('branch_id', { length: 26 }).notNull(),
    terminalId: text('terminal_id', { length: 26 }).notNull(),
    originalSaleId: text('original_sale_id', { length: 26 })
      .notNull()
      .references(() => sales.id),
    cashierId: text('cashier_id', { length: 26 }).notNull(),
    refundNumber: text('refund_number', { length: 100 }).notNull().unique(),
    subtotal: integer('subtotal').notNull(),
    taxAmount: integer('tax_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    reason: text('reason').notNull(),
    status: text('status', { length: 20 }).notNull().default('COMPLETED'),
    syncStatus: text('sync_status', { length: 20 }).notNull().default('PENDING'),
    idempotencyKey: text('idempotency_key', { length: 100 }).notNull().unique(),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    originalSaleIdx: index('idx_refunds_original_sale').on(table.originalSaleId),
    refundNumberIdx: index('idx_refunds_number').on(table.refundNumber),
    syncIdx: index('idx_refunds_sync').on(table.syncStatus),
  }),
);

export const refundItems = sqliteTable(
  'refund_items',
  {
    id: text('id', { length: 26 }).primaryKey(),
    refundId: text('refund_id', { length: 26 })
      .notNull()
      .references(() => refunds.id, { onDelete: 'cascade' }),
    saleItemId: text('sale_item_id', { length: 26 }).notNull(),
    productId: text('product_id', { length: 26 })
      .notNull()
      .references(() => products.id),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    taxAmount: integer('tax_amount').notNull().default(0),
    totalPrice: integer('total_price').notNull(),
    reason: text('reason'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    refundIdx: index('idx_refund_items_refund').on(table.refundId),
  }),
);

export const heldCarts = sqliteTable(
  'held_carts',
  {
    id: text('id', { length: 26 }).primaryKey(),
    terminalId: text('terminal_id', { length: 26 }).notNull(),
    cashierId: text('cashier_id', { length: 26 }).notNull(),
    customerId: text('customer_id', { length: 26 }).references(() => customers.id),
    cartDataJson: text('cart_data_json').notNull(), // JSON stringified cart state
    subtotal: integer('subtotal').notNull(),
    total: integer('total').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    terminalIdx: index('idx_held_carts_terminal').on(table.terminalId),
  }),
);
