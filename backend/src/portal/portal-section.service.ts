import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalSectionService {
  constructor(private prisma: PrismaService) {}

  async listSections(orgId: string, moduleConfigId?: string, pageId?: string) {
    const where: any = { organizationId: orgId };
    if (moduleConfigId) where.portalModuleConfigId = moduleConfigId;
    if (pageId) where.portalPageId = pageId;
    return this.prisma.portalSection.findMany({
      where,
      include: {
        fields: {
          where: { status: 'ACTIVE' },
          orderBy: { order: 'asc' },
          select: { id: true, label: true, fieldKey: true, fieldType: true, isVisible: true },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createSection(orgId: string, dto: {
    portalModuleConfigId?: string; label: string; type?: string; icon?: string;
    order?: number; columnIndex?: number; isCollapsible?: boolean;
    isVisible?: boolean; isAdminOnly?: boolean;
  }) {
    return this.prisma.portalSection.create({
      data: {
        organizationId: orgId,
        portalModuleConfigId: (dto as any).portalModuleConfigId ?? null,
        portalPageId: (dto as any).portalPageId ?? null,
        label: dto.label,
        type: dto.type ?? 'section',
        icon: dto.icon ?? null,
        order: dto.order ?? 0,
        columnIndex: dto.columnIndex ?? 0,
        isCollapsible: dto.isCollapsible ?? false,
        isVisible: dto.isVisible ?? true,
        isAdminOnly: dto.isAdminOnly ?? false,
        status: 'PUBLISHED',
      },
    });
  }

  async updateSection(orgId: string, sectionId: string, dto: Partial<{
    label: string; type: string; icon: string | null; order: number;
    columnIndex: number; isCollapsible: boolean; isVisible: boolean;
    isAdminOnly: boolean; status: string;
  }>) {
    const section = await this.prisma.portalSection.findFirst({ where: { id: sectionId, organizationId: orgId } });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.portalSection.update({ where: { id: sectionId }, data: dto as any });
  }

  async deleteSection(orgId: string, sectionId: string) {
    const section = await this.prisma.portalSection.findFirst({ where: { id: sectionId, organizationId: orgId } });
    if (!section) throw new NotFoundException('Section not found');
    // Unlink fields from this section
    await this.prisma.portalField.updateMany({
      where: { sectionId, organizationId: orgId },
      data: { sectionId: null },
    });
    await this.prisma.portalSection.delete({ where: { id: sectionId } });
    return { success: true };
  }

  async reorderSections(orgId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.portalSection.updateMany({ where: { id, organizationId: orgId }, data: { order: index } })
      )
    );
    return { success: true };
  }
}
