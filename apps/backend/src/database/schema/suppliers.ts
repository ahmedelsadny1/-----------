import { pgTable, varchar, text, boolean, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { companies } from './companies.js';
import { users } from './users.js';

export const suppliers = pgTable(
  'suppliers',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    contactPerson: varchar('contact_person', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    taxNumber: varchar('tax_number', { length: 50 }),
    balance: bigint('balance', { mode: 'number' }).notNull().default(0), // in minor units
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => ({
    companyIdx: index('idx_pg_suppliers_company').on(table.companyId),
    nameIdx: index('idx_pg_suppliers_name').on(table.name),
  }),
);

export const supplierPayments = pgTable(
  'supplier_payments',
  {
    id: varchar('id', { length: 26 }).primaryKey(),
    companyId: varchar('company_id', { length: 26 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    supplierId: varchar('supplier_id', { length: 26 })
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull().default('BANK_TRANSFER'),
    referenceNumber: varchar('reference_number', { length: 100 }),
    notes: text('notes'),
    createdBy: varchar('created_by', { length: 26 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    supplierIdx: index('idx_pg_sup_payments_supplier').on(table.supplierId),
  }),
);
