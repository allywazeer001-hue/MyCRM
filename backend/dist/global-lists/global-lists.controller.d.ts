import { GlobalListsService } from './global-lists.service';
export declare class GlobalListsController {
    private svc;
    constructor(svc: GlobalListsService);
    getPublished(): Promise<({
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
    findAll(user: any): Promise<{
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
    findOne(id: string, user: any): Promise<{
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
    create(body: any, user: any): Promise<{
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
    update(id: string, body: any, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
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
    linkParentList(id: string, body: {
        parentListId: string | null;
    }, user: any): Promise<{
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
    getByLinkedParent(id: string, parentItemId: string, user: any): Promise<{
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
    linkItemChildList(id: string, itemId: string, body: {
        childListId: string | null;
    }, user: any): Promise<{
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
    getItems(id: string, parentId: string, search: string, user: any): Promise<({
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
    getTree(id: string, user: any): Promise<any[]>;
    addItem(id: string, body: any, user: any): Promise<{
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
    bulkCreateItems(id: string, body: {
        items: Array<{
            label: string;
            parentId?: string | null;
            linkedParentItemId?: string | null;
            value?: string;
            order?: number;
        }>;
    }, user: any): Promise<{
        created: number;
        items: any[];
    }>;
    updateItem(id: string, itemId: string, body: any, user: any): Promise<{
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
    removeItem(id: string, itemId: string, user: any): Promise<{
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
    getItem(id: string, itemId: string, user: any): Promise<{
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
    getChildren(id: string, itemId: string, user: any): Promise<{
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
    getAncestors(id: string, itemId: string, user: any): Promise<string[]>;
}
