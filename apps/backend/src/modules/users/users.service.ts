import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

@Injectable()
export class UsersService {
  async list(companyId: string): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT u.id, u.company_id, u.username, u.email, u.full_name, u.phone, u.is_active, 
                u.is_locked, u.last_login_at, u.created_at,
                COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE (u.company_id = $1 OR $1 IS NULL) AND u.deleted_at IS NULL
         GROUP BY u.id
         ORDER BY u.created_at DESC`,
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
        `SELECT u.id, u.company_id, u.username, u.email, u.full_name, u.phone, u.is_active, 
                u.is_locked, u.last_login_at, u.created_at,
                COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.id = $1 AND u.deleted_at IS NULL
         GROUP BY u.id`,
        [id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async lock(id: string): Promise<void> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('UPDATE users SET is_locked = TRUE WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  }

  async unlock(id: string): Promise<void> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('UPDATE users SET is_locked = FALSE, failed_login_attempts = 0 WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  }
}
