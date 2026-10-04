import type pg from 'pg';

export const id = '0001_initial';

export async function up(client: pg.PoolClient): Promise<void> {
  await client.query(`
    -- Enable extensions if needed
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Companies
    CREATE TABLE IF NOT EXISTS companies (
      id VARCHAR(26) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      logo_url TEXT,
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      tax_number VARCHAR(50),
      currency_code VARCHAR(3) NOT NULL DEFAULT 'EGP',
      currency_subunit INTEGER NOT NULL DEFAULT 100,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    -- Company Settings
    CREATE TABLE IF NOT EXISTS company_settings (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Branches
    CREATE TABLE IF NOT EXISTS branches (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      code VARCHAR(50) NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_branches_company ON branches(company_id);

    -- Branch Settings
    CREATE TABLE IF NOT EXISTS branch_settings (
      id VARCHAR(26) PRIMARY KEY,
      branch_id VARCHAR(26) NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Devices
    CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      device_name VARCHAR(100) NOT NULL,
      hardware_fingerprint VARCHAR(255) NOT NULL,
      app_version VARCHAR(20) NOT NULL DEFAULT '0.1.0',
      db_version INTEGER NOT NULL DEFAULT 1,
      last_seen_at TIMESTAMPTZ,
      last_sync_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pg_devices_company ON devices(company_id);
    CREATE INDEX IF NOT EXISTS idx_pg_devices_branch ON devices(branch_id);

    -- POS Terminals
    CREATE TABLE IF NOT EXISTS pos_terminals (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      device_id VARCHAR(26) REFERENCES devices(id),
      terminal_code VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pg_terminals_branch ON pos_terminals(branch_id);

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) REFERENCES companies(id) ON DELETE CASCADE,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255),
      full_name VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      phone VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_locked BOOLEAN NOT NULL DEFAULT FALSE,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      last_login_at TIMESTAMPTZ,
      offline_access_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_users_company ON users(company_id);

    -- Roles
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pg_roles_company ON roles(company_id);

    -- Permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(26) PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      module VARCHAR(50) NOT NULL
    );

    -- Role Permissions
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id VARCHAR(26) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    -- User Roles
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );

    -- User Branches
    CREATE TABLE IF NOT EXISTS user_branches (
      user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, branch_id)
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      parent_id VARCHAR(26),
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      code VARCHAR(50) NOT NULL,
      color VARCHAR(20),
      icon VARCHAR(50),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_categories_company ON categories(company_id);

    -- Brands
    CREATE TABLE IF NOT EXISTS brands (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      code VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_brands_company ON brands(company_id);

    -- Units
    CREATE TABLE IF NOT EXISTS units (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      name_ar VARCHAR(100),
      code VARCHAR(20) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      is_fractional BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_units_company ON units(company_id);

    -- Tax Rates
    CREATE TABLE IF NOT EXISTS tax_rates (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      name_ar VARCHAR(100),
      rate_basis_points INTEGER NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_tax_rates_company ON tax_rates(company_id);

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category_id VARCHAR(26) REFERENCES categories(id),
      brand_id VARCHAR(26) REFERENCES brands(id),
      unit_id VARCHAR(26) NOT NULL REFERENCES units(id),
      tax_rate_id VARCHAR(26) REFERENCES tax_rates(id),
      sku VARCHAR(100) NOT NULL,
      barcode VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description TEXT,
      description_ar TEXT,
      product_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
      cost_price BIGINT NOT NULL DEFAULT 0,
      selling_price BIGINT NOT NULL DEFAULT 0,
      min_selling_price BIGINT NOT NULL DEFAULT 0,
      is_weighted BOOLEAN NOT NULL DEFAULT FALSE,
      is_fractional BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
      low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      image_url TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_pg_products_company ON products(company_id);
    CREATE INDEX IF NOT EXISTS idx_pg_products_barcode ON products(company_id, barcode);
    CREATE INDEX IF NOT EXISTS idx_pg_products_sku ON products(company_id, sku);

    -- Product Barcodes
    CREATE TABLE IF NOT EXISTS product_barcodes (
      id VARCHAR(26) PRIMARY KEY,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      barcode VARCHAR(100) NOT NULL,
      barcode_type VARCHAR(20) NOT NULL DEFAULT 'EAN13',
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pg_barcodes_barcode ON product_barcodes(barcode);

    -- Product Prices
    CREATE TABLE IF NOT EXISTS product_prices (
      id VARCHAR(26) PRIMARY KEY,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) REFERENCES branches(id) ON DELETE CASCADE,
      price_type VARCHAR(20) NOT NULL DEFAULT 'RETAIL',
      price BIGINT NOT NULL,
      min_price BIGINT NOT NULL DEFAULT 0,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Price History
    CREATE TABLE IF NOT EXISTS price_history (
      id VARCHAR(26) PRIMARY KEY,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) REFERENCES branches(id) ON DELETE CASCADE,
      old_price BIGINT NOT NULL,
      new_price BIGINT NOT NULL,
      changed_by VARCHAR(26) NOT NULL REFERENCES users(id),
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Branch Inventory
    CREATE TABLE IF NOT EXISTS branch_inventory (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      reserved_quantity INTEGER NOT NULL DEFAULT 0,
      min_quantity INTEGER NOT NULL DEFAULT 0,
      max_quantity INTEGER NOT NULL DEFAULT 1000000,
      reorder_point INTEGER NOT NULL DEFAULT 10,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pg_inventory_bp ON branch_inventory(branch_id, product_id);

    -- Inventory Movements
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      movement_type VARCHAR(30) NOT NULL,
      quantity_change INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      unit_cost BIGINT NOT NULL DEFAULT 0,
      reference_type VARCHAR(30),
      reference_id VARCHAR(26),
      notes TEXT,
      created_by VARCHAR(26) REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Stock Transfers
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      source_branch_id VARCHAR(26) NOT NULL REFERENCES branches(id),
      destination_branch_id VARCHAR(26) NOT NULL REFERENCES branches(id),
      transfer_number VARCHAR(50) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      notes TEXT,
      created_by VARCHAR(26) NOT NULL REFERENCES users(id),
      received_by VARCHAR(26) REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      received_at TIMESTAMPTZ
    );

    -- Stock Transfer Items
    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id VARCHAR(26) PRIMARY KEY,
      transfer_id VARCHAR(26) NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id),
      quantity_sent INTEGER NOT NULL,
      quantity_received INTEGER
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      tax_number VARCHAR(50),
      balance BIGINT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    -- Supplier Payments
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      supplier_id VARCHAR(26) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      amount BIGINT NOT NULL,
      payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
      reference_number VARCHAR(100),
      notes TEXT,
      created_by VARCHAR(26) NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Purchase Orders
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      supplier_id VARCHAR(26) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
      subtotal BIGINT NOT NULL DEFAULT 0,
      tax_amount BIGINT NOT NULL DEFAULT 0,
      total_amount BIGINT NOT NULL DEFAULT 0,
      paid_amount BIGINT NOT NULL DEFAULT 0,
      notes TEXT,
      created_by VARCHAR(26) NOT NULL REFERENCES users(id),
      ordered_at TIMESTAMPTZ,
      received_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Purchase Order Items
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id VARCHAR(26) PRIMARY KEY,
      purchase_order_id VARCHAR(26) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id),
      unit_cost BIGINT NOT NULL,
      quantity_ordered INTEGER NOT NULL,
      quantity_received INTEGER NOT NULL DEFAULT 0,
      tax_amount BIGINT NOT NULL DEFAULT 0,
      total_cost BIGINT NOT NULL
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      code VARCHAR(50),
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      credit_balance BIGINT NOT NULL DEFAULT 0,
      credit_limit BIGINT NOT NULL DEFAULT 0,
      address TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    -- Cash Sessions
    CREATE TABLE IF NOT EXISTS cash_sessions (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      terminal_id VARCHAR(26) NOT NULL REFERENCES pos_terminals(id),
      cashier_id VARCHAR(26) NOT NULL REFERENCES users(id),
      session_number VARCHAR(50) NOT NULL,
      opening_time TIMESTAMPTZ NOT NULL,
      closing_time TIMESTAMPTZ,
      opening_balance BIGINT NOT NULL DEFAULT 0,
      closing_cash_counted BIGINT,
      system_calculated_cash BIGINT NOT NULL DEFAULT 0,
      discrepancy BIGINT NOT NULL DEFAULT 0,
      notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Cash Movements
    CREATE TABLE IF NOT EXISTS cash_movements (
      id VARCHAR(26) PRIMARY KEY,
      session_id VARCHAR(26) NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
      movement_type VARCHAR(30) NOT NULL,
      amount BIGINT NOT NULL,
      reason TEXT NOT NULL,
      authorized_by VARCHAR(26) REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Sales
    CREATE TABLE IF NOT EXISTS sales (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      terminal_id VARCHAR(26) NOT NULL REFERENCES pos_terminals(id),
      cashier_id VARCHAR(26) NOT NULL REFERENCES users(id),
      customer_id VARCHAR(26) REFERENCES customers(id),
      cash_session_id VARCHAR(26) REFERENCES cash_sessions(id),
      invoice_number VARCHAR(100) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
      payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID',
      subtotal BIGINT NOT NULL,
      discount_amount BIGINT NOT NULL DEFAULT 0,
      discount_type VARCHAR(20),
      discount_reason TEXT,
      tax_amount BIGINT NOT NULL DEFAULT 0,
      total_amount BIGINT NOT NULL,
      paid_amount BIGINT NOT NULL,
      change_amount BIGINT NOT NULL DEFAULT 0,
      notes TEXT,
      idempotency_key VARCHAR(100) NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Sale Items
    CREATE TABLE IF NOT EXISTS sale_items (
      id VARCHAR(26) PRIMARY KEY,
      sale_id VARCHAR(26) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id),
      barcode VARCHAR(100),
      product_name VARCHAR(255) NOT NULL,
      product_name_ar VARCHAR(255),
      unit_price BIGINT NOT NULL,
      unit_cost BIGINT NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL,
      discount_amount BIGINT NOT NULL DEFAULT 0,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      tax_rate_basis_points INTEGER NOT NULL DEFAULT 0,
      tax_amount BIGINT NOT NULL DEFAULT 0,
      total_price BIGINT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(26) PRIMARY KEY,
      sale_id VARCHAR(26) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      payment_method VARCHAR(30) NOT NULL,
      amount BIGINT NOT NULL,
      currency_code VARCHAR(3) NOT NULL DEFAULT 'EGP',
      reference_number VARCHAR(100),
      notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Refunds
    CREATE TABLE IF NOT EXISTS refunds (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      terminal_id VARCHAR(26) NOT NULL REFERENCES pos_terminals(id),
      original_sale_id VARCHAR(26) NOT NULL REFERENCES sales(id),
      cashier_id VARCHAR(26) NOT NULL REFERENCES users(id),
      refund_number VARCHAR(100) NOT NULL UNIQUE,
      subtotal BIGINT NOT NULL,
      tax_amount BIGINT NOT NULL DEFAULT 0,
      total_amount BIGINT NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
      idempotency_key VARCHAR(100) NOT NULL UNIQUE,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Refund Items
    CREATE TABLE IF NOT EXISTS refund_items (
      id VARCHAR(26) PRIMARY KEY,
      refund_id VARCHAR(26) NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
      sale_item_id VARCHAR(26) NOT NULL,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id),
      unit_price BIGINT NOT NULL,
      quantity INTEGER NOT NULL,
      tax_amount BIGINT NOT NULL DEFAULT 0,
      total_price BIGINT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Expense Categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      session_id VARCHAR(26) REFERENCES cash_sessions(id),
      category_id VARCHAR(26) NOT NULL REFERENCES expense_categories(id),
      amount BIGINT NOT NULL,
      description TEXT NOT NULL,
      payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
      recipient VARCHAR(255),
      receipt_number VARCHAR(100),
      created_by VARCHAR(26) NOT NULL REFERENCES users(id),
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Sync Operations
    CREATE TABLE IF NOT EXISTS sync_operations (
      id VARCHAR(26) PRIMARY KEY,
      device_id VARCHAR(26) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(26) NOT NULL,
      operation VARCHAR(20) NOT NULL,
      idempotency_key VARCHAR(255) NOT NULL UNIQUE,
      payload JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PROCESSED',
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL
    );

    -- Sync Logs
    CREATE TABLE IF NOT EXISTS sync_logs (
      id VARCHAR(26) PRIMARY KEY,
      device_id VARCHAR(26) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      direction VARCHAR(10) NOT NULL,
      entity_type VARCHAR(50),
      records_count INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL,
      error TEXT,
      started_at TIMESTAMPTZ NOT NULL,
      completed_at TIMESTAMPTZ,
      duration_ms INTEGER
    );

    -- Sync Conflicts
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id VARCHAR(26) PRIMARY KEY,
      device_id VARCHAR(26) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(26) NOT NULL,
      conflict_type VARCHAR(50) NOT NULL,
      local_data JSONB NOT NULL,
      server_data JSONB NOT NULL,
      resolution VARCHAR(30),
      resolved_by VARCHAR(26) REFERENCES users(id),
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id VARCHAR(26) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(26),
      branch_id VARCHAR(26),
      old_value JSONB,
      new_value JSONB,
      device_id VARCHAR(26),
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) REFERENCES branches(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Daily Sales Summary
    CREATE TABLE IF NOT EXISTS daily_sales_summary (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      total_sales BIGINT NOT NULL DEFAULT 0,
      total_transactions INTEGER NOT NULL DEFAULT 0,
      total_refunds BIGINT NOT NULL DEFAULT 0,
      refund_count INTEGER NOT NULL DEFAULT 0,
      total_discount BIGINT NOT NULL DEFAULT 0,
      total_tax BIGINT NOT NULL DEFAULT 0,
      net_revenue BIGINT NOT NULL DEFAULT 0,
      cash_sales BIGINT NOT NULL DEFAULT 0,
      card_sales BIGINT NOT NULL DEFAULT 0,
      other_sales BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (company_id, branch_id, date)
    );

    -- Product Sales Summary
    CREATE TABLE IF NOT EXISTS product_sales_summary (
      id VARCHAR(26) PRIMARY KEY,
      company_id VARCHAR(26) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      branch_id VARCHAR(26) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      product_id VARCHAR(26) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      period DATE NOT NULL,
      period_type VARCHAR(10) NOT NULL,
      quantity_sold INTEGER NOT NULL DEFAULT 0,
      revenue BIGINT NOT NULL DEFAULT 0,
      cost BIGINT NOT NULL DEFAULT 0,
      profit BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (company_id, branch_id, product_id, period, period_type)
    );
  `);
}
