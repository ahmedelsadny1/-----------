import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { products } from './products.js';

export const inventory = sqliteTable(
  'inventory',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    branchId: text('branch_id', { length: 26 }).notNull(),
    productId: text('product_id', { length: 26 }).notNull().references(() => products.id),
    quantity: integer('quantity').notNull().default(0), // in minor units / grams if fractional, or integer units
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    minQuantity: integer('min_quantity').notNull().default(0),
    maxQuantity: integer('max_quantity').notNull().default(1000000),
    reorderPoint: integer('reorder_point').notNull().default(10),
    version: integer('version').notNull().default(1),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    branchProductIdx: index('idx_inventory_branch_product').on(table.branchId, table.productId),
    productIdx: index('idx_inventory_product').on(table.productId),
  }),
);

export const inventoryMovements = sqliteTable(
  'inventory_movements',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    branchId: text('branch_id', { length: 26 }).notNull(),
    productId: text('product_id', { length: 26 }).notNull().references(() => products.id),
    movementType: text('movement_type', { length: 30 }).notNull(), // SALE, RETURN, PURCHASE_RECEIVE, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT, DAMAGE
    quantityChange: integer('quantity_change').notNull(), // signed integer
    quantityBefore: integer('quantity_before').notNull(),
    quantityAfter: integer('quantity_after').notNull(),
    unitCost: integer('unit_cost').notNull().default(0),
    referenceType: text('reference_type', { length: 30 }), // SALE, REFUND, PURCHASE, ADJUSTMENT, TRANSFER
    referenceId: text('reference_id', { length: 26 }),
    notes: text('notes'),
    createdBy: text('created_by', { length: 26 }),
    syncStatus: text('sync_status', { length: 20 }).notNull().default('PENDING'), // PENDING, SYNCED, FAILED
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    productIdx: index('idx_inv_movements_product').on(table.productId),
    branchIdx: index('idx_inv_movements_branch').on(table.branchId),
    syncIdx: index('idx_inv_movements_sync').on(table.syncStatus),
    referenceIdx: index('idx_inv_movements_ref').on(table.referenceType, table.referenceId),
  }),
);
