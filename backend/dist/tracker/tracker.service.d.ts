import { PrismaService } from '../prisma/prisma.service';
type Band = {
    id: string;
    name: string;
    color: string;
    minVal: number;
    maxVal: number;
    order: number;
};
export declare class TrackerService {
    private prisma;
    constructor(prisma: PrismaService);
    private nameFromData;
    private assertOwns;
    private assignBand;
    private calcTotals;
    list(orgId: string, userId: string): Promise<({
        _count: {
            sessions: number;
        };
        module: {
            id: string;
            name: string;
            slug: string;
        };
        criteria: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            order: number;
            trackerId: string;
            scoreType: string;
            minValue: number;
            maxPoints: number;
            weight: number;
        }[];
        sessions: {
            id: string;
            createdAt: Date;
            label: string;
            date: Date;
            notes: string | null;
            trackerId: string;
        }[];
        bands: {
            id: string;
            name: string;
            color: string;
            order: number;
            trackerId: string;
            minVal: number;
            maxVal: number;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        createdById: string | null;
        isPublic: boolean;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
        formula: string;
        scoreLabel: string;
        scoreFieldId: string | null;
        benchmarkScore: number | null;
        performanceMessages: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    create(orgId: string, userId: string, body: {
        name: string;
        description?: string;
        moduleId: string;
        scoreLabel?: string;
    }): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
        };
        criteria: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            order: number;
            trackerId: string;
            scoreType: string;
            minValue: number;
            maxPoints: number;
            weight: number;
        }[];
        bands: {
            id: string;
            name: string;
            color: string;
            order: number;
            trackerId: string;
            minVal: number;
            maxVal: number;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        createdById: string | null;
        isPublic: boolean;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
        formula: string;
        scoreLabel: string;
        scoreFieldId: string | null;
        benchmarkScore: number | null;
        performanceMessages: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    get(trackerId: string, orgId: string): Promise<{
        _count: {
            sessions: number;
        };
        module: {
            id: string;
            name: string;
            slug: string;
        };
        criteria: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            order: number;
            trackerId: string;
            scoreType: string;
            minValue: number;
            maxPoints: number;
            weight: number;
        }[];
        bands: {
            id: string;
            name: string;
            color: string;
            order: number;
            trackerId: string;
            minVal: number;
            maxVal: number;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        createdById: string | null;
        isPublic: boolean;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
        formula: string;
        scoreLabel: string;
        scoreFieldId: string | null;
        benchmarkScore: number | null;
        performanceMessages: import("@prisma/client/runtime/library").JsonValue | null;
    } & {
        formula: string;
        isPublic: boolean;
        sharedUsers: string[];
        sharedDepts: string[];
    }>;
    update(trackerId: string, orgId: string, body: {
        name?: string;
        description?: string;
        scoreLabel?: string;
        formula?: string;
        isPublic?: boolean;
        sharedUsers?: string[];
        sharedDepts?: string[];
        benchmarkScore?: number | null;
        performanceMessages?: any;
    }): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
        };
        criteria: {
            id: string;
            createdAt: Date;
            name: string;
            description: string | null;
            order: number;
            trackerId: string;
            scoreType: string;
            minValue: number;
            maxPoints: number;
            weight: number;
        }[];
        bands: {
            id: string;
            name: string;
            color: string;
            order: number;
            trackerId: string;
            minVal: number;
            maxVal: number;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        createdById: string | null;
        isPublic: boolean;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
        formula: string;
        scoreLabel: string;
        scoreFieldId: string | null;
        benchmarkScore: number | null;
        performanceMessages: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    remove(trackerId: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        createdById: string | null;
        isPublic: boolean;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
        formula: string;
        scoreLabel: string;
        scoreFieldId: string | null;
        benchmarkScore: number | null;
        performanceMessages: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    addCriteria(trackerId: string, orgId: string, body: {
        name: string;
        description?: string;
        scoreType?: string;
        minValue?: number;
        maxPoints?: number;
        weight?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        order: number;
        trackerId: string;
        scoreType: string;
        minValue: number;
        maxPoints: number;
        weight: number;
    }>;
    updateCriteria(trackerId: string, criteriaId: string, orgId: string, body: {
        name?: string;
        description?: string;
        scoreType?: string;
        minValue?: number;
        maxPoints?: number;
        weight?: number;
        order?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        order: number;
        trackerId: string;
        scoreType: string;
        minValue: number;
        maxPoints: number;
        weight: number;
    }>;
    deleteCriteria(trackerId: string, criteriaId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        order: number;
        trackerId: string;
        scoreType: string;
        minValue: number;
        maxPoints: number;
        weight: number;
    }>;
    getBands(trackerId: string, orgId: string): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }[]>;
    createBand(trackerId: string, orgId: string, body: {
        name: string;
        color?: string;
        minVal: number;
        maxVal: number;
    }): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }>;
    updateBand(trackerId: string, bandId: string, orgId: string, body: {
        name?: string;
        color?: string;
        minVal?: number;
        maxVal?: number;
        order?: number;
    }): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }>;
    deleteBand(trackerId: string, bandId: string, orgId: string): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }>;
    getSessions(trackerId: string, orgId: string): Promise<({
        _count: {
            scores: number;
        };
    } & {
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    })[]>;
    createSession(trackerId: string, orgId: string, body: {
        label: string;
        date?: string;
        notes?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    }>;
    updateSession(trackerId: string, sessionId: string, orgId: string, body: {
        label?: string;
        date?: string;
        notes?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    }>;
    deleteSession(trackerId: string, sessionId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    }>;
    getGrid(trackerId: string, orgId: string, sessionId: string, search?: string): Promise<{
        tracker: {
            id: string;
            name: string;
            description: string;
            scoreLabel: string;
            formula: any;
            bands: Band[];
            module: {
                id: string;
                name: string;
                slug: string;
            };
            criteria: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                order: number;
                trackerId: string;
                scoreType: string;
                minValue: number;
                maxPoints: number;
                weight: number;
            }[];
            totalMax: number;
            benchmarkScore: any;
            isPublic: boolean;
            sharedUsers: any;
            sharedDepts: any;
        };
        session: {
            id: string;
            label: string;
            date: Date;
            notes: string;
        };
        rows: {
            id: string;
            name: string;
            criteriaScores: Record<string, number>;
            total: number;
            totalMax: number;
            pctEquivalent: number;
            band: {
                id: string;
                name: string;
                color: string;
            };
        }[];
    }>;
    saveScore(trackerId: string, orgId: string, body: {
        sessionId: string;
        criteriaId: string;
        recordId: string;
        score: number | null;
    }): Promise<{
        id: string;
        updatedAt: Date;
        recordId: string;
        trackerId: string;
        sessionId: string;
        criteriaId: string;
        score: number | null;
        note: string | null;
    }>;
    private recomputeAndWriteBack;
    getRecordHistory(trackerId: string, orgId: string, recordId: string): Promise<{
        recordId: string;
        name: string;
        tracker: {
            id: string;
            name: string;
            scoreLabel: string;
            formula: any;
            bands: Band[];
            criteria: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
                order: number;
                trackerId: string;
                scoreType: string;
                minValue: number;
                maxPoints: number;
                weight: number;
            }[];
            totalMax: number;
            benchmarkScore: any;
        };
        history: {
            sessionId: string;
            label: string;
            date: Date;
            notes: string;
            criteriaScores: Record<string, number>;
            total: number;
            totalMax: number;
            pctEquivalent: number;
            band: {
                id: string;
                name: string;
                color: string;
            };
        }[];
        avgPct: number;
        bestSession: {
            label: string;
            pctEquivalent: number;
        };
        sessionCount: number;
    }>;
    getPerformance(trackerId: string, orgId: string): Promise<{
        tracker: {
            id: string;
            name: string;
            scoreLabel: any;
            formula: string;
            benchmarkScore: number;
            performanceMessages: any;
            bands: Band[];
        };
        sessions: {
            id: string;
            label: string;
            date: string;
        }[];
        leaderboard: {
            rank: number;
            recordId: string;
            name: string;
            latestPct: number;
            avgPct: number;
            tier: "top" | "mid" | "low" | "none";
            band: {
                id: string;
                name: string;
                color: string;
            };
            aboveBenchmark: boolean;
        }[];
        chartSeries: Record<string, any>[];
        totalRecords: number;
    }>;
    private writeScoreBack;
}
export {};
