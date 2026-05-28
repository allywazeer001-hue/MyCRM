import { GlobalListsService } from './global-lists.service';
export declare class GlobalListsController {
    private svc;
    constructor(svc: GlobalListsService);
    findAll(user: any): Promise<({
        _count: {
            items: number;
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
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    findOne(id: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
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
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
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
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
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
        levelDefinitions: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getItems(id: string, parentId: string, user: any): Promise<({
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
        level: number;
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
        level: number;
    }[]>;
}
