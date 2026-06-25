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
exports.FormsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const workflows_service_1 = require("../workflows/workflows.service");
const google_sheets_service_1 = require("../calendar-sync/google-sheets.service");
const crypto_1 = require("crypto");
let FormsService = class FormsService {
    constructor(prisma, workflows, googleSheets) {
        this.prisma = prisma;
        this.workflows = workflows;
        this.googleSheets = googleSheets;
    }
    async findAll(orgId, userId, userRole) {
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        return this.prisma.form.findMany({
            where: {
                organizationId: orgId,
                isActive: true,
                ...(isAdmin ? {} : { createdById: userId }),
            },
            include: {
                module: { select: { id: true, name: true, slug: true, icon: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { fields: true, sections: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findOne(id, orgId) {
        const form = await this.prisma.form.findFirst({
            where: { id, organizationId: orgId, isActive: true },
            include: {
                module: { select: { id: true, name: true, slug: true, icon: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                sections: { orderBy: { order: 'asc' } },
                fields: {
                    orderBy: { order: 'asc' },
                    include: { section: true },
                },
                permissions: true,
            },
        });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return form;
    }
    async create(orgId, userId, data) {
        let slug = data.slug
            || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            || 'form';
        const slugExists = await this.prisma.form.findFirst({ where: { slug, organizationId: orgId, isActive: true } });
        if (slugExists)
            slug = `${slug}-${Date.now().toString(36)}`;
        const moduleId = data.moduleId || null;
        const folderId = data.folderId || null;
        return this.prisma.form.create({
            data: { ...data, moduleId, folderId, slug, organizationId: orgId, createdById: userId },
            include: {
                module: { select: { id: true, name: true, slug: true, icon: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
    async update(id, orgId, data) {
        const form = await this.prisma.form.findFirst({ where: { id, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.form.update({ where: { id }, data });
    }
    async remove(id, orgId) {
        const form = await this.prisma.form.findFirst({ where: { id, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.form.update({ where: { id }, data: { isActive: false } });
    }
    async addSection(formId, orgId, data) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        const maxOrder = await this.prisma.formSection.aggregate({ where: { formId }, _max: { order: true } });
        const order = (maxOrder._max.order ?? -1) + 1;
        return this.prisma.formSection.create({ data: { ...data, formId, order } });
    }
    async updateSection(formId, orgId, sectionId, data) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.formSection.update({ where: { id: sectionId }, data });
    }
    async removeSection(formId, orgId, sectionId) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        await this.prisma.formField.updateMany({ where: { formId, sectionId }, data: { sectionId: null } });
        return this.prisma.formSection.delete({ where: { id: sectionId } });
    }
    async addField(formId, orgId, data) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        const maxOrder = await this.prisma.formField.aggregate({ where: { formId }, _max: { order: true } });
        const order = (maxOrder._max.order ?? -1) + 1;
        return this.prisma.formField.create({ data: { ...data, formId, order } });
    }
    async updateField(formId, orgId, formFieldId, data) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.formField.update({ where: { id: formFieldId }, data });
    }
    async removeField(formId, orgId, formFieldId) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.formField.delete({ where: { id: formFieldId } });
    }
    async reorderFields(formId, orgId, formFieldIds) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        await Promise.all(formFieldIds.map((fId, index) => this.prisma.formField.update({ where: { id: fId }, data: { order: index } })));
        return { success: true };
    }
    async getPermissions(formId, orgId) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.formPermission.findMany({ where: { formId, organizationId: orgId } });
    }
    async setPermission(formId, orgId, data) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.formPermission.upsert({
            where: { formId_role_organizationId: { formId, role: data.role, organizationId: orgId } },
            create: { ...data, formId, organizationId: orgId },
            update: data,
        });
    }
    async getModuleFields(formId, orgId) {
        const form = await this.prisma.form.findFirst({
            where: { id: formId, organizationId: orgId },
            include: { fields: true },
        });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        if (!form.moduleId)
            return [];
        const usedFieldIds = form.fields.map(f => f.fieldId);
        return this.prisma.field.findMany({
            where: {
                moduleId: form.moduleId,
                isActive: true,
                id: { notIn: usedFieldIds },
            },
            include: { options: true },
            orderBy: { order: 'asc' },
        });
    }
    async generateToken(formId, orgId) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        const token = (0, crypto_1.randomBytes)(20).toString('hex');
        return this.prisma.form.update({ where: { id: formId }, data: { token, type: 'PUBLIC' } });
    }
    async revokeToken(formId, orgId) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.form.update({ where: { id: formId }, data: { token: null } });
    }
    async getPublicForm(token) {
        const form = await this.prisma.form.findFirst({
            where: { token, isActive: true },
            include: {
                module: { select: { id: true, name: true, slug: true, icon: true } },
                sections: { orderBy: { order: 'asc' } },
                fields: {
                    orderBy: { order: 'asc' },
                    include: { section: true },
                },
            },
        });
        if (!form)
            throw new common_1.NotFoundException('Form not found or no longer available');
        const settings = form.settings;
        if (settings.isEnabled === false)
            throw new common_1.BadRequestException('FORM_CLOSED');
        const now = new Date();
        if (settings.startDate && new Date(settings.startDate) > now) {
            throw new common_1.BadRequestException('FORM_NOT_STARTED');
        }
        if (settings.endDate && new Date(settings.endDate) < now) {
            throw new common_1.BadRequestException('FORM_EXPIRED');
        }
        if (settings.submissionLimit) {
            const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
            if (count >= settings.submissionLimit) {
                throw new common_1.BadRequestException('FORM_LIMIT_REACHED');
            }
        }
        if (form.moduleId) {
            const moduleFields = await this.prisma.field.findMany({
                where: { moduleId: form.moduleId, isActive: true },
                include: { options: true },
                orderBy: { order: 'asc' },
            });
            const fieldMap = Object.fromEntries(moduleFields.map(f => [f.id, f]));
            return {
                ...form,
                resolvedFields: form.fields.map(ff => ({
                    ...ff,
                    moduleField: fieldMap[ff.fieldId],
                })),
            };
        }
        return form;
    }
    async submitPublicForm(token, data, ipAddress, userAgent) {
        const form = await this.prisma.form.findFirst({ where: { token, isActive: true } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        const settings = form.settings;
        if (settings.isEnabled === false)
            throw new common_1.BadRequestException('FORM_CLOSED');
        const now = new Date();
        if (settings.startDate && new Date(settings.startDate) > now)
            throw new common_1.BadRequestException('FORM_NOT_STARTED');
        if (settings.endDate && new Date(settings.endDate) < now)
            throw new common_1.BadRequestException('FORM_EXPIRED');
        if (settings.submissionLimit) {
            const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
            if (count >= settings.submissionLimit)
                throw new common_1.BadRequestException('FORM_LIMIT_REACHED');
        }
        const submission = await this.prisma.formSubmission.create({
            data: { formId: form.id, data, ipAddress, userAgent },
        });
        if (form.moduleId && settings.postSubmit?.createRecord !== false) {
            try {
                const systemUser = await this.prisma.user.findFirst({
                    where: { organizationId: form.organizationId, role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
                    orderBy: { createdAt: 'asc' },
                    select: { id: true },
                });
                if (systemUser) {
                    const formFields = await this.prisma.formField.findMany({ where: { formId: form.id } });
                    const fieldIds = formFields.map(ff => ff.fieldId).filter(Boolean);
                    const moduleFields = await this.prisma.field.findMany({
                        where: { id: { in: fieldIds } },
                        select: { id: true, name: true },
                    });
                    const fieldNameMap = Object.fromEntries(moduleFields.map(f => [f.id, f.name]));
                    const recordData = {};
                    for (const ff of formFields) {
                        const fieldName = fieldNameMap[ff.fieldId];
                        if (!fieldName)
                            continue;
                        if (data[fieldName] !== undefined) {
                            recordData[fieldName] = data[fieldName];
                        }
                    }
                    const allModuleFields = await this.prisma.field.findMany({
                        where: { moduleId: form.moduleId, isActive: true, type: 'AUTO_NUMBER' },
                    });
                    for (const autoField of allModuleFields) {
                        if (!recordData[autoField.name]) {
                            recordData[autoField.name] = await this.generateAutoNumber(autoField, form.moduleId, form.organizationId);
                        }
                    }
                    const newRecord = await this.prisma.record.create({
                        data: {
                            moduleId: form.moduleId,
                            organizationId: form.organizationId,
                            createdById: systemUser.id,
                            data: recordData,
                        },
                    });
                    this.workflows
                        .executeForRecord('RECORD_CREATED', form.moduleId, form.organizationId, newRecord)
                        .catch(() => { });
                }
            }
            catch (err) {
                console.error('Failed to create module record from form submission:', err);
            }
        }
        const gsSettings = form.settings?.googleSheet;
        if (this.googleSheets && gsSettings?.syncEnabled && gsSettings?.spreadsheetId) {
            this.syncToGoogleSheets(form, gsSettings, data, submission.createdAt).catch(() => { });
        }
        return submission;
    }
    async syncToGoogleSheets(form, gsSettings, data, submittedAt) {
        const formFields = await this.prisma.formField.findMany({
            where: { formId: form.id },
            orderBy: { order: 'asc' },
        });
        const fieldIds = formFields.map(ff => ff.fieldId).filter(Boolean);
        const fields = await this.prisma.field.findMany({
            where: { id: { in: fieldIds } },
            select: { id: true, name: true, label: true },
        });
        const fieldMap = new Map(fields.map(f => [f.id, f]));
        const mappedFields = formFields.map(ff => {
            const field = fieldMap.get(ff.fieldId);
            return {
                label: ff.customLabel || field?.label || field?.name || ff.fieldId,
                name: field?.name || ff.fieldId,
            };
        });
        await this.googleSheets.appendSubmission(form.createdById, gsSettings.spreadsheetId, gsSettings.tabName || 'Form Responses', mappedFields, data, submittedAt);
    }
    async getSubmissions(formId, orgId) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        return this.prisma.formSubmission.findMany({
            where: { formId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getFolders(orgId, userId, userRole, deptId) {
        const all = await this.prisma.formFolder.findMany({
            where: { organizationId: orgId, isActive: true },
            include: { _count: { select: { forms: true } } },
            orderBy: { createdAt: 'desc' },
        });
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        return all.filter(f => {
            if (isAdmin || f.createdById === userId)
                return true;
            const users = f.sharedUsers;
            const depts = f.sharedDepts;
            const roles = f.sharedRoles;
            return (users.includes(userId) ||
                (deptId && depts.includes(deptId)) ||
                roles.includes(userRole));
        });
    }
    async createFolder(orgId, userId, data) {
        return this.prisma.formFolder.create({
            data: { ...data, organizationId: orgId, createdById: userId },
            include: { _count: { select: { forms: true } } },
        });
    }
    async updateFolder(id, orgId, userId, userRole, data) {
        const folder = await this.prisma.formFolder.findFirst({ where: { id, organizationId: orgId } });
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && folder.createdById !== userId)
            throw new common_1.ForbiddenException();
        return this.prisma.formFolder.update({
            where: { id },
            data,
            include: { _count: { select: { forms: true } } },
        });
    }
    async deleteFolder(id, orgId, userId, userRole) {
        const folder = await this.prisma.formFolder.findFirst({ where: { id, organizationId: orgId } });
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && folder.createdById !== userId)
            throw new common_1.ForbiddenException();
        await this.prisma.form.updateMany({ where: { folderId: id }, data: { folderId: null } });
        return this.prisma.formFolder.update({ where: { id }, data: { isActive: false } });
    }
    async getFolderForms(folderId, orgId) {
        return this.prisma.form.findMany({
            where: { folderId, organizationId: orgId, isActive: true },
            include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { submissions: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getSharedForms(orgId, userId, userRole, deptId) {
        const all = await this.prisma.form.findMany({
            where: { organizationId: orgId, isActive: true, NOT: { createdById: userId } },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { submissions: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (isAdmin)
            return all;
        return all.filter(f => {
            const su = f.sharedUsers || [];
            const sd = f.sharedDepts || [];
            const sr = f.sharedRoles || [];
            return (su.includes(userId) ||
                (deptId && sd.includes(deptId)) ||
                sr.includes(userRole));
        });
    }
    async getSharedFolders(orgId, userId, userRole, deptId) {
        const all = await this.prisma.formFolder.findMany({
            where: { organizationId: orgId, isActive: true, NOT: { createdById: userId } },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { forms: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (isAdmin)
            return all;
        return all.filter(f => {
            const su = f.sharedUsers || [];
            const sd = f.sharedDepts || [];
            const sr = f.sharedRoles || [];
            return (su.includes(userId) ||
                (deptId && sd.includes(deptId)) ||
                sr.includes(userRole));
        });
    }
    async updateFormSharing(formId, orgId, userId, userRole, data) {
        const form = await this.prisma.form.findFirst({ where: { id: formId, organizationId: orgId } });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && form.createdById !== userId)
            throw new common_1.ForbiddenException();
        const currentSettings = form.settings || {};
        const newSettings = {
            ...currentSettings,
            editableByUsers: data.editableByUsers ?? currentSettings.editableByUsers ?? [],
            editableByDepts: data.editableByDepts ?? currentSettings.editableByDepts ?? [],
            editableByRoles: data.editableByRoles ?? currentSettings.editableByRoles ?? [],
        };
        return this.prisma.form.update({
            where: { id: formId },
            data: {
                sharedUsers: data.sharedUsers !== undefined ? data.sharedUsers : form.sharedUsers,
                sharedDepts: data.sharedDepts !== undefined ? data.sharedDepts : form.sharedDepts,
                sharedRoles: data.sharedRoles !== undefined ? data.sharedRoles : form.sharedRoles,
                settings: newSettings,
            },
        });
    }
    async getFormSharing(formId, orgId) {
        const form = await this.prisma.form.findFirst({
            where: { id: formId, organizationId: orgId },
            select: { id: true, sharedUsers: true, sharedDepts: true, sharedRoles: true, settings: true, createdById: true },
        });
        if (!form)
            throw new common_1.NotFoundException('Form not found');
        const settings = form.settings || {};
        return {
            sharedUsers: form.sharedUsers || [],
            sharedDepts: form.sharedDepts || [],
            sharedRoles: form.sharedRoles || [],
            editableByUsers: settings.editableByUsers || [],
            editableByDepts: settings.editableByDepts || [],
            editableByRoles: settings.editableByRoles || [],
        };
    }
    async generateAutoNumber(field, moduleId, orgId) {
        const settings = field.settings || {};
        const prefix = settings.prefix || '';
        const suffix = settings.suffix || '';
        const startingNumber = settings.startingNumber ?? 1;
        const paddingLength = settings.paddingLength ?? 5;
        const count = await this.prisma.record.count({ where: { moduleId, organizationId: orgId } });
        const nextNum = count + startingNumber;
        const padded = String(nextNum).padStart(paddingLength, '0');
        return [prefix, padded, suffix].filter(Boolean).join('-');
    }
};
exports.FormsService = FormsService;
exports.FormsService = FormsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflows_service_1.WorkflowsService,
        google_sheets_service_1.GoogleSheetsService])
], FormsService);
//# sourceMappingURL=forms.service.js.map