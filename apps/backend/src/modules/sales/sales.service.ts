import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateSaleItemDto {
  productId: string;
  barcode?: string;
  productName: string;
  productNameAr?: string;
  unitPrice: number; // in piasters
  unitCost?: number;
  quantity: number;
  discountAmount?: number;
  discountPercent?: number;
  taxRateBasisPoints?: number;
  taxAmount?: number;
  totalPrice: number;
  notes?: string;
}

export interface CreatePaymentDto {
  paymentMethod: string;
  amount: number; // in piasters
  currencyCode?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface CreateSaleDto {
  id?: string;
  companyId?: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  customerId?: string;
  cashSessionId?: string;
  invoiceNumber: string;
  status?: string;
  paymentStatus?: string;
  subtotal: number;
  discountAmount?: number;
  discountType?: string;
  discountReason?: string;
  taxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount?: number;
  notes?: string;
  idempotencyKey?: string;
  items: CreateSaleItemDto[];
  payments: CreatePaymentDto[];
  createdAt?: string;
}

@Injectable()
export class SalesService {
  async create(companyId: string, dto: CreateSaleDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const saleId = dto.id || ulid();
      const idempotencyKey = dto.idempotencyKey || `sale_${saleId}`;

      // Check idempotency
      const existing = await client.query('SELECT * FROM sales WHERE idempotency_key = $1', [idempotencyKey]);
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return this.getById(existing.rows[0].id, companyId);
      }

      // Insert Sale
      const saleResult = await client.query(
        `INSERT INTO sales (
          id, company_id, branch_id, terminal_id, cashier_id, customer_id,
          cash_session_id, invoice_number, status, payment_status,
          subtotal, discount_amount, discount_type, discount_reason,
          tax_amount, total_amount, paid_amount, change_amount,
          notes, idempotency_key, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, COALESCE($21::timestamptz, NOW()), NOW()
        ) RETURNING *`,
        [
          saleId,
          companyId,
          dto.branchId,
          dto.terminalId,
          dto.cashierId,
          dto.customerId || null,
          dto.cashSessionId || null,
          dto.invoiceNumber,
          dto.status || 'COMPLETED',
          dto.paymentStatus || 'PAID',
          dto.subtotal,
          dto.discountAmount || 0,
          dto.discountType || null,
          dto.discountReason || null,
          dto.taxAmount || 0,
          dto.totalAmount,
          dto.paidAmount,
          dto.changeAmount || 0,
          dto.notes || null,
          idempotencyKey,
          dto.createdAt || null,
        ],
      );

      // Insert Items & Decrement Inventory
      for (const item of dto.items) {
        const itemId = ulid();
        await client.query(
          `INSERT INTO sale_items (
            id, sale_id, product_id, barcode, product_name, product_name_ar,
            unit_price, unit_cost, quantity, discount_amount, discount_percent,
            tax_rate_basis_points, tax_amount, total_price, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            itemId,
            saleId,
            item.productId,
            item.barcode || null,
            item.productName,
            item.productNameAr || null,
            item.unitPrice,
            item.unitCost || 0,
            item.quantity,
            item.discountAmount || 0,
            item.discountPercent || 0,
            item.taxRateBasisPoints || 0,
            item.taxAmount || 0,
            item.totalPrice,
            item.notes || null,
          ],
        );

        // Update branch inventory
        const invRes = await client.query(
          `SELECT id, quantity FROM branch_inventory WHERE branch_id = $1 AND product_id = $2`,
          [dto.branchId, item.productId],
        );

        let qtyBefore = 0;
        let qtyAfter = 0;

        if (invRes.rows.length > 0) {
          qtyBefore = invRes.rows[0].quantity;
          qtyAfter = qtyBefore - item.quantity;
          await client.query(
            `UPDATE branch_inventory 
             SET quantity = $1, version = version + 1, updated_at = NOW() 
             WHERE id = $2`,
            [qtyAfter, invRes.rows[0].id],
          );
        } else {
          qtyBefore = 0;
          qtyAfter = -item.quantity;
          const invId = ulid();
          await client.query(
            `INSERT INTO branch_inventory (id, company_id, branch_id, product_id, quantity, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [invId, companyId, dto.branchId, item.productId, qtyAfter],
          );
        }

        // Record Inventory Movement
        await client.query(
          `INSERT INTO inventory_movements (
            id, company_id, branch_id, product_id, movement_type,
            quantity_change, quantity_before, quantity_after, unit_cost,
            reference_type, reference_id, notes, created_by
          ) VALUES ($1, $2, $3, $4, 'SALE', $5, $6, $7, $8, 'SALE', $9, $10, $11)`,
          [
            ulid(),
            companyId,
            dto.branchId,
            item.productId,
            -item.quantity,
            qtyBefore,
            qtyAfter,
            item.unitCost || 0,
            saleId,
            `Sale #${dto.invoiceNumber}`,
            dto.cashierId,
          ],
        );
      }

      // Insert Payments
      for (const p of dto.payments) {
        await client.query(
          `INSERT INTO payments (
            id, sale_id, payment_method, amount, currency_code, reference_number, notes, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED')`,
          [
            ulid(),
            saleId,
            p.paymentMethod,
            p.amount,
            p.currencyCode || 'EGP',
            p.referenceNumber || null,
            p.notes || null,
          ],
        );
      }

      await client.query('COMMIT');
      return this.getById(saleId, companyId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async list(
    companyId: string,
    query?: {
      branchId?: string;
      terminalId?: string;
      cashierId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const terminalId = query?.terminalId || null;
      const cashierId = query?.cashierId || null;
      const status = query?.status || null;
      const startDate = query?.startDate || null;
      const endDate = query?.endDate || null;
      const search = query?.search ? `%${query.search}%` : null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT s.*,
                b.name as branch_name,
                t.terminal_name,
                u.display_name as cashier_name,
                c.name as customer_name,
                c.phone as customer_phone,
                (SELECT COUNT(*)::int FROM sale_items si WHERE si.sale_id = s.id) as items_count
         FROM sales s
         JOIN branches b ON b.id = s.branch_id
         JOIN pos_terminals t ON t.id = s.terminal_id
         JOIN users u ON u.id = s.cashier_id
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE (s.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR s.branch_id = $2)
           AND ($3::varchar IS NULL OR s.terminal_id = $3)
           AND ($4::varchar IS NULL OR s.cashier_id = $4)
           AND ($5::varchar IS NULL OR s.status = $5)
           AND ($6::timestamptz IS NULL OR s.created_at >= $6)
           AND ($7::timestamptz IS NULL OR s.created_at <= $7)
           AND ($8::text IS NULL OR s.invoice_number ILIKE $8)
         ORDER BY s.created_at DESC
         LIMIT $9 OFFSET $10`,
        [companyId || null, branchId, terminalId, cashierId, status, startDate, endDate, search, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int as count
         FROM sales s
         WHERE (s.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR s.branch_id = $2)
           AND ($3::varchar IS NULL OR s.terminal_id = $3)
           AND ($4::varchar IS NULL OR s.cashier_id = $4)
           AND ($5::varchar IS NULL OR s.status = $5)
           AND ($6::timestamptz IS NULL OR s.created_at >= $6)
           AND ($7::timestamptz IS NULL OR s.created_at <= $7)
           AND ($8::text IS NULL OR s.invoice_number ILIKE $8)`,
        [companyId || null, branchId, terminalId, cashierId, status, startDate, endDate, search],
      );

      return {
        items: res.rows,
        total: countRes.rows[0].count,
      };
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId?: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const saleRes = await client.query(
        `SELECT s.*,
                b.name as branch_name,
                t.terminal_name,
                u.display_name as cashier_name,
                c.name as customer_name,
                c.phone as customer_phone
         FROM sales s
         JOIN branches b ON b.id = s.branch_id
         JOIN pos_terminals t ON t.id = s.terminal_id
         JOIN users u ON u.id = s.cashier_id
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.id = $1 AND ($2::varchar IS NULL OR s.company_id = $2)`,
        [id, companyId || null],
      );

      if (saleRes.rows.length === 0) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      const sale = saleRes.rows[0];

      // Get items
      const itemsRes = await client.query(
        `SELECT si.*, p.sku
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = $1
         ORDER BY si.id ASC`,
        [id],
      );
      sale.items = itemsRes.rows;

      // Get payments
      const paymentsRes = await client.query(
        `SELECT * FROM payments WHERE sale_id = $1 ORDER BY id ASC`,
        [id],
      );
      sale.payments = paymentsRes.rows;

      return sale;
    } finally {
      client.release();
    }
  }

  async syncBatch(companyId: string, salesList: CreateSaleDto[]): Promise<{ synced: number; skipped: number; errors: any[] }> {
    let synced = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const item of salesList) {
      try {
        const pool = getPgPool();
        const client = await pool.connect();
        try {
          const check = await client.query(
            'SELECT id FROM sales WHERE idempotency_key = $1 OR id = $2',
            [item.idempotencyKey || `sale_${item.id}`, item.id],
          );
          if (check.rows.length > 0) {
            skipped++;
            continue;
          }
        } finally {
          client.release();
        }

        await this.create(companyId, item);
        synced++;
      } catch (err: any) {
        errors.push({ id: item.id, invoiceNumber: item.invoiceNumber, error: err.message });
      }
    }

    return { synced, skipped, errors };
  }

  async cancel(id: string, companyId: string, reason: string, cashierId: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const saleRes = await client.query(
        `SELECT * FROM sales WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (saleRes.rows.length === 0) {
        throw new NotFoundException(`Sale not found`);
      }

      const sale = saleRes.rows[0];
      if (sale.status === 'CANCELLED') {
        throw new BadRequestException('Sale is already cancelled');
      }

      // Mark cancelled
      await client.query(
        `UPDATE sales 
         SET status = 'CANCELLED', notes = COALESCE(notes || E'\n', '') || $1, updated_at = NOW() 
         WHERE id = $2`,
        [`Cancelled: ${reason}`, id],
      );

      // Restore inventory items
      const itemsRes = await client.query(`SELECT * FROM sale_items WHERE sale_id = $1`, [id]);
      for (const item of itemsRes.rows) {
        const invRes = await client.query(
          `SELECT id, quantity FROM branch_inventory WHERE branch_id = $1 AND product_id = $2`,
          [sale.branch_id, item.product_id],
        );

        let qtyBefore = 0;
        let qtyAfter = 0;

        if (invRes.rows.length > 0) {
          qtyBefore = invRes.rows[0].quantity;
          qtyAfter = qtyBefore + item.quantity;
          await client.query(
            `UPDATE branch_inventory SET quantity = $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
            [qtyAfter, invRes.rows[0].id],
          );
        } else {
          qtyBefore = 0;
          qtyAfter = item.quantity;
          await client.query(
            `INSERT INTO branch_inventory (id, company_id, branch_id, product_id, quantity, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [ulid(), companyId, sale.branch_id, item.product_id, qtyAfter],
          );
        }

        // Movement
        await client.query(
          `INSERT INTO inventory_movements (
            id, company_id, branch_id, product_id, movement_type,
            quantity_change, quantity_before, quantity_after, unit_cost,
            reference_type, reference_id, notes, created_by
          ) VALUES ($1, $2, $3, $4, 'ADJUSTMENT', $5, $6, $7, $8, 'SALE_CANCEL', $9, $10, $11)`,
          [
            ulid(),
            companyId,
            sale.branch_id,
            item.product_id,
            item.quantity,
            qtyBefore,
            qtyAfter,
            item.unit_cost,
            id,
            `Cancellation of Sale #${sale.invoice_number}: ${reason}`,
            cashierId,
          ],
        );
      }

      await client.query('COMMIT');
      return this.getById(id, companyId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
