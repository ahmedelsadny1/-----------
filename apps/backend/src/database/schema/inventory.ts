import { pgTable, varchar, text, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';
import { products } from './products.js';
import { users } from './users.js';

export const branchInventory = pgTable(
  'branch_inventory',
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
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    minQuantity: integer('min_quantity').notNull().default(0),
    maxQuantity: integer('max_quantity').notNull().default(1000000),
    reorderPoint: integer('reorder_point').notNull().default(10),
    version: integer('version').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    branchProductIdx: index('idx_pg_inventory_branch_product').on(table.branchId, table.productId),
    productIdx: index('idx_pg_inventory_product').on(table.productId),
  }),
);

export const inventoryMovements = pgTable(
  'inventory_movements',
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
    movementType: varchar('movement_type', { length: 30 }).notNull(),
    quantityChange: integer('quantity_change').notNull(),
    quantityBefore: integer('quantity_before').notNull(),
    quantityAfter: integer('quantity_after').notNull(),
    unitCost: bigint('unit_cost', { mode: 'number' }).notNull().default(0),
    referenceType: varchar('reference_type', { length: 30 }),
    referenceId: varchar('reference_id', { length: 26 }),
    notes: text('notes'),
    createdBy: varchar('created_by', { length: 26 }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    branchProductIdx: index('idx_pg_inv_movements_branch_prod').on(table.branchId, table.productId),
    refIdx: index('idx_pg_inv_movements_ref').on(table.referenceType, table.referenceId),
    createdAtIdx: index('idx_pg_inv_movements_created').on(table.createdAt),
  }),
);

export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    sourceBranchId: varchar('source_branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id),
    destinationBranchId: varchar('destination_branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id),
    transferNumber: varchar('transfer_number', { length: 50 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('DRAFT'), // DRAFT, IN_TRANSIT, RECEIVED, CANCELLED
    notes: text('notes'),
    createdBy: varchar('created_by', { length: 26 })
      .notNull()
      .references(() => users.id),
    receivedBy: varchar('received_by', { length: 26 }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_transfers_company').on(table.companyId),
    sourceIdx: index('idx_pg_transfers_source').on(table.sourceBranchId),
    destIdx: index('idx_pg_transfers_dest').on(table.destinationBranchId),
  }),
);

export const stockTransferItems = pgTable(
  'stock_transfer_items',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    transferId: varchar('transfer_id', { length: 26 })
      .notNull()
      .references(() => stockTransfers.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id),
    quantitySent: integer('quantity_sent').notNull(),
    quantityReceived: integer('quantity_received'),
  },
  (table) => ({
    transferIdx: index('idx_pg_transfer_items_transfer').on(table.transferId),
  }),
);
