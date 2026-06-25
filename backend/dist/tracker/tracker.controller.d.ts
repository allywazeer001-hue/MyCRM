import { TrackerService } from './tracker.service';
export declare class TrackerController {
    private readonly svc;
    constructor(svc: TrackerService);
    list(user: any): Promise<({
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
    create(body: any, user: any): Promise<{
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
    get(id: string, user: any): Promise<{
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
    update(id: string, body: any, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
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
    addCriteria(id: string, body: any, user: any): Promise<{
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
    updateCriteria(id: string, cid: string, body: any, user: any): Promise<{
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
    deleteCriteria(id: string, cid: string, user: any): Promise<{
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
    getSessions(id: string, user: any): Promise<({
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
    createSession(id: string, body: any, user: any): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    }>;
    updateSession(id: string, sid: string, body: any, user: any): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    }>;
    deleteSession(id: string, sid: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        label: string;
        date: Date;
        notes: string | null;
        trackerId: string;
    }>;
    getBands(id: string, user: any): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }[]>;
    createBand(id: string, body: any, user: any): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }>;
    updateBand(id: string, bid: string, body: any, user: any): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }>;
    deleteBand(id: string, bid: string, user: any): Promise<{
        id: string;
        name: string;
        color: string;
        order: number;
        trackerId: string;
        minVal: number;
        maxVal: number;
    }>;
    getGrid(id: string, sessionId: string, search: string, user: any): Promise<{
        tracker: {
            id: string;
            name: string;
            description: string;
            scoreLabel: string;
            formula: any;
            bands: {
                id: string;
                name: string;
                color: string;
                minVal: number;
                maxVal: number;
                order: number;
            }[];
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
    saveScore(id: string, body: any, user: any): Promise<{
        id: string;
        updatedAt: Date;
        recordId: string;
        trackerId: string;
        sessionId: string;
        criteriaId: string;
        score: number | null;
        note: string | null;
    }>;
    getRecordHistory(id: string, recordId: string, user: any): Promise<{
        recordId: string;
        name: string;
        tracker: {
            id: string;
            name: string;
            scoreLabel: string;
            formula: any;
            bands: {
                id: string;
                name: string;
                color: string;
                minVal: number;
                maxVal: number;
                order: number;
            }[];
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
    getPerformance(id: string, user: any): Promise<{
        tracker: {
            id: string;
            name: string;
            scoreLabel: any;
            formula: string;
            benchmarkScore: number;
            performanceMessages: any;
            bands: {
                id: string;
                name: string;
                color: string;
                minVal: number;
                maxVal: number;
                order: number;
            }[];
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
}
