import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CompaniesService, CreateCompanyDto } from './companies.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('companies')
@UseGuards(AuthGuard, PermissionGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SETTINGS_COMPANY)
  async list() {
    const data = await this.companiesService.list();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_COMPANY)
  async getById(@Param('id') id: string) {
    const data = await this.companiesService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_COMPANY)
  async create(@Body() dto: CreateCompanyDto) {
    const data = await this.companiesService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_COMPANY)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCompanyDto>) {
    const data = await this.companiesService.update(id, dto);
    return { success: true, data };
  }

  @Get(':id/settings')
  @RequirePermission(PERMISSIONS.SETTINGS_COMPANY)
  async getSettings(@Param('id') id: string) {
    const data = await this.companiesService.getSettings(id);
    return { success: true, data };
  }

  @Put(':id/settings')
  @RequirePermission(PERMISSIONS.SETTINGS_COMPANY)
  async updateSettings(@Param('id') id: string, @Body() settings: any) {
    const data = await this.companiesService.updateSettings(id, settings);
    return { success: true, data };
  }
}
