import { Module } from '@nestjs/common';
import { SyncService } from './sync.service.js';
import { SyncController } from './sync.controller.js';
import { SalesModule } from '../sales/sales.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [SalesModule, UsersModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
