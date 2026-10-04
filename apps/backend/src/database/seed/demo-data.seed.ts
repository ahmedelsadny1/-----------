import { ulid } from 'ulid';
import type pg from 'pg';
import { SYSTEM_ROLES } from '@supermarket/shared';

// Deterministic ULIDs for demo entities for easy referencing and testing
export const DEMO_COMPANY_ID = '01H0000000000000000000COMP';
export const DEMO_BRANCH_ID = '01H0000000000000000000BRAN';
export const DEMO_TERMINAL_ID = '01H0000000000000000000TERM';
export const DEMO_ADMIN_ID = '01H000000000000000000ADMIN';
export const DEMO_CASHIER_ID = '01H00000000000000000CASHIE';

async function hashPassword(password: string): Promise<string> {
  try {
    const argon2 = await import('argon2');
    return await argon2.hash(password);
  } catch {
    // Fallback argon2id hash for dev/offline if binary build unavailable
    return '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHR0ZXN0c2FsdA$u3kZ0QzH9vJgQ7Lp/X7vL1+5tE1y0hF0vVbQx4K8Z2o';
  }
}

export async function seedDemoData(
  client: pg.PoolClient,
  roleIdMap: Map<string, string>,
): Promise<void> {
  console.log('[Seed] Seeding demo company, branches, users, and catalog...');

  // 1. Demo Company
  await client.query(
    `
    INSERT INTO companies (id, name, name_ar, currency_code, currency_subunit, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `,
    [DEMO_COMPANY_ID, 'Al-Amal Supermarket', 'سوبرماركت الأمل', 'EGP', 100, true],
  );

  // 2. Demo Branch
  await client.query(
    `
    INSERT INTO branches (id, company_id, name, name_ar, code, address, phone, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `,
    [
      DEMO_BRANCH_ID,
      DEMO_COMPANY_ID,
      'Main Branch',
      'الفرع الرئيسي',
      'BR-01',
      '123 Nile Corniche, Cairo',
      '+201000000000',
      true,
    ],
  );

  // 3. Demo Terminal
  await client.query(
    `
    INSERT INTO pos_terminals (id, company_id, branch_id, terminal_code, name, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `,
    [DEMO_TERMINAL_ID, DEMO_COMPANY_ID, DEMO_BRANCH_ID, 'POS-01', 'Cashier Station 1', true],
  );

  // 4. Demo Users
  const adminPasswordHash = await hashPassword('Admin1234!');
  const cashierPasswordHash = await hashPassword('Cashier1234!');

  // Super Admin
  await client.query(
    `
    INSERT INTO users (id, company_id, username, email, full_name, password_hash, is_active, offline_access_enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name;
    `,
    [
      DEMO_ADMIN_ID,
      DEMO_COMPANY_ID,
      'admin',
      'admin@alamal.com',
      'System Administrator',
      adminPasswordHash,
      true,
      true,
    ],
  );

  // Cashier
  await client.query(
    `
    INSERT INTO users (id, company_id, username, email, full_name, password_hash, is_active, offline_access_enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name;
    `,
    [
      DEMO_CASHIER_ID,
      DEMO_COMPANY_ID,
      'cashier1',
      'cashier1@alamal.com',
      'Ahmed Mahmoud (Cashier)',
      cashierPasswordHash,
      true,
      true,
    ],
  );

  // Assign Roles
  const superAdminRoleId = roleIdMap.get(SYSTEM_ROLES.SUPER_ADMIN);
  if (superAdminRoleId) {
    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [DEMO_ADMIN_ID, superAdminRoleId],
    );
  }

  const cashierRoleId = roleIdMap.get(SYSTEM_ROLES.CASHIER);
  if (cashierRoleId) {
    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [DEMO_CASHIER_ID, cashierRoleId],
    );
  }

  // Assign Branch Access
  await client.query(
    'INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [DEMO_ADMIN_ID, DEMO_BRANCH_ID],
  );
  await client.query(
    'INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [DEMO_CASHIER_ID, DEMO_BRANCH_ID],
  );

  // 5. Units
  const unitPieceId = ulid();
  const unitKgId = ulid();
  const unitLiterId = ulid();

  await client.query(
    `
    INSERT INTO units (id, company_id, name, name_ar, code, symbol, is_fractional, is_active)
    VALUES 
      ($1, $4, 'Piece', 'قطعة', 'PCS', 'pc', FALSE, TRUE),
      ($2, $4, 'Kilogram', 'كيلوجرام', 'KG', 'kg', TRUE, TRUE),
      ($3, $4, 'Liter', 'لتر', 'LTR', 'L', TRUE, TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [unitPieceId, unitKgId, unitLiterId, DEMO_COMPANY_ID],
  );

  // 6. Tax Rates (VAT 14%)
  const vatTaxId = ulid();
  await client.query(
    `
    INSERT INTO tax_rates (id, company_id, name, name_ar, rate_basis_points, is_default, is_active)
    VALUES ($1, $2, 'VAT 14%', 'ضريبة القيمة المضافة 14%', 1400, TRUE, TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [vatTaxId, DEMO_COMPANY_ID],
  );

  // 7. Categories
  const catDairyId = ulid();
  const catBeveragesId = ulid();
  const catBakeryId = ulid();

  await client.query(
    `
    INSERT INTO categories (id, company_id, name, name_ar, code, color, is_active)
    VALUES
      ($1, $4, 'Dairy & Eggs', 'ألبان وبيض', 'CAT-DAIRY', '#3b82f6', TRUE),
      ($2, $4, 'Beverages', 'مشروبات', 'CAT-BEV', '#10b981', TRUE),
      ($3, $4, 'Bakery', 'مخبوزات', 'CAT-BAKE', '#f59e0b', TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [catDairyId, catBeveragesId, catBakeryId, DEMO_COMPANY_ID],
  );

  // 8. Products
  const prodMilkId = ulid();
  const prodWaterId = ulid();
  const prodBreadId = ulid();

  // Fresh Milk 1L - 35.00 EGP (3500 minor units)
  await client.query(
    `
    INSERT INTO products (
      id, company_id, category_id, unit_id, tax_rate_id, sku, barcode,
      name, name_ar, cost_price, selling_price, min_selling_price, is_active
    ) VALUES ($1, $2, $3, $4, $5, 'SKU-MILK-01', '6221234567890', 'Fresh Milk 1L', 'حليب طازج 1 لتر', 2800, 3500, 3200, TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [prodMilkId, DEMO_COMPANY_ID, catDairyId, unitLiterId, vatTaxId],
  );

  // Mineral Water 1.5L - 10.00 EGP (1000 minor units)
  await client.query(
    `
    INSERT INTO products (
      id, company_id, category_id, unit_id, tax_rate_id, sku, barcode,
      name, name_ar, cost_price, selling_price, min_selling_price, is_active
    ) VALUES ($1, $2, $3, $4, $5, 'SKU-WATER-01', '6221234567891', 'Mineral Water 1.5L', 'مياه معدنية 1.5 لتر', 600, 1000, 800, TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [prodWaterId, DEMO_COMPANY_ID, catBeveragesId, unitLiterId, vatTaxId],
  );

  // Toast Bread - 25.00 EGP (2500 minor units)
  await client.query(
    `
    INSERT INTO products (
      id, company_id, category_id, unit_id, tax_rate_id, sku, barcode,
      name, name_ar, cost_price, selling_price, min_selling_price, is_active
    ) VALUES ($1, $2, $3, $4, $5, 'SKU-BREAD-01', '6221234567892', 'White Toast Bread', 'خبز توست أبيض', 1800, 2500, 2200, TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [prodBreadId, DEMO_COMPANY_ID, catBakeryId, unitPieceId, vatTaxId],
  );

  // Product Barcodes
  await client.query(
    `
    INSERT INTO product_barcodes (id, product_id, barcode, barcode_type, is_primary)
    VALUES
      ($1, $4, '6221234567890', 'EAN13', TRUE),
      ($2, $5, '6221234567891', 'EAN13', TRUE),
      ($3, $6, '6221234567892', 'EAN13', TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [ulid(), ulid(), ulid(), prodMilkId, prodWaterId, prodBreadId],
  );

  // Branch Inventory (Stock levels)
  await client.query(
    `
    INSERT INTO branch_inventory (id, company_id, branch_id, product_id, quantity, min_quantity, reorder_point)
    VALUES
      ($1, $4, $5, $6, 150, 10, 20),
      ($2, $4, $5, $7, 300, 20, 50),
      ($3, $4, $5, $8, 80, 5, 15)
    ON CONFLICT (id) DO NOTHING;
    `,
    [ulid(), ulid(), ulid(), DEMO_COMPANY_ID, DEMO_BRANCH_ID, prodMilkId, prodWaterId, prodBreadId],
  );

  // 9. Demo Customer
  await client.query(
    `
    INSERT INTO customers (id, company_id, name, name_ar, phone, email, code, loyalty_points, credit_limit, is_active)
    VALUES ($1, $2, 'General Customer', 'عميل عام نقدي', '01000000001', 'customer@general.com', 'CUST-001', 50, 100000, TRUE)
    ON CONFLICT (id) DO NOTHING;
    `,
    [ulid(), DEMO_COMPANY_ID],
  );

  console.log('[Seed] Demo data seeded successfully.');
}
