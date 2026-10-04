import { getSqlite } from '../connection.js';

export interface LocalProduct {
  id: string;
  companyId: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  unitId: string;
  unitName: string;
  unitSymbol: string;
  taxRateId?: string;
  taxRateBasisPoints: number;
  sku: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  description?: string;
  productType: string;
  costPrice: number;
  sellingPrice: number;
  minSellingPrice: number;
  isWeighted: boolean;
  isFractional: boolean;
  currentStock: number;
  imageUrl?: string;
}

export class ProductRepository {
  /**
   * Fast lookup by barcode (checks products.barcode and product_barcodes table)
   */
  getByBarcode(barcode: string): LocalProduct | null {
    const sqlite = getSqlite();

    const row = sqlite
      .prepare(
        `SELECT p.*,
                c.name as category_name,
                u.name as unit_name, u.symbol as unit_symbol,
                COALESCE(tr.rate_basis_points, 0) as tax_rate_basis_points,
                COALESCE(i.quantity, 0) as current_stock
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id
         LEFT JOIN inventory i ON i.product_id = p.id
         LEFT JOIN product_barcodes pb ON pb.product_id = p.id
         WHERE (p.barcode = ? OR pb.barcode = ?)
           AND p.is_active = 1
           AND p.deleted_at IS NULL
         LIMIT 1`,
      )
      .get(barcode, barcode) as any;

    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * Search by query (matches barcode, SKU, English name, or Arabic name)
   */
  search(query: string, limit = 30): LocalProduct[] {
    const sqlite = getSqlite();
    const pattern = `%${query.trim()}%`;

    const rows = sqlite
      .prepare(
        `SELECT DISTINCT p.*,
                c.name as category_name,
                u.name as unit_name, u.symbol as unit_symbol,
                COALESCE(tr.rate_basis_points, 0) as tax_rate_basis_points,
                COALESCE(i.quantity, 0) as current_stock
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id
         LEFT JOIN inventory i ON i.product_id = p.id
         LEFT JOIN product_barcodes pb ON pb.product_id = p.id
         WHERE (
           p.barcode LIKE ? OR
           pb.barcode LIKE ? OR
           p.sku LIKE ? OR
           p.name LIKE ? OR
           p.name_ar LIKE ?
         )
         AND p.is_active = 1
         AND p.deleted_at IS NULL
         ORDER BY p.name ASC
         LIMIT ?`,
      )
      .all(pattern, pattern, pattern, pattern, pattern, limit) as any[];

    return rows.map((r) => this.mapRow(r));
  }

  getById(id: string): LocalProduct | null {
    const sqlite = getSqlite();

    const row = sqlite
      .prepare(
        `SELECT p.*,
                c.name as category_name,
                u.name as unit_name, u.symbol as unit_symbol,
                COALESCE(tr.rate_basis_points, 0) as tax_rate_basis_points,
                COALESCE(i.quantity, 0) as current_stock
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id
         LEFT JOIN inventory i ON i.product_id = p.id
         WHERE p.id = ? AND p.deleted_at IS NULL`,
      )
      .get(id) as any;

    if (!row) return null;
    return this.mapRow(row);
  }

  listCategories(): any[] {
    const sqlite = getSqlite();
    return sqlite
      .prepare(
        `SELECT id, name, name_ar, code, color, icon
         FROM categories WHERE is_active = 1 AND deleted_at IS NULL
         ORDER BY sort_order ASC, name ASC`,
      )
      .all() as any[];
  }

  private mapRow(row: any): LocalProduct {
    return {
      id: row.id,
      companyId: row.company_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      brandId: row.brand_id,
      unitId: row.unit_id,
      unitName: row.unit_name || 'Piece',
      unitSymbol: row.unit_symbol || 'pc',
      taxRateId: row.tax_rate_id,
      taxRateBasisPoints: row.tax_rate_basis_points || 0,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      nameAr: row.name_ar,
      description: row.description,
      productType: row.product_type || 'STANDARD',
      costPrice: row.cost_price,
      sellingPrice: row.selling_price,
      minSellingPrice: row.min_selling_price || 0,
      isWeighted: Boolean(row.is_weighted),
      isFractional: Boolean(row.is_fractional),
      currentStock: row.current_stock || 0,
      imageUrl: row.image_url || undefined,
    };
  }
}
