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
var GlobalListsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalListsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_LEVEL_DEPTH = 15;
let GlobalListsService = GlobalListsService_1 = class GlobalListsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GlobalListsService_1.name);
    }
    async findAll(orgId) {
        try {
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
        }
        catch (err) {
            this.logger.error('findAll error', err);
            return [];
        }
    }
    async findOne(id, orgId) {
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
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        return list;
    }
    async create(orgId, data) {
        const name = (data.name ?? '').toString().trim();
        if (!name)
            throw new common_1.BadRequestException('Name is required');
        let slug = data.slug?.toString().trim()
            || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            || `list-${Date.now()}`;
        let attempt = 0;
        while (attempt < 5) {
            const conflict = await this.prisma.globalList.findFirst({ where: { slug, organizationId: orgId } });
            if (!conflict)
                break;
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
        }
        catch (e) {
            this.logger.error('GlobalList create failed', e?.message, e?.code);
            throw new common_1.InternalServerErrorException(`Could not create list: ${e?.message || 'database error'}`);
        }
    }
    async update(id, orgId, data) {
        const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const safe = {};
        if (data.name !== undefined)
            safe.name = String(data.name).trim();
        if (data.description !== undefined)
            safe.description = data.description ? String(data.description) : null;
        if (data.levelDefinitions !== undefined)
            safe.levelDefinitions = data.levelDefinitions;
        if (data.isActive !== undefined)
            safe.isActive = Boolean(data.isActive);
        if (data.isPublished !== undefined)
            safe.isPublished = Boolean(data.isPublished);
        if ('linkedParentListId' in data)
            safe.linkedParentListId = data.linkedParentListId || null;
        return this.prisma.globalList.update({ where: { id }, data: safe });
    }
    async remove(id, orgId) {
        const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        return this.prisma.globalList.update({ where: { id }, data: { isActive: false } });
    }
    async setLinkedParentList(id, orgId, parentListId) {
        const list = await this.prisma.globalList.findFirst({ where: { id, organizationId: orgId } });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        if (parentListId && parentListId === id)
            throw new common_1.BadRequestException('A list cannot be its own parent');
        return this.prisma.globalList.update({ where: { id }, data: { linkedParentListId: parentListId } });
    }
    async getItemsByLinkedParent(listId, orgId, linkedParentItemId) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        return this.prisma.globalListItem.findMany({
            where: { listId, linkedParentItemId, isActive: true },
            orderBy: [{ order: 'asc' }, { label: 'asc' }],
        });
    }
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
    async getItems(listId, orgId, parentId, search) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const where = { listId, isActive: true };
        if (search && search.trim()) {
            where.label = { contains: search.trim() };
        }
        else {
            where.parentId = parentId && parentId !== 'null' && parentId !== 'undefined' ? parentId : null;
        }
        return this.prisma.globalListItem.findMany({
            where,
            include: { _count: { select: { children: true } } },
            orderBy: [{ order: 'asc' }, { label: 'asc' }],
            take: search ? 50 : undefined,
        });
    }
    async getItemTree(listId, orgId) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        try {
            const allItems = await this.prisma.globalListItem.findMany({
                where: { listId, isActive: true },
                include: { childList: { select: { id: true, name: true } } },
                orderBy: [{ level: 'asc' }, { order: 'asc' }, { label: 'asc' }],
            });
            return this.buildTree(allItems, null, new Set());
        }
        catch (err) {
            this.logger.error(`getItemTree error for list ${listId}`, err);
            return [];
        }
    }
    async linkItemChildList(listId, orgId, itemId, childListId) {
        const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        if (childListId) {
            const childList = await this.prisma.globalList.findFirst({
                where: { id: childListId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
            });
            if (!childList)
                throw new common_1.NotFoundException('Child list not found');
        }
        return this.prisma.globalListItem.update({ where: { id: itemId }, data: { childListId: childListId || null } });
    }
    buildTree(items, parentId, visited) {
        return items
            .filter(i => i.parentId === parentId && !visited.has(i.id))
            .map(i => {
            const childVisited = new Set(visited);
            childVisited.add(i.id);
            return { ...i, children: this.buildTree(items, i.id, childVisited) };
        });
    }
    async addItem(listId, orgId, data) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const parentId = data.parentId && data.parentId !== 'null' && data.parentId !== 'undefined'
            ? data.parentId : null;
        if (parentId) {
            const parent = await this.prisma.globalListItem.findFirst({ where: { id: parentId, listId, isActive: true } });
            if (!parent)
                throw new common_1.NotFoundException('Parent item not found');
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
    async getItemLevel(itemId, depth) {
        if (depth >= MAX_LEVEL_DEPTH)
            return depth;
        try {
            const item = await this.prisma.globalListItem.findUnique({ where: { id: itemId } });
            if (!item || !item.parentId)
                return depth;
            return this.getItemLevel(item.parentId, depth + 1);
        }
        catch {
            return depth;
        }
    }
    async updateItem(listId, orgId, itemId, data) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        return this.prisma.globalListItem.update({ where: { id: itemId }, data });
    }
    async removeItem(listId, orgId, itemId) {
        const list = await this.prisma.globalList.findFirst({ where: { id: listId, organizationId: orgId } });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        await this.softDeleteDescendants(itemId, new Set());
        return this.prisma.globalListItem.update({ where: { id: itemId }, data: { isActive: false } });
    }
    async softDeleteDescendants(parentId, visited) {
        if (visited.has(parentId))
            return;
        visited.add(parentId);
        const children = await this.prisma.globalListItem.findMany({ where: { parentId, isActive: true } });
        for (const child of children) {
            await this.softDeleteDescendants(child.id, visited);
            await this.prisma.globalListItem.update({ where: { id: child.id }, data: { isActive: false } });
        }
    }
    async getItem(listId, orgId, itemId) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const item = await this.prisma.globalListItem.findFirst({ where: { id: itemId, listId } });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        return item;
    }
    async getItemChildren(listId, orgId, itemId) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        return this.prisma.globalListItem.findMany({
            where: { listId, parentId: itemId, isActive: true },
            orderBy: [{ order: 'asc' }, { label: 'asc' }],
        });
    }
    async getItemAncestors(listId, orgId, itemId) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('Global list not found');
        const path = [];
        let currentId = itemId;
        const visited = new Set();
        while (currentId) {
            if (visited.has(currentId))
                break;
            visited.add(currentId);
            path.unshift(currentId);
            const item = await this.prisma.globalListItem.findFirst({ where: { id: currentId, listId } });
            if (!item)
                break;
            currentId = item.parentId;
        }
        return path;
    }
    async bulkCreateItems(orgId, listId, items) {
        const list = await this.prisma.globalList.findFirst({
            where: { id: listId, isActive: true, OR: [{ organizationId: orgId }, { isPublished: true }] },
        });
        if (!list)
            throw new common_1.NotFoundException('List not found');
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
};
exports.GlobalListsService = GlobalListsService;
exports.GlobalListsService = GlobalListsService = GlobalListsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GlobalListsService);
//# sourceMappingURL=global-lists.service.js.map