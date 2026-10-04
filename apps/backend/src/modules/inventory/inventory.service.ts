import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface StockAdjustmentDto {
  branchId: string;
  productId: string;
  quantityChange: number; // positive to add, negative to subtract
  movementType?: string; // 'ADJUSTMENT', 'DAMAGE', 'OPENING', etc.
  notes?: string;
}

@Injectable()
export class InventoryService {
  async getBranchInventory(
    companyId: string,
    query?: {
      branchId?: string;
      lowStockOnly?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const lowStockOnly = query?.lowStockOnly === true;
      const search = query?.search ? `%${query.search}%` : null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT bi.*,
                p.name as product_name,
                p.name_ar as product_name_ar,
                p.sku,
                p.barcode,
                p.selling_price,
                p.cost_price,
                c.name as category_name,
                u.name as unit_name,
                u.symbol as unit_symbol,
                b.name as branch_name,
                CASE 
                  WHEN bi.quantity <= 0 THEN 'OUT_OF_STOCK'
                  WHEN bi.quantity <= bi.reorder_point THEN 'LOW_STOCK'
                  ELSE 'IN_STOCK'
                END as stock_status
         FROM branch_inventory bi
         JOIN products p ON p.id = bi.product_id
         JOIN branches b ON b.id = bi.branch_id
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         WHERE (bi.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR bi.branch_id = $2)
           AND ($3::boolean IS FALSE OR bi.quantity <= bi.reorder_point)
           AND ($4::text IS NULL OR p.name ILIKE $4 OR p.name_ar ILIKE $4 OR p.sku ILIKE $4 OR p.barcode ILIKE $4)
         ORDER BY 
           CASE WHEN bi.quantity <= 0 THEN 1 WHEN bi.quantity <= bi.reorder_point THEN 2 ELSE 3 END,
           p.name ASC
         LIMIT $5 OFFSET $6`,
        [companyId || null, branchId, lowStockOnly, search, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int as count
         FROM branch_inventory bi
         JOIN products p ON p.id = bi.product_id
         WHERE (bi.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR bi.branch_id = $2)
           AND ($3::boolean IS FALSE OR bi.quantity <= bi.reorder_point)
           AND ($4::text IS NULL OR p.name ILIKE $4 OR p.name_ar ILIKE $4 OR p.sku ILIKE $4 OR p.barcode ILIKE $4)`,
        [companyId || null, branchId, lowStockOnly, search],
      );

      return {
        items: res.rows,
        total: countRes.rows[0].count,
      };
    } finally {
      client.release();
    }
  }

  async adjustStock(companyId: string, userId: string, dto: StockAdjustmentDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const invRes = await client.query(
        `SELECT bi.*, p.cost_price 
         FROM branch_inventory bi
         JOIN products p ON p.id = bi.product_id
         WHERE bi.branch_id = $1 AND bi.product_id = $2 FOR UPDATE`,
        [dto.branchId, dto.productId],
      );

      let qtyBefore = 0;
      let qtyAfter = 0;
      let unitCost = 0;
      let inventoryId = '';

      if (invRes.rows.length > 0) {
        const row = invRes.rows[0];
        inventoryId = row.id;
        qtyBefore = row.quantity;
        qtyAfter = qtyBefore + dto.quantityChange;
        unitCost = row.cost_price || 0;

        await client.query(
          `UPDATE branch_inventory 
           SET quantity = $1, version = version + 1, updated_at = NOW() 
           WHERE id = $2`,
          [qtyAfter, inventoryId],
        );
      } else {
        // Find product cost
        const prodRes = await client.query(`SELECT cost_price FROM products WHERE id = $1`, [dto.productId]);
        if (prodRes.rows.length === 0) {
          throw new NotFoundException('Product not found');
        }
        unitCost = prodRes.rows[0].cost_price || 0;
        qtyBefore = 0;
        qtyAfter = dto.quantityChange;
        inventoryId = ulid();

        await client.query(
          `INSERT INTO branch_inventory (id, company_id, branch_id, product_id, quantity, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [inventoryId, companyId, dto.branchId, dto.productId, qtyAfter],
        );
      }

      // Record movement
      const movementId = ulid();
      await client.query(
        `INSERT INTO inventory_movements (
          id, company_id, branch_id, product_id, movement_type,
          quantity_change, quantity_before, quantity_after, unit_cost,
          reference_type, reference_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'MANUAL_ADJUSTMENT', $10, $11, $12)`,
        [
          movementId,
          companyId,
          dto.branchId,
          dto.productId,
          dto.movementType || 'ADJUSTMENT',
          dto.quantityChange,
          qtyBefore,
          qtyAfter,
          unitCost,
          movementId,
          dto.notes || 'Manual stock adjustment',
          userId,
        ],
      );

      await client.query('COMMIT');

      return {
        success: true,
        inventoryId,
        productId: dto.productId,
        quantityBefore: qtyBefore,
        quantityAfter: qtyAfter,
        quantityChange: dto.quantityChange,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMovements(
    companyId: string,
    query?: {
      branchId?: string;
      productId?: string;
      movementType?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: any[]; total: number }> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const productId = query?.productId || null;
      const movementType = query?.movementType || null;
      const startDate = query?.startDate || null;
      const endDate = query?.endDate || null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT im.*,
                p.name as product_name,
                p.name_ar as product_name_ar,
                p.sku,
                p.barcode,
                b.name as branch_name,
                u.display_name as user_name
         FROM inventory_movements im
         JOIN products p ON p.id = im.product_id
         JOIN branches b ON b.id = im.branch_id
         LEFT JOIN users u ON u.id = im.created_by
         WHERE (im.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR im.branch_id = $2)
           AND ($3::varchar IS NULL OR im.product_id = $3)
           AND ($4::varchar IS NULL OR im.movement_type = $4)
           AND ($5::timestamptz IS NULL OR im.created_at >= $5)
           AND ($6::timestamptz IS NULL OR im.created_at <= $6)
         ORDER BY im.created_at DESC
         LIMIT $7 OFFSET $8`,
        [companyId || null, branchId, productId, movementType, startDate, endDate, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int as count
         FROM inventory_movements im
         WHERE (im.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR im.branch_id = $2)
           AND ($3::varchar IS NULL OR im.product_id = $3)
           AND ($4::varchar IS NULL OR im.movement_type = $4)
           AND ($5::timestamptz IS NULL OR im.created_at >= $5)
           AND ($6::timestamptz IS NULL OR im.created_at <= $6)`,
        [companyId || null, branchId, productId, movementType, startDate, endDate],
      );

      return {
        items: res.rows,
        total: countRes.rows[0].count,
      };
    } finally {
      client.release();
    }
  }

  async getLowStockAlerts(companyId: string, branchId?: string): Promise<any[]> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT bi.*,
                p.name as product_name,
                p.name_ar as product_name_ar,
                p.sku,
                p.barcode,
                b.name as branch_name
         FROM branch_inventory bi
         JOIN products p ON p.id = bi.product_id
         JOIN branches b ON b.id = bi.branch_id
         WHERE (bi.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR bi.branch_id = $2)
           AND bi.quantity <= bi.reorder_point
         ORDER BY bi.quantity ASC
         LIMIT 100`,
        [companyId || null, branchId || null],
      );
      return res.rows;
    } finally {
      client.release();
    }
  }
}
