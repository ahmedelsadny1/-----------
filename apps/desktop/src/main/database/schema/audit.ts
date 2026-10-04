import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id', { length: 26 }).primaryKey(),
    userId: text('user_id', { length: 26 }),
    action: text('action', { length: 100 }).notNull(), // LOGIN, LOGOUT, SALE_CREATE, SALE_REFUND, PRICE_CHANGE, STOCK_ADJUST
    entityType: text('entity_type', { length: 50 }).notNull(),
    entityId: text('entity_id', { length: 26 }),
    oldValues: text('old_values'), // JSON string
    newValues: text('new_values'), // JSON string
    ipAddress: text('ip_address', { length: 45 }),
    terminalId: text('terminal_id', { length: 26 }),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    userActionIdx: index('idx_audit_user_action').on(table.userId, table.action),
    entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
    createdAtIdx: index('idx_audit_created_at').on(table.createdAt),
  }),
);
