import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PortalSuperAdminGuard extends AuthGuard('portal-jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const user = context.switchToHttp().getRequest().user;
    if (user?.portalRole !== 'super_admin') throw new ForbiddenException('Portal super admin access required');
    return true;
  }
}
