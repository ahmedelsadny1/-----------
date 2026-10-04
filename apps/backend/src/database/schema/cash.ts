import { pgTable, varchar, text, integer, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { branches, posTerminals } from './branches.js';
import { users } from './users.js';

export const cashSessions = pgTable(
  'cash_sessions',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: varchar('branch_id', { length: 26 })
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    terminalId: varchar('terminal_id', { length: 26 })
      .notNull()
      .references(() => posTerminals.id),
    cashierId: varchar('cashier_id', { length: 26 })
      .notNull()
      .references(() => users.id),
    sessionNumber: varchar('session_number', { length: 50 }).notNull(),
    openingTime: timestamp('opening_time', { withTimezone: true, mode: 'string' }).notNull(),
    closingTime: timestamp('closing_time', { withTimezone: true, mode: 'string' }),
    openingBalance: bigint('opening_balance', { mode: 'number' }).notNull().default(0),
    closingCashCounted: bigint('closing_cash_counted', { mode: 'number' }),
    systemCalculatedCash: bigint('system_calculated_cash', { mode: 'number' }).notNull().default(0),
    discrepancy: bigint('discrepancy', { mode: 'number' }).notNull().default(0),
    notes: text('notes'),
    status: varchar('status', { length: 20 }).notNull().default('OPEN'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    branchIdx: index('idx_pg_cash_sessions_branch').on(table.branchId),
    terminalIdx: index('idx_pg_cash_sessions_terminal').on(table.terminalId),
    cashierIdx: index('idx_pg_cash_sessions_cashier').on(table.cashierId),
    statusIdx: index('idx_pg_cash_sessions_status').on(table.status),
  }),
);

export const cashMovements = pgTable(
  'cash_movements',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    sessionId: varchar('session_id', { length: 26 })
      .notNull()
      .references(() => cashSessions.id, { onDelete: 'cascade' }),
    movementType: varchar('movement_type', { length: 30 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    reason: text('reason').notNull(),
    authorizedBy: varchar('authorized_by', { length: 26 }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_pg_cash_movements_session').on(table.sessionId),
  }),
);
