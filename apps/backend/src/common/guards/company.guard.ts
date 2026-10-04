import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Super admin can access all tenants
    if (user.roles?.includes('super_admin')) {
      return true;
    }

    const companyIdFromParam = request.params?.companyId;
    const companyIdFromQuery = request.query?.companyId;
    const companyIdFromBody = request.body?.companyId;

    const targetCompanyId =
      companyIdFromParam || companyIdFromQuery || companyIdFromBody;

    if (targetCompanyId && targetCompanyId !== user.companyId) {
      throw new ForbiddenException(
        'Cross-company access is strictly forbidden.',
      );
    }

    return true;
  }
}
