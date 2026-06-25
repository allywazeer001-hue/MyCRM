import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { EngagementType } from '@prisma/client';
export declare class PublicationsService {
    private prisma;
    constructor(prisma: PrismaService);
    private include;
    findAll(orgId: string, query: {
        status?: string;
        search?: string;
    }): Promise<({
        _count: {
            engagements: number;
        };
        attachments: {
            id: string;
            createdAt: Date;
            label: string | null;
            mimeType: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            publicationId: string;
            fileId: string | null;
        }[];
        author: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        coverFile: {
            id: string;
            name: string;
            fileUrl: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    })[]>;
    findOne(orgId: string, id: string): Promise<{
        _count: {
            engagements: number;
        };
        attachments: {
            id: string;
            createdAt: Date;
            label: string | null;
            mimeType: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            publicationId: string;
            fileId: string | null;
        }[];
        author: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        coverFile: {
            id: string;
            name: string;
            fileUrl: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    create(orgId: string, authorId: string, dto: CreatePublicationDto): Promise<{
        _count: {
            engagements: number;
        };
        attachments: {
            id: string;
            createdAt: Date;
            label: string | null;
            mimeType: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            publicationId: string;
            fileId: string | null;
        }[];
        author: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        coverFile: {
            id: string;
            name: string;
            fileUrl: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    update(orgId: string, id: string, dto: UpdatePublicationDto): Promise<{
        _count: {
            engagements: number;
        };
        attachments: {
            id: string;
            createdAt: Date;
            label: string | null;
            mimeType: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            publicationId: string;
            fileId: string | null;
        }[];
        author: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        coverFile: {
            id: string;
            name: string;
            fileUrl: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    publish(orgId: string, id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    archive(orgId: string, id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    unpublish(orgId: string, id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    delete(orgId: string, id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    getPortalFeed(orgId: string): Promise<{
        upcomingEvent: {
            coverFile: {
                fileUrl: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.PublicationStatus;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            tags: import("@prisma/client/runtime/library").JsonValue;
            title: string;
            content: string | null;
            publishedAt: Date | null;
            downloadCount: number;
            categories: import("@prisma/client/runtime/library").JsonValue;
            excerpt: string | null;
            coverImageUrl: string | null;
            coverFileId: string | null;
            externalLinks: import("@prisma/client/runtime/library").JsonValue;
            audienceType: string;
            audienceConfig: import("@prisma/client/runtime/library").JsonValue;
            isEvent: boolean;
            eventDate: Date | null;
            eventCtaLabel: string | null;
            eventCtaUrl: string | null;
            authorId: string;
            viewCount: number;
            clickCount: number;
        };
        publications: ({
            author: {
                firstName: string;
                lastName: string;
                id: string;
            };
            coverFile: {
                fileUrl: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.PublicationStatus;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            tags: import("@prisma/client/runtime/library").JsonValue;
            title: string;
            content: string | null;
            publishedAt: Date | null;
            downloadCount: number;
            categories: import("@prisma/client/runtime/library").JsonValue;
            excerpt: string | null;
            coverImageUrl: string | null;
            coverFileId: string | null;
            externalLinks: import("@prisma/client/runtime/library").JsonValue;
            audienceType: string;
            audienceConfig: import("@prisma/client/runtime/library").JsonValue;
            isEvent: boolean;
            eventDate: Date | null;
            eventCtaLabel: string | null;
            eventCtaUrl: string | null;
            authorId: string;
            viewCount: number;
            clickCount: number;
        })[];
    }>;
    getPortalPublication(orgId: string, id: string, portalUserId?: string, userId?: string): Promise<{
        attachments: {
            id: string;
            createdAt: Date;
            label: string | null;
            mimeType: string;
            fileName: string;
            fileSize: number;
            fileUrl: string;
            publicationId: string;
            fileId: string | null;
        }[];
        author: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PublicationStatus;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        content: string | null;
        publishedAt: Date | null;
        downloadCount: number;
        categories: import("@prisma/client/runtime/library").JsonValue;
        excerpt: string | null;
        coverImageUrl: string | null;
        coverFileId: string | null;
        externalLinks: import("@prisma/client/runtime/library").JsonValue;
        audienceType: string;
        audienceConfig: import("@prisma/client/runtime/library").JsonValue;
        isEvent: boolean;
        eventDate: Date | null;
        eventCtaLabel: string | null;
        eventCtaUrl: string | null;
        authorId: string;
        viewCount: number;
        clickCount: number;
    }>;
    trackEngagement(orgId: string, publicationId: string, activityType: EngagementType, portalUserId?: string, userId?: string, metadata?: any, deviceInfo?: string): Promise<{
        ok: boolean;
    }>;
    getAnalytics(orgId: string, id: string, query: {
        from?: string;
        to?: string;
    }): Promise<{
        publication: {
            id: string;
            title: string;
            status: import(".prisma/client").$Enums.PublicationStatus;
        };
        views: number;
        uniqueViewers: number;
        clicks: number;
        downloads: number;
        byType: {
            [k: string]: number;
        };
        userSummaries: {
            key: string;
            userName: string | null;
            views: number;
            clicks: number;
            downloads: number;
            lastActivity: Date;
            firstActivity: Date;
        }[];
        engagements: {
            userName: any;
            id: string;
            createdAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            userId: string | null;
            portalUserId: string | null;
            publicationId: string;
            activityType: import(".prisma/client").$Enums.EngagementType;
            deviceInfo: string | null;
        }[];
    }>;
    getDashboardStats(orgId: string): Promise<{
        total: number;
        publishedThisMonth: number;
        totalClicks: number;
        totalDownloads: number;
        mostViewed: {
            id: string;
            title: string;
            downloadCount: number;
            viewCount: number;
            clickCount: number;
        }[];
        mostEngaged: {
            id: string;
            title: string;
            downloadCount: number;
            viewCount: number;
            clickCount: number;
        }[];
    }>;
    getUserEngagementSummary(orgId: string): Promise<{
        users: {
            id: string;
            name: string;
            email: string;
            postsOpened: number;
            lastActivity: Date;
            joinedAt: Date;
        }[];
    }>;
}
