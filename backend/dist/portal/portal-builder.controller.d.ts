import { PortalBuilderService } from './portal-builder.service';
export declare class PortalBuilderController {
    private readonly builderService;
    constructor(builderService: PortalBuilderService);
    listPages(user: any): Promise<{
        id: string;
        organizationId: string;
        title: string;
        slug: string;
        description: string | null;
        icon: string | null;
        layoutTemplate: string;
        status: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getPage(user: any, id: string): Promise<{
        id: string;
        organizationId: string;
        title: string;
        slug: string;
        description: string | null;
        icon: string | null;
        layoutTemplate: string;
        status: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createPage(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        title: string;
        slug: string;
        description: string | null;
        icon: string | null;
        layoutTemplate: string;
        status: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePage(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        title: string;
        slug: string;
        description: string | null;
        icon: string | null;
        layoutTemplate: string;
        status: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deletePage(user: any, id: string): Promise<{
        success: boolean;
    }>;
    listMenuItems(user: any): Promise<any[]>;
    saveMenuItems(user: any, dto: {
        items: any[];
    }): Promise<any[]>;
    listAnnouncements(user: any): Promise<{
        id: string;
        organizationId: string;
        title: string;
        publishedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        scheduledAt: Date | null;
        expiresAt: Date | null;
    }[]>;
    createAnnouncement(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        title: string;
        publishedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        scheduledAt: Date | null;
        expiresAt: Date | null;
    }>;
    updateAnnouncement(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        title: string;
        publishedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        scheduledAt: Date | null;
        expiresAt: Date | null;
    }>;
    deleteAnnouncement(user: any, id: string): Promise<{
        success: boolean;
    }>;
    broadcast(user: any, dto: any): Promise<{
        sent: number;
    }>;
}
