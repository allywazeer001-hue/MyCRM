import { PrismaService } from '../prisma/prisma.service';
export declare class PortalSectionService {
    private prisma;
    constructor(prisma: PrismaService);
    listSections(orgId: string, moduleConfigId?: string, pageId?: string): Promise<({
        fields: {
            id: string;
            label: string;
            isVisible: boolean;
            fieldKey: string;
            fieldType: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        icon: string | null;
        order: number;
        label: string;
        type: string;
        status: string;
        portalModuleConfigId: string | null;
        isVisible: boolean;
        columnIndex: number;
        isAdminOnly: boolean;
        portalPageId: string | null;
        isCollapsible: boolean;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
    })[]>;
    createSection(orgId: string, dto: {
        portalModuleConfigId?: string;
        label: string;
        type?: string;
        icon?: string;
        order?: number;
        columnIndex?: number;
        isCollapsible?: boolean;
        isVisible?: boolean;
        isAdminOnly?: boolean;
    }): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        icon: string | null;
        order: number;
        label: string;
        type: string;
        status: string;
        portalModuleConfigId: string | null;
        isVisible: boolean;
        columnIndex: number;
        isAdminOnly: boolean;
        portalPageId: string | null;
        isCollapsible: boolean;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
    }>;
    updateSection(orgId: string, sectionId: string, dto: Partial<{
        label: string;
        type: string;
        icon: string | null;
        order: number;
        columnIndex: number;
        isCollapsible: boolean;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
    }>): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        icon: string | null;
        order: number;
        label: string;
        type: string;
        status: string;
        portalModuleConfigId: string | null;
        isVisible: boolean;
        columnIndex: number;
        isAdminOnly: boolean;
        portalPageId: string | null;
        isCollapsible: boolean;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
    }>;
    deleteSection(orgId: string, sectionId: string): Promise<{
        success: boolean;
    }>;
    reorderSections(orgId: string, orderedIds: string[]): Promise<{
        success: boolean;
    }>;
}
