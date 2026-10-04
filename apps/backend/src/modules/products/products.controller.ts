import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService, CreateProductDto } from './products.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('products')
@UseGuards(AuthGuard, PermissionGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PRODUCTS_VIEW)
  async list(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.productsService.list(companyId, {
      search,
      categoryId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data };
  }

  @Get('barcode/:barcode')
  @RequirePermission(PERMISSIONS.PRODUCTS_VIEW)
  async getByBarcode(@Param('barcode') barcode: string, @CompanyId() companyId: string) {
    const data = await this.productsService.getByBarcode(barcode, companyId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PRODUCTS_VIEW)
  async getById(@Param('id') id: string) {
    const data = await this.productsService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.PRODUCTS_CREATE)
  async create(@CompanyId() companyId: string, @Body() dto: Omit<CreateProductDto, 'companyId'>) {
    const data = await this.productsService.create({ ...dto, companyId });
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.PRODUCTS_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.productsService.update(id, dto, userId);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.PRODUCTS_DELETE)
  async softDelete(@Param('id') id: string) {
    await this.productsService.softDelete(id);
    return { success: true, message: 'Product deleted' };
  }
}
