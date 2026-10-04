import { ulid } from 'ulid';
import { getSqlite } from '../connection.js';

export interface InventoryItem {
  id: string;
  companyId: string;
  branchId: string;
  productId: string;
  productName: string;
  barcode?: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  reorderPoint: number;
}

export class InventoryRepository {
  getStock(productId: string): number {
    const sqlite = getSqlite();
    const row = sqlite
      .prepare('SELECT quantity FROM inventory WHERE product_id = ?')
      .get(productId) as { quantity: number } | undefined;
    return row ? row.quantity : 0;
  }

  list(limit = 100): InventoryItem[] {
    const sqlite = getSqlite();
    const rows = sqlite
      .prepare(
        `SELECT i.*, p.name as product_name, p.barcode, p.sku
         FROM inventory i
         JOIN products p ON p.id = i.product_id
         WHERE p.deleted_at IS NULL
         ORDER BY i.quantity ASC LIMIT ?`,
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      branchId: r.branch_id,
      productId: r.product_id,
      productName: r.product_name,
      barcode: r.barcode,
      sku: r.sku,
      quantity: r.quantity,
      minQuantity: r.min_quantity,
      reorderPoint: r.reorder_point,
    }));
  }

  adjustStock(params: {
    productId: string;
    branchId?: string;
    companyId?: string;
    quantityChange: number; // positive or negative
    movementType: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }): void {
    const sqlite = getSqlite();
    const now = new Date().toISOString();

    const device = sqlite
      .prepare('SELECT company_id, branch_id FROM local_device LIMIT 1')
      .get() as any;

    const companyId = params.companyId || device?.company_id || 'COMPANY_DEFAULT';
    const branchId = params.branchId || device?.branch_id || 'BRANCH_DEFAULT';

    sqlite.transaction(() => {
      // 1. Get or create inventory row
      let inv = sqlite
        .prepare('SELECT id, quantity FROM inventory WHERE product_id = ?')
        .get(params.productId) as { id: string; quantity: number } | undefined;

      const currentQty = inv ? inv.quantity : 0;
      const newQty = currentQty + params.quantityChange;

      if (inv) {
        sqlite
          .prepare('UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?')
          .run(newQty, now, inv.id);
      } else {
        const invId = ulid();
        sqlite
          .prepare(
            `INSERT INTO inventory (id, company_id, branch_id, product_id, quantity, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(invId, companyId, branchId, params.productId, newQty, now);
      }

      // 2. Insert movement audit record
      sqlite
        .prepare(
          `INSERT INTO inventory_movements (
            id, company_id, branch_id, product_id, movement_type,
            quantity_change, quantity_before, quantity_after,
            reference_type, reference_id, notes, created_by, sync_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        )
        .run(
          ulid(),
          companyId,
          branchId,
          params.productId,
          params.movementType,
          params.quantityChange,
          currentQty,
          newQty,
          params.referenceType || null,
          params.referenceId || null,
          params.notes || null,
          params.createdBy || null,
          now,
        );
    })();
  }
}
