import { PortalBuilderService } from './portal-builder.service';
export declare class PortalBuilderController {
    private readonly builderService;
    constructor(builderService: PortalBuilderService);
    listPages(user: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        icon: string | null;
        title: string;
        publishedAt: Date | null;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
    }[]>;
    getPage(user: any, id: string): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        icon: string | null;
        title: string;
        publishedAt: Date | null;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
    }>;
    createPage(user: any, dto: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        icon: string | null;
        title: string;
        publishedAt: Date | null;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
    }>;
    updatePage(user: any, id: string, dto: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        icon: string | null;
        title: string;
        publishedAt: Date | null;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        type: string;
        title: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        publishedAt: Date;
        scheduledAt: Date | null;
    }[]>;
    createAnnouncement(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        type: string;
        title: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        publishedAt: Date;
        scheduledAt: Date | null;
    }>;
    updateAnnouncement(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        type: string;
        title: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        publishedAt: Date;
        scheduledAt: Date | null;
    }>;
    deleteAnnouncement(user: any, id: string): Promise<{
        success: boolean;
    }>;
    broadcast(user: any, dto: any): Promise<{
        sent: number;
    }>;
}
