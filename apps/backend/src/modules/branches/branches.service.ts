import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateBranchDto {
  companyId: string;
  name: string;
  nameAr?: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class BranchesService {
  async list(companyId: string): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT b.*,
                (SELECT COUNT(*) FROM pos_terminals t WHERE t.branch_id = b.id AND t.is_active = TRUE) as terminals_count,
                (SELECT COUNT(*) FROM devices d WHERE d.branch_id = b.id AND d.status = 'ACTIVE') as devices_count
         FROM branches b
         WHERE (b.company_id = $1 OR $1 IS NULL) AND b.deleted_at IS NULL
         ORDER BY b.code ASC`,
        [companyId || null],
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async getById(id: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM branches WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Branch with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async create(dto: CreateBranchDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const id = ulid();
      const res = await client.query(
        `INSERT INTO branches (id, company_id, name, name_ar, code, address, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          id,
          dto.companyId,
          dto.name,
          dto.nameAr || null,
          dto.code,
          dto.address || null,
          dto.phone || null,
          dto.email || null,
        ],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: Partial<CreateBranchDto>): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const branch = await this.getById(id);
      const res = await client.query(
        `UPDATE branches SET
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          code = COALESCE($3, code),
          address = COALESCE($4, address),
          phone = COALESCE($5, phone),
          email = COALESCE($6, email),
          updated_at = NOW(),
          version = version + 1
         WHERE id = $7 RETURNING *`,
        [
          dto.name || null,
          dto.nameAr || null,
          dto.code || null,
          dto.address || null,
          dto.phone || null,
          dto.email || null,
          id,
        ],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async deactivate(id: string): Promise<void> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE branches SET is_active = FALSE, deleted_at = NOW() WHERE id = $1`,
        [id],
      );
    } finally {
      client.release();
    }
  }
}
