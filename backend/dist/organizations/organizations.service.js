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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OrganizationsService = class OrganizationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(id) {
        return this.prisma.organization.findUnique({ where: { id } });
    }
    async findAll() {
        return this.prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        users: true,
                        modules: true,
                        records: true,
                        forms: true,
                        workflows: true,
                        blueprints: true,
                        portalUsers: true,
                    },
                },
            },
        });
    }
    async create(data) {
        const slugConflict = await this.prisma.organization.findFirst({ where: { slug: data.slug } });
        if (slugConflict)
            throw new common_1.ConflictException('Organization slug already in use');
        if (data.code) {
            const codeConflict = await this.prisma.organization.findFirst({ where: { code: data.code } });
            if (codeConflict)
                throw new common_1.ConflictException('Organization code already in use');
        }
        return this.prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                code: data.code || null,
                description: data.description || null,
                logo: data.logo || null,
                website: data.website || null,
                phone: data.phone || null,
                address: data.address || null,
                status: 'ACTIVE',
                isActive: true,
            },
        });
    }
    async update(id, data) {
        const safe = {};
        if (data.name !== undefined)
            safe.name = String(data.name).trim();
        if (data.code !== undefined)
            safe.code = data.code ? String(data.code).trim().toUpperCase() : null;
        if (data.description !== undefined)
            safe.description = data.description || null;
        if (data.logo !== undefined)
            safe.logo = data.logo || null;
        if (data.website !== undefined)
            safe.website = data.website || null;
        if (data.phone !== undefined)
            safe.phone = data.phone || null;
        if (data.address !== undefined)
            safe.address = data.address || null;
        if (data.settings !== undefined)
            safe.settings = data.settings;
        return this.prisma.organization.update({ where: { id }, data: safe });
    }
    async suspend(id) {
        return this.prisma.organization.update({
            where: { id },
            data: { status: 'SUSPENDED', isActive: false },
        });
    }
    async activate(id) {
        return this.prisma.organization.update({
            where: { id },
            data: { status: 'ACTIVE', isActive: true },
        });
    }
    async deactivate(id) {
        return this.prisma.organization.update({
            where: { id },
            data: { status: 'INACTIVE', isActive: false },
        });
    }
    async hardDelete(id, requestingUserId) {
        const org = await this.prisma.organization.findUnique({ where: { id } });
        if (!org)
            throw new common_1.NotFoundException('Organization not found');
        const requester = await this.prisma.user.findFirst({ where: { id: requestingUserId } });
        if (requester?.organizationId === id) {
            throw new common_1.ForbiddenException('You cannot delete your own organization');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `UPDATE departments SET headUserId = NULL WHERE organizationId = ${id}`;
            await tx.$executeRaw `UPDATE users SET departmentId = NULL WHERE organizationId = ${id}`;
            await tx.$executeRaw `DELETE c FROM comments c INNER JOIN records r ON c.recordId = r.id WHERE r.organizationId = ${id}`;
            await tx.$executeRaw `DELETE dw FROM dashboard_widgets dw INNER JOIN dashboards d ON dw.dashboardId = d.id WHERE d.organizationId = ${id}`;
            await tx.$executeRaw `DELETE wa FROM workflow_actions wa INNER JOIN workflows w ON wa.workflowId = w.id WHERE w.organizationId = ${id}`;
            await tx.$executeRaw `DELETE we FROM workflow_executions we INNER JOIN workflows w ON we.workflowId = w.id WHERE w.organizationId = ${id}`;
            await tx.$executeRaw `DELETE fo FROM field_options fo INNER JOIN fields f ON fo.fieldId = f.id INNER JOIN dynamic_modules dm ON f.moduleId = dm.id WHERE dm.organizationId = ${id}`;
            await tx.$executeRaw `DELETE f2 FROM fields f2 INNER JOIN dynamic_modules dm ON f2.moduleId = dm.id WHERE dm.organizationId = ${id}`;
            await tx.$executeRaw `DELETE fsub FROM form_submissions fsub INNER JOIN forms frm ON fsub.formId = frm.id WHERE frm.organizationId = ${id}`;
            await tx.$executeRaw `DELETE ff FROM form_fields ff INNER JOIN forms frm ON ff.formId = frm.id WHERE frm.organizationId = ${id}`;
            await tx.$executeRaw `DELETE fsec FROM form_sections fsec INNER JOIN forms frm ON fsec.formId = frm.id WHERE frm.organizationId = ${id}`;
            await tx.$executeRaw `DELETE gli FROM global_list_items gli INNER JOIN global_lists gl ON gli.listId = gl.id WHERE gl.organizationId = ${id}`;
            await tx.$executeRaw `DELETE pn FROM portal_notifications pn INNER JOIN portal_users pu ON pn.portalUserId = pu.id WHERE pu.organizationId = ${id}`;
            await tx.$executeRaw `DELETE pfm FROM portal_field_mappings pfm INNER JOIN portal_module_configs pmc ON pfm.portalModuleConfigId = pmc.id WHERE pmc.organizationId = ${id}`;
            await tx.$executeRaw `DELETE cp FROM conversation_participants cp INNER JOIN conversations c ON cp.conversationId = c.id WHERE c.organizationId = ${id}`;
            await tx.$executeRaw `DELETE dm FROM direct_messages dm WHERE dm.organizationId = ${id}`;
            await tx.$executeRaw `DELETE up FROM user_preferences up INNER JOIN users u ON up.userId = u.id WHERE u.organizationId = ${id}`;
            const piIds = (await tx.processInstance.findMany({
                where: { organizationId: id }, select: { id: true },
            })).map(p => p.id);
            if (piIds.length > 0) {
                await tx.processTimeline.deleteMany({ where: { instanceId: { in: piIds } } });
                await tx.processTask.deleteMany({ where: { instanceId: { in: piIds } } });
                await tx.processInstance.deleteMany({ where: { organizationId: id } });
            }
            await tx.workspaceNote.deleteMany({ where: { organizationId: id } });
            await tx.workspaceTask.deleteMany({ where: { organizationId: id } });
            await tx.savedReport.deleteMany({ where: { organizationId: id } });
            await tx.conversation.deleteMany({ where: { organizationId: id } });
            await tx.processBlueprint.deleteMany({ where: { organizationId: id } });
            await tx.blueprintTask.deleteMany({ where: { organizationId: id } });
            await tx.blueprint.deleteMany({ where: { organizationId: id } });
            await tx.analyticsTarget.deleteMany({ where: { organizationId: id } });
            await tx.analyticsView.deleteMany({ where: { organizationId: id } });
            await tx.savedFilter.deleteMany({ where: { organizationId: id } });
            await tx.globalList.deleteMany({ where: { organizationId: id } });
            await tx.permission.deleteMany({ where: { organizationId: id } });
            await tx.auditLog.deleteMany({ where: { organizationId: id } });
            await tx.notification.deleteMany({ where: { organizationId: id } });
            await tx.userPermissionOverride.deleteMany({ where: { organizationId: id } });
            await tx.portalDocument.deleteMany({ where: { organizationId: id } });
            await tx.portalSection.deleteMany({ where: { organizationId: id } });
            await tx.portalField.deleteMany({ where: { organizationId: id } });
            await tx.portalPage.deleteMany({ where: { organizationId: id } });
            await tx.portalMenuItem.deleteMany({ where: { organizationId: id } });
            await tx.portalModuleConfig.deleteMany({ where: { organizationId: id } });
            await tx.portalSettings.deleteMany({ where: { organizationId: id } });
            await tx.portalAnnouncement.deleteMany({ where: { organizationId: id } });
            await tx.portalTemplate.deleteMany({ where: { organizationId: id } });
            await tx.portalUser.deleteMany({ where: { organizationId: id } });
            await tx.formPermission.deleteMany({ where: { organizationId: id } });
            await tx.form.deleteMany({ where: { organizationId: id } });
            await tx.record.deleteMany({ where: { organizationId: id } });
            await tx.file.deleteMany({ where: { organizationId: id } });
            await tx.view.deleteMany({ where: { organizationId: id } });
            await tx.dashboard.deleteMany({ where: { organizationId: id } });
            await tx.workflow.deleteMany({ where: { organizationId: id } });
            await tx.relationship.deleteMany({ where: { organizationId: id } });
            await tx.taskPanel.deleteMany({ where: { organizationId: id } });
            await tx.dynamicModule.deleteMany({ where: { organizationId: id } });
            await tx.department.deleteMany({ where: { organizationId: id } });
            await tx.user.deleteMany({ where: { organizationId: id } });
        }, { timeout: 60000 });
        return this.prisma.organization.delete({ where: { id } });
    }
    async getStats(orgId) {
        const [users, modules, records, forms, workflows, blueprints, portalUsers, globalLists, departments] = await Promise.all([
            this.prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
            this.prisma.dynamicModule.count({ where: { organizationId: orgId } }),
            this.prisma.record.count({ where: { organizationId: orgId } }),
            this.prisma.form.count({ where: { organizationId: orgId } }),
            this.prisma.workflow.count({ where: { organizationId: orgId } }),
            this.prisma.blueprint.count({ where: { organizationId: orgId } }),
            this.prisma.portalUser.count({ where: { organizationId: orgId } }),
            this.prisma.globalList.count({ where: { organizationId: orgId } }),
            this.prisma.department.count({ where: { organizationId: orgId } }),
        ]);
        return { users, modules, records, forms, workflows, blueprints, portalUsers, globalLists, departments };
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map