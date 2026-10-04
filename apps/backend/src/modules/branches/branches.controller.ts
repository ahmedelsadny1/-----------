import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BranchesService, CreateBranchDto } from './branches.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('branches')
@UseGuards(AuthGuard, PermissionGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async list(@CompanyId() companyId: string) {
    const data = await this.branchesService.list(companyId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async getById(@Param('id') id: string) {
    const data = await this.branchesService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async create(@CompanyId() companyId: string, @Body() dto: Omit<CreateBranchDto, 'companyId'>) {
    const data = await this.branchesService.create({ ...dto, companyId });
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateBranchDto>) {
    const data = await this.branchesService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async deactivate(@Param('id') id: string) {
    await this.branchesService.deactivate(id);
    return { success: true, message: 'Branch deactivated' };
  }
}
