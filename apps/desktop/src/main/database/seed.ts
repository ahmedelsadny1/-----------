import type { Database as DatabaseType } from 'better-sqlite3';
import { ulid } from 'ulid';

export function seedLocalDatabase(sqlite: DatabaseType): void {
  // Check if already seeded
  const count = sqlite.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (count && count.count > 0) {
    return;
  }

  console.log('[SQLite Seed] Seeding default local products, categories, units, and users...');

  const companyId = '01H0000000000000000000COMP';
  const branchId = '01H0000000000000000000BRAN';
  const terminalId = '01H0000000000000000000TERM';
  const now = new Date().toISOString();

  // 1. Device Registration
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO local_device (
        id, company_id, branch_id, terminal_id, terminal_code, device_name,
        hardware_fingerprint, app_version, db_version, registered_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      ulid(),
      companyId,
      branchId,
      terminalId,
      'POS-01',
      'Cashier Station 1',
      'LOCAL_DEV_HARDWARE_FINGERPRINT',
      '0.1.0',
      1,
      now,
      'ACTIVE',
      now,
      now,
    );

  // 2. Local Users (Cached for offline login)
  // Password hash for 'Admin1234!' and 'Cashier1234!'
  const defaultHash = '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHR0ZXN0c2FsdA$u3kZ0QzH9vJgQ7Lp/X7vL1+5tE1y0hF0vVbQx4K8Z2o';

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO local_users (
        id, company_id, username, email, full_name, password_hash,
        roles_json, permissions_json, branches_json, is_active, offline_access_enabled,
        cached_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      '01H000000000000000000ADMIN',
      companyId,
      'admin',
      'admin@alamal.com',
      'مدير النظام (Admin)',
      defaultHash,
      JSON.stringify(['super_admin']),
      JSON.stringify(['*']),
      JSON.stringify([branchId]),
      1,
      1,
      now,
      now,
      now,
    );

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO local_users (
        id, company_id, username, email, full_name, password_hash,
        roles_json, permissions_json, branches_json, is_active, offline_access_enabled,
        cached_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      '01H00000000000000000CASHIE',
      companyId,
      'cashier1',
      'cashier1@alamal.com',
      'أحمد محمود (كاشير)',
      defaultHash,
      JSON.stringify(['cashier']),
      JSON.stringify(['sales.view', 'sales.create', 'sales.discount', 'cash_sessions.view']),
      JSON.stringify([branchId]),
      1,
      1,
      now,
      now,
      now,
    );

  // 3. Units
  const unitPieceId = ulid();
  const unitKgId = ulid();
  const unitLiterId = ulid();

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO units (id, company_id, name, name_ar, code, symbol, is_fractional, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(unitPieceId, companyId, 'Piece', 'قطعة', 'PCS', 'قطعة', 0, now, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO units (id, company_id, name, name_ar, code, symbol, is_fractional, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(unitKgId, companyId, 'Kilogram', 'كيلوجرام', 'KG', 'كجم', 1, now, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO units (id, company_id, name, name_ar, code, symbol, is_fractional, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(unitLiterId, companyId, 'Liter', 'لتر', 'LTR', 'لتر', 1, now, now);

  // 4. Tax Rate (VAT 14%)
  const vatTaxId = ulid();
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO tax_rates (id, company_id, name, name_ar, rate_basis_points, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(vatTaxId, companyId, 'VAT 14%', 'ضريبة القيمة المضافة 14%', 1400, 1, now, now);

  // 5. Categories
  const catDairyId = ulid();
  const catBeveragesId = ulid();
  const catBakeryId = ulid();
  const catSnacksId = ulid();

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO categories (id, company_id, name, name_ar, code, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(catDairyId, companyId, 'Dairy & Eggs', 'ألبان وبيض', 'CAT-DAIRY', '#3b82f6', '🥛', now, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO categories (id, company_id, name, name_ar, code, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(catBeveragesId, companyId, 'Beverages', 'مشروبات وعصائر', 'CAT-BEV', '#10b981', '🧃', now, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO categories (id, company_id, name, name_ar, code, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(catBakeryId, companyId, 'Bakery', 'مخبوزات وحلويات', 'CAT-BAKE', '#f59e0b', '🍞', now, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO categories (id, company_id, name, name_ar, code, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(catSnacksId, companyId, 'Snacks', 'تسالي ومقرمشات', 'CAT-SNACK', '#ec4899', '🍿', now, now);

  // 6. Products
  const sampleProducts = [
    {
      id: ulid(),
      barcode: '6221234567890',
      sku: 'MILK-001',
      name: 'Juhayna Full Cream Milk 1L',
      nameAr: 'حليب جهينة كامل الدسم 1 لتر',
      catId: catDairyId,
      unitId: unitLiterId,
      costPrice: 3200, // 32.00 EGP
      sellingPrice: 3800, // 38.00 EGP
      stock: 120,
    },
    {
      id: ulid(),
      barcode: '6221234567891',
      sku: 'WATER-001',
      name: 'Nestle Pure Life 1.5L',
      nameAr: 'مياه نستله بيور لايف 1.5 لتر',
      catId: catBeveragesId,
      unitId: unitLiterId,
      costPrice: 700, // 7.00 EGP
      sellingPrice: 1000, // 10.00 EGP
      stock: 250,
    },
    {
      id: ulid(),
      barcode: '6221234567892',
      sku: 'BREAD-001',
      name: 'Rich Bake White Toast',
      nameAr: 'توست أبيض ريتش بيك',
      catId: catBakeryId,
      unitId: unitPieceId,
      costPrice: 2200,
      sellingPrice: 2800,
      stock: 45,
    },
    {
      id: ulid(),
      barcode: '6221234567893',
      sku: 'CHEESE-001',
      name: 'Domty Feta Cheese 500g',
      nameAr: 'جبنة دومتي فيتا 500 جرام',
      catId: catDairyId,
      unitId: unitPieceId,
      costPrice: 3000,
      sellingPrice: 3600,
      stock: 80,
    },
    {
      id: ulid(),
      barcode: '6221234567894',
      sku: 'CHIPS-001',
      name: 'Chipsy Salt & Vinegar Jumbo',
      nameAr: 'شيبسي ملح وخل حجم عائلي',
      catId: catSnacksId,
      unitId: unitPieceId,
      costPrice: 1200,
      sellingPrice: 1500,
      stock: 160,
    },
    {
      id: ulid(),
      barcode: '6221234567895',
      sku: 'COLA-001',
      name: 'Coca Cola Can 330ml',
      nameAr: 'كوكاكولا كانز 330 مل',
      catId: catBeveragesId,
      unitId: unitPieceId,
      costPrice: 900,
      sellingPrice: 1200,
      stock: 200,
    },
  ];

  const insertProd = sqlite.prepare(
    `INSERT OR IGNORE INTO products (
      id, company_id, category_id, unit_id, tax_rate_id, sku, barcode,
      name, name_ar, product_type, cost_price, selling_price, min_selling_price,
      is_weighted, is_fractional, is_active, track_inventory, low_stock_threshold,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 10, ?, ?)`,
  );

  const insertBarcode = sqlite.prepare(
    `INSERT OR IGNORE INTO product_barcodes (id, product_id, barcode, barcode_type, is_primary, created_at)
     VALUES (?, ?, ?, 'EAN13', 1, ?)`,
  );

  const insertInv = sqlite.prepare(
    `INSERT OR IGNORE INTO inventory (
      id, company_id, branch_id, product_id, quantity, reserved_quantity, min_quantity, reorder_point, version, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, 5, 15, 1, ?)`,
  );

  for (const p of sampleProducts) {
    insertProd.run(
      p.id,
      companyId,
      p.catId,
      p.unitId,
      vatTaxId,
      p.sku,
      p.barcode,
      p.name,
      p.nameAr,
      'STANDARD',
      p.costPrice,
      p.sellingPrice,
      p.costPrice,
      0,
      0,
      now,
      now,
    );

    insertBarcode.run(ulid(), p.id, p.barcode, now);
    insertInv.run(ulid(), companyId, branchId, p.id, p.stock, now);
  }

  // 7. Demo Customer
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO customers (
        id, company_id, name, name_ar, phone, email, code, loyalty_points, credit_balance, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(ulid(), companyId, 'عميل نقدي عام', 'عميل نقدي عام', '01000000000', 'general@pos.local', 'CUST-000', 0, 0, now, now);

  console.log('[SQLite Seed] Seeded demo catalog and cached offline users successfully.');
}
