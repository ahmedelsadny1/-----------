import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const cashSessions = sqliteTable(
  'cash_sessions',
  {
    id: text('id', { length: 26 }).primaryKey(),
    companyId: text('company_id', { length: 26 }).notNull(),
    branchId: text('branch_id', { length: 26 }).notNull(),
    terminalId: text('terminal_id', { length: 26 }).notNull(),
    cashierId: text('cashier_id', { length: 26 }).notNull(),
    sessionNumber: text('session_number', { length: 50 }).notNull(),
    openingTime: text('opening_time').notNull(),
    closingTime: text('closing_time'),
    openingBalance: integer('opening_balance').notNull().default(0), // all in minor units (piasters)
    closingCashCounted: integer('closing_cash_counted'),
    systemCalculatedCash: integer('system_calculated_cash').notNull().default(0),
    discrepancy: integer('discrepancy').notNull().default(0),
    notes: text('notes'),
    status: text('status', { length: 20 }).notNull().default('OPEN'), // OPEN, CLOSED, RECONCILED
    syncStatus: text('sync_status', { length: 20 }).notNull().default('PENDING'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    branchIdx: index('idx_cash_sessions_branch').on(table.branchId),
    terminalIdx: index('idx_cash_sessions_terminal').on(table.terminalId),
    cashierIdx: index('idx_cash_sessions_cashier').on(table.cashierId),
    statusIdx: index('idx_cash_sessions_status').on(table.status),
    syncIdx: index('idx_cash_sessions_sync').on(table.syncStatus),
  }),
);

export const cashMovements = sqliteTable(
  'cash_movements',
  {
    id: text('id', { length: 26 }).primaryKey(),
    sessionId: text('session_id', { length: 26 })
      .notNull()
      .references(() => cashSessions.id),
    movementType: text('movement_type', { length: 30 }).notNull(), // DEPOSIT, WITHDRAWAL, EXPENSE, CASH_DROP
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    authorizedBy: text('authorized_by', { length: 26 }),
    syncStatus: text('sync_status', { length: 20 }).notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    sessionIdx: index('idx_cash_movements_session').on(table.sessionId),
  }),
);
