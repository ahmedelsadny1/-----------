import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateCompanyDto {
  name: string;
  nameAr?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  currencyCode?: string;
}

@Injectable()
export class CompaniesService {
  async list(): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT id, name, name_ar, email, phone, currency_code, is_active, created_at
         FROM companies WHERE deleted_at IS NULL ORDER BY created_at DESC`,
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
        `SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async create(dto: CreateCompanyDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const id = ulid();
      const res = await client.query(
        `INSERT INTO companies (
          id, name, name_ar, logo_url, email, phone, address, tax_number, currency_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          id,
          dto.name,
          dto.nameAr || null,
          dto.logoUrl || null,
          dto.email || null,
          dto.phone || null,
          dto.address || null,
          dto.taxNumber || null,
          dto.currencyCode || 'EGP',
        ],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: Partial<CreateCompanyDto>): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const company = await this.getById(id);
      const res = await client.query(
        `UPDATE companies SET
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          address = COALESCE($5, address),
          tax_number = COALESCE($6, tax_number),
          updated_at = NOW(),
          version = version + 1
         WHERE id = $7 RETURNING *`,
        [
          dto.name || null,
          dto.nameAr || null,
          dto.email || null,
          dto.phone || null,
          dto.address || null,
          dto.taxNumber || null,
          id,
        ],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async getSettings(companyId: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT settings FROM company_settings WHERE company_id = $1`,
        [companyId],
      );
      return res.rows[0]?.settings || {};
    } finally {
      client.release();
    }
  }

  async updateSettings(companyId: string, settings: any): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const id = ulid();
      const res = await client.query(
        `INSERT INTO company_settings (id, company_id, settings, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (company_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
         RETURNING settings`,
        [id, companyId, JSON.stringify(settings)],
      );
      return res.rows[0]?.settings;
    } finally {
      client.release();
    }
  }
}
