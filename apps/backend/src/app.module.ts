// ============================================
// Root Application Module
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { TerminalsModule } from './modules/terminals/terminals.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { SuppliersModule } from './modules/suppliers/suppliers.module.js';
import { PurchasesModule } from './modules/purchases/purchases.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { SyncModule } from './modules/sync/sync.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    CompaniesModule,
    BranchesModule,
    TerminalsModule,
    ProductsModule,
    SalesModule,
    InventoryModule,
    SuppliersModule,
    PurchasesModule,
    CustomersModule,
    SyncModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
