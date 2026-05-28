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
exports.PublicFormsController = exports.FormsController = void 0;
const common_1 = require("@nestjs/common");
const forms_service_1 = require("./forms.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let FormsController = class FormsController {
    constructor(svc) {
        this.svc = svc;
    }
    findAll(user) {
        return this.svc.findAll(user.organizationId);
    }
    findOne(id, user) {
        return this.svc.findOne(id, user.organizationId);
    }
    create(body, user) {
        return this.svc.create(user.organizationId, user.id, body);
    }
    update(id, body, user) {
        return this.svc.update(id, user.organizationId, body);
    }
    remove(id, user) {
        return this.svc.remove(id, user.organizationId);
    }
    addSection(id, body, user) {
        return this.svc.addSection(id, user.organizationId, body);
    }
    updateSection(id, sectionId, body, user) {
        return this.svc.updateSection(id, user.organizationId, sectionId, body);
    }
    removeSection(id, sectionId, user) {
        return this.svc.removeSection(id, user.organizationId, sectionId);
    }
    getModuleFields(id, user) {
        return this.svc.getModuleFields(id, user.organizationId);
    }
    addField(id, body, user) {
        return this.svc.addField(id, user.organizationId, body);
    }
    updateField(id, formFieldId, body, user) {
        return this.svc.updateField(id, user.organizationId, formFieldId, body);
    }
    removeField(id, formFieldId, user) {
        return this.svc.removeField(id, user.organizationId, formFieldId);
    }
    reorderFields(id, formFieldIds, user) {
        return this.svc.reorderFields(id, user.organizationId, formFieldIds);
    }
    getPermissions(id, user) {
        return this.svc.getPermissions(id, user.organizationId);
    }
    setPermission(id, body, user) {
        return this.svc.setPermission(id, user.organizationId, body);
    }
    generateToken(id, user) {
        return this.svc.generateToken(id, user.organizationId);
    }
    revokeToken(id, user) {
        return this.svc.revokeToken(id, user.organizationId);
    }
    getSubmissions(id, user) {
        return this.svc.getSubmissions(id, user.organizationId);
    }
};
exports.FormsController = FormsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/sections'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "addSection", null);
__decorate([
    (0, common_1.Patch)(':id/sections/:sectionId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('sectionId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "updateSection", null);
__decorate([
    (0, common_1.Delete)(':id/sections/:sectionId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('sectionId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "removeSection", null);
__decorate([
    (0, common_1.Get)(':id/available-fields'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "getModuleFields", null);
__decorate([
    (0, common_1.Post)(':id/fields'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "addField", null);
__decorate([
    (0, common_1.Patch)(':id/fields/:formFieldId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('formFieldId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "updateField", null);
__decorate([
    (0, common_1.Delete)(':id/fields/:formFieldId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('formFieldId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "removeField", null);
__decorate([
    (0, common_1.Post)(':id/fields/reorder'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('formFieldIds')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "reorderFields", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "getPermissions", null);
__decorate([
    (0, common_1.Post)(':id/permissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "setPermission", null);
__decorate([
    (0, common_1.Post)(':id/generate-token'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "generateToken", null);
__decorate([
    (0, common_1.Post)(':id/revoke-token'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "revokeToken", null);
__decorate([
    (0, common_1.Get)(':id/submissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FormsController.prototype, "getSubmissions", null);
exports.FormsController = FormsController = __decorate([
    (0, swagger_1.ApiTags)('forms'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('forms'),
    __metadata("design:paramtypes", [forms_service_1.FormsService])
], FormsController);
let PublicFormsController = class PublicFormsController {
    constructor(svc) {
        this.svc = svc;
    }
    getPublicForm(token) {
        return this.svc.getPublicForm(token);
    }
    submitForm(token, body, req) {
        const ip = req.ip || req.headers['x-forwarded-for'];
        const ua = req.headers['user-agent'];
        return this.svc.submitPublicForm(token, body, ip, ua);
    }
};
exports.PublicFormsController = PublicFormsController;
__decorate([
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicFormsController.prototype, "getPublicForm", null);
__decorate([
    (0, common_1.Post)(':token/submit'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PublicFormsController.prototype, "submitForm", null);
exports.PublicFormsController = PublicFormsController = __decorate([
    (0, swagger_1.ApiTags)('public-forms'),
    (0, common_1.Controller)('public/forms'),
    __metadata("design:paramtypes", [forms_service_1.FormsService])
], PublicFormsController);
//# sourceMappingURL=forms.controller.js.map