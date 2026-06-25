"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TrackerService = class TrackerService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    nameFromData(data) {
        if (!data || typeof data !== 'object')
            return 'Unnamed';
        if (typeof data.name === 'string' && data.name)
            return data.name;
        if (typeof data.title === 'string' && data.title)
            return data.title;
        if (typeof data.firstName === 'string' && data.firstName)
            return [data.firstName, data.lastName].filter(Boolean).join(' ');
        const first = Object.values(data).find(v => typeof v === 'string' && v);
        return first || 'Unnamed';
    }
    async assertOwns(trackerId, orgId) {
        const t = await this.prisma.tracker.findFirst({
            where: { id: trackerId, organizationId: orgId, isActive: true },
        });
        if (!t)
            throw new common_1.NotFoundException('Tracker not found');
        return t;
    }
    assignBand(compareValue, bands) {
        if (compareValue == null || bands.length === 0)
            return null;
        const sorted = [...bands].sort((a, b) => a.order - b.order || a.minVal - b.minVal);
        for (const band of sorted) {
            if (compareValue >= band.minVal && compareValue <= band.maxVal)
                return band;
        }
        return null;
    }
    calcTotals(criteriaList, scoreMap, formula) {
        const rated = criteriaList.filter(c => scoreMap.get(c.id) != null);
        if (rated.length === 0) {
            const totalMax = formula === 'average'
                ? criteriaList.length > 0
                    ? Math.round((criteriaList.reduce((s, c) => s + c.maxPoints, 0) / criteriaList.length) * 100) / 100
                    : 0
                : formula === 'sum'
                    ? criteriaList.reduce((s, c) => s + c.maxPoints, 0)
                    : 100;
            return { total: null, totalMax, pctEquivalent: null, bandValue: null };
        }
        if (formula === 'sum') {
            const rawSum = rated.reduce((s, c) => s + (scoreMap.get(c.id) ?? 0), 0);
            const totalMax = criteriaList.reduce((s, c) => s + c.maxPoints, 0);
            const pctEquivalent = totalMax > 0 ? Math.round((rawSum / totalMax) * 10000) / 100 : null;
            const total = Math.round(rawSum * 100) / 100;
            return { total, totalMax, pctEquivalent, bandValue: total };
        }
        if (formula === 'average') {
            const rawSum = rated.reduce((s, c) => s + (scoreMap.get(c.id) ?? 0), 0);
            const avg = rawSum / rated.length;
            const avgMax = Math.round((criteriaList.reduce((s, c) => s + c.maxPoints, 0) / criteriaList.length) * 100) / 100;
            const pctEquivalent = avgMax > 0 ? Math.round((avg / avgMax) * 10000) / 100 : null;
            const total = Math.round(avg * 100) / 100;
            return { total, totalMax: avgMax, pctEquivalent, bandValue: total };
        }
        const allPct = rated.every(c => c.scoreType === 'percentage');
        const hasWeights = rated.some(c => (c.weight ?? 0) > 0);
        if (allPct && hasWeights) {
            let weightedScoreSum = 0;
            let weightSum = 0;
            for (const c of rated) {
                const sc = scoreMap.get(c.id);
                const w = c.weight ?? 0;
                weightedScoreSum += sc * w;
                weightSum += w;
            }
            const pctEquivalent = weightSum > 0 ? Math.round((weightedScoreSum / weightSum) * 100) / 100 : null;
            return { total: pctEquivalent, totalMax: 100, pctEquivalent, bandValue: pctEquivalent };
        }
        let weightedSum = 0;
        let weightTotal = 0;
        for (const c of rated) {
            const sc = scoreMap.get(c.id);
            const range = c.maxPoints - c.minValue;
            const normalized = range > 0 ? Math.max(0, Math.min(100, ((sc - c.minValue) / range) * 100)) : 0;
            weightedSum += normalized * c.maxPoints;
            weightTotal += c.maxPoints;
        }
        const pctEquivalent = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : null;
        return { total: pctEquivalent, totalMax: 100, pctEquivalent, bandValue: pctEquivalent };
    }
    async list(orgId, userId) {
        const all = await this.prisma.tracker.findMany({
            where: { organizationId: orgId, isActive: true },
            include: {
                module: { select: { id: true, name: true, slug: true } },
                criteria: { orderBy: { order: 'asc' } },
                bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
                sessions: { orderBy: { date: 'desc' }, take: 1 },
                _count: { select: { sessions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const dbUser = await this.prisma.user.findFirst({ where: { id: userId }, select: { role: true, departmentId: true } });
        const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(dbUser?.role ?? '');
        if (isPrivileged)
            return all;
        return all.filter(t => {
            const ta = t;
            if (ta.isPublic || ta.isPublic == null)
                return true;
            if (!t.createdById)
                return true;
            if (t.createdById === userId)
                return true;
            const shared = Array.isArray(ta.sharedUsers) ? ta.sharedUsers : [];
            if (shared.includes(userId))
                return true;
            const sharedD = Array.isArray(ta.sharedDepts) ? ta.sharedDepts : [];
            if (dbUser?.departmentId && sharedD.includes(dbUser.departmentId))
                return true;
            return false;
        });
    }
    async create(orgId, userId, body) {
        return this.prisma.tracker.create({
            data: {
                organizationId: orgId,
                createdById: userId,
                name: body.name,
                description: body.description ?? null,
                moduleId: body.moduleId,
                scoreLabel: body.scoreLabel ?? 'Total Score',
            },
            include: {
                module: { select: { id: true, name: true, slug: true } },
                criteria: true,
                bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
            },
        });
    }
    async get(trackerId, orgId) {
        const t = await this.prisma.tracker.findFirst({
            where: { id: trackerId, organizationId: orgId, isActive: true },
            include: {
                module: { select: { id: true, name: true, slug: true } },
                criteria: { orderBy: { order: 'asc' } },
                bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
                _count: { select: { sessions: true } },
            },
        });
        if (!t)
            throw new common_1.NotFoundException('Tracker not found');
        return t;
    }
    async update(trackerId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.tracker.update({
            where: { id: trackerId },
            data: { name: body.name, description: body.description, scoreLabel: body.scoreLabel, formula: body.formula, isPublic: body.isPublic, sharedUsers: body.sharedUsers, sharedDepts: body.sharedDepts, benchmarkScore: body.benchmarkScore, performanceMessages: body.performanceMessages },
            include: {
                module: { select: { id: true, name: true, slug: true } },
                criteria: { orderBy: { order: 'asc' } },
                bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
            },
        });
    }
    async remove(trackerId, orgId) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.tracker.update({ where: { id: trackerId }, data: { isActive: false } });
    }
    async addCriteria(trackerId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        const last = await this.prisma.trackerCriteria.findFirst({ where: { trackerId }, orderBy: { order: 'desc' } });
        return this.prisma.trackerCriteria.create({
            data: {
                trackerId,
                name: body.name,
                description: body.description ?? null,
                scoreType: body.scoreType ?? 'points',
                minValue: body.minValue ?? 0,
                maxPoints: body.maxPoints ?? 10,
                weight: body.weight ?? 0,
                order: (last?.order ?? -1) + 1,
            },
        });
    }
    async updateCriteria(trackerId, criteriaId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerCriteria.update({
            where: { id: criteriaId },
            data: { name: body.name, description: body.description, scoreType: body.scoreType, minValue: body.minValue, maxPoints: body.maxPoints, weight: body.weight, order: body.order },
        });
    }
    async deleteCriteria(trackerId, criteriaId, orgId) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerCriteria.delete({ where: { id: criteriaId } });
    }
    async getBands(trackerId, orgId) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerBand.findMany({
            where: { trackerId },
            orderBy: [{ order: 'asc' }, { minVal: 'asc' }],
        });
    }
    async createBand(trackerId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        const last = await this.prisma.trackerBand.findFirst({ where: { trackerId }, orderBy: { order: 'desc' } });
        return this.prisma.trackerBand.create({
            data: {
                trackerId,
                name: body.name,
                color: body.color ?? '#6b7280',
                minVal: body.minVal,
                maxVal: body.maxVal,
                order: (last?.order ?? -1) + 1,
            },
        });
    }
    async updateBand(trackerId, bandId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerBand.update({
            where: { id: bandId },
            data: { name: body.name, color: body.color, minVal: body.minVal, maxVal: body.maxVal, order: body.order },
        });
    }
    async deleteBand(trackerId, bandId, orgId) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerBand.delete({ where: { id: bandId } });
    }
    async getSessions(trackerId, orgId) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerSession.findMany({
            where: { trackerId },
            orderBy: { date: 'desc' },
            include: { _count: { select: { scores: true } } },
        });
    }
    async createSession(trackerId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerSession.create({
            data: {
                trackerId,
                label: body.label,
                date: body.date ? new Date(body.date) : new Date(),
                notes: body.notes ?? null,
            },
        });
    }
    async updateSession(trackerId, sessionId, orgId, body) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerSession.update({
            where: { id: sessionId },
            data: { label: body.label, date: body.date ? new Date(body.date) : undefined, notes: body.notes },
        });
    }
    async deleteSession(trackerId, sessionId, orgId) {
        await this.assertOwns(trackerId, orgId);
        return this.prisma.trackerSession.delete({ where: { id: sessionId } });
    }
    async getGrid(trackerId, orgId, sessionId, search) {
        const tracker = await this.get(trackerId, orgId);
        const formula = tracker.formula ?? 'percentage';
        const bands = tracker.bands ?? [];
        const session = await this.prisma.trackerSession.findFirst({ where: { id: sessionId, trackerId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        const records = await this.prisma.record.findMany({
            where: { moduleId: tracker.module.id, organizationId: orgId },
            orderBy: { createdAt: 'asc' },
        });
        const scores = await this.prisma.trackerScore.findMany({ where: { sessionId } });
        let rows = records.map(rec => {
            const name = this.nameFromData(rec.data);
            const criteriaScores = {};
            const scoreMapForRec = new Map();
            for (const crit of tracker.criteria) {
                const sc = scores.find(s => s.criteriaId === crit.id && s.recordId === rec.id);
                const val = sc?.score ?? null;
                criteriaScores[crit.id] = val;
                scoreMapForRec.set(crit.id, val);
            }
            const { total, totalMax, pctEquivalent, bandValue } = this.calcTotals(tracker.criteria, scoreMapForRec, formula);
            const band = this.assignBand(bandValue, bands);
            return { id: rec.id, name, criteriaScores, total, totalMax, pctEquivalent, band: band ? { id: band.id, name: band.name, color: band.color } : null };
        });
        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(r => r.name.toLowerCase().includes(q));
        }
        const totalMax = tracker.criteria.reduce((s, c) => s + c.maxPoints, 0);
        const ta = tracker;
        return {
            tracker: {
                id: tracker.id,
                name: tracker.name,
                description: tracker.description,
                scoreLabel: tracker.scoreLabel,
                formula,
                bands,
                module: tracker.module,
                criteria: tracker.criteria,
                totalMax,
                benchmarkScore: ta.benchmarkScore ?? null,
                isPublic: ta.isPublic !== false,
                sharedUsers: Array.isArray(ta.sharedUsers) ? ta.sharedUsers : (typeof ta.sharedUsers === 'string' ? JSON.parse(ta.sharedUsers || '[]') : []),
                sharedDepts: Array.isArray(ta.sharedDepts) ? ta.sharedDepts : (typeof ta.sharedDepts === 'string' ? JSON.parse(ta.sharedDepts || '[]') : []),
            },
            session: { id: session.id, label: session.label, date: session.date, notes: session.notes },
            rows,
        };
    }
    async saveScore(trackerId, orgId, body) {
        const tracker = await this.assertOwns(trackerId, orgId);
        const ta = tracker;
        const saved = await this.prisma.trackerScore.upsert({
            where: { sessionId_criteriaId_recordId: { sessionId: body.sessionId, criteriaId: body.criteriaId, recordId: body.recordId } },
            create: { trackerId, sessionId: body.sessionId, criteriaId: body.criteriaId, recordId: body.recordId, score: body.score },
            update: { score: body.score },
        });
        this.recomputeAndWriteBack(tracker, ta, body.recordId, body.sessionId).catch(() => { });
        return saved;
    }
    async recomputeAndWriteBack(tracker, ta, recordId, sessionId) {
        const formula = ta.formula ?? 'percentage';
        const allScores = await this.prisma.trackerScore.findMany({ where: { sessionId, recordId } });
        const criteria = await this.prisma.trackerCriteria.findMany({ where: { trackerId: tracker.id } });
        const scoreMap = new Map(criteria.map(c => [c.id, allScores.find(s => s.criteriaId === c.id)?.score ?? null]));
        const { pctEquivalent } = this.calcTotals(criteria, scoreMap, formula);
        await this.writeScoreBack(ta, recordId, pctEquivalent);
        const benchmark = ta.benchmarkScore ?? null;
        const messages = ta.performanceMessages ?? {};
        if (benchmark != null && pctEquivalent != null) {
            const above = pctEquivalent >= benchmark;
            const msgKey = above ? 'above' : 'below';
            const msg = messages[msgKey];
            if (msg) {
                const record = await this.prisma.record.findFirst({ where: { id: recordId }, select: { createdById: true } });
                if (record?.createdById) {
                    await this.prisma.notification.create({
                        data: {
                            userId: record.createdById,
                            organizationId: tracker.organizationId,
                            title: above ? `Benchmark reached in ${tracker.name}!` : `Below benchmark in ${tracker.name}`,
                            message: msg,
                            type: 'INFO',
                            data: { trackerId: tracker.id, recordId, pctEquivalent, benchmark },
                        },
                    });
                }
            }
        }
    }
    async getRecordHistory(trackerId, orgId, recordId) {
        const tracker = await this.get(trackerId, orgId);
        const formula = tracker.formula ?? 'percentage';
        const bands = tracker.bands ?? [];
        const record = await this.prisma.record.findFirst({ where: { id: recordId } });
        const name = this.nameFromData(record?.data);
        const sessions = await this.prisma.trackerSession.findMany({
            where: { trackerId },
            include: { scores: { where: { recordId } } },
            orderBy: { date: 'asc' },
        });
        const history = sessions.map(session => {
            const criteriaScores = {};
            const scoreMap = new Map();
            for (const c of tracker.criteria) {
                const sc = session.scores.find(s => s.criteriaId === c.id);
                const val = sc?.score ?? null;
                criteriaScores[c.id] = val;
                scoreMap.set(c.id, val);
            }
            const { total, totalMax, pctEquivalent, bandValue } = this.calcTotals(tracker.criteria, scoreMap, formula);
            const band = this.assignBand(bandValue, bands);
            return {
                sessionId: session.id, label: session.label, date: session.date, notes: session.notes,
                criteriaScores, total, totalMax, pctEquivalent,
                band: band ? { id: band.id, name: band.name, color: band.color } : null,
            };
        });
        const rated = history.filter(h => h.pctEquivalent != null);
        const avgPct = rated.length > 0
            ? Math.round((rated.reduce((s, h) => s + h.pctEquivalent, 0) / rated.length) * 100) / 100
            : null;
        const bestSession = rated.length > 0
            ? rated.reduce((best, h) => (h.pctEquivalent > best.pctEquivalent ? h : best))
            : null;
        const totalMax = tracker.criteria.reduce((s, c) => s + c.maxPoints, 0);
        return {
            recordId,
            name,
            tracker: { id: tracker.id, name: tracker.name, scoreLabel: tracker.scoreLabel, formula, bands, criteria: tracker.criteria, totalMax, benchmarkScore: tracker.benchmarkScore ?? null },
            history,
            avgPct,
            bestSession: bestSession ? { label: bestSession.label, pctEquivalent: bestSession.pctEquivalent } : null,
            sessionCount: sessions.length,
        };
    }
    async getPerformance(trackerId, orgId) {
        const tracker = await this.get(trackerId, orgId);
        const ta = tracker;
        const formula = ta.formula ?? 'percentage';
        const bands = ta.bands ?? [];
        const benchmarkScore = ta.benchmarkScore ?? null;
        const performanceMessages = ta.performanceMessages ?? {};
        const sessions = await this.prisma.trackerSession.findMany({
            where: { trackerId },
            include: { scores: true },
            orderBy: { date: 'asc' },
        });
        const recordIdSet = new Set();
        for (const s of sessions)
            for (const sc of s.scores)
                recordIdSet.add(sc.recordId);
        const records = await this.prisma.record.findMany({
            where: { id: { in: [...recordIdSet] } },
            select: { id: true, data: true },
        });
        const recordMap = new Map(records.map(r => [r.id, this.nameFromData(r.data)]));
        const recordPerf = {};
        for (const recordId of recordIdSet) {
            const sessionPoints = [];
            for (const session of sessions) {
                const scoreMap = new Map();
                for (const c of tracker.criteria) {
                    const sc = session.scores.find(s => s.criteriaId === c.id && s.recordId === recordId);
                    scoreMap.set(c.id, sc?.score ?? null);
                }
                const { pctEquivalent } = this.calcTotals(tracker.criteria, scoreMap, formula);
                sessionPoints.push({ sessionId: session.id, label: session.label, date: session.date.toISOString(), pctEquivalent });
            }
            const rated = sessionPoints.filter(s => s.pctEquivalent != null);
            const latestPct = sessionPoints.length > 0 ? sessionPoints[sessionPoints.length - 1].pctEquivalent : null;
            const avgPct = rated.length > 0 ? Math.round((rated.reduce((s, h) => s + h.pctEquivalent, 0) / rated.length) * 100) / 100 : null;
            recordPerf[recordId] = { recordId, name: recordMap.get(recordId) ?? 'Unnamed', sessions: sessionPoints, latestPct, avgPct };
        }
        const sorted = Object.values(recordPerf).sort((a, b) => (b.latestPct ?? -1) - (a.latestPct ?? -1));
        const total = sorted.length;
        const leaderboard = sorted.map((r, i) => {
            const rank = i + 1;
            const pct = r.latestPct;
            let tier = 'none';
            if (pct != null) {
                if (pct >= 75)
                    tier = 'top';
                else if (pct >= 50)
                    tier = 'mid';
                else
                    tier = 'low';
            }
            const band = pct != null ? this.assignBand(formula === 'percentage' ? pct : pct, bands) : null;
            const aboveBenchmark = benchmarkScore != null && pct != null ? pct >= benchmarkScore : null;
            return { rank, recordId: r.recordId, name: r.name, latestPct: pct, avgPct: r.avgPct, tier, band: band ? { id: band.id, name: band.name, color: band.color } : null, aboveBenchmark };
        });
        const chartSeries = sessions.map(session => {
            const point = { sessionId: session.id, label: session.label, date: session.date.toISOString() };
            for (const rp of Object.values(recordPerf)) {
                const sp = rp.sessions.find(s => s.sessionId === session.id);
                point[rp.recordId] = sp?.pctEquivalent ?? null;
            }
            return point;
        });
        return {
            tracker: { id: tracker.id, name: tracker.name, scoreLabel: ta.scoreLabel, formula, benchmarkScore, performanceMessages, bands },
            sessions: sessions.map(s => ({ id: s.id, label: s.label, date: s.date.toISOString() })),
            leaderboard,
            chartSeries,
            totalRecords: total,
        };
    }
    async writeScoreBack(tracker, recordId, pctEquivalent) {
        if (!tracker.scoreFieldId || pctEquivalent == null)
            return;
        try {
            const field = await this.prisma.field.findFirst({ where: { id: tracker.scoreFieldId } });
            if (!field)
                return;
            const record = await this.prisma.record.findFirst({ where: { id: recordId } });
            if (!record)
                return;
            const existing = record.data ?? {};
            await this.prisma.record.update({
                where: { id: recordId },
                data: { data: { ...existing, [field.name]: pctEquivalent } },
            });
        }
        catch { }
    }
};
exports.TrackerService = TrackerService;
exports.TrackerService = TrackerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TrackerService);
//# sourceMappingURL=tracker.service.js.map