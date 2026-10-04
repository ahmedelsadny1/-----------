import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InventoryService, StockAdjustmentDto } from './inventory.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('inventory')
@UseGuards(AuthGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  async getBranchInventory(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.inventoryService.getBranchInventory(companyId, {
      branchId,
      lowStockOnly: lowStockOnly === 'true',
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }

  @Get('low-stock')
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  async getLowStockAlerts(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
  ) {
    const data = await this.inventoryService.getLowStockAlerts(companyId, branchId);
    return { success: true, data };
  }

  @Post('adjust')
  @RequirePermission(PERMISSIONS.INVENTORY_ADJUST)
  async adjustStock(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: StockAdjustmentDto,
  ) {
    const data = await this.inventoryService.adjustStock(companyId, userId, dto);
    return { success: true, data };
  }

  @Get('movements')
  @RequirePermission(PERMISSIONS.INVENTORY_VIEW)
  async getMovements(
    @CompanyId() companyId: string,
    @Query('branchId') branchId?: string,
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.inventoryService.getMovements(companyId, {
      branchId,
      productId,
      movementType,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }
}
