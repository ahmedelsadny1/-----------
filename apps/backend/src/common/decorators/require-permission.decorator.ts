import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@supermarket/shared';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
