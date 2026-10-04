import { Injectable, NotFoundException } from '@nestjs/common';
import { getPgPool } from '../../database/connection.js';

@Injectable()
export class RolesService {
  async list(companyId: string): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT r.id, r.name, r.description, r.is_system, r.is_active,
                COUNT(rp.permission_id) as permissions_count
         FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         WHERE (r.company_id = $1 OR r.is_system = TRUE)
         GROUP BY r.id
         ORDER BY r.is_system DESC, r.name ASC`,
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
        `SELECT r.id, r.name, r.description, r.is_system, r.is_active,
                COALESCE(json_agg(json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'module', p.module)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE r.id = $1
         GROUP BY r.id`,
        [id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async listPermissions(): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT id, code, name, description, module FROM permissions ORDER BY module, code');
      return res.rows;
    } finally {
      client.release();
    }
  }
}
