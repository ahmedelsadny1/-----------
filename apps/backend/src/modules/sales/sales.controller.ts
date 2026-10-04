import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SalesService, CreateSaleDto } from './sales.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('sales')
@UseGuards(AuthGuard, PermissionGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SALES_VIEW)
  async list(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('terminalId') terminalId?: string,
    @Query('cashierId') cashierId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.salesService.list(companyId, {
      branchId,
      terminalId,
      cashierId,
      status,
      startDate,
      endDate,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.SALES_VIEW)
  async getById(@Param('id') id: string, @CompanyId() companyId: string) {
    const data = await this.salesService.getById(id, companyId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SALES_CREATE)
  async create(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSaleDto,
  ) {
    const data = await this.salesService.create(companyId, {
      ...dto,
      cashierId: dto.cashierId || userId,
    });
    return { success: true, data };
  }

  @Post('sync-batch')
  @RequirePermission(PERMISSIONS.SALES_CREATE)
  async syncBatch(
    @CompanyId() companyId: string,
    @Body() body: { sales: CreateSaleDto[] },
  ) {
    const data = await this.salesService.syncBatch(companyId, body.sales || []);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.SALES_CANCEL)
  async cancel(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    const data = await this.salesService.cancel(id, companyId, reason || 'No reason provided', userId);
    return { success: true, data };
  }
}
