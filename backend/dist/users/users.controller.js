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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    isSuperAdmin(user) {
        return user?.role === 'SUPER_ADMIN';
    }
    findAll(user) {
        return this.usersService.findAll(user.organizationId);
    }
    create(user, body) {
        return this.usersService.create(user.organizationId, body);
    }
    getMyPermissions(user) {
        return this.usersService.getMyPermissions(user.id, user.organizationId);
    }
    findOne(id, user) {
        return this.usersService.findOne(id, user.organizationId);
    }
    update(id, body, user) {
        return this.usersService.update(id, user.organizationId, body);
    }
    remove(id, user) {
        return this.usersService.remove(id, user.organizationId);
    }
    reactivate(id, user) {
        return this.usersService.reactivate(id, user.organizationId);
    }
    suspend(id, user) {
        if (!this.isSuperAdmin(user)) {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.suspend(id, user.organizationId, user.id);
    }
    unsuspend(id, user) {
        return this.usersService.unsuspend(id, user.organizationId, user.id);
    }
    lock(id, user) {
        if (!this.isSuperAdmin(user)) {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.lock(id, user.organizationId, user.id);
    }
    unlock(id, user) {
        if (!this.isSuperAdmin(user)) {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.unlock(id, user.organizationId, user.id);
    }
    resetPassword(id, user) {
        if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.resetPassword(id, user.organizationId, user.id);
    }
    forcePasswordReset(id, user) {
        if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.forcePasswordReset(id, user.organizationId, user.id);
    }
    getPermissionSummary(id, user) {
        return this.usersService.getPermissionSummary(id, user.organizationId);
    }
    getPermissionOverrides(id, user) {
        return this.usersService.getPermissionOverrides(id, user.organizationId);
    }
    setPermissionOverride(id, body, user) {
        if (!this.isSuperAdmin(user)) {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.setPermissionOverride(id, user.organizationId, user.id, body);
    }
    removePermissionOverride(overrideId, user) {
        if (!this.isSuperAdmin(user)) {
            throw new common_1.ForbiddenException('Only Super Admin can perform this action');
        }
        return this.usersService.removePermissionOverride(overrideId, user.organizationId, user.id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me/permissions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getMyPermissions", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/reactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "reactivate", null);
__decorate([
    (0, common_1.Patch)(':id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "suspend", null);
__decorate([
    (0, common_1.Patch)(':id/unsuspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "unsuspend", null);
__decorate([
    (0, common_1.Patch)(':id/lock'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "lock", null);
__decorate([
    (0, common_1.Patch)(':id/unlock'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "unlock", null);
__decorate([
    (0, common_1.Post)(':id/reset-password'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Patch)(':id/force-password-reset'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "forcePasswordReset", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getPermissionSummary", null);
__decorate([
    (0, common_1.Get)(':id/permission-overrides'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getPermissionOverrides", null);
__decorate([
    (0, common_1.Post)(':id/permission-overrides'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "setPermissionOverride", null);
__decorate([
    (0, common_1.Delete)('permission-overrides/:overrideId'),
    __param(0, (0, common_1.Param)('overrideId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removePermissionOverride", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map