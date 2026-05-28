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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let AnalyticsController = class AnalyticsController {
    constructor(svc) {
        this.svc = svc;
    }
    getData(moduleId, body, user) {
        return this.svc.getAnalytics(moduleId, user.organizationId, body);
    }
    getDataGet(moduleId, groupByField, user) {
        return this.svc.getAnalytics(moduleId, user.organizationId, { groupByField });
    }
    getKanban(moduleId, body, user) {
        return this.svc.getKanban(moduleId, user.organizationId, body.statusField, body.filterGroup);
    }
    getViews(user) {
        return this.svc.getViews(user.organizationId);
    }
    createView(body, user) {
        return this.svc.createView(user.organizationId, user.id, body);
    }
    updateView(id, body, user) {
        return this.svc.updateView(id, user.organizationId, body);
    }
    deleteView(id, user) {
        return this.svc.deleteView(id, user.organizationId);
    }
    togglePinView(id, user) {
        return this.svc.togglePinView(id, user.organizationId);
    }
    getSavedFilters(context, user) {
        return this.svc.getSavedFilters(user.organizationId, context);
    }
    createSavedFilter(body, user) {
        return this.svc.createSavedFilter(user.organizationId, user.id, body);
    }
    updateSavedFilter(id, body, user) {
        return this.svc.updateSavedFilter(id, user.organizationId, body);
    }
    deleteSavedFilter(id, user) {
        return this.svc.deleteSavedFilter(id, user.organizationId);
    }
    getTargets(user) {
        return this.svc.getTargets(user.organizationId);
    }
    createTarget(body, user) {
        return this.svc.createTarget(user.organizationId, body);
    }
    updateTarget(id, body, user) {
        return this.svc.updateTarget(id, user.organizationId, body);
    }
    deleteTarget(id, user) {
        return this.svc.deleteTarget(id, user.organizationId);
    }
    computeTarget(id, user) {
        return this.svc.computeTargetCurrent(id, user.organizationId);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('data/:moduleId'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getData", null);
__decorate([
    (0, common_1.Get)(':moduleId'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Query)('groupByField')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getDataGet", null);
__decorate([
    (0, common_1.Post)('kanban/:moduleId'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getKanban", null);
__decorate([
    (0, common_1.Get)('views/list'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getViews", null);
__decorate([
    (0, common_1.Post)('views'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "createView", null);
__decorate([
    (0, common_1.Patch)('views/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "updateView", null);
__decorate([
    (0, common_1.Delete)('views/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "deleteView", null);
__decorate([
    (0, common_1.Patch)('views/:id/toggle-pin'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "togglePinView", null);
__decorate([
    (0, common_1.Get)('saved-filters'),
    __param(0, (0, common_1.Query)('context')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getSavedFilters", null);
__decorate([
    (0, common_1.Post)('saved-filters'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "createSavedFilter", null);
__decorate([
    (0, common_1.Patch)('saved-filters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "updateSavedFilter", null);
__decorate([
    (0, common_1.Delete)('saved-filters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "deleteSavedFilter", null);
__decorate([
    (0, common_1.Get)('targets/list'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getTargets", null);
__decorate([
    (0, common_1.Post)('targets'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "createTarget", null);
__decorate([
    (0, common_1.Patch)('targets/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "updateTarget", null);
__decorate([
    (0, common_1.Delete)('targets/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "deleteTarget", null);
__decorate([
    (0, common_1.Post)('targets/:id/compute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "computeTarget", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map