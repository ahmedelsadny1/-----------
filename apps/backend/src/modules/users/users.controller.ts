import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CompanyId } from '../../common/decorators/company-id.decorator.js';
import { PERMISSIONS } from '@supermarket/shared';

@Controller('users')
@UseGuards(AuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  async list(@CompanyId() companyId: string) {
    const data = await this.usersService.list(companyId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USERS_VIEW)
  async getById(@Param('id') id: string) {
    const data = await this.usersService.getById(id);
    return { success: true, data };
  }

  @Post(':id/lock')
  @RequirePermission(PERMISSIONS.USERS_DISABLE)
  async lock(@Param('id') id: string) {
    await this.usersService.lock(id);
    return { success: true, message: 'User account locked' };
  }

  @Post(':id/unlock')
  @RequirePermission(PERMISSIONS.USERS_DISABLE)
  async unlock(@Param('id') id: string) {
    await this.usersService.unlock(id);
    return { success: true, message: 'User account unlocked' };
  }
}
