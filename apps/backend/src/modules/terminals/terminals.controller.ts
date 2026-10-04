import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TerminalsService, CreateTerminalDto } from './terminals.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('terminals')
@UseGuards(AuthGuard, PermissionGuard)
export class TerminalsController {
  constructor(private readonly terminalsService: TerminalsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async list(@CompanyId() companyId: string, @Query('branchId') branchId?: string) {
    const data = await this.terminalsService.list(branchId, companyId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async getById(@Param('id') id: string) {
    const data = await this.terminalsService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_BRANCH)
  async create(@CompanyId() companyId: string, @Body() dto: Omit<CreateTerminalDto, 'companyId'>) {
    const data = await this.terminalsService.create({ ...dto, companyId });
    return { success: true, data };
  }

  @Post(':id/bind')
  @RequirePermission(PERMISSIONS.DEVICES_REGISTER)
  async bindDevice(@Param('id') id: string, @Body('deviceId') deviceId: string) {
    const data = await this.terminalsService.bindDevice(id, deviceId);
    return { success: true, data };
  }
}
