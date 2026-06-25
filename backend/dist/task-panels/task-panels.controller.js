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
exports.TaskPanelsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const task_panels_service_1 = require("./task-panels.service");
const task_panel_dto_1 = require("./dto/task-panel.dto");
let TaskPanelsController = class TaskPanelsController {
    constructor(taskPanelsService) {
        this.taskPanelsService = taskPanelsService;
    }
    getPanelsForUser(user) {
        return this.taskPanelsService.getPanelsForUser(user.id, user.role, user.organizationId);
    }
    getAllPanels(user) {
        return this.taskPanelsService.getAllPanels(user.organizationId);
    }
    getPanelRecords(id, user) {
        return this.taskPanelsService.getPanelRecords(id, user.id, user.role, user.organizationId);
    }
    createPanel(dto, user) {
        return this.taskPanelsService.createPanel(dto, user.organizationId);
    }
    updatePanel(id, dto, user) {
        return this.taskPanelsService.updatePanel(id, dto, user.organizationId);
    }
    deletePanel(id, user) {
        return this.taskPanelsService.deletePanel(id, user.organizationId);
    }
};
exports.TaskPanelsController = TaskPanelsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaskPanelsController.prototype, "getPanelsForUser", null);
__decorate([
    (0, common_1.Get)('admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaskPanelsController.prototype, "getAllPanels", null);
__decorate([
    (0, common_1.Get)(':id/records'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TaskPanelsController.prototype, "getPanelRecords", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [task_panel_dto_1.CreateTaskPanelDto, Object]),
    __metadata("design:returntype", void 0)
], TaskPanelsController.prototype, "createPanel", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, task_panel_dto_1.UpdateTaskPanelDto, Object]),
    __metadata("design:returntype", void 0)
], TaskPanelsController.prototype, "updatePanel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TaskPanelsController.prototype, "deletePanel", null);
exports.TaskPanelsController = TaskPanelsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('task-panels'),
    __metadata("design:paramtypes", [task_panels_service_1.TaskPanelsService])
], TaskPanelsController);
//# sourceMappingURL=task-panels.controller.js.map