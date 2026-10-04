import type { Database as DatabaseType } from 'better-sqlite3';

export const id = '0001_initial';

export function up(db: DatabaseType): void {
  db.exec(`
    -- Local Device
    CREATE TABLE IF NOT EXISTS local_device (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      terminal_code TEXT NOT NULL,
      device_name TEXT NOT NULL,
      hardware_fingerprint TEXT NOT NULL,
      app_version TEXT NOT NULL DEFAULT '0.1.0',
      db_version INTEGER NOT NULL DEFAULT 1,
      registered_at TEXT NOT NULL,
      last_sync_at TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Local Settings
    CREATE TABLE IF NOT EXISTS local_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Backup Metadata
    CREATE TABLE IF NOT EXISTS backup_metadata (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      backup_type TEXT NOT NULL DEFAULT 'AUTOMATIC',
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      trigger_source TEXT NOT NULL DEFAULT 'USER',
      checksum_sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Local Users (Cached for offline auth)
    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      pin_hash TEXT,
      roles_json TEXT NOT NULL DEFAULT '[]',
      permissions_json TEXT NOT NULL DEFAULT '[]',
      branches_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      offline_access_enabled INTEGER NOT NULL DEFAULT 1,
      credentials_expire_at TEXT,
      cached_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Local Sessions
    CREATE TABLE IF NOT EXISTS local_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES local_users(id),
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      name_ar TEXT,
      code TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

    -- Brands
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      code TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_brands_company ON brands(company_id);

    -- Units
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      code TEXT NOT NULL,
      symbol TEXT NOT NULL,
      is_fractional INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_units_company ON units(company_id);

    -- Tax Rates
    CREATE TABLE IF NOT EXISTS tax_rates (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      rate_basis_points INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tax_rates_company ON tax_rates(company_id);

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      category_id TEXT REFERENCES categories(id),
      brand_id TEXT REFERENCES brands(id),
      unit_id TEXT NOT NULL REFERENCES units(id),
      tax_rate_id TEXT REFERENCES tax_rates(id),
      sku TEXT NOT NULL,
      barcode TEXT,
      name TEXT NOT NULL,
      name_ar TEXT,
      description TEXT,
      description_ar TEXT,
      product_type TEXT NOT NULL DEFAULT 'STANDARD',
      cost_price INTEGER NOT NULL DEFAULT 0,
      selling_price INTEGER NOT NULL DEFAULT 0,
      min_selling_price INTEGER NOT NULL DEFAULT 0,
      is_weighted INTEGER NOT NULL DEFAULT 0,
      is_fractional INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      track_inventory INTEGER NOT NULL DEFAULT 1,
      low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      image_url TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    -- Product Barcodes
    CREATE TABLE IF NOT EXISTS product_barcodes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      barcode TEXT NOT NULL,
      barcode_type TEXT NOT NULL DEFAULT 'EAN13',
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_barcodes_barcode ON product_barcodes(barcode);
    CREATE INDEX IF NOT EXISTS idx_barcodes_product ON product_barcodes(product_id);

    -- Product Prices
    CREATE TABLE IF NOT EXISTS product_prices (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      branch_id TEXT,
      price_type TEXT NOT NULL DEFAULT 'RETAIL',
      price INTEGER NOT NULL,
      min_price INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prices_product ON product_prices(product_id);
    CREATE INDEX IF NOT EXISTS idx_prices_branch ON product_prices(branch_id);

    -- Inventory
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      reserved_quantity INTEGER NOT NULL DEFAULT 0,
      min_quantity INTEGER NOT NULL DEFAULT 0,
      max_quantity INTEGER NOT NULL DEFAULT 1000000,
      reorder_point INTEGER NOT NULL DEFAULT 10,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_inventory_branch_product ON inventory(branch_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);

    -- Inventory Movements
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      movement_type TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL DEFAULT 0,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_by TEXT,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_inv_movements_branch ON inventory_movements(branch_id);
    CREATE INDEX IF NOT EXISTS idx_inv_movements_sync ON inventory_movements(sync_status);

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      phone TEXT,
      email TEXT,
      code TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      credit_balance INTEGER NOT NULL DEFAULT 0,
      credit_limit INTEGER NOT NULL DEFAULT 0,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);

    -- Cash Sessions
    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      session_number TEXT NOT NULL,
      opening_time TEXT NOT NULL,
      closing_time TEXT,
      opening_balance INTEGER NOT NULL DEFAULT 0,
      closing_cash_counted INTEGER,
      system_calculated_cash INTEGER NOT NULL DEFAULT 0,
      discrepancy INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_branch ON cash_sessions(branch_id);
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_terminal ON cash_sessions(terminal_id);
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);

    -- Cash Movements
    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES cash_sessions(id),
      movement_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      authorized_by TEXT,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);

    -- Sales
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      cash_session_id TEXT REFERENCES cash_sessions(id),
      invoice_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      subtotal INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      discount_type TEXT,
      discount_reason TEXT,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL,
      change_amount INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      idempotency_key TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
    CREATE INDEX IF NOT EXISTS idx_sales_terminal ON sales(terminal_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_idempotency ON sales(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_sales_sync ON sales(sync_status);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

    -- Sale Items
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      barcode TEXT,
      product_name TEXT NOT NULL,
      product_name_ar TEXT,
      unit_price INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      tax_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      total_price INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      payment_method TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency_code TEXT NOT NULL DEFAULT 'EGP',
      reference_number TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

    -- Refunds
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      original_sale_id TEXT NOT NULL REFERENCES sales(id),
      cashier_id TEXT NOT NULL,
      refund_number TEXT NOT NULL UNIQUE,
      subtotal INTEGER NOT NULL,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      idempotency_key TEXT NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_refunds_original_sale ON refunds(original_sale_id);
    CREATE INDEX IF NOT EXISTS idx_refunds_number ON refunds(refund_number);

    -- Refund Items
    CREATE TABLE IF NOT EXISTS refund_items (
      id TEXT PRIMARY KEY,
      refund_id TEXT NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
      sale_item_id TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      total_price INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_refund_items_refund ON refund_items(refund_id);

    -- Held Carts
    CREATE TABLE IF NOT EXISTS held_carts (
      id TEXT PRIMARY KEY,
      terminal_id TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      cart_data_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      total INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_held_carts_terminal ON held_carts(terminal_id);

    -- Expense Categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      session_id TEXT REFERENCES cash_sessions(id),
      category_id TEXT NOT NULL REFERENCES expense_categories(id),
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      recipient TEXT,
      receipt_number TEXT,
      created_by TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_session ON expenses(session_id);

    -- Sync Queue
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'PENDING',
      last_error TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_idempotency ON sync_queue(idempotency_key);

    -- Sync Log
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      direction TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      records_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      error TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_ms INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at);

    -- Sync Checkpoints
    CREATE TABLE IF NOT EXISTS sync_checkpoints (
      entity_type TEXT PRIMARY KEY,
      last_sync_timestamp TEXT NOT NULL,
      last_sync_id TEXT,
      records_synced INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    -- Audit Log
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      terminal_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
  `);
}
