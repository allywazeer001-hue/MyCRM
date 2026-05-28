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
exports.PortalController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const portal_auth_guard_1 = require("./portal-auth.guard");
const portal_service_1 = require("./portal.service");
const portal_builder_service_1 = require("./portal-builder.service");
const portal_field_service_1 = require("./portal-field.service");
const portal_document_service_1 = require("./portal-document.service");
let PortalController = class PortalController {
    constructor(portalService, builderService, fieldService, documentService) {
        this.portalService = portalService;
        this.builderService = builderService;
        this.fieldService = fieldService;
        this.documentService = documentService;
    }
    getProfile(user) {
        return this.portalService.getProfile(user.portalUserId);
    }
    updateProfile(user, body) {
        return this.portalService.updateProfile(user.portalUserId, body);
    }
    getDashboard(user) {
        return this.portalService.getDashboardSummary(user.portalUserId);
    }
    getRecord(user) {
        return this.portalService.getRecordData(user.portalUserId);
    }
    updateRecord(user, body) {
        return this.portalService.updateRecordField(user.portalUserId, body);
    }
    getPageData(user, slug) {
        return this.portalService.getPageData(user.portalUserId, slug);
    }
    savePageData(user, slug, body) {
        return this.portalService.savePageData(user.portalUserId, slug, body.updates ?? []);
    }
    getNotifications(user, page, limit) {
        return this.portalService.getNotifications(user.portalUserId, page, limit);
    }
    markAllRead(user) {
        return this.portalService.markAllNotificationsRead(user.portalUserId);
    }
    markRead(user, id) {
        return this.portalService.markNotificationRead(user.portalUserId, id);
    }
    getAnnouncements(user) {
        return this.portalService.getAnnouncements(user.organizationId);
    }
    getMenu(user) {
        return this.builderService.getPublicMenuItems(user.organizationId);
    }
    getPage(user, slug) {
        return this.builderService.getPublishedPageFull(user.organizationId, slug);
    }
    getFields(user) {
        return this.fieldService.getFieldsWithValues(user.portalUserId);
    }
    updateFields(user, body) {
        const map = {};
        for (const { fieldKey, value } of (body.updates ?? []))
            map[fieldKey] = value;
        return this.fieldService.updateFieldValues(user.portalUserId, map);
    }
    listDocuments(user) {
        return this.documentService.listDocuments(user.portalUserId);
    }
    uploadDocument(user, file, dto) {
        return this.documentService.uploadDocument(user.portalUserId, user.organizationId, file, dto);
    }
    deleteDocument(user, id) {
        return this.documentService.deleteDocument(user.portalUserId, id);
    }
};
exports.PortalController = PortalController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('record'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getRecord", null);
__decorate([
    (0, common_1.Patch)('record'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "updateRecord", null);
__decorate([
    (0, common_1.Get)('pages/:slug/data'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPageData", null);
__decorate([
    (0, common_1.Patch)('pages/:slug/data'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "savePageData", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Patch)('notifications/read-all'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "markAllRead", null);
__decorate([
    (0, common_1.Patch)('notifications/:id/read'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "markRead", null);
__decorate([
    (0, common_1.Get)('announcements'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getAnnouncements", null);
__decorate([
    (0, common_1.Get)('menu'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getMenu", null);
__decorate([
    (0, common_1.Get)('pages/:slug'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getPage", null);
__decorate([
    (0, common_1.Get)('fields'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "getFields", null);
__decorate([
    (0, common_1.Patch)('fields'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "updateFields", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Post)('documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    __param(0, (0, portal_auth_guard_1.CurrentPortalUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "deleteDocument", null);
exports.PortalController = PortalController = __decorate([
    (0, common_1.UseGuards)(portal_auth_guard_1.PortalAuthGuard),
    (0, common_1.Controller)('portal'),
    __metadata("design:paramtypes", [portal_service_1.PortalService,
        portal_builder_service_1.PortalBuilderService,
        portal_field_service_1.PortalFieldService,
        portal_document_service_1.PortalDocumentService])
], PortalController);
//# sourceMappingURL=portal.controller.js.map