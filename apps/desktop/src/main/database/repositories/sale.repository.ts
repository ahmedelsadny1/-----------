import { getSqlite } from '../connection.js';

export interface LocalSaleSummary {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentMethod: string;
  itemsCount: number;
  createdAt: string;
}

export class SaleRepository {
  listRecent(limit = 50): LocalSaleSummary[] {
    const sqlite = getSqlite();
    const rows = sqlite
      .prepare(
        `SELECT s.id, s.invoice_number, s.total_amount, s.paid_amount, s.status, s.created_at,
                c.name as customer_name,
                (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count,
                (SELECT payment_method FROM payments p WHERE p.sale_id = s.id LIMIT 1) as payment_method
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         ORDER BY s.created_at DESC LIMIT ?`,
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      customerName: r.customer_name,
      totalAmount: r.total_amount,
      paidAmount: r.paid_amount,
      status: r.status,
      paymentMethod: r.payment_method || 'CASH',
      itemsCount: r.items_count,
      createdAt: r.created_at,
    }));
  }

  getById(id: string): any {
    const sqlite = getSqlite();
    const sale = sqlite
      .prepare(
        `SELECT s.*, c.name as customer_name, c.phone as customer_phone
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.id = ?`,
      )
      .get(id) as any;

    if (!sale) return null;

    const items = sqlite
      .prepare('SELECT * FROM sale_items WHERE sale_id = ?')
      .all(id) as any[];

    const payments = sqlite
      .prepare('SELECT * FROM payments WHERE sale_id = ?')
      .all(id) as any[];

    return {
      ...sale,
      items,
      payments,
    };
  }

  getByInvoiceNumber(invoiceNumber: string): any {
    const sqlite = getSqlite();
    const sale = sqlite
      .prepare('SELECT id FROM sales WHERE invoice_number = ?')
      .get(invoiceNumber) as { id: string } | undefined;

    if (!sale) return null;
    return this.getById(sale.id);
  }
}
