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
exports.RecordsController = exports.LookupController = void 0;
const common_1 = require("@nestjs/common");
const records_service_1 = require("./records.service");
const permission_check_service_1 = require("../permissions/permission-check.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let LookupController = class LookupController {
    constructor(recordsService) {
        this.recordsService = recordsService;
    }
    lookup(moduleId, displayField, search, user) {
        return this.recordsService.lookupSearch(user.organizationId, moduleId, displayField, search || '');
    }
};
exports.LookupController = LookupController;
__decorate([
    (0, common_1.Get)('lookup'),
    __param(0, (0, common_1.Query)('moduleId')),
    __param(1, (0, common_1.Query)('displayField')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "lookup", null);
exports.LookupController = LookupController = __decorate([
    (0, swagger_1.ApiTags)('records'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('records'),
    __metadata("design:paramtypes", [records_service_1.RecordsService])
], LookupController);
let RecordsController = class RecordsController {
    constructor(recordsService, permCheck) {
        this.recordsService = recordsService;
        this.permCheck = permCheck;
    }
    async create(moduleId, body, user) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canCreate');
        return this.recordsService.create(moduleId, user.organizationId, user.id, body);
    }
    findAll(moduleId, query, user) {
        return this.recordsService.findAll(moduleId, user.organizationId, query);
    }
    findOne(id, user) {
        return this.recordsService.findOne(id, user.organizationId);
    }
    async update(moduleId, id, body, user) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canEdit');
        return this.recordsService.update(id, user.organizationId, user.id, body);
    }
    async remove(moduleId, id, user) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canDelete');
        return this.recordsService.softDelete(id, user.organizationId, user.id);
    }
    async bulkDelete(moduleId, ids, user) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canDelete');
        return this.recordsService.bulkDelete(ids, user.organizationId, user.id);
    }
    async bulkUpdate(moduleId, body, user) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canEdit');
        return this.recordsService.bulkUpdateField(body.ids, body.fieldName, body.value, user.organizationId);
    }
    async getImportTemplate(moduleId, user, res) {
        const csv = await this.recordsService.getImportTemplate(moduleId, user.organizationId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="import-template.csv"`);
        res.send(csv);
    }
    importPreview(csvText) {
        return this.recordsService.importPreview(csvText);
    }
    async importRun(moduleId, csvText, mapping, user) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canImport');
        return this.recordsService.importCsv(moduleId, user.organizationId, user.id, csvText, mapping);
    }
    async exportCsv(moduleId, filterGroup, user, res) {
        await this.permCheck.enforceModulePerm(user.id, user.organizationId, moduleId, 'canExport');
        const csv = await this.recordsService.exportCsv(moduleId, user.organizationId, filterGroup);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="export-${Date.now()}.csv"`);
        res.send(csv);
    }
    addComment(id, content, user) {
        return this.recordsService.addComment(id, user.organizationId, user.id, content);
    }
};
exports.RecordsController = RecordsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RecordsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RecordsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('bulk-delete'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)('ids')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "bulkDelete", null);
__decorate([
    (0, common_1.Post)('bulk-update'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "bulkUpdate", null);
__decorate([
    (0, common_1.Get)('import/template'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "getImportTemplate", null);
__decorate([
    (0, common_1.Post)('import/preview'),
    __param(0, (0, common_1.Body)('csvText')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecordsController.prototype, "importPreview", null);
__decorate([
    (0, common_1.Post)('import/run'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Body)('csvText')),
    __param(2, (0, common_1.Body)('mapping')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "importRun", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    __param(0, (0, common_1.Param)('moduleId')),
    __param(1, (0, common_1.Query)('filterGroup')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RecordsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('content')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], RecordsController.prototype, "addComment", null);
exports.RecordsController = RecordsController = __decorate([
    (0, swagger_1.ApiTags)('records'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('modules/:moduleId/records'),
    __metadata("design:paramtypes", [records_service_1.RecordsService,
        permission_check_service_1.PermissionCheckService])
], RecordsController);
//# sourceMappingURL=records.controller.js.map