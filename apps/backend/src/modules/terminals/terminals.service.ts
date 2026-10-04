import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateTerminalDto {
  companyId: string;
  branchId: string;
  deviceId?: string;
  terminalCode: string;
  name: string;
}

@Injectable()
export class TerminalsService {
  async list(branchId?: string, companyId?: string): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT t.*, d.device_name, d.status as device_status, d.last_seen_at
         FROM pos_terminals t
         LEFT JOIN devices d ON d.id = t.device_id
         WHERE (t.branch_id = $1 OR $1 IS NULL)
           AND (t.company_id = $2 OR $2 IS NULL)
         ORDER BY t.terminal_code ASC`,
        [branchId || null, companyId || null],
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
        `SELECT t.*, d.device_name, d.status as device_status, d.last_seen_at
         FROM pos_terminals t
         LEFT JOIN devices d ON d.id = t.device_id
         WHERE t.id = $1`,
        [id],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Terminal with ID ${id} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async create(dto: CreateTerminalDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const id = ulid();
      const res = await client.query(
        `INSERT INTO pos_terminals (id, company_id, branch_id, device_id, terminal_code, name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, dto.companyId, dto.branchId, dto.deviceId || null, dto.terminalCode, dto.name],
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async bindDevice(terminalId: string, deviceId: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE pos_terminals SET device_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [deviceId, terminalId],
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Terminal with ID ${terminalId} not found`);
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }
}
