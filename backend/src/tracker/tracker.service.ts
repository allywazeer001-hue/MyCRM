import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Band = { id: string; name: string; color: string; minVal: number; maxVal: number; order: number };
type CritInfo = { id: string; maxPoints: number; minValue: number; scoreType?: string; weight?: number };

@Injectable()
export class TrackerService {
  constructor(private prisma: PrismaService) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private nameFromData(data: any): string {
    if (!data || typeof data !== 'object') return 'Unnamed';
    if (typeof data.name === 'string' && data.name) return data.name;
    if (typeof data.title === 'string' && data.title) return data.title;
    if (typeof data.firstName === 'string' && data.firstName)
      return [data.firstName, data.lastName].filter(Boolean).join(' ');
    const first = Object.values(data).find(v => typeof v === 'string' && v);
    return (first as string) || 'Unnamed';
  }

  private async assertOwns(trackerId: string, orgId: string) {
    const t = await this.prisma.tracker.findFirst({
      where: { id: trackerId, organizationId: orgId, isActive: true },
    });
    if (!t) throw new NotFoundException('Tracker not found');
    return t;
  }

  /**
   * Returns the first band whose [minVal, maxVal] contains compareValue.
   * For formula="percentage" pass pctEquivalent (0-100).
   * For formula="average"/"sum" pass total (raw).
   */
  private assignBand(compareValue: number | null, bands: Band[]): Band | null {
    if (compareValue == null || bands.length === 0) return null;
    const sorted = [...bands].sort((a, b) => a.order - b.order || a.minVal - b.minVal);
    for (const band of sorted) {
      if (compareValue >= band.minVal && compareValue <= band.maxVal) return band;
    }
    return null;
  }

  /**
   * Compute the total score for one record.
   *
   * formula = "percentage":
   *   - If all criteria have scoreType="percentage" and at least one has weight>0:
   *     weighted average of % scores by their weights (0-100 result).
   *   - Otherwise: normalize each score by its range, weighted by maxPoints (legacy).
   *   Band comparison: pctEquivalent (0-100).
   *
   * formula = "average":
   *   Arithmetic mean of raw scores (in rating/points scale).
   *   Band comparison: total (native scale).
   *
   * formula = "sum":
   *   Raw sum of all scores.
   *   Band comparison: total (native scale).
   *
   * Always returns pctEquivalent (0-100) for colour bars.
   */
  private calcTotals(
    criteriaList: CritInfo[],
    scoreMap: Map<string, number | null>,
    formula: string,
  ): { total: number | null; totalMax: number; pctEquivalent: number | null; bandValue: number | null } {
    const rated = criteriaList.filter(c => scoreMap.get(c.id) != null);

    if (rated.length === 0) {
      const totalMax =
        formula === 'average'
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

    // formula === "percentage"
    // Path A: all rated criteria are scoreType=percentage with weights
    const allPct = rated.every(c => c.scoreType === 'percentage');
    const hasWeights = rated.some(c => (c.weight ?? 0) > 0);
    if (allPct && hasWeights) {
      let weightedScoreSum = 0;
      let weightSum = 0;
      for (const c of rated) {
        const sc = scoreMap.get(c.id)!;
        const w = c.weight ?? 0;
        weightedScoreSum += sc * w;
        weightSum += w;
      }
      const pctEquivalent = weightSum > 0 ? Math.round((weightedScoreSum / weightSum) * 100) / 100 : null;
      return { total: pctEquivalent, totalMax: 100, pctEquivalent, bandValue: pctEquivalent };
    }

    // Path B: normalize each score to 0-100 by its range, weighted by maxPoints
    let weightedSum = 0;
    let weightTotal = 0;
    for (const c of rated) {
      const sc = scoreMap.get(c.id)!;
      const range = c.maxPoints - c.minValue;
      const normalized = range > 0 ? Math.max(0, Math.min(100, ((sc - c.minValue) / range) * 100)) : 0;
      weightedSum += normalized * c.maxPoints;
      weightTotal += c.maxPoints;
    }
    const pctEquivalent = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : null;
    return { total: pctEquivalent, totalMax: 100, pctEquivalent, bandValue: pctEquivalent };
  }

  // ── Trackers CRUD ─────────────────────────────────────────────────────────

  async list(orgId: string, userId: string) {
    // Return all active trackers in the org — visibility is checked per-tracker below
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
    if (isPrivileged) return all;

    return all.filter(t => {
      const ta = t as any;
      if (ta.isPublic || ta.isPublic == null) return true;   // public or unset
      if (!t.createdById) return true;                       // legacy: no creator recorded
      if (t.createdById === userId) return true;             // own tracker
      const shared = Array.isArray(ta.sharedUsers) ? ta.sharedUsers : [];
      if (shared.includes(userId)) return true;
      const sharedD = Array.isArray(ta.sharedDepts) ? ta.sharedDepts : [];
      if (dbUser?.departmentId && sharedD.includes(dbUser.departmentId)) return true;
      return false;
    });
  }

  async create(orgId: string, userId: string, body: { name: string; description?: string; moduleId: string; scoreLabel?: string }) {
    return this.prisma.tracker.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: body.name,
        description: body.description ?? null,
        moduleId: body.moduleId,
        scoreLabel: body.scoreLabel ?? 'Total Score',
      } as any,
      include: {
        module: { select: { id: true, name: true, slug: true } },
        criteria: true,
        bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
      },
    });
  }

  async get(trackerId: string, orgId: string) {
    const t = await this.prisma.tracker.findFirst({
      where: { id: trackerId, organizationId: orgId, isActive: true },
      include: {
        module: { select: { id: true, name: true, slug: true } },
        criteria: { orderBy: { order: 'asc' } },
        bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
        _count: { select: { sessions: true } },
      },
    });
    if (!t) throw new NotFoundException('Tracker not found');
    return t as typeof t & { formula: string; isPublic: boolean; sharedUsers: string[]; sharedDepts: string[] };
  }

  async update(
    trackerId: string,
    orgId: string,
    body: { name?: string; description?: string; scoreLabel?: string; formula?: string; isPublic?: boolean; sharedUsers?: string[]; sharedDepts?: string[]; benchmarkScore?: number | null; performanceMessages?: any },
  ) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.tracker.update({
      where: { id: trackerId },
      data: { name: body.name, description: body.description, scoreLabel: body.scoreLabel, formula: body.formula, isPublic: body.isPublic, sharedUsers: body.sharedUsers, sharedDepts: body.sharedDepts, benchmarkScore: body.benchmarkScore, performanceMessages: body.performanceMessages } as any,
      include: {
        module: { select: { id: true, name: true, slug: true } },
        criteria: { orderBy: { order: 'asc' } },
        bands: { orderBy: [{ order: 'asc' }, { minVal: 'asc' }] },
      },
    });
  }

  async remove(trackerId: string, orgId: string) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.tracker.update({ where: { id: trackerId }, data: { isActive: false } });
  }

  // ── Criteria ──────────────────────────────────────────────────────────────

  async addCriteria(
    trackerId: string,
    orgId: string,
    body: { name: string; description?: string; scoreType?: string; minValue?: number; maxPoints?: number; weight?: number },
  ) {
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
      } as any,
    });
  }

  async updateCriteria(
    trackerId: string,
    criteriaId: string,
    orgId: string,
    body: { name?: string; description?: string; scoreType?: string; minValue?: number; maxPoints?: number; weight?: number; order?: number },
  ) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerCriteria.update({
      where: { id: criteriaId },
      data: { name: body.name, description: body.description, scoreType: body.scoreType, minValue: body.minValue, maxPoints: body.maxPoints, weight: body.weight, order: body.order } as any,
    });
  }

  async deleteCriteria(trackerId: string, criteriaId: string, orgId: string) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerCriteria.delete({ where: { id: criteriaId } });
  }

  // ── Performance Bands ─────────────────────────────────────────────────────

  async getBands(trackerId: string, orgId: string) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerBand.findMany({
      where: { trackerId },
      orderBy: [{ order: 'asc' }, { minVal: 'asc' }],
    });
  }

  async createBand(trackerId: string, orgId: string, body: { name: string; color?: string; minVal: number; maxVal: number }) {
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

  async updateBand(trackerId: string, bandId: string, orgId: string, body: { name?: string; color?: string; minVal?: number; maxVal?: number; order?: number }) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerBand.update({
      where: { id: bandId },
      data: { name: body.name, color: body.color, minVal: body.minVal, maxVal: body.maxVal, order: body.order },
    });
  }

  async deleteBand(trackerId: string, bandId: string, orgId: string) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerBand.delete({ where: { id: bandId } });
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async getSessions(trackerId: string, orgId: string) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerSession.findMany({
      where: { trackerId },
      orderBy: { date: 'desc' },
      include: { _count: { select: { scores: true } } },
    });
  }

  async createSession(trackerId: string, orgId: string, body: { label: string; date?: string; notes?: string }) {
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

  async updateSession(trackerId: string, sessionId: string, orgId: string, body: { label?: string; date?: string; notes?: string }) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerSession.update({
      where: { id: sessionId },
      data: { label: body.label, date: body.date ? new Date(body.date) : undefined, notes: body.notes },
    });
  }

  async deleteSession(trackerId: string, sessionId: string, orgId: string) {
    await this.assertOwns(trackerId, orgId);
    return this.prisma.trackerSession.delete({ where: { id: sessionId } });
  }

  // ── Score Grid ────────────────────────────────────────────────────────────

  async getGrid(trackerId: string, orgId: string, sessionId: string, search?: string) {
    const tracker = await this.get(trackerId, orgId);
    const formula = (tracker as any).formula ?? 'percentage';
    const bands: Band[] = (tracker as any).bands ?? [];

    const session = await this.prisma.trackerSession.findFirst({ where: { id: sessionId, trackerId } });
    if (!session) throw new NotFoundException('Session not found');

    const records = await this.prisma.record.findMany({
      where: { moduleId: tracker.module.id, organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });

    const scores = await this.prisma.trackerScore.findMany({ where: { sessionId } });

    let rows = records.map(rec => {
      const name = this.nameFromData(rec.data);
      const criteriaScores: Record<string, number | null> = {};
      const scoreMapForRec = new Map<string, number | null>();
      for (const crit of tracker.criteria) {
        const sc = scores.find(s => s.criteriaId === crit.id && s.recordId === rec.id);
        const val = sc?.score ?? null;
        criteriaScores[crit.id] = val;
        scoreMapForRec.set(crit.id, val);
      }
      const { total, totalMax, pctEquivalent, bandValue } = this.calcTotals(tracker.criteria as any, scoreMapForRec, formula);
      const band = this.assignBand(bandValue, bands);
      return { id: rec.id, name, criteriaScores, total, totalMax, pctEquivalent, band: band ? { id: band.id, name: band.name, color: band.color } : null };
    });

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q));
    }

    const totalMax = tracker.criteria.reduce((s, c) => s + c.maxPoints, 0);

    const ta = tracker as any;
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

  // ── Scores ────────────────────────────────────────────────────────────────

  async saveScore(
    trackerId: string,
    orgId: string,
    body: { sessionId: string; criteriaId: string; recordId: string; score: number | null },
  ) {
    const tracker = await this.assertOwns(trackerId, orgId);
    const ta = tracker as any;

    const saved = await this.prisma.trackerScore.upsert({
      where: { sessionId_criteriaId_recordId: { sessionId: body.sessionId, criteriaId: body.criteriaId, recordId: body.recordId } },
      create: { trackerId, sessionId: body.sessionId, criteriaId: body.criteriaId, recordId: body.recordId, score: body.score },
      update: { score: body.score },
    });

    // Recompute total for this record in this session (fire-and-forget)
    this.recomputeAndWriteBack(tracker, ta, body.recordId, body.sessionId).catch(() => {});

    return saved;
  }

  private async recomputeAndWriteBack(tracker: any, ta: any, recordId: string, sessionId: string) {
    const formula: string = ta.formula ?? 'percentage';
    const allScores = await this.prisma.trackerScore.findMany({ where: { sessionId, recordId } });
    const criteria  = await this.prisma.trackerCriteria.findMany({ where: { trackerId: tracker.id } });
    const scoreMap  = new Map<string, number | null>(criteria.map(c => [c.id, allScores.find(s => s.criteriaId === c.id)?.score ?? null]));
    const { pctEquivalent } = this.calcTotals(criteria as any, scoreMap, formula);

    // Write score back to the module record field
    await this.writeScoreBack(ta, recordId, pctEquivalent);

    // Benchmark notification
    const benchmark: number | null = ta.benchmarkScore ?? null;
    const messages: any = ta.performanceMessages ?? {};
    if (benchmark != null && pctEquivalent != null) {
      const above = pctEquivalent >= benchmark;
      const msgKey = above ? 'above' : 'below';
      const msg = messages[msgKey];
      if (msg) {
        // Find who is assigned to this record org-wide (first user in org as fallback)
        const record = await this.prisma.record.findFirst({ where: { id: recordId }, select: { createdById: true } });
        if (record?.createdById) {
          await this.prisma.notification.create({
            data: {
              userId:         record.createdById,
              organizationId: tracker.organizationId,
              title:          above ? `Benchmark reached in ${tracker.name}!` : `Below benchmark in ${tracker.name}`,
              message:        msg,
              type:           'INFO',
              data:           { trackerId: tracker.id, recordId, pctEquivalent, benchmark },
            },
          } as any);
        }
      }
    }
  }

  // ── Record History ────────────────────────────────────────────────────────

  async getRecordHistory(trackerId: string, orgId: string, recordId: string) {
    const tracker = await this.get(trackerId, orgId);
    const formula = (tracker as any).formula ?? 'percentage';
    const bands: Band[] = (tracker as any).bands ?? [];

    const record = await this.prisma.record.findFirst({ where: { id: recordId } });
    const name = this.nameFromData(record?.data);

    const sessions = await this.prisma.trackerSession.findMany({
      where: { trackerId },
      include: { scores: { where: { recordId } } },
      orderBy: { date: 'asc' },
    });

    const history = sessions.map(session => {
      const criteriaScores: Record<string, number | null> = {};
      const scoreMap = new Map<string, number | null>();
      for (const c of tracker.criteria) {
        const sc = session.scores.find(s => s.criteriaId === c.id);
        const val = sc?.score ?? null;
        criteriaScores[c.id] = val;
        scoreMap.set(c.id, val);
      }
      const { total, totalMax, pctEquivalent, bandValue } = this.calcTotals(tracker.criteria as any, scoreMap, formula);
      const band = this.assignBand(bandValue, bands);
      return {
        sessionId: session.id, label: session.label, date: session.date, notes: session.notes,
        criteriaScores, total, totalMax, pctEquivalent,
        band: band ? { id: band.id, name: band.name, color: band.color } : null,
      };
    });

    const rated = history.filter(h => h.pctEquivalent != null);
    const avgPct = rated.length > 0
      ? Math.round((rated.reduce((s, h) => s + h.pctEquivalent!, 0) / rated.length) * 100) / 100
      : null;
    const bestSession = rated.length > 0
      ? rated.reduce((best, h) => (h.pctEquivalent! > best.pctEquivalent! ? h : best))
      : null;

    const totalMax = tracker.criteria.reduce((s, c) => s + c.maxPoints, 0);

    return {
      recordId,
      name,
      tracker: { id: tracker.id, name: tracker.name, scoreLabel: tracker.scoreLabel, formula, bands, criteria: tracker.criteria, totalMax, benchmarkScore: (tracker as any).benchmarkScore ?? null },
      history,
      avgPct,
      bestSession: bestSession ? { label: bestSession.label, pctEquivalent: bestSession.pctEquivalent } : null,
      sessionCount: sessions.length,
    };
  }

  // ── Performance Summary (leaderboard + chart data for all records) ────────

  async getPerformance(trackerId: string, orgId: string) {
    const tracker = await this.get(trackerId, orgId);
    const ta = tracker as any;
    const formula: string = ta.formula ?? 'percentage';
    const bands: Band[]   = ta.bands ?? [];
    const benchmarkScore: number | null = ta.benchmarkScore ?? null;
    const performanceMessages: any = ta.performanceMessages ?? {};

    const sessions = await this.prisma.trackerSession.findMany({
      where: { trackerId },
      include: { scores: true },
      orderBy: { date: 'asc' },
    });

    // All unique recordIds that have been scored
    const recordIdSet = new Set<string>();
    for (const s of sessions) for (const sc of s.scores) recordIdSet.add(sc.recordId);

    const records = await this.prisma.record.findMany({
      where: { id: { in: [...recordIdSet] } },
      select: { id: true, data: true },
    });
    const recordMap = new Map(records.map(r => [r.id, this.nameFromData(r.data)]));

    // Per-record: score in each session + latest score
    const recordPerf: Record<string, { recordId: string; name: string; sessions: { sessionId: string; label: string; date: string; pctEquivalent: number | null }[]; latestPct: number | null; avgPct: number | null; }> = {};

    for (const recordId of recordIdSet) {
      const sessionPoints: { sessionId: string; label: string; date: string; pctEquivalent: number | null }[] = [];
      for (const session of sessions) {
        const scoreMap = new Map<string, number | null>();
        for (const c of tracker.criteria) {
          const sc = session.scores.find(s => s.criteriaId === c.id && s.recordId === recordId);
          scoreMap.set(c.id, sc?.score ?? null);
        }
        const { pctEquivalent } = this.calcTotals(tracker.criteria as any, scoreMap, formula);
        sessionPoints.push({ sessionId: session.id, label: session.label, date: session.date.toISOString(), pctEquivalent });
      }
      const rated = sessionPoints.filter(s => s.pctEquivalent != null);
      const latestPct = sessionPoints.length > 0 ? sessionPoints[sessionPoints.length - 1].pctEquivalent : null;
      const avgPct = rated.length > 0 ? Math.round((rated.reduce((s, h) => s + h.pctEquivalent!, 0) / rated.length) * 100) / 100 : null;
      recordPerf[recordId] = { recordId, name: recordMap.get(recordId) ?? 'Unnamed', sessions: sessionPoints, latestPct, avgPct };
    }

    // Sort by latestPct descending
    const sorted = Object.values(recordPerf).sort((a, b) => (b.latestPct ?? -1) - (a.latestPct ?? -1));

    // Leaderboard with tier coloring
    const total = sorted.length;
    const leaderboard = sorted.map((r, i) => {
      const rank = i + 1;
      const pct  = r.latestPct;
      let tier: 'top' | 'mid' | 'low' | 'none' = 'none';
      if (pct != null) {
        if (pct >= 75) tier = 'top';
        else if (pct >= 50) tier = 'mid';
        else tier = 'low';
      }
      const band = pct != null ? this.assignBand(formula === 'percentage' ? pct : pct, bands) : null;
      const aboveBenchmark = benchmarkScore != null && pct != null ? pct >= benchmarkScore : null;
      return { rank, recordId: r.recordId, name: r.name, latestPct: pct, avgPct: r.avgPct, tier, band: band ? { id: band.id, name: band.name, color: band.color } : null, aboveBenchmark };
    });

    // Chart data: array of sessions with scores per record (for multi-line chart)
    const chartSeries = sessions.map(session => {
      const point: Record<string, any> = { sessionId: session.id, label: session.label, date: session.date.toISOString() };
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

  // ── Score writeback to record field ──────────────────────────────────────

  private async writeScoreBack(tracker: any, recordId: string, pctEquivalent: number | null) {
    if (!tracker.scoreFieldId || pctEquivalent == null) return;
    try {
      const field = await this.prisma.field.findFirst({ where: { id: tracker.scoreFieldId } });
      if (!field) return;
      const record = await this.prisma.record.findFirst({ where: { id: recordId } });
      if (!record) return;
      const existing = (record.data as any) ?? {};
      await this.prisma.record.update({
        where: { id: recordId },
        data: { data: { ...existing, [field.name]: pctEquivalent } },
      });
    } catch { /* silent — never block scoring */ }
  }
}
