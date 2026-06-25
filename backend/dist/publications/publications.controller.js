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
exports.PortalPublicationsController = exports.PublicationsController = void 0;
const common_1 = require("@nestjs/common");
const publications_service_1 = require("./publications.service");
const create_publication_dto_1 = require("./dto/create-publication.dto");
const update_publication_dto_1 = require("./dto/update-publication.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let PublicationsController = class PublicationsController {
    constructor(svc) {
        this.svc = svc;
    }
    getStats(user) {
        return this.svc.getDashboardStats(user.organizationId);
    }
    getUserEngagement(user) {
        return this.svc.getUserEngagementSummary(user.organizationId);
    }
    findAll(user, query) {
        return this.svc.findAll(user.organizationId, query);
    }
    findOne(user, id) {
        return this.svc.findOne(user.organizationId, id);
    }
    create(user, dto) {
        return this.svc.create(user.organizationId, user.id, dto);
    }
    update(user, id, dto) {
        return this.svc.update(user.organizationId, id, dto);
    }
    publish(user, id) {
        return this.svc.publish(user.organizationId, id);
    }
    archive(user, id) {
        return this.svc.archive(user.organizationId, id);
    }
    unpublish(user, id) {
        return this.svc.unpublish(user.organizationId, id);
    }
    delete(user, id) {
        return this.svc.delete(user.organizationId, id);
    }
    getAnalytics(user, id, query) {
        return this.svc.getAnalytics(user.organizationId, id, query);
    }
};
exports.PublicationsController = PublicationsController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('user-engagement/summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "getUserEngagement", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_publication_dto_1.CreatePublicationDto]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_publication_dto_1.UpdatePublicationDto]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/archive'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)(':id/unpublish'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "unpublish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id/analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PublicationsController.prototype, "getAnalytics", null);
exports.PublicationsController = PublicationsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('publications'),
    __metadata("design:paramtypes", [publications_service_1.PublicationsService])
], PublicationsController);
let PortalPublicationsController = class PortalPublicationsController {
    constructor(svc) {
        this.svc = svc;
    }
    getFeed(orgId) {
        return this.svc.getPortalFeed(orgId);
    }
    getPublication(orgId, id, portalUserId, userId) {
        return this.svc.getPortalPublication(orgId, id, portalUserId, userId);
    }
    trackEngagement(orgId, id, body) {
        return this.svc.trackEngagement(orgId, id, body.activityType, body.portalUserId, body.userId, body.metadata, body.deviceInfo);
    }
};
exports.PortalPublicationsController = PortalPublicationsController;
__decorate([
    (0, common_1.Get)('feed/:orgId'),
    __param(0, (0, common_1.Param)('orgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PortalPublicationsController.prototype, "getFeed", null);
__decorate([
    (0, common_1.Get)(':orgId/:id'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('portalUserId')),
    __param(3, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], PortalPublicationsController.prototype, "getPublication", null);
__decorate([
    (0, common_1.Post)(':orgId/:id/engage'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPublicationsController.prototype, "trackEngagement", null);
exports.PortalPublicationsController = PortalPublicationsController = __decorate([
    (0, common_1.Controller)('portal-publications'),
    __metadata("design:paramtypes", [publications_service_1.PublicationsService])
], PortalPublicationsController);
//# sourceMappingURL=publications.controller.js.map