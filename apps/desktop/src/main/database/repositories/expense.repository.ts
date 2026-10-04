import { ulid } from 'ulid';
import { getSqlite } from '../connection.js';

export interface LocalExpense {
  id: string;
  companyId: string;
  branchId: string;
  sessionId?: string;
  categoryId: string;
  categoryName?: string;
  amount: number; // piasters
  description: string;
  recipient?: string;
  receiptNumber?: string;
  createdBy: string;
  createdAt: string;
}

export class ExpenseRepository {
  list(sessionId?: string, limit = 50): LocalExpense[] {
    const sqlite = getSqlite();
    let query = `
      SELECT e.*, ec.name_ar as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
    `;
    const params: any[] = [];

    if (sessionId) {
      query += ` WHERE e.session_id = ? `;
      params.push(sessionId);
    }

    query += ` ORDER BY e.created_at DESC LIMIT ? `;
    params.push(limit);

    const rows = sqlite.prepare(query).all(...params) as any[];

    return rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      branchId: r.branch_id,
      sessionId: r.session_id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      amount: r.amount,
      description: r.description,
      recipient: r.recipient,
      receiptNumber: r.receipt_number,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));
  }

  listCategories(): { id: string; name: string; nameAr: string }[] {
    const sqlite = getSqlite();
    const rows = sqlite
      .prepare('SELECT id, name, name_ar FROM expense_categories WHERE is_active = 1 ORDER BY name_ar ASC')
      .all() as any[];

    if (rows.length === 0) {
      // Default categories if empty
      const defaultCategories = [
        { id: '01EXP000000000000000000CAT1', name: 'Buffet & Hospitality', nameAr: 'ضيافة وبوفيه' },
        { id: '01EXP000000000000000000CAT2', name: 'Cleaning & Supplies', nameAr: 'نظافة ومستلزمات' },
        { id: '01EXP000000000000000000CAT3', name: 'Maintenance & Repairs', nameAr: 'صيانة وإصلاحات سريعة' },
        { id: '01EXP000000000000000000CAT4', name: 'Tips & Miscellaneous', nameAr: 'مصروفات نثرية وإكراميات' },
      ];
      const now = new Date().toISOString();
      const insert = sqlite.prepare(
        'INSERT OR IGNORE INTO expense_categories (id, company_id, name, name_ar, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      );
      defaultCategories.forEach((c) => {
        insert.run(c.id, '01HQ00000000000000000COMPAN1', c.name, c.nameAr, now);
      });
      return defaultCategories;
    }

    return rows.map((r) => ({ id: r.id, name: r.name, nameAr: r.name_ar }));
  }

  create(expense: {
    companyId?: string;
    branchId?: string;
    sessionId?: string;
    categoryId: string;
    amount: number;
    description: string;
    recipient?: string;
    receiptNumber?: string;
    createdBy: string;
  }): LocalExpense {
    const sqlite = getSqlite();
    const id = ulid();
    const now = new Date().toISOString();

    const device = sqlite
      .prepare('SELECT company_id, branch_id FROM local_device LIMIT 1')
      .get() as any;

    const companyId = expense.companyId || device?.company_id || '01HQ00000000000000000COMPAN1';
    const branchId = expense.branchId || device?.branch_id || '01HQ00000000000000000BRANCH1';

    return sqlite.transaction(() => {
      sqlite
        .prepare(
          `INSERT INTO expenses (
            id, company_id, branch_id, session_id, category_id,
            amount, description, payment_method, recipient,
            receipt_number, created_by, sync_status, version, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CASH', ?, ?, ?, 'PENDING', 1, ?)`,
        )
        .run(
          id,
          companyId,
          branchId,
          expense.sessionId || null,
          expense.categoryId,
          expense.amount,
          expense.description,
          expense.recipient || null,
          expense.receiptNumber || null,
          expense.createdBy,
          now,
        );

      // If active session, record cash movement as EXPENSE
      if (expense.sessionId) {
        sqlite
          .prepare(
            `INSERT INTO cash_movements (id, session_id, movement_type, amount, reason, authorized_by, created_at)
             VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?)`,
          )
          .run(
            ulid(),
            expense.sessionId,
            expense.amount,
            expense.description,
            expense.createdBy,
            now,
          );
      }

      return {
        id,
        companyId,
        branchId,
        sessionId: expense.sessionId,
        categoryId: expense.categoryId,
        amount: expense.amount,
        description: expense.description,
        recipient: expense.recipient,
        receiptNumber: expense.receiptNumber,
        createdBy: expense.createdBy,
        createdAt: now,
      };
    })();
  }
}
