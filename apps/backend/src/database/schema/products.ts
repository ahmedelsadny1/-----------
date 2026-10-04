import { pgTable, varchar, text, boolean, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches } from './branches.js';
import { users } from './users.js';

export const categories = pgTable(
  'categories',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    parentId: varchar('parent_id', { length: 26 }),
    name: varchar('name', { length: 255 }).notNull(),
    nameAr: varchar('name_ar', { length: 255 }),
    code: varchar('code', { length: 50 }).notNull(),
    color: varchar('color', { length: 20 }),
    icon: varchar('icon', { length: 50 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_categories_company').on(table.companyId),
    parentIdx: index('idx_pg_categories_parent').on(table.parentId),
  }),
);

export const brands = pgTable(
  'brands',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    nameAr: varchar('name_ar', { length: 255 }),
    code: varchar('code', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_brands_company').on(table.companyId),
  }),
);

export const units = pgTable(
  'units',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    nameAr: varchar('name_ar', { length: 100 }),
    code: varchar('code', { length: 20 }).notNull(),
    symbol: varchar('symbol', { length: 10 }).notNull(),
    isFractional: boolean('is_fractional').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_units_company').on(table.companyId),
  }),
);

export const taxRates = pgTable(
  'tax_rates',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    nameAr: varchar('name_ar', { length: 100 }),
    rateBasisPoints: integer('rate_basis_points').notNull().default(0), // 1400 = 14%
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_tax_rates_company').on(table.companyId),
  }),
);

export const products = pgTable(
  'products',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 26 }).references(() => categories.id),
    brandId: varchar('brand_id', { length: 26 }).references(() => brands.id),
    unitId: varchar('unit_id', { length: 26 })
      .notNull()
      .references(() => units.id),
    taxRateId: varchar('tax_rate_id', { length: 26 }).references(() => taxRates.id),
    sku: varchar('sku', { length: 100 }).notNull(),
    barcode: varchar('barcode', { length: 100 }),
    name: varchar('name', { length: 255 }).notNull(),
    nameAr: varchar('name_ar', { length: 255 }),
    description: text('description'),
    descriptionAr: text('description_ar'),
    productType: varchar('product_type', { length: 20 }).notNull().default('STANDARD'),
    costPrice: bigint('cost_price', { mode: 'number' }).notNull().default(0),
    sellingPrice: bigint('selling_price', { mode: 'number' }).notNull().default(0),
    minSellingPrice: bigint('min_selling_price', { mode: 'number' }).notNull().default(0),
    isWeighted: boolean('is_weighted').notNull().default(false),
    isFractional: boolean('is_fractional').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    trackInventory: boolean('track_inventory').notNull().default(true),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(10),
    imageUrl: text('image_url'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_products_company').on(table.companyId),
    categoryIdx: index('idx_pg_products_category').on(table.categoryId),
    barcodeIdx: index('idx_pg_products_barcode').on(table.companyId, table.barcode),
    skuIdx: index('idx_pg_products_sku').on(table.companyId, table.sku),
    nameIdx: index('idx_pg_products_name').on(table.name),
  }),
);

export const productBarcodes = pgTable(
  'product_barcodes',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    barcode: varchar('barcode', { length: 100 }).notNull(),
    barcodeType: varchar('barcode_type', { length: 20 }).notNull().default('EAN13'),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    barcodeIdx: index('idx_pg_barcodes_barcode').on(table.barcode),
    productIdx: index('idx_pg_barcodes_product').on(table.productId),
  }),
);

export const productPrices = pgTable(
  'product_prices',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 }).references(() => branches.id, { onDelete: 'cascade' }),
    priceType: varchar('price_type', { length: 20 }).notNull().default('RETAIL'),
    price: bigint('price', { mode: 'number' }).notNull(),
    minPrice: bigint('min_price', { mode: 'number' }).notNull().default(0),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'string' }),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'string' }),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('idx_pg_prices_product').on(table.productId),
    branchIdx: index('idx_pg_prices_branch').on(table.branchId),
  }),
);

export const priceHistory = pgTable(
  'price_history',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    productId: varchar('product_id', { length: 26 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 }).references(() => branches.id, { onDelete: 'cascade' }),
    oldPrice: bigint('old_price', { mode: 'number' }).notNull(),
    newPrice: bigint('new_price', { mode: 'number' }).notNull(),
    changedBy: varchar('changed_by', { length: 26 })
      .notNull()
      .references(() => users.id),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('idx_pg_price_history_product').on(table.productId),
  }),
);
