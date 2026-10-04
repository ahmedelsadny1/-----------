import { ulid } from 'ulid';
import { getSqlite } from '../connection.js';

export interface LocalCustomer {
  id: string;
  companyId: string;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  code?: string;
  loyaltyPoints: number;
  creditBalance: number;
  creditLimit: number;
  address?: string;
}

export class CustomerRepository {
  search(query: string, limit = 20): LocalCustomer[] {
    const sqlite = getSqlite();
    const pattern = `%${query.trim()}%`;
    const rows = sqlite
      .prepare(
        `SELECT * FROM customers
         WHERE (name LIKE ? OR name_ar LIKE ? OR phone LIKE ? OR code LIKE ?)
           AND is_active = 1 AND deleted_at IS NULL
         ORDER BY name ASC LIMIT ?`,
      )
      .all(pattern, pattern, pattern, pattern, limit) as any[];

    return rows.map((r) => this.mapRow(r));
  }

  getById(id: string): LocalCustomer | null {
    const sqlite = getSqlite();
    const row = sqlite
      .prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL')
      .get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  create(customer: Omit<LocalCustomer, 'id' | 'loyaltyPoints' | 'creditBalance'>): LocalCustomer {
    const sqlite = getSqlite();
    const id = ulid();
    const now = new Date().toISOString();

    sqlite
      .prepare(
        `INSERT INTO customers (
          id, company_id, name, name_ar, phone, email, code,
          loyalty_points, credit_balance, credit_limit, address, is_active,
          version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 1, 1, ?, ?)`,
      )
      .run(
        id,
        customer.companyId,
        customer.name,
        customer.nameAr || null,
        customer.phone || null,
        customer.email || null,
        customer.code || `CUST-${id.slice(-6)}`,
        customer.creditLimit || 0,
        customer.address || null,
        now,
        now,
      );

    return this.getById(id)!;
  }

  private mapRow(row: any): LocalCustomer {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      nameAr: row.name_ar,
      phone: row.phone,
      email: row.email,
      code: row.code,
      loyaltyPoints: row.loyalty_points || 0,
      creditBalance: row.credit_balance || 0,
      creditLimit: row.credit_limit || 0,
      address: row.address,
    };
  }
}
