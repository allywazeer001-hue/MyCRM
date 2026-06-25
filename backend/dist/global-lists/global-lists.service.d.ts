import { PrismaService } from '../prisma/prisma.service';
export declare class GlobalListsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<{
        isOwn: boolean;
        _count: {
            items: number;
        };
        linkedParentList: {
            id: string;
            name: string;
        };
        linkedChildLists: {
            id: string;
            name: string;
        }[];
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    }[]>;
    findOne(id: string, orgId: string): Promise<{
        linkedParentList: {
            id: string;
            name: string;
            slug: string;
        };
        linkedChildLists: {
            id: string;
            name: string;
            slug: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    }>;
    create(orgId: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    }>;
    update(id: string, orgId: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    }>;
    remove(id: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    }>;
    setLinkedParentList(id: string, orgId: string, parentListId: string | null): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    }>;
    getItemsByLinkedParent(listId: string, orgId: string, linkedParentItemId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }[]>;
    getPublishedLists(): Promise<({
        organization: {
            name: string;
        };
        _count: {
            items: number;
        };
        linkedParentList: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        isPublished: boolean;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
        linkedParentListId: string | null;
    })[]>;
    getItems(listId: string, orgId: string, parentId?: string, search?: string): Promise<({
        _count: {
            children: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    })[]>;
    getItemTree(listId: string, orgId: string): Promise<any[]>;
    linkItemChildList(listId: string, orgId: string, itemId: string, childListId: string | null): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }>;
    private buildTree;
    addItem(listId: string, orgId: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }>;
    private getItemLevel;
    updateItem(listId: string, orgId: string, itemId: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }>;
    removeItem(listId: string, orgId: string, itemId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }>;
    private softDeleteDescendants;
    getItem(listId: string, orgId: string, itemId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }>;
    getItemChildren(listId: string, orgId: string, itemId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        order: number;
        label: string;
        value: string;
        listId: string;
        parentId: string | null;
        linkedParentItemId: string | null;
        childListId: string | null;
        level: number;
    }[]>;
    getItemAncestors(listId: string, orgId: string, itemId: string): Promise<string[]>;
    bulkCreateItems(orgId: string, listId: string, items: Array<{
        label: string;
        parentId?: string | null;
        linkedParentItemId?: string | null;
        value?: string;
        order?: number;
    }>): Promise<{
        created: number;
        items: any[];
    }>;
}
