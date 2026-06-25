import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
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

  async create(data: {
    name: string;
    slug: string;
    code?: string;
    description?: string;
    logo?: string;
    website?: string;
    phone?: string;
    address?: string;
  }) {
    const slugConflict = await this.prisma.organization.findFirst({ where: { slug: data.slug } });
    if (slugConflict) throw new ConflictException('Organization slug already in use');
    if (data.code) {
      const codeConflict = await this.prisma.organization.findFirst({ where: { code: data.code } });
      if (codeConflict) throw new ConflictException('Organization code already in use');
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
      } as any,
    });
  }

  async update(id: string, data: any) {
    const safe: any = {};
    if (data.name        !== undefined) safe.name        = String(data.name).trim();
    if (data.code        !== undefined) safe.code        = data.code ? String(data.code).trim().toUpperCase() : null;
    if (data.description !== undefined) safe.description = data.description || null;
    if (data.logo        !== undefined) safe.logo        = data.logo || null;
    if (data.website     !== undefined) safe.website     = data.website || null;
    if (data.phone       !== undefined) safe.phone       = data.phone || null;
    if (data.address     !== undefined) safe.address     = data.address || null;
    if (data.settings    !== undefined) safe.settings    = data.settings;
    return this.prisma.organization.update({ where: { id }, data: safe as any });
  }

  async suspend(id: string) {
    return this.prisma.organization.update({
      where: { id },
      data: { status: 'SUSPENDED', isActive: false } as any,
    });
  }

  async activate(id: string) {
    return this.prisma.organization.update({
      where: { id },
      data: { status: 'ACTIVE', isActive: true } as any,
    });
  }

  async deactivate(id: string) {
    return this.prisma.organization.update({
      where: { id },
      data: { status: 'INACTIVE', isActive: false } as any,
    });
  }

  /**
   * Permanently deletes an organization and ALL its data.
   * Executes in a single transaction with explicit ordered cleanup
   * to satisfy every FK constraint before the final delete.
   */
  async hardDelete(id: string, requestingUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    // Safety: prevent SUPER_ADMIN from nuking their own org (would delete themselves)
    const requester = await this.prisma.user.findFirst({ where: { id: requestingUserId } });
    if (requester?.organizationId === id) {
      throw new ForbiddenException('You cannot delete your own organization');
    }

    await this.prisma.$transaction(async (tx) => {
      // ── Break circular FKs between Department ↔ User ─────────────────────
      await tx.$executeRaw`UPDATE departments SET headUserId = NULL WHERE organizationId = ${id}`;
      await tx.$executeRaw`UPDATE users SET departmentId = NULL WHERE organizationId = ${id}`;

      // ── Grandchildren (no direct org FK — delete via JOIN) ────────────────
      await tx.$executeRaw`DELETE c FROM comments c INNER JOIN records r ON c.recordId = r.id WHERE r.organizationId = ${id}`;
      await tx.$executeRaw`DELETE dw FROM dashboard_widgets dw INNER JOIN dashboards d ON dw.dashboardId = d.id WHERE d.organizationId = ${id}`;
      await tx.$executeRaw`DELETE wa FROM workflow_actions wa INNER JOIN workflows w ON wa.workflowId = w.id WHERE w.organizationId = ${id}`;
      await tx.$executeRaw`DELETE we FROM workflow_executions we INNER JOIN workflows w ON we.workflowId = w.id WHERE w.organizationId = ${id}`;
      await tx.$executeRaw`DELETE fo FROM field_options fo INNER JOIN fields f ON fo.fieldId = f.id INNER JOIN dynamic_modules dm ON f.moduleId = dm.id WHERE dm.organizationId = ${id}`;
      await tx.$executeRaw`DELETE f2 FROM fields f2 INNER JOIN dynamic_modules dm ON f2.moduleId = dm.id WHERE dm.organizationId = ${id}`;
      await tx.$executeRaw`DELETE fsub FROM form_submissions fsub INNER JOIN forms frm ON fsub.formId = frm.id WHERE frm.organizationId = ${id}`;
      await tx.$executeRaw`DELETE ff FROM form_fields ff INNER JOIN forms frm ON ff.formId = frm.id WHERE frm.organizationId = ${id}`;
      await tx.$executeRaw`DELETE fsec FROM form_sections fsec INNER JOIN forms frm ON fsec.formId = frm.id WHERE frm.organizationId = ${id}`;
      await tx.$executeRaw`DELETE gli FROM global_list_items gli INNER JOIN global_lists gl ON gli.listId = gl.id WHERE gl.organizationId = ${id}`;
      await tx.$executeRaw`DELETE pn FROM portal_notifications pn INNER JOIN portal_users pu ON pn.portalUserId = pu.id WHERE pu.organizationId = ${id}`;
      await tx.$executeRaw`DELETE pfm FROM portal_field_mappings pfm INNER JOIN portal_module_configs pmc ON pfm.portalModuleConfigId = pmc.id WHERE pmc.organizationId = ${id}`;
      await tx.$executeRaw`DELETE cp FROM conversation_participants cp INNER JOIN conversations c ON cp.conversationId = c.id WHERE c.organizationId = ${id}`;
      await tx.$executeRaw`DELETE dm FROM direct_messages dm WHERE dm.organizationId = ${id}`;
      await tx.$executeRaw`DELETE up FROM user_preferences up INNER JOIN users u ON up.userId = u.id WHERE u.organizationId = ${id}`;

      // ── Process models (must delete children before parents) ──────────────
      // ProcessTask and ProcessTimeline have cascade from ProcessInstance,
      // but ProcessTask.stageId → ProcessStage blocks ProcessStage deletion.
      // Delete instances first so cascade handles ProcessTask/Timeline,
      // then processBlueprint.deleteMany cascades to ProcessStage.
      const piIds = (await tx.processInstance.findMany({
        where: { organizationId: id }, select: { id: true },
      })).map(p => p.id);
      if (piIds.length > 0) {
        await tx.processTimeline.deleteMany({ where: { instanceId: { in: piIds } } });
        await tx.processTask.deleteMany({ where: { instanceId: { in: piIds } } });
        await tx.processInstance.deleteMany({ where: { organizationId: id } });
      }

      // ── Direct org children (ordered by FK dependencies) ──────────────────
      await tx.workspaceNote.deleteMany({ where: { organizationId: id } });
      await tx.workspaceTask.deleteMany({ where: { organizationId: id } });
      await tx.savedReport.deleteMany({ where: { organizationId: id } });
      await tx.conversation.deleteMany({ where: { organizationId: id } });
      // processBlueprint cascades to ProcessStage (ProcessTask already gone)
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
      // Portal (documents before users; fieldMappings before moduleConfigs)
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
      // Content tables that reference DynamicModule — before dynamicModule
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

  async getStats(orgId: string) {
    const [users, modules, records, forms, workflows, blueprints, portalUsers, globalLists, departments] =
      await Promise.all([
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
}
