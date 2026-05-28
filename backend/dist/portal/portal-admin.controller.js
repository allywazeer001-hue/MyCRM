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
exports.PortalAdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const portal_auth_service_1 = require("./portal-auth.service");
const portal_service_1 = require("./portal.service");
const portal_module_service_1 = require("./portal-module.service");
let PortalAdminController = class PortalAdminController {
    constructor(authService, portalService, moduleService) {
        this.authService = authService;
        this.portalService = portalService;
        this.moduleService = moduleService;
    }
    getSettings(user) {
        return this.authService.getSettings(user.organizationId);
    }
    updateSettings(user, body) {
        return this.authService.updateSettings(user.organizationId, body);
    }
    listUsers(user, page, limit) {
        return this.portalService.listUsers(user.organizationId, page, limit);
    }
    getUserDetail(user, id) {
        return this.portalService.getAdminUserDetail(user.organizationId, id);
    }
    createUser(user, body) {
        return this.authService.autoCreateUser({ ...body, organizationId: user.organizationId });
    }
    updateStatus(user, id, body) {
        return this.portalService.updateAccountStatus(user.organizationId, id, body.status);
    }
    resetUser(user, id) {
        return this.portalService.resetToFirstLogin(user.organizationId, id);
    }
    setPortalRole(user, id, body) {
        return this.portalService.setPortalRole(user.organizationId, id, body.portalRole);
    }
    setPortalAdmin(user, id, body) {
        return this.portalService.setPortalAdminFlag(user.organizationId, id, body.isPortalAdmin);
    }
    listModuleConfigs(user) {
        return this.moduleService.listModuleConfigs(user.organizationId);
    }
    getModuleConfig(user, moduleId) {
        return this.moduleService.getModuleConfig(user.organizationId, moduleId);
    }
    upsertModuleConfig(user, moduleId, body) {
        return this.moduleService.upsertModuleConfig(user.organizationId, moduleId, body);
    }
    getFieldMappings(user, moduleId) {
        return this.moduleService.getModuleConfig(user.organizationId, moduleId);
    }
    saveFieldMappings(user, moduleId, body) {
        return this.moduleService.saveFieldMappings(user.organizationId, moduleId, body.mappings);
    }
    getRecordPortalStatus(user, recordId) {
        return this.moduleService.getRecordPortalStatus(user.organizationId, recordId);
    }
    createPortalUserFromRecord(user, recordId) {
        return this.moduleService.createPortalUserFromRecord(user.organizationId, recordId);
    }
    syncRecord(user, recordId) {
        return this.moduleService.syncRecordToPortal(user.organizationId, recordId);
    }
};
exports.PortalAdminController = PortalAdminController;
__decorate([
    (0, common_1.Get)('settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "getUserDetail", null);
__decorate([
    (0, common_1.Post)('users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('users/:id/reset'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "resetUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/role'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "setPortalRole", null);
__decorate([
    (0, common_1.Patch)('users/:id/admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "setPortalAdmin", null);
__decorate([
    (0, common_1.Get)('module-configs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "listModuleConfigs", null);
__decorate([
    (0, common_1.Get)('module-configs/:moduleId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "getModuleConfig", null);
__decorate([
    (0, common_1.Patch)('module-configs/:moduleId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('moduleId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "upsertModuleConfig", null);
__decorate([
    (0, common_1.Get)('module-configs/:moduleId/mappings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "getFieldMappings", null);
__decorate([
    (0, common_1.Put)('module-configs/:moduleId/mappings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('moduleId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "saveFieldMappings", null);
__decorate([
    (0, common_1.Get)('records/:recordId/portal-status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('recordId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "getRecordPortalStatus", null);
__decorate([
    (0, common_1.Post)('records/:recordId/create-portal-user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('recordId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "createPortalUserFromRecord", null);
__decorate([
    (0, common_1.Post)('records/:recordId/sync'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('recordId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalAdminController.prototype, "syncRecord", null);
exports.PortalAdminController = PortalAdminController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('portal/admin'),
    __metadata("design:paramtypes", [portal_auth_service_1.PortalAuthService,
        portal_service_1.PortalService,
        portal_module_service_1.PortalModuleService])
], PortalAdminController);
//# sourceMappingURL=portal-admin.controller.js.map