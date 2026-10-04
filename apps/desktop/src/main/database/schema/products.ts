import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable(
  'categories',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    parentId: text('parent_id', { length: 26 }),
    name: text('name', { length: 255 }).notNull(),
    nameAr: text('name_ar', { length: 255 }),
    code: text('code', { length: 50 }).notNull(),
    color: text('color', { length: 20 }),
    icon: text('icon', { length: 50 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    companyIdx: index('idx_categories_company').on(table.companyId),
    parentIdx: index('idx_categories_parent').on(table.parentId),
  }),
);

export const brands = sqliteTable(
  'brands',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    name: text('name', { length: 255 }).notNull(),
    nameAr: text('name_ar', { length: 255 }),
    code: text('code', { length: 50 }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    companyIdx: index('idx_brands_company').on(table.companyId),
  }),
);

export const units = sqliteTable(
  'units',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    name: text('name', { length: 100 }).notNull(),
    nameAr: text('name_ar', { length: 100 }),
    code: text('code', { length: 20 }).notNull(),
    symbol: text('symbol', { length: 10 }).notNull(),
    isFractional: integer('is_fractional', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    companyIdx: index('idx_units_company').on(table.companyId),
  }),
);

export const taxRates = sqliteTable(
  'tax_rates',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    name: text('name', { length: 100 }).notNull(),
    nameAr: text('name_ar', { length: 100 }),
    rateBasisPoints: integer('rate_basis_points').notNull().default(0), // 1400 = 14.00%
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    companyIdx: index('idx_tax_rates_company').on(table.companyId),
  }),
);

export const products = sqliteTable(
  'products',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    categoryId: text('category_id', { length: 26 }).references(() => categories.id),
    brandId: text('brand_id', { length: 26 }).references(() => brands.id),
    unitId: text('unit_id', { length: 26 }).notNull().references(() => units.id),
    taxRateId: text('tax_rate_id', { length: 26 }).references(() => taxRates.id),
    sku: text('sku', { length: 100 }).notNull(),
    barcode: text('barcode', { length: 100 }), // primary barcode
    name: text('name', { length: 255 }).notNull(),
    nameAr: text('name_ar', { length: 255 }),
    description: text('description'),
    descriptionAr: text('description_ar'),
    productType: text('product_type', { length: 20 }).notNull().default('STANDARD'), // STANDARD, WEIGHTED, SERVICE, BUNDLE
    costPrice: integer('cost_price').notNull().default(0), // integer in minor currency unit
    sellingPrice: integer('selling_price').notNull().default(0),
    minSellingPrice: integer('min_selling_price').notNull().default(0),
    isWeighted: integer('is_weighted', { mode: 'boolean' }).notNull().default(false),
    isFractional: integer('is_fractional', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    trackInventory: integer('track_inventory', { mode: 'boolean' }).notNull().default(true),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(10),
    imageUrl: text('image_url'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    companyIdx: index('idx_products_company').on(table.companyId),
    categoryIdx: index('idx_products_category').on(table.categoryId),
    barcodeIdx: index('idx_products_barcode').on(table.barcode),
    skuIdx: index('idx_products_sku').on(table.sku),
    nameIdx: index('idx_products_name').on(table.name),
  }),
);

export const productBarcodes = sqliteTable(
  'product_barcodes',
  {
    id: text('id', { length: 26 }).primaryKey(),
    productId: text('product_id', { length: 26 }).notNull().references(() => products.id),
    barcode: text('barcode', { length: 100 }).notNull(),
    barcodeType: text('barcode_type', { length: 20 }).notNull().default('EAN13'), // EAN13, CODE128, QR, etc.
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    barcodeIdx: index('idx_barcodes_barcode').on(table.barcode),
    productIdx: index('idx_barcodes_product').on(table.productId),
  }),
);

export const productPrices = sqliteTable(
  'product_prices',
  {
    id: text('id', { length: 26 }).primaryKey(),
    productId: text('product_id', { length: 26 }).notNull().references(() => products.id),
    branchId: text('branch_id', { length: 26 }), // null = all branches
    priceType: text('price_type', { length: 20 }).notNull().default('RETAIL'), // RETAIL, WHOLESALE, PROMO
    price: integer('price').notNull(),
    minPrice: integer('min_price').notNull().default(0),
    startDate: text('start_date'),
    endDate: text('end_date'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    productIdx: index('idx_prices_product').on(table.productId),
    branchIdx: index('idx_prices_branch').on(table.branchId),
  }),
);
