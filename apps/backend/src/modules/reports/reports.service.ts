import { Injectable } from '@nestjs/common';
import { getPgPool } from '../../database/connection.js';

@Injectable()
export class ReportsService {
  async getDailySales(
    companyId: string,
    query?: { branchId?: string; startDate?: string; endDate?: string },
  ): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const startDate = query?.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const endDate = query?.endDate || new Date().toISOString().slice(0, 10);

      const res = await client.query(
        `SELECT DATE(s.created_at) as sale_date,
                COUNT(s.id)::int as total_transactions,
                SUM(s.total_amount)::bigint as total_revenue,
                SUM(s.tax_amount)::bigint as total_tax,
                SUM(s.discount_amount)::bigint as total_discount,
                SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END)::bigint as cash_revenue,
                SUM(CASE WHEN p.payment_method = 'CARD' THEN p.amount ELSE 0 END)::bigint as card_revenue
         FROM sales s
         LEFT JOIN payments p ON p.sale_id = s.id
         WHERE (s.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR s.branch_id = $2)
           AND s.status = 'COMPLETED'
           AND DATE(s.created_at) >= $3::date
           AND DATE(s.created_at) <= $4::date
         GROUP BY DATE(s.created_at)
         ORDER BY sale_date DESC`,
        [companyId || null, branchId, startDate, endDate],
      );

      return res.rows;
    } finally {
      client.release();
    }
  }

  async getTopProducts(
    companyId: string,
    query?: { branchId?: string; limit?: number },
  ): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const limit = query?.limit || 10;

      const res = await client.query(
        `SELECT si.product_id,
                si.product_name,
                si.product_name_ar,
                p.sku,
                p.barcode,
                SUM(si.quantity)::int as total_quantity_sold,
                SUM(si.total_price)::bigint as total_revenue,
                SUM(si.quantity * si.unit_cost)::bigint as total_cost,
                SUM(si.total_price - (si.quantity * si.unit_cost))::bigint as total_profit
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN products p ON p.id = si.product_id
         WHERE (s.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR s.branch_id = $2)
           AND s.status = 'COMPLETED'
         GROUP BY si.product_id, si.product_name, si.product_name_ar, p.sku, p.barcode
         ORDER BY total_revenue DESC
         LIMIT $3`,
        [companyId || null, branchId, limit],
      );

      return res.rows;
    } finally {
      client.release();
    }
  }

  async getProfitMargins(
    companyId: string,
    query?: { branchId?: string; startDate?: string; endDate?: string },
  ): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const startDate = query?.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const endDate = query?.endDate || new Date().toISOString().slice(0, 10);

      const res = await client.query(
        `SELECT COALESCE(SUM(si.total_price), 0)::bigint as gross_revenue,
                COALESCE(SUM(si.quantity * si.unit_cost), 0)::bigint as cogs,
                COALESCE(SUM(si.total_price - (si.quantity * si.unit_cost)), 0)::bigint as gross_profit,
                COALESCE(SUM(s.discount_amount), 0)::bigint as total_discounts
         FROM sales s
         JOIN sale_items si ON si.sale_id = s.id
         WHERE (s.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR s.branch_id = $2)
           AND s.status = 'COMPLETED'
           AND DATE(s.created_at) >= $3::date
           AND DATE(s.created_at) <= $4::date`,
        [companyId || null, branchId, startDate, endDate],
      );

      const row = res.rows[0];
      const revenue = Number(row.gross_revenue);
      const profit = Number(row.gross_profit);
      const marginBasisPoints = revenue > 0 ? Math.round((profit / revenue) * 10000) : 0;

      return {
        ...row,
        marginPercent: (marginBasisPoints / 100).toFixed(2) + '%',
      };
    } finally {
      client.release();
    }
  }

  async getDeadStock(
    companyId: string,
    query?: { branchId?: string; daysWithoutSale?: number },
  ): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      const branchId = query?.branchId || null;
      const days = query?.daysWithoutSale || 30;

      const res = await client.query(
        `SELECT p.id,
                p.name,
                p.name_ar,
                p.sku,
                p.barcode,
                p.cost_price,
                p.selling_price,
                bi.quantity as current_stock,
                (bi.quantity * p.cost_price)::bigint as capital_tied_up,
                MAX(s.created_at) as last_sold_at
         FROM products p
         JOIN branch_inventory bi ON bi.product_id = p.id
         LEFT JOIN sale_items si ON si.product_id = p.id
         LEFT JOIN sales s ON s.id = si.sale_id AND s.status = 'COMPLETED'
         WHERE (p.company_id = $1 OR $1 IS NULL)
           AND ($2::varchar IS NULL OR bi.branch_id = $2)
           AND bi.quantity > 0
         GROUP BY p.id, p.name, p.name_ar, p.sku, p.barcode, p.cost_price, p.selling_price, bi.quantity
         HAVING MAX(s.created_at) IS NULL OR MAX(s.created_at) < (NOW() - ($3 || ' days')::interval)
         ORDER BY capital_tied_up DESC
         LIMIT 100`,
        [companyId || null, branchId, days],
      );

      return res.rows;
    } finally {
      client.release();
    }
  }
}
