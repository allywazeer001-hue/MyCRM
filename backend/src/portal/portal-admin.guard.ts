import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PortalAdminGuard extends AuthGuard('portal-jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const user = context.switchToHttp().getRequest().user;
    const isAdmin = user?.isPortalAdmin || ['admin', 'super_admin'].includes(user?.portalRole ?? '');
    if (!isAdmin) throw new ForbiddenException('Portal admin access required');
    return true;
  }
}
