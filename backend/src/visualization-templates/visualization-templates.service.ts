import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCheckService, ShareableResource } from '../permissions/permission-check.service';

/**
 * A Visualization Template is a reusable, self-contained dashboard "recipe" — its
 * layoutConfiguration holds full chart definitions (moduleId/groupByField/filterGroup/etc.
 * per widget, the same shape AnalyticsView.config already uses), not pointers into another
 * record. Instantiating a template creates a brand-new AnalyticsView + Dashboard through the
 * exact same shapes the existing analytics/dashboards code already produces — nothing about
 * how charts or dashboards normally render is touched by this feature.
 */
@Injectable()
export class VisualizationTemplatesService {
  constructor(
    private prisma: PrismaService,
    private perm: PermissionCheckService,
  ) {}

  private pickWritable(data: any) {
    const out: any = {};
    for (const key of ['name', 'description', 'moduleId', 'layoutConfiguration', 'isPublic', 'sharedRoles', 'sharedDepartments', 'sharedUsers']) {
      if (data[key] !== undefined) out[key] = data[key];
    }
    return out;
  }

  async findAll(userId: string, orgId: string) {
    const templates = await this.prisma.visualizationTemplate.findMany({
      where: { organizationId: orgId },
      include: { contexts: true },
      orderBy: { updatedAt: 'desc' },
    });
    const visible: any[] = [];
    for (const t of templates) {
      if (await this.perm.canViewResource(userId, orgId, t as unknown as ShareableResource)) {
        visible.push(t);
      }
    }
    return visible;
  }

  async findOne(id: string, userId: string, orgId: string) {
    const t = await this.prisma.visualizationTemplate.findFirst({
      where: { id, organizationId: orgId },
      include: { contexts: true },
    });
    if (!t) throw new NotFoundException('Template not found');
    const allowed = await this.perm.canViewResource(userId, orgId, t as unknown as ShareableResource);
    if (!allowed) throw new ForbiddenException('You do not have access to this template');
    return t;
  }

  async create(userId: string, orgId: string, data: any) {
    const writable = this.pickWritable(data);
    // contextField/contextDefaultValue are convenience top-level inputs from the builder UI —
    // stored as the template's single VisualizationContext row.
    const contextField: string | undefined = data.contextField;
    const contextDefaultValue: string | undefined = data.contextDefaultValue;

    return this.prisma.visualizationTemplate.create({
      data: {
        name: writable.name ?? 'Untitled Template',
        description: writable.description ?? null,
        moduleId: writable.moduleId ?? null,
        layoutConfiguration: writable.layoutConfiguration ?? {},
        isPublic: writable.isPublic ?? false,
        sharedRoles: writable.sharedRoles ?? [],
        sharedDepartments: writable.sharedDepartments ?? [],
        sharedUsers: writable.sharedUsers ?? [],
        organizationId: orgId,
        createdById: userId,
        contexts: contextField
          ? { create: [{ fieldName: contextField, defaultValue: contextDefaultValue ?? null }] }
          : undefined,
      },
      include: { contexts: true },
    });
  }

  async update(id: string, userId: string, orgId: string, data: any) {
    const t = await this.prisma.visualizationTemplate.findFirst({ where: { id, organizationId: orgId } });
    if (!t) throw new NotFoundException('Template not found');
    await this.perm.enforceCanEditResource(userId, orgId, t as unknown as ShareableResource);

    const writable = this.pickWritable(data);
    if (data.contextField !== undefined) {
      await this.prisma.visualizationContext.deleteMany({ where: { templateId: id } });
      if (data.contextField) {
        await this.prisma.visualizationContext.create({
          data: { templateId: id, fieldName: data.contextField, defaultValue: data.contextDefaultValue ?? null },
        });
      }
    }
    return this.prisma.visualizationTemplate.update({
      where: { id },
      data: writable,
      include: { contexts: true },
    });
  }

  async remove(id: string, userId: string, orgId: string) {
    const t = await this.prisma.visualizationTemplate.findFirst({ where: { id, organizationId: orgId } });
    if (!t) throw new NotFoundException('Template not found');
    await this.perm.enforceCanEditResource(userId, orgId, t as unknown as ShareableResource);
    await this.prisma.visualizationTemplate.delete({ where: { id } }); // cascades to contexts
    return { ok: true };
  }

  /** Creates a real AnalyticsView (and, unless `createDashboard` is false, a Dashboard
   *  wrapping it) from a template — using the exact record shapes the existing
   *  analytics/dashboards services already create by hand.
   *
   *  Widgets keep their ORIGINAL filterGroup untouched — the context value is never
   *  baked into a widget's own filter. Instead it's stored as `contextField`/`contextValue`
   *  on the created View's (and Dashboard's) `config`, the same live-filter shape the
   *  Dashboard page's "Filter" panel already reads. The actual chart renderer merges the
   *  CURRENT context value into each widget's filter fresh on every load (see
   *  analytics-widget.tsx's loadWidgetData/mergeContextFilter) — never mutating the
   *  widget's stored filter. This is what makes the value changeable later (switching
   *  camps, say) without ever conflicting with whatever was baked in at creation time. */
  async instantiate(
    id: string,
    userId: string,
    orgId: string,
    contextValue: string,
    dashboardName?: string,
    createDashboard = true,
  ) {
    const template = await this.findOne(id, userId, orgId);
    const layout = (template.layoutConfiguration as any) ?? {};
    const templateWidgets: any[] = Array.isArray(layout.widgets) ? layout.widgets : [];
    const contextFieldName: string | undefined = template.contexts?.[0]?.fieldName;

    const newWidgets = templateWidgets.map((w: any) => ({ ...w, id: randomUUID() }));

    const label = contextValue ? `${template.name} — ${contextValue}` : template.name;

    const view = await this.prisma.analyticsView.create({
      data: {
        name: label,
        config: { widgets: newWidgets, contextField: contextFieldName ?? null, contextValue: contextValue ?? null },
        organizationId: orgId,
        createdById: userId,
      },
    });

    if (!createDashboard) return { view };

    const dashboardWidgets = newWidgets.map((w: any) => ({
      id: randomUUID(),
      type: 'analytics_widget',
      title: w.title ?? '',
      x: w.x ?? 0,
      y: w.y ?? 0,
      w: w.w ?? 6,
      h: w.h ?? 4,
      config: { analyticsViewId: view.id, analyticsWidgetId: w.id },
    }));

    const dashboard = await this.prisma.dashboard.create({
      data: {
        name: dashboardName || label,
        config: {
          widgets: dashboardWidgets,
          // Kept live/changeable after creation — this is what lets the user later switch
          // the same dashboard to a different context value instead of only being able to
          // create a new one per value.
          contextField: contextFieldName ?? null,
          contextValue,
        },
        organizationId: orgId,
        createdById: userId,
      },
    });

    return dashboard;
  }
}
