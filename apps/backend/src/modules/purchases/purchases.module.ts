import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service.js';
import { PurchasesController } from './purchases.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
