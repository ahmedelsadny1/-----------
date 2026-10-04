import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SuppliersService, CreateSupplierDto } from './suppliers.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('suppliers')
@UseGuards(AuthGuard, PermissionGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SUPPLIERS_VIEW)
  async list(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.suppliersService.list(companyId, {
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.SUPPLIERS_VIEW)
  async getById(@Param('id') id: string, @CompanyId() companyId: string) {
    const data = await this.suppliersService.getById(id, companyId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SUPPLIERS_CREATE)
  async create(@CompanyId() companyId: string, @Body() dto: CreateSupplierDto) {
    const data = await this.suppliersService.create(companyId, dto);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.SUPPLIERS_UPDATE)
  async update(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @Body() dto: Partial<CreateSupplierDto>,
  ) {
    const data = await this.suppliersService.update(id, companyId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.SUPPLIERS_DELETE)
  async softDelete(@Param('id') id: string, @CompanyId() companyId: string) {
    await this.suppliersService.softDelete(id, companyId);
    return { success: true, message: 'Supplier deleted' };
  }

  @Post(':id/payments')
  @RequirePermission(PERMISSIONS.SUPPLIERS_UPDATE)
  async recordPayment(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { amount: number; paymentMethod?: string; referenceNumber?: string; notes?: string },
  ) {
    const data = await this.suppliersService.recordPayment(companyId, id, userId, body);
    return { success: true, data };
  }
}
