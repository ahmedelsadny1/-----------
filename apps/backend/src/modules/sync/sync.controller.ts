import { Controller, Post, Get, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { SyncService, SyncPushOperation } from './sync.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';

@Controller('sync')
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  async push(
    @CompanyId() companyId: string,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-branch-id') branchId: string,
    @Body('operations') operations: SyncPushOperation[],
  ) {
    const data = await this.syncService.push(
      companyId,
      deviceId || 'DEV-TERMINAL-01',
      branchId || '01HQ00000000000000000BRANCH1',
      operations || [],
    );
    return { success: true, data };
  }

  @Get('pull')
  async pull(
    @CompanyId() companyId: string,
    @Headers('x-branch-id') branchId: string,
    @Query('since') since?: string,
  ) {
    const data = await this.syncService.pull(
      companyId,
      branchId || '01HQ00000000000000000BRANCH1',
      since,
    );
    return { success: true, data };
  }
}
