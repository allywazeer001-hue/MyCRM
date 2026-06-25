"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalAuthController = void 0;
const common_1 = require("@nestjs/common");
const portal_auth_service_1 = require("./portal-auth.service");
let PortalAuthController = class PortalAuthController {
    constructor(authService) {
        this.authService = authService;
    }
    register() {
        throw new common_1.ForbiddenException('Self-registration is disabled');
    }
    login(body) {
        return this.authService.login(body);
    }
    activateAccount(body) {
        return this.authService.activateAccount(body.changeToken, body.newPassword);
    }
    refresh(body) {
        return this.authService.refresh(body.refreshToken);
    }
    forgotPassword(body) {
        return this.authService.forgotPassword(body.email, body.orgSlug);
    }
    resetPassword(body) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }
    getPasswordPolicy(orgSlug) {
        return this.authService.getPasswordPolicyPublic(orgSlug);
    }
    logout() {
        return { message: 'Logged out successfully' };
    }
};
exports.PortalAuthController = PortalAuthController;
__decorate([
    (0, common_1.Post)('register'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('activate'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "activateAccount", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('password-policy'),
    __param(0, (0, common_1.Query)('orgSlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "getPasswordPolicy", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PortalAuthController.prototype, "logout", null);
exports.PortalAuthController = PortalAuthController = __decorate([
    (0, common_1.Controller)('portal/auth'),
    __metadata("design:paramtypes", [portal_auth_service_1.PortalAuthService])
], PortalAuthController);
//# sourceMappingURL=portal-auth.controller.js.map