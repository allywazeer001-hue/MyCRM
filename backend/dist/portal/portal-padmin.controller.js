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
exports.PortalPadminController = void 0;
const common_1 = require("@nestjs/common");
const portal_crm_admin_guard_1 = require("./portal-crm-admin.guard");
const portal_field_service_1 = require("./portal-field.service");
const portal_section_service_1 = require("./portal-section.service");
const portal_document_service_1 = require("./portal-document.service");
const portal_service_1 = require("./portal.service");
const portal_builder_service_1 = require("./portal-builder.service");
const CurrentPortalUser = (0, common_1.createParamDecorator)((_data, ctx) => ctx.switchToHttp().getRequest().user);
let PortalPadminController = class PortalPadminController {
    constructor(fieldService, sectionService, documentService, portalService, builderService) {
        this.fieldService = fieldService;
        this.sectionService = sectionService;
        this.documentService = documentService;
        this.portalService = portalService;
        this.builderService = builderService;
    }
    listSections(user, moduleConfigId, pageId) {
        return this.sectionService.listSections(user.organizationId, moduleConfigId, pageId);
    }
    createSection(user, dto) {
        return this.sectionService.createSection(user.organizationId, dto);
    }
    updateSection(user, id, dto) {
        return this.sectionService.updateSection(user.organizationId, id, dto);
    }
    deleteSection(user, id) {
        return this.sectionService.deleteSection(user.organizationId, id);
    }
    reorderSections(user, dto) {
        return this.sectionService.reorderSections(user.organizationId, dto.ids);
    }
    listFields(user, moduleConfigId, pageId) {
        return this.fieldService.listFields(user.organizationId, moduleConfigId, pageId);
    }
    createField(user, dto) {
        return this.fieldService.createField(user.organizationId, dto);
    }
    updateField(user, id, dto) {
        return this.fieldService.updateField(user.organizationId, id, dto);
    }
    deleteField(user, id) {
        return this.fieldService.deleteField(user.organizationId, id);
    }
    reorderFields(user, dto) {
        return this.fieldService.reorderFields(user.organizationId, dto.ids);
    }
    getCrmFields(user, moduleId) {
        return this.fieldService.getCrmFieldsForModule(user.organizationId, moduleId);
    }
    listCrmModules(user) {
        return this.builderService.listCrmModules(user.organizationId);
    }
    getCrmModuleFields(user, moduleId) {
        return this.builderService.getCrmModuleFields(user.organizationId, moduleId);
    }
    detectRelatedModules(user, moduleId) {
        return this.builderService.detectRelatedModules(user.organizationId, moduleId);
    }
    suggestSections(user, moduleId) {
        return this.builderService.suggestSectionsFromModule(user.organizationId, moduleId);
    }
    createSectionFromModule(user, pageId, dto) {
        return this.builderService.createSectionFromModule(user.organizationId, pageId, dto);
    }
    setPagePrimaryModule(user, pageId, dto) {
        return this.builderService.setPagePrimaryModule(user.organizationId, pageId, dto);
    }
    mapFieldToCrm(user, id, dto) {
        return this.builderService.mapPortalFieldToCrm(user.organizationId, id, dto);
    }
    unmapField(user, id) {
        return this.builderService.unmapPortalField(user.organizationId, id);
    }
    createCrmField(user, id, dto) {
        return this.builderService.createCrmFieldAndMap(user.organizationId, id, dto);
    }
    listMenu(user) {
        return this.builderService.listMenuItems(user.organizationId);
    }
    addMenuItem(user, dto) {
        return this.builderService.addMenuItem(user.organizationId, dto);
    }
    reorderMenu(user, dto) {
        return this.builderService.reorderMenuItems(user.organizationId, dto.ids);
    }
    updateMenuItem(user, id, dto) {
        return this.builderService.updateMenuItem(user.organizationId, id, dto);
    }
    deleteMenuItem(user, id) {
        return this.builderService.deleteMenuItem(user.organizationId, id);
    }
    listPages(user) {
        return this.builderService.listPages(user.organizationId);
    }
    createPage(user, dto) {
        return this.builderService.createPage(user.organizationId, dto);
    }
    getPage(user, id) {
        return this.builderService.getPageFull(user.organizationId, id);
    }
    updatePage(user, id, dto) {
        return this.builderService.updatePage(user.organizationId, id, dto);
    }
    deletePage(user, id) {
        return this.builderService.deletePage(user.organizationId, id);
    }
    duplicatePage(user, id) {
        return this.builderService.duplicatePage(user.organizationId, id);
    }
    publishPage(user, id, dto) {
        return this.builderService.updatePage(user.organizationId, id, { status: dto.status ?? 'PUBLISHED' });
    }
    republishPage(user, id) {
        return this.builderService.republishPage(user.organizationId, id);
    }
    listTemplates(user) {
        return this.builderService.listTemplates(user.organizationId);
    }
    saveTemplate(user, dto) {
        return this.builderService.saveTemplate(user.organizationId, dto);
    }
    applyTemplate(user, id) {
        return this.builderService.applyTemplate(user.organizationId, id);
    }
    deleteTemplate(user, id) {
        return this.builderService.deleteTemplate(user.organizationId, id);
    }
    listDocuments(user, userId) {
        return this.documentService.listOrgDocuments(user.organizationId, userId);
    }
    listUsers(user) {
        return this.portalService.listUsers(user.organizationId, 1, 200);
    }
    toggleAdmin(user, id, dto) {
        return this.portalService.setPortalAdminFlag(user.organizationId, id, dto.isPortalAdmin);
    }
    updateRole(user, id, dto) {
        return this.portalService.setPortalRole(user.organizationId, id, dto.portalRole);
    }
    updateStatus(user, id, dto) {
        return this.portalService.updateAccountStatus(user.organizationId, id, dto.status);
    }
    async getStats(user) {
        const [users, sections, fields, docs, pages, menus] = await Promise.all([
            this.portalService.listUsers(user.organizationId, 1, 1),
            this.sectionService.listSections(user.organizationId),
            this.fieldService.listFields(user.organizationId),
            this.documentService.listOrgDocuments(user.organizationId),
            this.builderService.listPages(user.organizationId),
            this.builderService.listMenuItems(user.organizationId),
        ]);
        return {
            totalUsers: users.total ?? 0,
            totalSections: sections.length,
            totalFields: fields.length,
            totalDocuments: docs.length,
            totalPages: pages.length,
            totalMenuItems: menus.length,
        };
    }
};
exports.PortalPadminController = PortalPadminController;
__decorate([
    (0, common_1.Get)('sections'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Query)('moduleConfigId')),
    __param(2, (0, common_1.Query)('pageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listSections", null);
__decorate([
    (0, common_1.Post)('sections'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "createSection", null);
__decorate([
    (0, common_1.Patch)('sections/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "updateSection", null);
__decorate([
    (0, common_1.Delete)('sections/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "deleteSection", null);
__decorate([
    (0, common_1.Post)('sections/reorder'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "reorderSections", null);
__decorate([
    (0, common_1.Get)('fields'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Query)('moduleConfigId')),
    __param(2, (0, common_1.Query)('pageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listFields", null);
__decorate([
    (0, common_1.Post)('fields'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "createField", null);
__decorate([
    (0, common_1.Patch)('fields/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "updateField", null);
__decorate([
    (0, common_1.Delete)('fields/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "deleteField", null);
__decorate([
    (0, common_1.Post)('fields/reorder'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "reorderFields", null);
__decorate([
    (0, common_1.Get)('crm-fields/:moduleId'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "getCrmFields", null);
__decorate([
    (0, common_1.Get)('crm-modules'),
    __param(0, CurrentPortalUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listCrmModules", null);
__decorate([
    (0, common_1.Get)('crm-modules/:moduleId/fields'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "getCrmModuleFields", null);
__decorate([
    (0, common_1.Get)('crm-modules/:moduleId/related'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "detectRelatedModules", null);
__decorate([
    (0, common_1.Get)('crm-modules/:moduleId/suggest-sections'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('moduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "suggestSections", null);
__decorate([
    (0, common_1.Post)('pages/:pageId/sections/from-module'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('pageId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "createSectionFromModule", null);
__decorate([
    (0, common_1.Patch)('pages/:pageId/primary-module'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('pageId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "setPagePrimaryModule", null);
__decorate([
    (0, common_1.Patch)('fields/:id/map-crm'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "mapFieldToCrm", null);
__decorate([
    (0, common_1.Patch)('fields/:id/unmap-crm'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "unmapField", null);
__decorate([
    (0, common_1.Post)('fields/:id/create-crm-field'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "createCrmField", null);
__decorate([
    (0, common_1.Get)('menu'),
    __param(0, CurrentPortalUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listMenu", null);
__decorate([
    (0, common_1.Post)('menu'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "addMenuItem", null);
__decorate([
    (0, common_1.Patch)('menu/reorder'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "reorderMenu", null);
__decorate([
    (0, common_1.Patch)('menu/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "updateMenuItem", null);
__decorate([
    (0, common_1.Delete)('menu/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "deleteMenuItem", null);
__decorate([
    (0, common_1.Get)('pages'),
    __param(0, CurrentPortalUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listPages", null);
__decorate([
    (0, common_1.Post)('pages'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "createPage", null);
__decorate([
    (0, common_1.Get)('pages/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "getPage", null);
__decorate([
    (0, common_1.Patch)('pages/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "updatePage", null);
__decorate([
    (0, common_1.Delete)('pages/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "deletePage", null);
__decorate([
    (0, common_1.Post)('pages/:id/duplicate'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "duplicatePage", null);
__decorate([
    (0, common_1.Patch)('pages/:id/publish'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "publishPage", null);
__decorate([
    (0, common_1.Post)('pages/:id/republish'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "republishPage", null);
__decorate([
    (0, common_1.Get)('templates'),
    __param(0, CurrentPortalUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listTemplates", null);
__decorate([
    (0, common_1.Post)('templates'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "saveTemplate", null);
__decorate([
    (0, common_1.Post)('templates/:id/apply'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "applyTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:id'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Get)('documents'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Query)('portalUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, CurrentPortalUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/admin'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "toggleAdmin", null);
__decorate([
    (0, common_1.Patch)('users/:id/role'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    __param(0, CurrentPortalUser()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PortalPadminController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, CurrentPortalUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PortalPadminController.prototype, "getStats", null);
exports.PortalPadminController = PortalPadminController = __decorate([
    (0, common_1.UseGuards)(portal_crm_admin_guard_1.PortalCrmAdminGuard),
    (0, common_1.Controller)('portal/padmin'),
    __metadata("design:paramtypes", [portal_field_service_1.PortalFieldService,
        portal_section_service_1.PortalSectionService,
        portal_document_service_1.PortalDocumentService,
        portal_service_1.PortalService,
        portal_builder_service_1.PortalBuilderService])
], PortalPadminController);
//# sourceMappingURL=portal-padmin.controller.js.map