import { ExecutionContext } from '@nestjs/common';
declare const PortalSuperAdminGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class PortalSuperAdminGuard extends PortalSuperAdminGuard_base {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
