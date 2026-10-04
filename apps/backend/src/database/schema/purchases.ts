import { pgTable, varchar, text, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';
import { suppliers } from './suppliers.js';
import { products } from './products.js';
import { users } from './users.js';

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    supplierId: varchar('supplier_id', { length: 26 })
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    status: varchar('status', { length: 30 }).notNull().default('DRAFT'), // DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    subtotal: bigint('subtotal', { mode: 'number' }).notNull().default(0),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull().default(0),
    paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
    notes: text('notes'),
    createdBy: varchar('created_by', { length: 26 })
      .notNull()
      .references(() => users.id),
    orderedAt: timestamp('ordered_at', { withTimezone: true, mode: 'string' }),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('idx_pg_po_company').on(table.companyId),
    branchIdx: index('idx_pg_po_branch').on(table.branchId),
    supplierIdx: index('idx_pg_po_supplier').on(table.supplierId),
    statusIdx: index('idx_pg_po_status').on(table.status),
  }),
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    purchaseOrderId: varchar('purchase_order_id', { length: 26 })
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id),
    unitCost: bigint('unit_cost', { mode: 'number' }).notNull(),
    quantityOrdered: integer('quantity_ordered').notNull(),
    quantityReceived: integer('quantity_received').notNull().default(0),
    taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
    totalCost: bigint('total_cost', { mode: 'number' }).notNull(),
  },
  (table) => ({
    poIdx: index('idx_pg_po_items_po').on(table.purchaseOrderId),
  }),
);
