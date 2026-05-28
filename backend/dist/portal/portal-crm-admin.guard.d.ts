import { ExecutionContext } from '@nestjs/common';
declare const PortalCrmAdminGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class PortalCrmAdminGuard extends PortalCrmAdminGuard_base {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
