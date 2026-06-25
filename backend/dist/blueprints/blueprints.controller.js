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
exports.BlueprintsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const blueprints_service_1 = require("./blueprints.service");
let BlueprintsController = class BlueprintsController {
    constructor(blueprintsService) {
        this.blueprintsService = blueprintsService;
    }
    findAll(user) {
        return this.blueprintsService.findAll(user.organizationId);
    }
    findForModule(moduleId, user) {
        return this.blueprintsService.findForModule(moduleId, user.organizationId);
    }
    evaluate(recordId, user) {
        return this.blueprintsService.evaluateForRecord(recordId, user.organizationId);
    }
    getForRecord(recordId, user) {
        return this.blueprintsService.getAvailableTransitions(recordId, user.id, user.organizationId);
    }
    getStageHistory(recordId, user) {
        return this.blueprintsService.getStageHistory(recordId, user.organizationId);
    }
    initializeRecord(body, user) {
        const { recordId, stageId } = body;
        return this.blueprintsService.initializeRecord(recordId, stageId, user.id, user.organizationId);
    }
    executeTransition(body, user) {
        const { recordId, transitionId, formData } = body;
        return this.blueprintsService.executeTransition(recordId, transitionId, user.id, user.organizationId, formData ?? {});
    }
    validateTransition(body, user) {
        const { moduleId, fromStage, toStage } = body;
        return this.blueprintsService.validateTransition(moduleId, fromStage, toStage, user.id, user.organizationId);
    }
    getMyTasks(user) {
        return this.blueprintsService.getMyBlueprintTasks(user.id, user.organizationId);
    }
    getRecordTasks(recordId, user) {
        return this.blueprintsService.getBlueprintTasksForRecord(recordId, user.organizationId);
    }
    completeTask(id, body, user) {
        return this.blueprintsService.completeBlueprintTask(id, body.action, body.comment, user.id, user.organizationId);
    }
    findOne(id, user) {
        return this.blueprintsService.findOne(id, user.organizationId);
    }
    create(body, user) {
        return this.blueprintsService.create(user.organizationId, body);
    }
    update(id, body, user) {
        return this.blueprintsService.update(id, user.organizationId, body);
    }
    remove(id, user) {
        return this.blueprintsService.remove(id, user.organizationId);
    }
};
exports.BlueprintsController = BlueprintsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('module/:moduleId'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "findForModule", null);
__decorate([
    (0, common_1.Get)('evaluate/:recordId'),
    __param(0, (0, common_1.Param)('recordId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "evaluate", null);
__decorate([
    (0, common_1.Get)('for-record/:recordId'),
    __param(0, (0, common_1.Param)('recordId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "getForRecord", null);
__decorate([
    (0, common_1.Get)('for-record/:recordId/history'),
    __param(0, (0, common_1.Param)('recordId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "getStageHistory", null);
__decorate([
    (0, common_1.Post)('initialize-record'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "initializeRecord", null);
__decorate([
    (0, common_1.Post)('execute-transition'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "executeTransition", null);
__decorate([
    (0, common_1.Post)('validate-transition'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "validateTransition", null);
__decorate([
    (0, common_1.Get)('my-pending-tasks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "getMyTasks", null);
__decorate([
    (0, common_1.Get)('record/:recordId/tasks'),
    __param(0, (0, common_1.Param)('recordId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "getRecordTasks", null);
__decorate([
    (0, common_1.Post)('pending-tasks/:id/action'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "completeTask", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlueprintsController.prototype, "remove", null);
exports.BlueprintsController = BlueprintsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('blueprints'),
    __metadata("design:paramtypes", [blueprints_service_1.BlueprintsService])
], BlueprintsController);
//# sourceMappingURL=blueprints.controller.js.map