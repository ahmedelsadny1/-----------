import { ulid } from 'ulid';
import { getSqlite } from '../database/connection.js';
import { SyncRepository } from '../database/repositories/sync.repository.js';

export interface RefundItemParam {
  saleItemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  totalPrice: number;
  reason?: string;
}

export interface CreateRefundParams {
  originalSaleId: string;
  cashierId: string;
  reason: string;
  items: RefundItemParam[];
}

export class RefundService {
  private syncRepo: SyncRepository;

  constructor() {
    this.syncRepo = new SyncRepository();
  }

  processRefund(params: CreateRefundParams): any {
    if (!params.items || params.items.length === 0) {
      throw new Error('Refund must include at least one item');
    }

    const sqlite = getSqlite();
    const now = new Date().toISOString();

    return sqlite.transaction(() => {
      // 1. Fetch original sale
      const sale = sqlite
        .prepare('SELECT * FROM sales WHERE id = ?')
        .get(params.originalSaleId) as any;

      if (!sale) {
        throw new Error(`Original sale with ID ${params.originalSaleId} not found`);
      }

      if (sale.status === 'CANCELLED') {
        throw new Error('Cannot process refund for a cancelled sale');
      }

      const refundId = ulid();
      const dateStr = now.slice(0, 10).replace(/-/g, '');
      const refundNumber = `REF-${dateStr}-${refundId.slice(-6).toUpperCase()}`;

      let subtotal = 0;
      let totalTax = 0;

      for (const item of params.items) {
        subtotal += item.totalPrice;
        totalTax += item.taxAmount || 0;
      }
      const totalAmount = subtotal;

      // 2. Insert Refund Record
      sqlite
        .prepare(
          `INSERT INTO refunds (
            id, company_id, branch_id, terminal_id, original_sale_id,
            cashierId, refund_number, subtotal, tax_amount, total_amount,
            reason, status, sync_status, idempotency_key, version, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 'PENDING', ?, 1, ?)`,
        )
        .run(
          refundId,
          sale.company_id,
          sale.branch_id,
          sale.terminal_id,
          sale.id,
          params.cashierId,
          refundNumber,
          subtotal,
          totalTax,
          totalAmount,
          params.reason,
          `refund_${refundId}`,
          now,
        );

      // 3. Process Each Refund Item & Restore Inventory
      for (const item of params.items) {
        const refundItemId = ulid();
        sqlite
          .prepare(
            `INSERT INTO refund_items (
              id, refund_id, sale_item_id, product_id, unit_price,
              quantity, tax_amount, total_price, reason, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            refundItemId,
            refundId,
            item.saleItemId,
            item.productId,
            item.unitPrice,
            item.quantity,
            item.taxAmount || 0,
            item.totalPrice,
            item.reason || params.reason,
            now,
          );

        // Fetch current stock
        let inv = sqlite
          .prepare('SELECT id, quantity FROM inventory WHERE product_id = ?')
          .get(item.productId) as { id: string; quantity: number } | undefined;

        const currentQty = inv ? inv.quantity : 0;
        const newQty = currentQty + item.quantity;

        if (inv) {
          sqlite
            .prepare('UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?')
            .run(newQty, now, inv.id);
        } else {
          sqlite
            .prepare(
              `INSERT INTO inventory (id, company_id, branch_id, product_id, quantity, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(ulid(), sale.company_id, sale.branch_id, item.productId, newQty, now);
        }

        // Record Inventory Movement
        sqlite
          .prepare(
            `INSERT INTO inventory_movements (
              id, company_id, branch_id, product_id, movement_type,
              quantity_change, quantity_before, quantity_after,
              reference_type, reference_id, notes, created_by, sync_status, created_at
            ) VALUES (?, ?, ?, ?, 'RETURN', ?, ?, ?, 'REFUND', ?, ?, ?, 'PENDING', ?)`,
          )
          .run(
            ulid(),
            sale.company_id,
            sale.branch_id,
            item.productId,
            item.quantity,
            currentQty,
            newQty,
            refundId,
            `Refund #${refundNumber} for Sale #${sale.invoice_number}: ${params.reason}`,
            params.cashierId,
            now,
          );
      }

      // 4. Update Original Sale status
      const totalRefundedRes = sqlite
        .prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM refunds WHERE original_sale_id = ?')
        .get(sale.id) as { total: number };

      const totalRefunded = totalRefundedRes.total + totalAmount;
      const newSaleStatus = totalRefunded >= sale.total_amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      sqlite
        .prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?')
        .run(newSaleStatus, now, sale.id);

      // 5. Enqueue in Sync Queue
      this.syncRepo.enqueue({
        entityType: 'refunds',
        entityId: refundId,
        action: 'CREATE',
        payload: {
          id: refundId,
          companyId: sale.company_id,
          branchId: sale.branch_id,
          terminalId: sale.terminal_id,
          originalSaleId: sale.id,
          cashierId: params.cashierId,
          refundNumber,
          subtotal,
          taxAmount: totalTax,
          totalAmount,
          reason: params.reason,
          items: params.items,
          createdAt: now,
        },
      });

      return {
        id: refundId,
        refundNumber,
        originalInvoiceNumber: sale.invoice_number,
        totalAmount,
        status: newSaleStatus,
        createdAt: now,
      };
    })();
  }
}
