import { PrismaService } from '../prisma/prisma.service';
export declare class GlobalListsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<({
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
    findOne(id: string, orgId: string): Promise<{
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
    create(orgId: string, data: any): Promise<{
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
    update(id: string, orgId: string, data: any): Promise<{
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
    remove(id: string, orgId: string): Promise<{
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
    getItems(listId: string, orgId: string, parentId?: string): Promise<({
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
    getItemTree(listId: string, orgId: string): Promise<any[]>;
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
        level: number;
    }>;
    private softDeleteDescendants;
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
        level: number;
    }[]>;
}
