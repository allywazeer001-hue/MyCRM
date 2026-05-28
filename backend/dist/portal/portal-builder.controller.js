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
exports.PortalBuilderController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const portal_builder_service_1 = require("./portal-builder.service");
let PortalBuilderController = class PortalBuilderController {
    constructor(builderService) {
        this.builderService = builderService;
    }
    listPages(user) {
        return this.builderService.listPages(user.organizationId);
    }
    getPage(user, id) {
        return this.builderService.getPage(user.organizationId, id);
    }
    createPage(user, dto) {
        return this.builderService.createPage(user.organizationId, dto);
    }
    updatePage(user, id, dto) {
        return this.builderService.updatePage(user.organizationId, id, dto);
    }
    deletePage(user, id) {
        return this.builderService.deletePage(user.organizationId, id);
    }
    listMenuItems(user) {
        return this.builderService.listMenuItems(user.organizationId);
    }
    saveMenuItems(user, dto) {
        return this.builderService.saveMenuItems(user.organizationId, dto.items);
    }
    listAnnouncements(user) {
        return this.builderService.listAnnouncements(user.organizationId);
    }
    createAnnouncement(user, dto) {
        return this.builderService.createAnnouncement(user.organizationId, dto);
    }
    updateAnnouncement(user, id, dto) {
        return this.builderService.updateAnnouncement(user.organizationId, id, dto);
    }
    deleteAnnouncement(user, id) {
        return this.builderService.deleteAnnouncement(user.organizationId, id);
    }
    broadcast(user, dto) {
        return this.builderService.broadcastNotification(user.organizationId, dto);
    }
};
exports.PortalBuilderController = PortalBuilderController;
__decorate([
    (0, common_1.Get)('pages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "listPages", null);
__decorate([
    (0, common_1.Get)('pages/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "getPage", null);
__decorate([
    (0, common_1.Post)('pages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "createPage", null);
__decorate([
    (0, common_1.Patch)('pages/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "updatePage", null);
__decorate([
    (0, common_1.Delete)('pages/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "deletePage", null);
__decorate([
    (0, common_1.Get)('menu'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "listMenuItems", null);
__decorate([
    (0, common_1.Post)('menu'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "saveMenuItems", null);
__decorate([
    (0, common_1.Get)('announcements'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "listAnnouncements", null);
__decorate([
    (0, common_1.Post)('announcements'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "createAnnouncement", null);
__decorate([
    (0, common_1.Patch)('announcements/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "updateAnnouncement", null);
__decorate([
    (0, common_1.Delete)('announcements/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "deleteAnnouncement", null);
__decorate([
    (0, common_1.Post)('announcements/broadcast'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalBuilderController.prototype, "broadcast", null);
exports.PortalBuilderController = PortalBuilderController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('portal/admin/builder'),
    __metadata("design:paramtypes", [portal_builder_service_1.PortalBuilderService])
], PortalBuilderController);
//# sourceMappingURL=portal-builder.controller.js.map