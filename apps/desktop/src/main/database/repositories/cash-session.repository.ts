import { ulid } from 'ulid';
import { getSqlite } from '../connection.js';

export interface LocalCashSession {
  id: string;
  companyId: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  sessionNumber: string;
  openingTime: string;
  closingTime?: string;
  openingBalance: number;
  closingCashCounted?: number;
  systemCalculatedCash: number;
  discrepancy: number;
  notes?: string;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
}

export class CashSessionRepository {
  getActiveSession(terminalId: string): LocalCashSession | null {
    const sqlite = getSqlite();
    const row = sqlite
      .prepare(
        `SELECT * FROM cash_sessions
         WHERE terminal_id = ? AND status = 'OPEN'
         ORDER BY opening_time DESC LIMIT 1`,
      )
      .get(terminalId) as any;

    if (!row) return null;
    return this.mapRow(row);
  }

  openSession(params: {
    companyId: string;
    branchId: string;
    terminalId: string;
    cashierId: string;
    openingBalance: number;
  }): LocalCashSession {
    const sqlite = getSqlite();
    const existing = this.getActiveSession(params.terminalId);
    if (existing) {
      return existing;
    }

    const id = ulid();
    const now = new Date().toISOString();
    const sessionNumber = `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-4)}`;

    sqlite
      .prepare(
        `INSERT INTO cash_sessions (
          id, company_id, branch_id, terminal_id, cashier_id, session_number,
          opening_time, opening_balance, system_calculated_cash, discrepancy,
          status, sync_status, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'OPEN', 'PENDING', 1, ?, ?)`,
      )
      .run(
        id,
        params.companyId,
        params.branchId,
        params.terminalId,
        params.cashierId,
        sessionNumber,
        now,
        params.openingBalance,
        params.openingBalance,
        now,
        now,
      );

    return this.mapRow(sqlite.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(id));
  }

  closeSession(sessionId: string, countedCash: number, notes?: string): LocalCashSession {
    const sqlite = getSqlite();
    const session = sqlite.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Calculate actual cash sales during shift
    const salesTotal = sqlite
      .prepare(
        `SELECT COALESCE(SUM(p.amount), 0) as total_cash
         FROM payments p
         JOIN sales s ON s.id = p.sale_id
         WHERE s.cash_session_id = ? AND p.payment_method = 'CASH' AND s.status = 'COMPLETED'`,
      )
      .get(sessionId) as { total_cash: number };

    // Calculate cash movements (deposits and withdrawals)
    const movements = sqlite
      .prepare(
        `SELECT 
           COALESCE(SUM(CASE WHEN movement_type = 'DEPOSIT' THEN amount ELSE 0 END), 0) as deposits,
           COALESCE(SUM(CASE WHEN movement_type IN ('WITHDRAWAL', 'EXPENSE') THEN amount ELSE 0 END), 0) as withdrawals
         FROM cash_movements WHERE session_id = ?`,
      )
      .get(sessionId) as { deposits: number; withdrawals: number };

    const expectedCash =
      session.opening_balance + salesTotal.total_cash + movements.deposits - movements.withdrawals;
    const discrepancy = countedCash - expectedCash;
    const now = new Date().toISOString();

    sqlite
      .prepare(
        `UPDATE cash_sessions SET
          closing_time = ?,
          closing_cash_counted = ?,
          system_calculated_cash = ?,
          discrepancy = ?,
          notes = ?,
          status = 'CLOSED',
          updated_at = ?
         WHERE id = ?`,
      )
      .run(now, countedCash, expectedCash, discrepancy, notes || null, now, sessionId);

    return this.mapRow(sqlite.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId));
  }

  addCashMovement(params: {
    sessionId: string;
    movementType: 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE';
    amount: number;
    reason: string;
    authorizedBy?: string;
  }): void {
    const sqlite = getSqlite();
    sqlite
      .prepare(
        `INSERT INTO cash_movements (id, session_id, movement_type, amount, reason, authorized_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        ulid(),
        params.sessionId,
        params.movementType,
        params.amount,
        params.reason,
        params.authorizedBy || null,
        new Date().toISOString(),
      );
  }

  private mapRow(row: any): LocalCashSession {
    return {
      id: row.id,
      companyId: row.company_id,
      branchId: row.branch_id,
      terminalId: row.terminal_id,
      cashierId: row.cashier_id,
      sessionNumber: row.session_number,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      openingBalance: row.opening_balance,
      closingCashCounted: row.closing_cash_counted,
      systemCalculatedCash: row.system_calculated_cash,
      discrepancy: row.discrepancy,
      notes: row.notes,
      status: row.status,
    };
  }
}
