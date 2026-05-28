import { ExecutionContext } from '@nestjs/common';
declare const PortalAdminGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class PortalAdminGuard extends PortalAdminGuard_base {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
