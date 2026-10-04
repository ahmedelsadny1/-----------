import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
}

@Injectable()
export class SuppliersService {
  async list(companyId: string, query?: { search?: string; limit?: number; offset?: number }): Promise<{ items: any[]; total: number }> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const search = query?.search ? `%${query.search}%` : null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT * FROM suppliers
         WHERE (company_id = $1 OR $1 IS NULL)
           AND deleted_at IS NULL
           AND ($2::text IS NULL OR name ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2)
         ORDER BY name ASC
         LIMIT $3 OFFSET $4`,
        [companyId || null, search, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int as count FROM suppliers
         WHERE (company_id = $1 OR $1 IS NULL)
           AND deleted_at IS NULL
           AND ($2::text IS NULL OR name ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2)`,
        [companyId || null, search],
      );

      return { items: res.rows, total: countRes.rows[0].count };
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId?: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT * FROM suppliers WHERE id = $1 AND ($2::varchar IS NULL OR company_id = $2) AND deleted_at IS NULL`,
        [id, companyId || null],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async create(companyId: string, dto: CreateSupplierDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const id = ulid();
      const res = await client.query(
        `INSERT INTO suppliers (id, company_id, name, contact_person, phone, email, address, tax_number, balance, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, true, NOW(), NOW())
         RETURNING *`,
        [id, companyId, dto.name, dto.contactPerson || null, dto.phone || null, dto.email || null, dto.address || null, dto.taxNumber || null],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async update(id: string, companyId: string, dto: Partial<CreateSupplierDto>): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const existing = await this.getById(id, companyId);
      const res = await client.query(
        `UPDATE suppliers
         SET name = COALESCE($1, name),
             contact_person = COALESCE($2, contact_person),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             address = COALESCE($5, address),
             tax_number = COALESCE($6, tax_number),
             updated_at = NOW()
         WHERE id = $7 AND company_id = $8
         RETURNING *`,
        [dto.name, dto.contactPerson, dto.phone, dto.email, dto.address, dto.taxNumber, id, companyId],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async softDelete(id: string, companyId: string): Promise<void> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query(
        `UPDATE suppliers SET deleted_at = NOW(), is_active = false WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
    } finally {
      client.release();
    }
  }

  async recordPayment(
    companyId: string,
    supplierId: string,
    userId: string,
    params: { amount: number; paymentMethod?: string; referenceNumber?: string; notes?: string },
  ): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const paymentId = ulid();
      await client.query(
        `INSERT INTO supplier_payments (id, company_id, supplier_id, amount, payment_method, reference_number, notes, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          paymentId,
          companyId,
          supplierId,
          params.amount,
          params.paymentMethod || 'BANK_TRANSFER',
          params.referenceNumber || null,
          params.notes || null,
          userId,
        ],
      );

      // Reduce supplier balance (what we owe them)
      await client.query(
        `UPDATE suppliers SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
        [params.amount, supplierId, companyId],
      );

      await client.query('COMMIT');
      return { success: true, paymentId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
