import { Injectable, Logger } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';
import { SalesService } from '../sales/sales.service.js';

export interface SyncPushOperation {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  idempotencyKey: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly salesService: SalesService) {}

  async push(
    companyId: string,
    deviceId: string,
    branchId: string,
    operations: SyncPushOperation[],
  ): Promise<{ processed: number; skipped: number; errors: any[] }> {
    let processed = 0;
    let skipped = 0;
    const errors: any[] = [];
    const pool = getPgPool();

    for (const op of operations) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Check idempotency in sync_operations table
        const check = await client.query(
          `SELECT id FROM sync_operations WHERE idempotency_key = $1`,
          [op.idempotencyKey],
        );

        if (check.rows.length > 0) {
          skipped++;
          await client.query('ROLLBACK');
          continue;
        }

        // 2. Process based on entity type
        if (op.entityType === 'sales') {
          await this.salesService.create(companyId, op.payload);
        } else if (op.entityType === 'expenses') {
          const exp = op.payload;
          await client.query(
            `INSERT INTO expenses (
              id, company_id, branch_id, category_id, amount,
              description, payment_method, recipient, receipt_number,
              created_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'CASH', $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING`,
            [
              exp.id,
              companyId,
              branchId,
              exp.categoryId,
              exp.amount,
              exp.description,
              exp.recipient || null,
              exp.receiptNumber || null,
              exp.createdBy,
              exp.createdAt,
            ],
          );
        }

        // 3. Record operation as processed
        await client.query(
          `INSERT INTO sync_operations (
            id, device_id, company_id, branch_id, entity_type,
            entity_id, operation, idempotency_key, payload, status,
            processed_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PROCESSED', NOW(), NOW())`,
          [
            ulid(),
            deviceId,
            companyId,
            branchId,
            op.entityType,
            op.entityId,
            op.operation,
            op.idempotencyKey,
            JSON.stringify(op.payload),
          ],
        );

        await client.query('COMMIT');
        processed++;
      } catch (err: any) {
        await client.query('ROLLBACK');
        this.logger.error(`Error processing sync op ${op.id} (${op.entityType}):`, err);
        errors.push({ id: op.id, entityType: op.entityType, error: err.message });
      } finally {
        client.release();
      }
    }

    return { processed, skipped, errors };
  }

  async pull(
    companyId: string,
    branchId: string,
    sinceTimestamp?: string,
  ): Promise<{
    timestamp: string;
    products: any[];
    categories: any[];
    users: any[];
    customers: any[];
  }> {
    const pool = getPgPool();
    const client = await pool.connect();
    const now = new Date().toISOString();
    const since = sinceTimestamp || '1970-01-01T00:00:00.000Z';

    try {
      // 1. Products modified since
      const prodsRes = await client.query(
        `SELECT p.*,
                COALESCE(bi.quantity, 0) as branch_stock,
                u.name as unit_name,
                c.name as category_name
         FROM products p
         LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = $2
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE (p.company_id = $1 OR $1 IS NULL)
           AND p.updated_at >= $3
         ORDER BY p.updated_at ASC
         LIMIT 500`,
        [companyId || null, branchId, since],
      );

      // 2. Categories
      const catsRes = await client.query(
        `SELECT * FROM categories
         WHERE (company_id = $1 OR $1 IS NULL)
           AND updated_at >= $2
         ORDER BY updated_at ASC`,
        [companyId || null, since],
      );

      // 3. Cashiers / Users
      const usersRes = await client.query(
        `SELECT id, company_id, branch_id, username, email, full_name, role, password_hash, is_active, updated_at
         FROM users
         WHERE (company_id = $1 OR $1 IS NULL)
           AND (branch_id = $2 OR branch_id IS NULL)
           AND updated_at >= $3`,
        [companyId || null, branchId, since],
      );

      // 4. Customers
      const custRes = await client.query(
        `SELECT * FROM customers
         WHERE (company_id = $1 OR $1 IS NULL)
           AND updated_at >= $2
         LIMIT 500`,
        [companyId || null, since],
      );

      return {
        timestamp: now,
        products: prodsRes.rows,
        categories: catsRes.rows,
        users: usersRes.rows,
        customers: custRes.rows,
      };
    } finally {
      client.release();
    }
  }
}
