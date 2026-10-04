import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateCustomerDto {
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  code?: string;
  creditLimit?: number;
  address?: string;
}

@Injectable()
export class CustomersService {
  async list(
    companyId: string,
    query?: {
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const search = query?.search ? `%${query.search}%` : null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT * FROM customers
         WHERE (company_id = $1 OR $1 IS NULL)
           AND deleted_at IS NULL
           AND ($2::text IS NULL OR name ILIKE $2 OR name_ar ILIKE $2 OR phone ILIKE $2 OR code ILIKE $2)
         ORDER BY name ASC
         LIMIT $3 OFFSET $4`,
        [companyId || null, search, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int as count FROM customers
         WHERE (company_id = $1 OR $1 IS NULL)
           AND deleted_at IS NULL
           AND ($2::text IS NULL OR name ILIKE $2 OR name_ar ILIKE $2 OR phone ILIKE $2 OR code ILIKE $2)`,
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
        `SELECT * FROM customers WHERE id = $1 AND ($2::varchar IS NULL OR company_id = $2) AND deleted_at IS NULL`,
        [id, companyId || null],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async create(companyId: string, dto: CreateCustomerDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const id = ulid();
      const code = dto.code || `CUST-${id.slice(-6).toUpperCase()}`;

      const res = await client.query(
        `INSERT INTO customers (
          id, company_id, name, name_ar, phone, email, code,
          loyalty_points, credit_balance, credit_limit, address,
          is_active, version, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          0, 0, $8, $9,
          true, 1, NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          companyId,
          dto.name,
          dto.nameAr || null,
          dto.phone || null,
          dto.email || null,
          code,
          dto.creditLimit || 0,
          dto.address || null,
        ],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async update(id: string, companyId: string, dto: Partial<CreateCustomerDto>): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await this.getById(id, companyId);
      const res = await client.query(
        `UPDATE customers
         SET name = COALESCE($1, name),
             name_ar = COALESCE($2, name_ar),
             phone = COALESCE($3, phone),
             email = COALESCE($4, email),
             code = COALESCE($5, code),
             credit_limit = COALESCE($6, credit_limit),
             address = COALESCE($7, address),
             version = version + 1,
             updated_at = NOW()
         WHERE id = $8 AND company_id = $9
         RETURNING *`,
        [dto.name, dto.nameAr, dto.phone, dto.email, dto.code, dto.creditLimit, dto.address, id, companyId],
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
        `UPDATE customers SET deleted_at = NOW(), is_active = false WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
    } finally {
      client.release();
    }
  }

  async addLoyaltyPoints(id: string, companyId: string, points: number): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const res = await client.query(
        `UPDATE customers
         SET loyalty_points = loyalty_points + $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3
         RETURNING *`,
        [points, id, companyId],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }
}
