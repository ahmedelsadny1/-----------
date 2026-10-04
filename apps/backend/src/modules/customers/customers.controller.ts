import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService, CreateCustomerDto } from './customers.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('customers')
@UseGuards(AuthGuard, PermissionGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.CUSTOMERS_VIEW)
  async list(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.customersService.list(companyId, {
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.CUSTOMERS_VIEW)
  async getById(@Param('id') id: string, @CompanyId() companyId: string) {
    const data = await this.customersService.getById(id, companyId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.CUSTOMERS_CREATE)
  async create(@CompanyId() companyId: string, @Body() dto: CreateCustomerDto) {
    const data = await this.customersService.create(companyId, dto);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.CUSTOMERS_UPDATE)
  async update(
    @Param('id') id: string,
    @CompanyId() companyId: string,
    @Body() dto: Partial<CreateCustomerDto>,
  ) {
    const data = await this.customersService.update(id, companyId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.CUSTOMERS_DELETE)
  async softDelete(@Param('id') id: string, @CompanyId() companyId: string) {
    await this.customersService.softDelete(id, companyId);
    return { success: true, message: 'Customer deleted' };
  }
}
