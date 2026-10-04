import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ulid } from 'ulid';
import { getPgPool } from '../../database/connection.js';

export interface CreateProductDto {
  companyId: string;
  categoryId?: string;
  brandId?: string;
  unitId: string;
  taxRateId?: string;
  sku: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  productType?: string;
  costPrice: number;
  sellingPrice: number;
  minSellingPrice?: number;
  isWeighted?: boolean;
  isFractional?: boolean;
  lowStockThreshold?: number;
  imageUrl?: string;
  barcodes?: string[];
}

@Injectable()
export class ProductsService {
  async list(companyId: string, query?: { search?: string; categoryId?: string; limit?: number; offset?: number }): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const search = query?.search ? `%${query.search}%` : null;
      const categoryId = query?.categoryId || null;
      const limit = query?.limit || 50;
      const offset = query?.offset || 0;

      const res = await client.query(
        `SELECT p.*,
                c.name as category_name, c.name_ar as category_name_ar,
                u.name as unit_name, u.symbol as unit_symbol,
                tr.name as tax_rate_name, tr.rate_basis_points as tax_rate,
                COALESCE(json_agg(DISTINCT pb.barcode) FILTER (WHERE pb.barcode IS NOT NULL), '[]') as all_barcodes
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id
         LEFT JOIN product_barcodes pb ON pb.product_id = p.id
         WHERE (p.company_id = $1 OR $1 IS NULL)
           AND p.deleted_at IS NULL
           AND ($2::text IS NULL OR p.name ILIKE $2 OR p.name_ar ILIKE $2 OR p.sku ILIKE $2 OR p.barcode ILIKE $2)
           AND ($3::varchar IS NULL OR p.category_id = $3)
         GROUP BY p.id, c.name, c.name_ar, u.name, u.symbol, tr.name, tr.rate_basis_points
         ORDER BY p.name ASC
         LIMIT $4 OFFSET $5`,
        [companyId || null, search, categoryId, limit, offset],
      );

      const countRes = await client.query(
        `SELECT COUNT(*) FROM products p
         WHERE (p.company_id = $1 OR $1 IS NULL) AND p.deleted_at IS NULL
           AND ($2::text IS NULL OR p.name ILIKE $2 OR p.name_ar ILIKE $2 OR p.sku ILIKE $2 OR p.barcode ILIKE $2)
           AND ($3::varchar IS NULL OR p.category_id = $3)`,
        [companyId || null, search, categoryId],
      );

      return {
        items: res.rows,
        total: parseInt(countRes.rows[0].count, 10),
      };
    } finally {
      client.release();
    }
  }

  async getById(id: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT p.*,
                c.name as category_name, c.name_ar as category_name_ar,
                u.name as unit_name, u.symbol as unit_symbol,
                tr.name as tax_rate_name, tr.rate_basis_points as tax_rate,
                COALESCE(json_agg(DISTINCT pb.barcode) FILTER (WHERE pb.barcode IS NOT NULL), '[]') as all_barcodes
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id
         LEFT JOIN product_barcodes pb ON pb.product_id = p.id
         WHERE p.id = $1 AND p.deleted_at IS NULL
         GROUP BY p.id, c.name, c.name_ar, u.name, u.symbol, tr.name, tr.rate_basis_points`,
        [id],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async getByBarcode(barcode: string, companyId: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT p.*,
                c.name as category_name, c.name_ar as category_name_ar,
                u.name as unit_name, u.symbol as unit_symbol,
                tr.name as tax_rate_name, tr.rate_basis_points as tax_rate
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN units u ON u.id = p.unit_id
         LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id
         LEFT JOIN product_barcodes pb ON pb.product_id = p.id
         WHERE (p.barcode = $1 OR pb.barcode = $1)
           AND (p.company_id = $2 OR $2 IS NULL)
           AND p.deleted_at IS NULL
         LIMIT 1`,
        [barcode, companyId || null],
      );

      if (res.rows.length === 0) {
        throw new NotFoundException(`Product with barcode ${barcode} not found`);
      }

      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async create(dto: CreateProductDto): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const id = ulid();
      const insertRes = await client.query(
        `INSERT INTO products (
          id, company_id, category_id, brand_id, unit_id, tax_rate_id,
          sku, barcode, name, name_ar, description, description_ar,
          product_type, cost_price, selling_price, min_selling_price,
          is_weighted, is_fractional, low_stock_threshold, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          id,
          dto.companyId,
          dto.categoryId || null,
          dto.brandId || null,
          dto.unitId,
          dto.taxRateId || null,
          dto.sku,
          dto.barcode || null,
          dto.name,
          dto.nameAr || null,
          dto.description || null,
          dto.descriptionAr || null,
          dto.productType || 'STANDARD',
          dto.costPrice,
          dto.sellingPrice,
          dto.minSellingPrice || 0,
          dto.isWeighted || false,
          dto.isFractional || false,
          dto.lowStockThreshold || 10,
          dto.imageUrl || null,
        ],
      );

      // Insert primary barcode if provided
      if (dto.barcode) {
        await client.query(
          `INSERT INTO product_barcodes (id, product_id, barcode, barcode_type, is_primary)
           VALUES ($1, $2, $3, 'EAN13', TRUE) ON CONFLICT DO NOTHING`,
          [ulid(), id, dto.barcode],
        );
      }

      // Insert additional barcodes if provided
      if (dto.barcodes && dto.barcodes.length > 0) {
        for (const b of dto.barcodes) {
          if (b !== dto.barcode) {
            await client.query(
              `INSERT INTO product_barcodes (id, product_id, barcode, barcode_type, is_primary)
               VALUES ($1, $2, $3, 'EAN13', FALSE) ON CONFLICT DO NOTHING`,
              [ulid(), id, b],
            );
          }
        }
      }

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: Partial<CreateProductDto>, userId?: string): Promise<any> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await this.getById(id);

      // Record price history if selling price changed
      if (dto.sellingPrice !== undefined && dto.sellingPrice !== current.selling_price) {
        await client.query(
          `INSERT INTO price_history (id, product_id, old_price, new_price, changed_by, reason)
           VALUES ($1, $2, $3, $4, $5, 'Product update price modification')`,
          [ulid(), id, current.selling_price, dto.sellingPrice, userId || current.company_id],
        );
      }

      const updateRes = await client.query(
        `UPDATE products SET
          name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          category_id = COALESCE($3, category_id),
          unit_id = COALESCE($4, unit_id),
          tax_rate_id = COALESCE($5, tax_rate_id),
          cost_price = COALESCE($6, cost_price),
          selling_price = COALESCE($7, selling_price),
          min_selling_price = COALESCE($8, min_selling_price),
          low_stock_threshold = COALESCE($9, low_stock_threshold),
          updated_at = NOW(),
          version = version + 1
         WHERE id = $10 RETURNING *`,
        [
          dto.name || null,
          dto.nameAr || null,
          dto.categoryId || null,
          dto.unitId || null,
          dto.taxRateId || null,
          dto.costPrice !== undefined ? dto.costPrice : null,
          dto.sellingPrice !== undefined ? dto.sellingPrice : null,
          dto.minSellingPrice !== undefined ? dto.minSellingPrice : null,
          dto.lowStockThreshold !== undefined ? dto.lowStockThreshold : null,
          id,
        ],
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async softDelete(id: string): Promise<void> {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE products SET is_active = FALSE, deleted_at = NOW() WHERE id = $1`,
        [id],
      );
    } finally {
      client.release();
    }
  }
}
