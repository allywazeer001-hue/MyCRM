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
exports.TrackerController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const tracker_service_1 = require("./tracker.service");
let TrackerController = class TrackerController {
    constructor(svc) {
        this.svc = svc;
    }
    list(user) {
        return this.svc.list(user.organizationId, user.id);
    }
    create(body, user) {
        return this.svc.create(user.organizationId, user.id, body);
    }
    get(id, user) {
        return this.svc.get(id, user.organizationId);
    }
    update(id, body, user) {
        return this.svc.update(id, user.organizationId, body);
    }
    remove(id, user) {
        return this.svc.remove(id, user.organizationId);
    }
    addCriteria(id, body, user) {
        return this.svc.addCriteria(id, user.organizationId, body);
    }
    updateCriteria(id, cid, body, user) {
        return this.svc.updateCriteria(id, cid, user.organizationId, body);
    }
    deleteCriteria(id, cid, user) {
        return this.svc.deleteCriteria(id, cid, user.organizationId);
    }
    getSessions(id, user) {
        return this.svc.getSessions(id, user.organizationId);
    }
    createSession(id, body, user) {
        return this.svc.createSession(id, user.organizationId, body);
    }
    updateSession(id, sid, body, user) {
        return this.svc.updateSession(id, sid, user.organizationId, body);
    }
    deleteSession(id, sid, user) {
        return this.svc.deleteSession(id, sid, user.organizationId);
    }
    getBands(id, user) {
        return this.svc.getBands(id, user.organizationId);
    }
    createBand(id, body, user) {
        return this.svc.createBand(id, user.organizationId, body);
    }
    updateBand(id, bid, body, user) {
        return this.svc.updateBand(id, bid, user.organizationId, body);
    }
    deleteBand(id, bid, user) {
        return this.svc.deleteBand(id, bid, user.organizationId);
    }
    getGrid(id, sessionId, search, user) {
        return this.svc.getGrid(id, user.organizationId, sessionId, search);
    }
    saveScore(id, body, user) {
        return this.svc.saveScore(id, user.organizationId, body);
    }
    getRecordHistory(id, recordId, user) {
        return this.svc.getRecordHistory(id, user.organizationId, recordId);
    }
    getPerformance(id, user) {
        return this.svc.getPerformance(id, user.organizationId);
    }
};
exports.TrackerController = TrackerController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/criteria'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "addCriteria", null);
__decorate([
    (0, common_1.Patch)(':id/criteria/:cid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('cid')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "updateCriteria", null);
__decorate([
    (0, common_1.Delete)(':id/criteria/:cid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('cid')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "deleteCriteria", null);
__decorate([
    (0, common_1.Get)(':id/sessions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Post)(':id/sessions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "createSession", null);
__decorate([
    (0, common_1.Patch)(':id/sessions/:sid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('sid')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Delete)(':id/sessions/:sid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('sid')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Get)(':id/bands'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "getBands", null);
__decorate([
    (0, common_1.Post)(':id/bands'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "createBand", null);
__decorate([
    (0, common_1.Patch)(':id/bands/:bid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('bid')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "updateBand", null);
__decorate([
    (0, common_1.Delete)(':id/bands/:bid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('bid')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "deleteBand", null);
__decorate([
    (0, common_1.Get)(':id/grid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('sessionId')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "getGrid", null);
__decorate([
    (0, common_1.Post)(':id/scores'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "saveScore", null);
__decorate([
    (0, common_1.Get)(':id/records/:recordId/history'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('recordId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "getRecordHistory", null);
__decorate([
    (0, common_1.Get)(':id/performance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TrackerController.prototype, "getPerformance", null);
exports.TrackerController = TrackerController = __decorate([
    (0, common_1.Controller)('tracker'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [tracker_service_1.TrackerService])
], TrackerController);
//# sourceMappingURL=tracker.controller.js.map