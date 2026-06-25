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
exports.ProcessController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const process_service_1 = require("./process.service");
const create_blueprint_dto_1 = require("./dto/create-blueprint.dto");
const task_action_dto_1 = require("./dto/task-action.dto");
let ProcessController = class ProcessController {
    constructor(processService) {
        this.processService = processService;
    }
    getBlueprints(user) {
        return this.processService.getBlueprints(user.organizationId);
    }
    createBlueprint(dto, user) {
        return this.processService.createBlueprint(dto, user.organizationId);
    }
    getBlueprintById(id, user) {
        return this.processService.getBlueprintById(id, user.organizationId);
    }
    updateBlueprint(id, dto, user) {
        return this.processService.updateBlueprint(id, dto, user.organizationId);
    }
    deleteBlueprint(id, user) {
        return this.processService.deleteBlueprint(id, user.organizationId);
    }
    startInstance(body, user) {
        return this.processService.startInstance(body.blueprintId, body.recordId, body.recordModule, user.id, user.organizationId);
    }
    getMyTasks(user) {
        return this.processService.getMyTasks(user.id, user.organizationId);
    }
    executeTaskAction(id, dto, user) {
        return this.processService.executeTaskAction(id, user.id, dto);
    }
    markTaskSeen(id, user) {
        return this.processService.markTaskSeen(id, user.id);
    }
    getInstanceTimeline(id, user) {
        return this.processService.getInstanceTimeline(id, user.organizationId);
    }
    getMonitoringStats(user) {
        return this.processService.getMonitoringStats(user.organizationId);
    }
};
exports.ProcessController = ProcessController;
__decorate([
    (0, common_1.Get)('blueprints'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "getBlueprints", null);
__decorate([
    (0, common_1.Post)('blueprints'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blueprint_dto_1.CreateBlueprintDto, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "createBlueprint", null);
__decorate([
    (0, common_1.Get)('blueprints/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "getBlueprintById", null);
__decorate([
    (0, common_1.Patch)('blueprints/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_blueprint_dto_1.UpdateBlueprintDto, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "updateBlueprint", null);
__decorate([
    (0, common_1.Delete)('blueprints/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "deleteBlueprint", null);
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "startInstance", null);
__decorate([
    (0, common_1.Get)('my-tasks'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "getMyTasks", null);
__decorate([
    (0, common_1.Post)('tasks/:id/action'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, task_action_dto_1.TaskActionDto, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "executeTaskAction", null);
__decorate([
    (0, common_1.Patch)('tasks/:id/seen'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "markTaskSeen", null);
__decorate([
    (0, common_1.Get)('instances/:id/timeline'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "getInstanceTimeline", null);
__decorate([
    (0, common_1.Get)('monitor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProcessController.prototype, "getMonitoringStats", null);
exports.ProcessController = ProcessController = __decorate([
    (0, common_1.Controller)('process'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [process_service_1.ProcessService])
], ProcessController);
//# sourceMappingURL=process.controller.js.map