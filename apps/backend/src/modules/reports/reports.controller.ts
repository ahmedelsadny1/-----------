import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('reports')
@UseGuards(AuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  @RequirePermission(PERMISSIONS.REPORTS_VIEW)
  async getDailySales(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getDailySales(companyId, {
      branchId,
      startDate,
      endDate,
    });
    return { success: true, data };
  }

  @Get('top-products')
  @RequirePermission(PERMISSIONS.REPORTS_VIEW)
  async getTopProducts(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.reportsService.getTopProducts(companyId, {
      branchId,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    return { success: true, data };
  }

  @Get('profit-margins')
  @RequirePermission(PERMISSIONS.REPORTS_FINANCIAL)
  async getProfitMargins(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.reportsService.getProfitMargins(companyId, {
      branchId,
      startDate,
      endDate,
    });
    return { success: true, data };
  }

  @Get('dead-stock')
  @RequirePermission(PERMISSIONS.REPORTS_VIEW)
  async getDeadStock(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('daysWithoutSale') days?: string,
  ) {
    const data = await this.reportsService.getDeadStock(companyId, {
      branchId,
      daysWithoutSale: days ? parseInt(days, 10) : 30,
    });
    return { success: true, data };
  }
}
