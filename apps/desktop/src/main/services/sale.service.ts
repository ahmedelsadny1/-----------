import { ulid } from 'ulid';
import { getSqlite } from '../database/connection.js';
import { SyncRepository } from '../database/repositories/sync.repository.js';

export interface CartItemDto {
  productId: string;
  barcode?: string;
  productName: string;
  productNameAr?: string;
  unitPrice: number; // in piasters
  unitCost?: number;
  quantity: number;
  discountAmount?: number;
  discountPercent?: number; // basis points (e.g. 500 = 5%)
  taxRateBasisPoints?: number;
}

export interface PaymentDto {
  paymentMethod: 'CASH' | 'CARD' | 'SPLIT' | 'CREDIT';
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

export interface CreateSaleParams {
  companyId?: string;
  branchId?: string;
  terminalId: string;
  cashierId: string;
  customerId?: string;
  cashSessionId?: string;
  items: CartItemDto[];
  payments: PaymentDto[];
  orderDiscountAmount?: number;
  orderDiscountType?: 'FIXED' | 'PERCENTAGE';
  orderDiscountReason?: string;
  notes?: string;
  idempotencyKey?: string;
}

export class SaleService {
  private syncRepo: SyncRepository;

  constructor() {
    this.syncRepo = new SyncRepository();
  }

  createSale(params: CreateSaleParams): any {
    if (!params.items || params.items.length === 0) {
      throw new Error('Cart cannot be empty.');
    }

    const sqlite = getSqlite();

    // Fetch device registration for company and branch IDs
    const device = sqlite
      .prepare('SELECT company_id, branch_id, terminal_code FROM local_device LIMIT 1')
      .get() as any;

    const companyId = params.companyId || device?.company_id || '01H0000000000000000000COMP';
    const branchId = params.branchId || device?.branch_id || '01H0000000000000000000BRAN';
    const terminalCode = device?.terminal_code || 'POS-01';

    // 1. Math calculations using pure integers (minor units / piasters)
    let subtotal = 0;
    let totalTax = 0;
    const processedItems: any[] = [];

    for (const item of params.items) {
      const lineBase = item.unitPrice * item.quantity;
      const lineDiscount = item.discountAmount || 0;
      const lineAfterDiscount = Math.max(0, lineBase - lineDiscount);

      const taxRate = item.taxRateBasisPoints || 0;
      const lineTax = Math.round((lineAfterDiscount * taxRate) / 10000);
      const lineTotal = lineAfterDiscount + lineTax;

      subtotal += lineAfterDiscount;
      totalTax += lineTax;

      processedItems.push({
        id: ulid(),
        productId: item.productId,
        barcode: item.barcode || null,
        productName: item.productName,
        productNameAr: item.productNameAr || null,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost || 0,
        quantity: item.quantity,
        discountAmount: lineDiscount,
        discountPercent: item.discountPercent || 0,
        taxRateBasisPoints: taxRate,
        taxAmount: lineTax,
        totalPrice: lineTotal,
      });
    }

    const orderDiscount = params.orderDiscountAmount || 0;
    const totalAmount = Math.max(0, subtotal - orderDiscount + totalTax);

    // Calculate payments
    const totalPaid = params.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < totalAmount) {
      throw new Error(
        `Insufficient payment. Total: ${(totalAmount / 100).toFixed(2)}, Paid: ${(totalPaid / 100).toFixed(2)}`,
      );
    }
    const changeAmount = totalPaid - totalAmount;

    // 2. Generate identifiers
    const saleId = ulid();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${terminalCode}-${saleId.slice(-6)}`;
    const idempotencyKey = params.idempotencyKey || `IDEM-${saleId}`;
    const now = new Date().toISOString();

    // 3. ATOMIC SQLite Transaction
    const executeTransaction = sqlite.transaction(() => {
      // A. Insert Sale Header
      sqlite
        .prepare(
          `INSERT INTO sales (
            id, company_id, branch_id, terminal_id, cashier_id, customer_id, cash_session_id,
            invoice_number, status, payment_status, subtotal, discount_amount, discount_type,
            discount_reason, tax_amount, total_amount, paid_amount, change_amount, notes,
            sync_status, idempotency_key, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 'PAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 1, ?, ?)`,
        )
        .run(
          saleId,
          companyId,
          branchId,
          params.terminalId,
          params.cashierId,
          params.customerId || null,
          params.cashSessionId || null,
          invoiceNumber,
          subtotal,
          orderDiscount,
          params.orderDiscountType || 'FIXED',
          params.orderDiscountReason || null,
          totalTax,
          totalAmount,
          totalPaid,
          changeAmount,
          params.notes || null,
          idempotencyKey,
          now,
          now,
        );

      // B. Insert Sale Items and adjust Inventory
      const insertItemStmt = sqlite.prepare(
        `INSERT INTO sale_items (
          id, sale_id, product_id, barcode, product_name, product_name_ar,
          unit_price, unit_cost, quantity, discount_amount, discount_percent,
          tax_rate_basis_points, tax_amount, total_price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      const updateInvStmt = sqlite.prepare(
        `UPDATE inventory SET quantity = quantity - ?, updated_at = ? WHERE product_id = ?`,
      );

      const insertMovementStmt = sqlite.prepare(
        `INSERT INTO inventory_movements (
          id, company_id, branch_id, product_id, movement_type,
          quantity_change, quantity_before, quantity_after, unit_cost,
          reference_type, reference_id, sync_status, created_at
        ) VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, 'SALE', ?, 'PENDING', ?)`,
      );

      for (const item of processedItems) {
        insertItemStmt.run(
          item.id,
          saleId,
          item.productId,
          item.barcode,
          item.productName,
          item.productNameAr,
          item.unitPrice,
          item.unitCost,
          item.quantity,
          item.discountAmount,
          item.discountPercent,
          item.taxRateBasisPoints,
          item.taxAmount,
          item.totalPrice,
          now,
        );

        // Check stock before decrement
        const invRow = sqlite
          .prepare('SELECT quantity FROM inventory WHERE product_id = ?')
          .get(item.productId) as { quantity: number } | undefined;

        const beforeQty = invRow ? invRow.quantity : 0;
        const afterQty = beforeQty - item.quantity;

        updateInvStmt.run(item.quantity, now, item.productId);

        insertMovementStmt.run(
          ulid(),
          companyId,
          branchId,
          item.productId,
          -item.quantity,
          beforeQty,
          afterQty,
          item.unitCost,
          saleId,
          now,
        );
      }

      // C. Insert Payments
      const insertPaymentStmt = sqlite.prepare(
        `INSERT INTO payments (
          id, sale_id, payment_method, amount, currency_code, reference_number, notes, status, created_at
        ) VALUES (?, ?, ?, ?, 'EGP', ?, ?, 'COMPLETED', ?)`,
      );

      for (const p of params.payments) {
        insertPaymentStmt.run(
          ulid(),
          saleId,
          p.paymentMethod,
          p.amount,
          p.referenceNumber || null,
          p.notes || null,
          now,
        );
      }

      // D. Enqueue to Sync Queue
      this.syncRepo.enqueue(
        'SALE',
        saleId,
        'INSERT',
        {
          id: saleId,
          companyId,
          branchId,
          terminalId: params.terminalId,
          cashierId: params.cashierId,
          customerId: params.customerId || null,
          invoiceNumber,
          subtotal,
          discountAmount: orderDiscount,
          taxAmount: totalTax,
          totalAmount,
          paidAmount: totalPaid,
          changeAmount,
          items: processedItems,
          payments: params.payments,
          createdAt: now,
        },
        idempotencyKey,
      );
    });

    // Execute atomic transaction
    executeTransaction();

    return {
      id: saleId,
      invoiceNumber,
      subtotal,
      discountAmount: orderDiscount,
      taxAmount: totalTax,
      totalAmount,
      paidAmount: totalPaid,
      changeAmount,
      itemsCount: processedItems.length,
      items: processedItems,
      payments: params.payments,
      createdAt: now,
    };
  }
}
