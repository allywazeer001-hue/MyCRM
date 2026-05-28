import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_LEVEL_DEPTH = 15;

@Injectable()
export class GlobalListsService {
  private readonly logger = new Logger(GlobalListsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    try {
      return await this.prisma.globalList.findMany({
        where: { organizationId: orgId, isActive: true },
        include: { _count: { select: { items: true } } },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.logger.error('findAll error', err);
      return [];
    }
  }

  async findOne(id: string, orgId: string) {
    const list = await this.prisma.globalList.findFirst({
      where: { id, organizationId: orgId, isActive: true },
    });
    if (!list) throw new NotFoundException('Global list not found');
    return list;
  }

  async create(orgId: string, data: any) {
    const name: string = (data.name ?? '').toString().trim();
    if (!name) throw new BadRequestException('Name is required');
    let slug = data.slug?.toString().trim()
      || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      || `list-${Date.now()}`;
    // Resolve slug conflicts within the organization
    const conflict = await this.prisma.globalList.findFirst({ where: { slug, organizationId: orgId } });
    if (conflict) slug = `${slug}-${Date.now()}`;
    return this.prisma.globalList.create({
      data: {
        name,
        description: data.description ? String(data.description) : null,
        slug,
        organizationId: orgId,
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    // Only pass fields that belong to the schema
    const safe: any = {};
    if (data.name       !== undefined) safe.name            = String(data.name).trim();
    if (data.description !== undefined) safe.description    = data.description ? String(data.description) : null;
    if (data.levelDefinitions !== undefined) safe.levelDefinitions = data.levelDefinitions;
    if (data.isActive   !== undefined) safe.isActive        = Boolean(data.isActive);
    return this.prisma.globalList.update({ where: { id }, data: safe });
  }

  async remove(id: string, orgId: string) {
    const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    return this.prisma.globalList.update({ where: { id }, data: { isActive: false } });
  }

  // Items

  async getItems(listId: string, orgId: string, parentId?: string) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');

    // When no parentId is given, return root items (parentId = null)
    // When parentId is given, return children of that item
    const where: any = {
      listId,
      isActive: true,
      parentId: parentId && parentId !== 'null' && parentId !== 'undefined' ? parentId : null,
    };

    return this.prisma.globalListItem.findMany({
      where,
      include: { _count: { select: { children: true } } },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
  }

  async getItemTree(listId: string, orgId: string) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');

    try {
      const allItems = await this.prisma.globalListItem.findMany({
        where: { listId, isActive: true },
        orderBy: [{ level: 'asc' }, { order: 'asc' }, { label: 'asc' }],
      });
      return this.buildTree(allItems, null, new Set<string>());
    } catch (err) {
      this.logger.error(`getItemTree error for list ${listId}`, err);
      return [];
    }
  }

  // Cycle-safe recursive tree builder
  private buildTree(items: any[], parentId: string | null, visited: Set<string>): any[] {
    return items
      .filter(i => i.parentId === parentId && !visited.has(i.id))
      .map(i => {
        const childVisited = new Set(visited);
        childVisited.add(i.id);
        return { ...i, children: this.buildTree(items, i.id, childVisited) };
      });
  }

  async addItem(listId: string, orgId: string, data: any) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');

    // Normalize parentId — treat empty string, 'null', 'undefined' as null
    const parentId = data.parentId && data.parentId !== 'null' && data.parentId !== 'undefined'
      ? data.parentId
      : null;

    // Validate parent exists in same list
    if (parentId) {
      const parent = await this.prisma.globalListItem.findFirst({ where: { id: parentId, listId, isActive: true } });
      if (!parent) throw new NotFoundException('Parent item not found');
    }

    const level = parentId ? await this.getItemLevel(parentId, 0) + 1 : 0;

    const maxOrder = await this.prisma.globalListItem.aggregate({
      where: { listId, parentId: parentId ?? null },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;

    return this.prisma.globalListItem.create({
      data: { ...data, parentId, listId, level, order },
    });
  }

  private async getItemLevel(itemId: string, depth: number): Promise<number> {
    if (depth >= MAX_LEVEL_DEPTH) return depth;
    try {
      const item = await this.prisma.globalListItem.findUnique({ where: { id: itemId } });
      if (!item || !item.parentId) return depth;
      return this.getItemLevel(item.parentId, depth + 1);
    } catch {
      return depth;
    }
  }

  async updateItem(listId: string, orgId: string, itemId: string, data: any) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.globalListItem.update({ where: { id: itemId }, data });
  }

  async removeItem(listId: string, orgId: string, itemId: string) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new NotFoundException('Item not found');
    await this.softDeleteDescendants(itemId, new Set<string>());
    return this.prisma.globalListItem.update({ where: { id: itemId }, data: { isActive: false } });
  }

  private async softDeleteDescendants(parentId: string, visited: Set<string>) {
    if (visited.has(parentId)) return;
    visited.add(parentId);
    const children = await this.prisma.globalListItem.findMany({ where: { parentId, isActive: true } });
    for (const child of children) {
      await this.softDeleteDescendants(child.id, visited);
      await this.prisma.globalListItem.update({ where: { id: child.id }, data: { isActive: false } });
    }
  }

  async getItemChildren(listId: string, orgId: string, itemId: string) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    return this.prisma.globalListItem.findMany({
      where: { listId, parentId: itemId, isActive: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
  }
}
