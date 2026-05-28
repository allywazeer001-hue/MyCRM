"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalCrmAdminGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let PortalCrmAdminGuard = class PortalCrmAdminGuard extends (0, passport_1.AuthGuard)('jwt') {
    async canActivate(context) {
        await super.canActivate(context);
        const user = context.switchToHttp().getRequest().user;
        const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
        if (!isAdmin)
            throw new common_1.ForbiddenException('CRM admin access required');
        return true;
    }
};
exports.PortalCrmAdminGuard = PortalCrmAdminGuard;
exports.PortalCrmAdminGuard = PortalCrmAdminGuard = __decorate([
    (0, common_1.Injectable)()
], PortalCrmAdminGuard);
//# sourceMappingURL=portal-crm-admin.guard.js.map