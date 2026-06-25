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
exports.RequestBlueprintsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const request_blueprints_service_1 = require("./request-blueprints.service");
let RequestBlueprintsController = class RequestBlueprintsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(u) { return this.svc.list(u.organizationId); }
    get(id, u) { return this.svc.get(id, u.organizationId); }
    create(b, u) { return this.svc.create(u.organizationId, b); }
    update(id, b, u) { return this.svc.update(id, u.organizationId, b); }
    remove(id, u) { return this.svc.remove(id, u.organizationId); }
    addStage(id, b, u) { return this.svc.addStage(id, u.organizationId, b); }
    updateStage(sid, b, u) { return this.svc.updateStage(sid, u.organizationId, b); }
    removeStage(sid, u) { return this.svc.removeStage(sid, u.organizationId); }
    addAction(sid, b, u) { return this.svc.addAction(sid, u.organizationId, b); }
    updateAction(aid, b, u) { return this.svc.updateAction(aid, u.organizationId, b); }
    removeAction(aid, u) { return this.svc.removeAction(aid, u.organizationId); }
};
exports.RequestBlueprintsController = RequestBlueprintsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/stages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "addStage", null);
__decorate([
    (0, common_1.Patch)('stages/:sid'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "updateStage", null);
__decorate([
    (0, common_1.Delete)('stages/:sid'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "removeStage", null);
__decorate([
    (0, common_1.Post)('stages/:sid/actions'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "addAction", null);
__decorate([
    (0, common_1.Patch)('actions/:aid'),
    __param(0, (0, common_1.Param)('aid')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "updateAction", null);
__decorate([
    (0, common_1.Delete)('actions/:aid'),
    __param(0, (0, common_1.Param)('aid')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RequestBlueprintsController.prototype, "removeAction", null);
exports.RequestBlueprintsController = RequestBlueprintsController = __decorate([
    (0, common_1.Controller)('request-blueprints'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [request_blueprints_service_1.RequestBlueprintsService])
], RequestBlueprintsController);
//# sourceMappingURL=request-blueprints.controller.js.map