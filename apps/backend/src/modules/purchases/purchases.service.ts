import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreatePurchaseOrderItemDto {
  productId: string;
  unitCost: number; // in piasters
  quantityOrdered: number;
  taxAmount?: number;
}

export interface CreatePurchaseOrderDto {
  branchId: string;
  supplierId: string;
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

@Injectable()
export class PurchasesService {
  async list(
    companyId: string,
    query?: {
      branchId?: string;
      supplierId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const supplierId = query?.supplierId || null;
      const status = query?.status || null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT po.*,
                s.name as supplier_name,
                b.name as branch_name,
                u.display_name as creator_name,
                (SELECT COUNT(*)::int FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) as items_count
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         JOIN branches b ON b.id = po.branch_id
         JOIN users u ON u.id = po.created_by
         WHERE (po.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR po.branch_id = $2)
           AND ($3::varchar IS NULL OR po.supplier_id = $3)
           AND ($4::varchar IS NULL OR po.status = $4)
         ORDER BY po.created_at DESC
         LIMIT $5 OFFSET $6`,
        [companyId || null, branchId, supplierId, status, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int as count
         FROM purchase_orders po
         WHERE (po.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR po.branch_id = $2)
           AND ($3::varchar IS NULL OR po.supplier_id = $3)
           AND ($4::varchar IS NULL OR po.status = $4)`,
        [companyId || null, branchId, supplierId, status],
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
        `SELECT po.*,
                s.name as supplier_name,
                s.phone as supplier_phone,
                b.name as branch_name,
                u.display_name as creator_name
         FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         JOIN branches b ON b.id = po.branch_id
         JOIN users u ON u.id = po.created_by
         WHERE po.id = $1 AND ($2::varchar IS NULL OR po.company_id = $2)`,
        [id, companyId || null],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException(`Purchase Order ${id} not found`);
      }

      const po = res.rows[0];

      const itemsRes = await client.query(
        `SELECT poi.*, p.name as product_name, p.name_ar as product_name_ar, p.sku, p.barcode
         FROM purchase_order_items poi
         JOIN products p ON p.id = poi.product_id
         WHERE poi.purchase_order_id = $1
         ORDER BY poi.id ASC`,
        [id],
      );
      po.items = itemsRes.rows;

      return po;
    } finally {
      client.release();
    }
  }

  async create(companyId: string, userId: string, dto: CreatePurchaseOrderDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const poId = ulid();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const orderNumber = `PO-${dateStr}-${poId.slice(-6).toUpperCase()}`;

      let subtotal = 0;
      let totalTax = 0;

      for (const item of dto.items) {
        const itemTotal = item.unitCost * item.quantityOrdered;
        subtotal += itemTotal;
        totalTax += item.taxAmount || 0;
      }
      const totalAmount = subtotal + totalTax;

      // Insert PO
      await client.query(
        `INSERT INTO purchase_orders (
          id, company_id, branch_id, supplier_id, order_number, status,
          subtotal, tax_amount, total_amount, paid_amount, notes,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'ORDERED', $6, $7, $8, 0, $9, $10, NOW(), NOW())`,
        [
          poId,
          companyId,
          dto.branchId,
          dto.supplierId,
          orderNumber,
          subtotal,
          totalTax,
          totalAmount,
          dto.notes || null,
          userId,
        ],
      );

      // Insert Items
      for (const item of dto.items) {
        const itemId = ulid();
        const itemTotal = item.unitCost * item.quantityOrdered;
        await client.query(
          `INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, unit_cost,
            quantity_ordered, quantity_received, tax_amount, total_cost
          ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
          [
            itemId,
            poId,
            item.productId,
            item.unitCost,
            item.quantityOrdered,
            item.taxAmount || 0,
            itemTotal + (item.taxAmount || 0),
          ],
        );
      }

      await client.query('COMMIT');
      return this.getById(poId, companyId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async receive(id: string, companyId: string, userId: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const poRes = await client.query(
        `SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (poRes.rows.length === 0) {
        throw new NotFoundException(`Purchase Order ${id} not found`);
      }

      const po = poRes.rows[0];
      if (po.status === 'RECEIVED') {
        throw new BadRequestException('Purchase order is already fully received');
      }
      if (po.status === 'CANCELLED') {
        throw new BadRequestException('Cannot receive a cancelled purchase order');
      }

      const itemsRes = await client.query(
        `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`,
        [id],
      );

      // Receive items, increment stock, create movement, update cost
      for (const item of itemsRes.rows) {
        const qtyReceived = item.quantity_ordered;

        await client.query(
          `UPDATE purchase_order_items SET quantity_received = $1 WHERE id = $2`,
          [qtyReceived, item.id],
        );

        // Update inventory
        const invRes = await client.query(
          `SELECT id, quantity FROM branch_inventory WHERE branch_id = $1 AND product_id = $2`,
          [po.branch_id, item.product_id],
        );

        let qtyBefore = 0;
        let qtyAfter = 0;

        if (invRes.rows.length > 0) {
          qtyBefore = invRes.rows[0].quantity;
          qtyAfter = qtyBefore + qtyReceived;
          await client.query(
            `UPDATE branch_inventory SET quantity = $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
            [qtyAfter, invRes.rows[0].id],
          );
        } else {
          qtyBefore = 0;
          qtyAfter = qtyReceived;
          await client.query(
            `INSERT INTO branch_inventory (id, company_id, branch_id, product_id, quantity, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [ulid(), companyId, po.branch_id, item.product_id, qtyAfter],
          );
        }

        // Inventory Movement
        await client.query(
          `INSERT INTO inventory_movements (
            id, company_id, branch_id, product_id, movement_type,
            quantity_change, quantity_before, quantity_after, unit_cost,
            reference_type, reference_id, notes, created_by
          ) VALUES ($1, $2, $3, $4, 'PURCHASE', $5, $6, $7, $8, 'PURCHASE_ORDER', $9, $10, $11)`,
          [
            ulid(),
            companyId,
            po.branch_id,
            item.product_id,
            qtyReceived,
            qtyBefore,
            qtyAfter,
            item.unit_cost,
            po.id,
            `Received PO #${po.order_number}`,
            userId,
          ],
        );

        // Update product cost price
        await client.query(
          `UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2`,
          [item.unit_cost, item.product_id],
        );
      }

      // Update supplier balance
      await client.query(
        `UPDATE suppliers SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
        [po.total_amount, po.supplier_id],
      );

      // Update PO status
      await client.query(
        `UPDATE purchase_orders SET status = 'RECEIVED', received_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');
      return this.getById(id, companyId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancel(id: string, companyId: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const res = await client.query(
        `UPDATE purchase_orders SET status = 'CANCELLED', updated_at = NOW()
         WHERE id = $1 AND company_id = $2 AND status = 'ORDERED'
         RETURNING *`,
        [id, companyId],
      );
      if (res.rows.length === 0) {
        throw new BadRequestException('Cannot cancel this purchase order');
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }
}
