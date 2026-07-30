import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_LEVEL_DEPTH = 15;

@Injectable()
export class GlobalListsService {
  private readonly logger = new Logger(GlobalListsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    try {
      // Ensure the default Locations list exists so it's visible the first
      // time an org opens Global Lists, without needing some unrelated page
      // to trigger it first (unlike the older staff-roles lazy-create).
      await this.ensureLocationsList(orgId).catch(() => {});

      // Include org's own lists + all published lists from other orgs
      const [own, published] = await Promise.all([
        this.prisma.globalList.findMany({
          where: { organizationId: orgId, isActive: true },
          include: {
            _count: { select: { items: true } },
            linkedParentList: { select: { id: true, name: true } },
            linkedChildLists: { select: { id: true, name: true } },
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.globalList.findMany({
          where: { isPublished: true, isActive: true, organizationId: { not: orgId } },
          include: {
            _count: { select: { items: true } },
            linkedParentList: { select: { id: true, name: true } },
            linkedChildLists: { select: { id: true, name: true } },
            organization: { select: { name: true } },
          },
          orderBy: { name: 'asc' },
        }),
      ]);
      return [
        ...own.map(l => ({ ...l, isOwn: true })),
        ...published.map(l => ({ ...l, isOwn: false })),
      ];
    } catch (err) {
      this.logger.error('findAll error', err);
      return [];
    }
  }

  async findOne(id: string, orgId: string) {
    const list = await this.prisma.globalList.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ organizationId: orgId }, { isPublished: true }],
      },
      include: {
        linkedParentList: { select: { id: true, name: true, slug: true } },
        linkedChildLists: { select: { id: true, name: true, slug: true } },
      },
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

    let attempt = 0;
    while (attempt < 5) {
      const conflict = await this.prisma.globalList.findFirst({ where: { slug, organizationId: orgId } });
      if (!conflict) break;
      slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}-${attempt}`;
      attempt++;
    }

    try {
      return await this.prisma.globalList.create({
        data: {
          name,
          description: data.description ? String(data.description) : null,
          slug,
          organizationId: orgId,
          linkedParentListId: data.linkedParentListId || null,
        },
      });
    } catch (e: any) {
      this.logger.error('GlobalList create failed', e?.message, e?.code);
      throw new InternalServerErrorException(`Could not create list: ${e?.message || 'database error'}`);
    }
  }

  async update(id: string, orgId: string, data: any) {
    const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    const safe: any = {};
    if (data.name              !== undefined) safe.name              = String(data.name).trim();
    if (data.description       !== undefined) safe.description       = data.description ? String(data.description) : null;
    if (data.levelDefinitions  !== undefined) safe.levelDefinitions  = data.levelDefinitions;
    if (data.isActive          !== undefined) safe.isActive          = Boolean(data.isActive);
    if (data.isPublished       !== undefined) safe.isPublished       = Boolean(data.isPublished);
    if ('linkedParentListId' in data)         safe.linkedParentListId = data.linkedParentListId || null;
    return this.prisma.globalList.update({ where: { id }, data: safe });
  }

  async remove(id: string, orgId: string) {
    const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    return this.prisma.globalList.update({ where: { id }, data: { isActive: false } });
  }

  // ── Cross-List Relationship ───────────────────────────────────────────────

  /** Link this list's items as children of items in another list. */
  async setLinkedParentList(id: string, orgId: string, parentListId: string | null) {
    const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    if (parentListId && parentListId === id) throw new BadRequestException('A list cannot be its own parent');
    return this.prisma.globalList.update({ where: { id }, data: { linkedParentListId: parentListId } });
  }

  /** Get items of childListId that are linked to a specific parent item. */
  async getItemsByLinkedParent(listId: string, orgId: string, linkedParentItemId: string) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');
    return this.prisma.globalListItem.findMany({
      where: { listId, linkedParentItemId, isActive: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
  }

  // ── Published Lists ───────────────────────────────────────────────────────

  async getPublishedLists() {
    return this.prisma.globalList.findMany({
      where: { isPublished: true, isActive: true },
      include: {
        _count: { select: { items: true } },
        organization: { select: { name: true } },
        linkedParentList: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── Items (all existing methods preserved) ────────────────────────────────

  async getItems(listId: string, orgId: string, parentId?: string, search?: string) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');

    const where: any = { listId, isActive: true };
    if (search && search.trim()) {
      where.label = { contains: search.trim() };
    } else {
      where.parentId = parentId && parentId !== 'null' && parentId !== 'undefined' ? parentId : null;
    }

    return this.prisma.globalListItem.findMany({
      where,
      include: { _count: { select: { children: true } } },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
      take: search ? 50 : undefined,
    });
  }

  async getItemTree(listId: string, orgId: string) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');

    try {
      const allItems = await this.prisma.globalListItem.findMany({
        where: { listId, isActive: true },
        include: { childList: { select: { id: true, name: true } } },
        orderBy: [{ level: 'asc' }, { order: 'asc' }, { label: 'asc' }],
      });
      return this.buildTree(allItems, null, new Set<string>());
    } catch (err) {
      this.logger.error(`getItemTree error for list ${listId}`, err);
      return [];
    }
  }

  /** Link or unlink a child list from a specific item */
  async linkItemChildList(listId: string, orgId: string, itemId: string, childListId: string | null) {
    const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
    if (!list) throw new NotFoundException('Global list not found');
    const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new NotFoundException('Item not found');
    if (childListId) {
      const childList = await this.prisma.globalList.findFirst({
        where: { id: childListId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
      });
      if (!childList) throw new NotFoundException('Child list not found');
    }
    return this.prisma.globalListItem.update({ where: { id: itemId }, data: { childListId: childListId || null } });
  }

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
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');

    const parentId = data.parentId && data.parentId !== 'null' && data.parentId !== 'undefined'
      ? data.parentId : null;

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
      data: {
        ...data,
        parentId,
        linkedParentItemId: data.linkedParentItemId || null,
        listId,
        level,
        order,
      },
    });
  }

  private async getItemLevel(itemId: string, depth: number): Promise<number> {
    if (depth >= MAX_LEVEL_DEPTH) return depth;
    try {
      const item = await this.prisma.globalListItem.findUnique({ where: { id: itemId } });
      if (!item || !item.parentId) return depth;
      return this.getItemLevel(item.parentId, depth + 1);
    } catch { return depth; }
  }

  async updateItem(listId: string, orgId: string, itemId: string, data: any) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
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

  async getItem(listId: string, orgId: string, itemId: string) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');
    const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async getItemChildren(listId: string, orgId: string, itemId: string) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');
    return this.prisma.globalListItem.findMany({
      where: { listId, parentId: itemId, isActive: true },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
  }

  async getItemAncestors(listId: string, orgId: string, itemId: string): Promise<string[]> {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('Global list not found');
    const path: string[] = [];
    let currentId: string | null = itemId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      path.unshift(currentId);
      const item = await this.prisma.globalListItem.findFirst({ where: { id: currentId, listId } });
      if (!item) break;
      currentId = item.parentId;
    }
    return path;
  }

  async bulkCreateItems(orgId: string, listId: string, items: Array<{ label: string; parentId?: string | null; linkedParentItemId?: string | null; value?: string; order?: number }>) {
    const list = await this.prisma.globalList.findFirst({
      where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
    });
    if (!list) throw new NotFoundException('List not found');

    const created = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const value = item.value || item.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const result = await this.prisma.globalListItem.create({
        data: {
          listId,
          parentId: item.parentId || null,
          linkedParentItemId: item.linkedParentItemId || null,
          label: item.label.trim(),
          value,
          order: item.order ?? i,
          isActive: true,
        },
      });
      created.push(result);
    }
    return { created: created.length, items: created };
  }

  // ── Staff Roles (Team Roles via Global List) ──────────────────────────────

  private readonly DEFAULT_STAFF_ROLES = [
    { label: 'Finance Officer',         value: 'finance_officer' },
    { label: 'Education Officer',       value: 'education_officer' },
    { label: 'HR Director',             value: 'hr_director' },
    { label: 'Teller',                  value: 'teller' },
    { label: 'Teacher',                 value: 'teacher' },
    { label: 'Operations Manager',      value: 'operations_manager' },
    { label: 'IT Officer',              value: 'it_officer' },
    { label: 'Marketing Officer',       value: 'marketing_officer' },
    { label: 'Customer Service',        value: 'customer_service' },
    { label: 'Legal Officer',           value: 'legal_officer' },
    { label: 'Procurement Officer',     value: 'procurement_officer' },
    { label: 'Field Officer',           value: 'field_officer' },
    { label: 'Programme Manager',       value: 'programme_manager' },
    { label: 'Communications Officer',  value: 'communications_officer' },
    { label: 'M&E Officer',             value: 'me_officer' },
    { label: 'Admin Officer',           value: 'admin_officer' },
  ];

  async ensureStaffRolesList(orgId: string) {
    let list = await this.prisma.globalList.findFirst({
      where: { organizationId: orgId, slug: 'staff-roles', isActive: true },
      include: { items: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });

    if (!list) {
      list = await this.prisma.globalList.create({
        data: {
          name: 'Staff Roles',
          slug: 'staff-roles',
          description: 'Team roles and job positions for staff members.',
          organizationId: orgId,
          isActive: true,
          isPublished: false,
          levelDefinitions: [],
          items: {
            create: this.DEFAULT_STAFF_ROLES.map((r, i) => ({
              label: r.label,
              value: r.value,
              level: 0,
              order: i,
              isActive: true,
              metadata: {},
            })),
          },
        },
        include: { items: { where: { isActive: true }, orderBy: { order: 'asc' } } },
      });
    } else if (!Array.isArray(list.levelDefinitions)) {
      // Heal records created before the JSON.stringify bug was fixed
      await this.prisma.globalList.update({
        where: { id: list.id },
        data: { levelDefinitions: [] },
      });
      (list as any).levelDefinitions = [];
    }

    return list;
  }

  // ── Locations: Countries / Regions / Wards ────────────────────────────────
  // Countries is a plain, ordinary list (extensible — more countries can be
  // added later). Regions is its own separate list, but it doesn't extend
  // from Countries as a whole — it extends specifically from the Tanzania
  // ITEM, using the per-item "link child list" feature (childListId on
  // GlobalListItem, the same "Link existing list" action available on any
  // item in the admin UI): the Tanzania item's childListId points at the
  // Regions list. Expanding Tanzania in the admin tree jumps straight into
  // Regions. Wards is left unattached and empty for now — there's no
  // verified authoritative source here for Tanzania's ~4,000+ real ward
  // names, and fabricating official administrative data would be worse
  // than leaving it for admins (or a future real dataset) to populate and
  // link from each region individually once that data exists.

  private readonly DEFAULT_COUNTRIES = [
    { label: 'Tanzania', value: 'tanzania' },
  ];

  private readonly DEFAULT_TANZANIA_REGIONS = [
    'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi',
    'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro',
    'Mtwara', 'Mwanza', 'Njombe', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga',
    'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga',
    'Kaskazini Unguja', 'Kusini Unguja', 'Mjini Magharibi', 'Kaskazini Pemba', 'Kusini Pemba',
  ].map(name => ({ label: name, value: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') }));

  private async ensureList(orgId: string, slug: string, name: string, description: string, levelLabel: string) {
    let list = await this.prisma.globalList.findFirst({ where: { organizationId: orgId, slug, isActive: true } });
    if (!list) {
      list = await this.prisma.globalList.create({
        data: {
          name,
          slug,
          description,
          organizationId: orgId,
          isActive: true,
          isPublished: false,
          levelDefinitions: [{ level: 0, label: levelLabel, key: levelLabel.toLowerCase(), displayName: levelLabel }],
        },
      });
    }
    return list;
  }

  async ensureLocationsList(orgId: string) {
    const countries = await this.ensureList(orgId, 'countries', 'Countries', 'Countries available for address and location fields.', 'Country');

    let countryItems = await this.prisma.globalListItem.findMany({ where: { listId: countries.id, isActive: true }, orderBy: { order: 'asc' } });
    if (countryItems.length === 0) {
      for (let i = 0; i < this.DEFAULT_COUNTRIES.length; i++) {
        await this.prisma.globalListItem.create({
          data: { listId: countries.id, label: this.DEFAULT_COUNTRIES[i].label, value: this.DEFAULT_COUNTRIES[i].value, level: 0, order: i, isActive: true, metadata: {} },
        });
      }
      countryItems = await this.prisma.globalListItem.findMany({ where: { listId: countries.id, isActive: true }, orderBy: { order: 'asc' } });
    }
    let tanzania = countryItems.find(i => i.value === 'tanzania');

    const regions = await this.ensureList(orgId, 'regions', 'Regions', 'Tanzania\'s regions — extends from the Tanzania item in Countries.', 'Region');

    const existingRegions = await this.prisma.globalListItem.count({ where: { listId: regions.id, isActive: true } });
    if (existingRegions === 0) {
      for (let i = 0; i < this.DEFAULT_TANZANIA_REGIONS.length; i++) {
        await this.prisma.globalListItem.create({
          data: {
            listId: regions.id,
            label: this.DEFAULT_TANZANIA_REGIONS[i].label,
            value: this.DEFAULT_TANZANIA_REGIONS[i].value,
            level: 0,
            order: i,
            isActive: true,
            metadata: {},
          },
        });
      }
    }

    // Tanzania's item extends into Regions via the per-item child-list link.
    if (tanzania && tanzania.childListId !== regions.id) {
      await this.prisma.globalListItem.update({ where: { id: tanzania.id }, data: { childListId: regions.id } });
    }

    await this.ensureList(orgId, 'wards', 'Wards', 'Wards — link from a region once real ward data is available.', 'Ward');

    return this.prisma.globalList.findMany({
      where: { organizationId: orgId, slug: { in: ['countries', 'regions', 'wards'] } },
      include: { items: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
  }
}
