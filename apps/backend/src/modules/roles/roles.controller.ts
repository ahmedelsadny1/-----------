import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('roles')
@UseGuards(AuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ROLES_VIEW)
  async list(@CompanyId() companyId: string) {
    const data = await this.rolesService.list(companyId);
    return { success: true, data };
  }

  @Get('permissions')
  @RequirePermission(PERMISSIONS.ROLES_VIEW)
  async listPermissions() {
    const data = await this.rolesService.listPermissions();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ROLES_VIEW)
  async getById(@Param('id') id: string) {
    const data = await this.rolesService.getById(id);
    return { success: true, data };
  }
}
