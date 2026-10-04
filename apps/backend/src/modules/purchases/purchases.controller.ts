import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PurchasesService, CreatePurchaseOrderDto } from './purchases.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('purchases')
@UseGuards(AuthGuard, PermissionGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PURCHASES_VIEW)
  async list(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.purchasesService.list(companyId, {
      branchId,
      supplierId,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PURCHASES_VIEW)
  async getById(@Param('id') id: string, @CompanyId() companyId: string) {
    const data = await this.purchasesService.getById(id, companyId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.PURCHASES_CREATE)
  async create(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    const data = await this.purchasesService.create(companyId, userId, dto);
    return { success: true, data };
  }

  @Post(':id/receive')
  @RequirePermission(PERMISSIONS.PURCHASES_RECEIVE)
  async receive(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.purchasesService.receive(id, companyId, userId);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.PURCHASES_CREATE)
  async cancel(@Param('id') id: string, @CompanyId() companyId: string) {
    const data = await this.purchasesService.cancel(id, companyId);
    return { success: true, data };
  }
}
