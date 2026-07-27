import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionCheckService } from '../permissions/permission-check.service';

// ── Field types that are always system-generated (skip validation) ────────────

const SKIP_REQUIRED_TYPES = new Set([
  'AUTO_NUMBER', 'FORMULA', 'MIRROR', 'LOOKUP',
]);

const SKIP_UNIQUE_TYPES = new Set(['AUTO_NUMBER', 'FORMULA', 'MIRROR']);

// ── Format validators ─────────────────────────────────────────────────────────

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') return val.trim() === '';
  if (Array.isArray(val)) return val.length === 0;
  return false;
}

function isValidEmail(v: string): boolean {
  return RE_EMAIL.test(v.trim());
}

function isValidPhone(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 6;
}

function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function isValidDate(v: string): boolean {
  if (!v || typeof v !== 'string') return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function getRecordSummary(data: Record<string, unknown>, fields: { name: string; type: string }[]): string {
  const TEXT_TYPES = new Set(['TEXT', 'SHORT_TEXT', 'LONG_TEXT', 'NAME', 'SINGLE_LINE_TEXT', 'TEXTAREA']);
  for (const f of fields) {
    if (TEXT_TYPES.has(f.type)) {
      const v = data[f.name];
      if (v && typeof v === 'string' && v.trim()) return v.trim().slice(0, 80);
    }
  }
  // Fallback: first non-empty string value in any field
  for (const v of Object.values(data)) {
    if (v && typeof v === 'string' && v.trim()) return v.trim().slice(0, 80);
  }
  return '';
}

function safeJson(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw as Record<string, unknown>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DuplicateRule {
  moduleId: string;
  fields: string[];
  label?: string;
}

export interface MissingDataRule {
  id?: string;
  moduleId: string;
  fields: string[];
  label?: string;
}

export interface ScanSummary {
  totalRecords: number;
  totalIssues: number;
  duplicates: number;
  missingFields: number;
  invalidFormats: number;
  byModule: Record<string, { records: number; issues: number; qualityScore: number }>;
  qualityScore: number;
}

export interface QuickCheckResult {
  hasIssues: boolean;
  warnings: Array<{ type: string; field: string; label: string; message: string }>;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly permissions: PermissionCheckService,
  ) {}

  // ── Config ──────────────────────────────────────────────────────────────────

  async getConfig(orgId: string) {
    const cfg = await this.prisma.dataQualityConfig.findUnique({
      where: { organizationId: orgId },
    });
    if (!cfg) {
      return this.prisma.dataQualityConfig.create({
        data: { organizationId: orgId },
      });
    }
    // Guard against empty-string JSON columns left by schema migrations
    const fixJson = (val: unknown, fallback: unknown) => {
      if (val === null || val === undefined || val === '') return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };
    return {
      ...cfg,
      includedModules: fixJson(cfg.includedModules, []),
      notifyRoles: fixJson(cfg.notifyRoles, ['ADMIN', 'SUPER_ADMIN']),
      missingDataRules: fixJson(cfg.missingDataRules, []),
      duplicateRules: fixJson(cfg.duplicateRules, []),
    };
  }

  async updateConfig(orgId: string, dto: Partial<{
    autoMode: boolean;
    schedule: string;
    scheduledHour: number;
    duplicateRules: DuplicateRule[];
    notifyDuplicate: boolean;
    notifyMissing: boolean;
    notifyInvalid: boolean;
  }>) {
    return this.prisma.dataQualityConfig.upsert({
      where: { organizationId: orgId },
      update: dto as any,
      create: { organizationId: orgId, ...(dto as any) },
    });
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard(orgId: string) {
    const [latestScan, scansTotal] = await Promise.all([
      this.prisma.dataQualityScan.findFirst({
        where: { organizationId: orgId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, createdAt: true, status: true,
          scanType: true, moduleId: true, moduleName: true,
          summary: true,
        },
      }),
      this.prisma.dataQualityScan.count({ where: { organizationId: orgId } }),
    ]);

    if (!latestScan) {
      return { latestScan: null, scansTotal, pendingIssues: 0, byType: {}, qualityScore: null, byModule: {} };
    }

    // Scope all open-issue metrics to the latest scan, not all-time
    const [pendingIssues, issuesByType] = await Promise.all([
      this.prisma.dataQualityIssue.count({
        where: { scanId: latestScan.id, isResolved: false },
      }),
      this.prisma.dataQualityIssue.groupBy({
        by: ['issueType'],
        where: { scanId: latestScan.id, isResolved: false },
        _count: { id: true },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const row of issuesByType) {
      byType[row.issueType] = row._count.id;
    }

    const summary = latestScan.summary as unknown as ScanSummary;
    const byModule = summary?.byModule ?? {};

    return {
      latestScan: {
        id: latestScan.id,
        createdAt: latestScan.createdAt,
        status: latestScan.status,
        scanType: latestScan.scanType,
        moduleId: latestScan.moduleId,
        moduleName: latestScan.moduleName,
        summary,
      },
      scansTotal,
      pendingIssues,
      byType,
      qualityScore: summary?.qualityScore ?? null,
      byModule,
    };
  }

  // ── Scan ────────────────────────────────────────────────────────────────────

  async triggerScan(
    orgId: string,
    userId: string,
    scanType: 'MANUAL' | 'SCHEDULED' = 'MANUAL',
    opts?: { moduleId?: string },
  ) {
    const running = await this.prisma.dataQualityScan.findFirst({
      where: { organizationId: orgId, status: 'RUNNING' },
    });
    if (running) return { ...running, alreadyRunning: true };

    let moduleName: string | undefined;
    if (opts?.moduleId) {
      const mod = await this.prisma.dynamicModule.findUnique({
        where: { id: opts.moduleId },
        select: { name: true },
      });
      moduleName = mod?.name;
    }

    const scan = await this.prisma.dataQualityScan.create({
      data: {
        organizationId: orgId,
        initiatedById: userId,
        status: 'RUNNING',
        scanType: opts?.moduleId ? 'MODULE' : scanType,
        moduleId: opts?.moduleId,
        moduleName,
      },
    });

    this.executeScan(scan.id, orgId, userId, opts?.moduleId).catch(err =>
      this.logger.error(`Scan ${scan.id} failed: ${err.message}`)
    );

    return scan;
  }

  async executeScan(scanId: string, orgId: string, userId: string, filterModuleId?: string): Promise<void> {
    const start = Date.now();
    const issueRows: any[] = [];

    const summary: ScanSummary = {
      totalRecords: 0,
      totalIssues: 0,
      duplicates: 0,
      missingFields: 0,
      invalidFormats: 0,
      byModule: {},
      qualityScore: 100,
    };

    try {
      const config = await this.getConfig(orgId);
      const duplicateRules   = (config.duplicateRules   ?? []) as unknown as DuplicateRule[];
      const missingDataRules = (config.missingDataRules ?? []) as unknown as MissingDataRule[];
      const includedModules  = (config.includedModules  ?? []) as unknown as string[];

      const moduleWhere: any = { organizationId: orgId, isActive: true };
      if (filterModuleId) {
        moduleWhere.id = filterModuleId;
      } else if (includedModules.length > 0) {
        moduleWhere.id = { in: includedModules };
      }

      let modules = await this.prisma.dynamicModule.findMany({
        where: moduleWhere,
        include: { fields: { where: { isActive: true } } },
      });

      // RBAC: filter to modules the initiating user can view (skip for system/scheduled scans)
      if (userId && userId !== 'SYSTEM') {
        const perms = await this.permissions.resolveUserPermissions(userId, orgId);
        if (!perms.isSuperAdmin) {
          modules = modules.filter(m => {
            const modPerm = (perms.modules as any)[m.slug];
            return modPerm?.canView !== false;
          });
        }
      }

      for (const mod of modules) {
        const records = await this.prisma.record.findMany({
          where: { moduleId: mod.id, organizationId: orgId, isDeleted: false },
          take: 5000,
          orderBy: { createdAt: 'desc' },
          select: { id: true, data: true },
        });

        summary.totalRecords += records.length;
        let modIssues = 0;
        const issueStartIdx = issueRows.length;

        // Pre-compute a display summary per record (used in issue details)
        const recSummaryMap = new Map<string, string>();
        for (const r of records) {
          recSummaryMap.set(r.id, getRecordSummary(safeJson(r.data), mod.fields));
        }

        // Build field type maps for this module
        const allRequiredFields = mod.fields.filter(f => f.isRequired && !SKIP_REQUIRED_TYPES.has(f.type as string));
        const modMissingRule    = missingDataRules.find(r => r.moduleId === mod.id);
        // If a rule exists for this module, monitor only the configured fields; otherwise fall back to all required fields
        const requiredFields = modMissingRule
          ? mod.fields.filter(f => modMissingRule.fields.includes(f.name))
          : allRequiredFields;
        const emailFields     = mod.fields.filter(f => f.type === 'EMAIL');
        const phoneFields     = mod.fields.filter(f => f.type === 'PHONE');
        const dateFields      = mod.fields.filter(f => f.type === 'DATE' || f.type === 'DATETIME');
        const urlFields       = mod.fields.filter(f => f.type === 'URL');
        const uniqueFields    = mod.fields.filter(f => f.isUnique && !SKIP_UNIQUE_TYPES.has(f.type as string));

        // Parsed record data cache
        const parsedRecords = records.map(r => ({
          id: r.id,
          data: safeJson(r.data),
        }));

        // ── Per-record checks ────────────────────────────────────────────────
        for (const rec of parsedRecords) {
          // Missing required fields
          for (const field of requiredFields) {
            if (isEmpty(rec.data[field.name])) {
              issueRows.push({
                scanId,
                organizationId: orgId,
                issueType: 'MISSING_FIELD',
                severity: 'HIGH',
                moduleId: mod.id,
                moduleName: mod.name,
                moduleSlug: mod.slug,
                recordId: rec.id,
                fieldName: field.name,
                details: { fieldLabel: field.label },
              });
              summary.missingFields++;
              modIssues++;
            }
          }

          // Invalid emails
          for (const field of emailFields) {
            const val = rec.data[field.name];
            if (val && typeof val === 'string' && !isValidEmail(val)) {
              issueRows.push({
                scanId, organizationId: orgId,
                issueType: 'INVALID_EMAIL', severity: 'MEDIUM',
                moduleId: mod.id, moduleName: mod.name, moduleSlug: mod.slug, recordId: rec.id,
                fieldName: field.name,
                details: { fieldLabel: field.label, value: val },
              });
              summary.invalidFormats++;
              modIssues++;
            }
          }

          // Invalid phones
          for (const field of phoneFields) {
            const val = rec.data[field.name];
            if (val && typeof val === 'string' && !isValidPhone(val)) {
              issueRows.push({
                scanId, organizationId: orgId,
                issueType: 'INVALID_PHONE', severity: 'LOW',
                moduleId: mod.id, moduleName: mod.name, moduleSlug: mod.slug, recordId: rec.id,
                fieldName: field.name,
                details: { fieldLabel: field.label, value: val },
              });
              summary.invalidFormats++;
              modIssues++;
            }
          }

          // Invalid dates
          for (const field of dateFields) {
            const val = rec.data[field.name];
            if (val && !isValidDate(String(val))) {
              issueRows.push({
                scanId, organizationId: orgId,
                issueType: 'INVALID_DATE', severity: 'MEDIUM',
                moduleId: mod.id, moduleName: mod.name, moduleSlug: mod.slug, recordId: rec.id,
                fieldName: field.name,
                details: { fieldLabel: field.label, value: val },
              });
              summary.invalidFormats++;
              modIssues++;
            }
          }

          // Invalid URLs
          for (const field of urlFields) {
            const val = rec.data[field.name];
            if (val && typeof val === 'string' && !isValidUrl(val)) {
              issueRows.push({
                scanId, organizationId: orgId,
                issueType: 'INVALID_URL', severity: 'LOW',
                moduleId: mod.id, moduleName: mod.name, moduleSlug: mod.slug, recordId: rec.id,
                fieldName: field.name,
                details: { fieldLabel: field.label, value: val },
              });
              summary.invalidFormats++;
              modIssues++;
            }
          }
        }

        // ── Duplicate checks (needs all records) ─────────────────────────────
        for (const field of uniqueFields) {
          const groups = new Map<string, string[]>();
          for (const rec of parsedRecords) {
            const val = rec.data[field.name];
            if (!isEmpty(val)) {
              const key = String(val).toLowerCase().trim();
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(rec.id);
            }
          }
          for (const [, recordIds] of groups) {
            if (recordIds.length > 1) {
              for (const recordId of recordIds) {
                issueRows.push({
                  scanId, organizationId: orgId,
                  issueType: 'DUPLICATE', severity: 'HIGH',
                  moduleId: mod.id, moduleName: mod.name, moduleSlug: mod.slug, recordId,
                  fieldName: field.name,
                  details: {
                    fieldLabel: field.label,
                    duplicateGroup: recordIds,
                    groupSize: recordIds.length,
                  },
                });
                summary.duplicates++;
                modIssues++;
              }
            }
          }
        }

        // ── Configured multi-field duplicate rules ────────────────────────────
        const modRules = duplicateRules.filter(r => r.moduleId === mod.id);
        for (const rule of modRules) {
          if (!rule.fields?.length) continue;
          const groups = new Map<string, string[]>();
          for (const rec of parsedRecords) {
            const key = rule.fields.map(f => String(rec.data[f] ?? '').toLowerCase().trim()).join('|');
            if (key === rule.fields.map(() => '').join('|')) continue; // all empty
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(rec.id);
          }
          for (const [, recordIds] of groups) {
            if (recordIds.length > 1) {
              // Only add if not already found by unique field check
              const alreadyReported = new Set(
                issueRows
                  .filter(i => i.moduleId === mod.id && i.issueType === 'DUPLICATE')
                  .map(i => i.recordId)
              );
              for (const recordId of recordIds) {
                if (!alreadyReported.has(recordId)) {
                  issueRows.push({
                    scanId, organizationId: orgId,
                    issueType: 'DUPLICATE', severity: 'HIGH',
                    moduleId: mod.id, moduleName: mod.name, moduleSlug: mod.slug, recordId,
                    fieldName: rule.fields.join(', '),
                    details: {
                      ruleLabel: rule.label ?? rule.fields.join(' + '),
                      duplicateGroup: recordIds,
                      groupSize: recordIds.length,
                    },
                  });
                  summary.duplicates++;
                  modIssues++;
                }
              }
            }
          }
        }

        // Stamp recordSummary onto all new issue rows from this module
        for (let j = issueStartIdx; j < issueRows.length; j++) {
          const s = recSummaryMap.get(issueRows[j].recordId);
          if (s) (issueRows[j].details as any).recordSummary = s;
        }

        if (records.length > 0) {
          const modQualityScore = Math.max(0, Math.round(100 - (modIssues / records.length) * 100));
          summary.byModule[mod.name] = { records: records.length, issues: modIssues, qualityScore: modQualityScore };
        }
      }

      // Bulk create issues in batches of 500
      summary.totalIssues = issueRows.length;
      summary.qualityScore =
        summary.totalRecords > 0
          ? Math.max(0, Math.round(100 - (summary.totalIssues / summary.totalRecords) * 100))
          : 100;

      for (let i = 0; i < issueRows.length; i += 500) {
        await this.prisma.dataQualityIssue.createMany({
          data: issueRows.slice(i, i + 500),
          skipDuplicates: true,
        });
      }

      await this.prisma.dataQualityScan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          summary: summary as any,
          duration: Date.now() - start,
          completedAt: new Date(),
        },
      });

      // Notifications for admin users (if configured)
      if (config.notifyDuplicate || config.notifyMissing) {
        await this.sendScanNotifications(orgId, userId, summary, config);
      }
    } catch (err) {
      this.logger.error(`Scan ${scanId} failed`, err);
      await this.prisma.dataQualityScan.update({
        where: { id: scanId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    }
  }

  private async sendScanNotifications(
    orgId: string,
    userId: string,
    summary: ScanSummary,
    config: any,
  ) {
    try {
      const notifyRoles = (config.notifyRoles as string[] | undefined)?.length
        ? (config.notifyRoles as string[])
        : ['ADMIN', 'SUPER_ADMIN'];

      const admins = await this.prisma.user.findMany({
        where: { organizationId: orgId, role: { in: notifyRoles as any[] }, isActive: true },
        select: { id: true },
      });

      for (const admin of admins) {
        const parts: string[] = [];
        if (config.notifyDuplicate && summary.duplicates > 0)
          parts.push(`${summary.duplicates} duplicate records`);
        if (config.notifyMissing && summary.missingFields > 0)
          parts.push(`${summary.missingFields} missing required fields`);

        if (parts.length > 0) {
          await this.notifications.create(admin.id, orgId, {
            title: 'Data Quality Scan Complete',
            message: `Found ${parts.join(', ')}. Quality score: ${summary.qualityScore}%.`,
            type: 'DATA_QUALITY',
            link: '/data-quality',
          });
        }
      }
    } catch (err) {
      this.logger.warn('Failed to send scan notifications', err);
    }
  }

  // ── Scans list ──────────────────────────────────────────────────────────────

  async listScans(orgId: string, limit = 20) {
    return this.prisma.dataQualityScan.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, status: true, scanType: true,
        moduleId: true, moduleName: true,
        summary: true, duration: true, createdAt: true, completedAt: true,
        initiatedById: true,
        _count: { select: { issues: true } },
      },
    });
  }

  async getScanDetail(orgId: string, scanId: string) {
    const scan = await this.prisma.dataQualityScan.findFirst({
      where: { id: scanId, organizationId: orgId },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  // ── Issues ──────────────────────────────────────────────────────────────────

  async listIssues(orgId: string, opts: {
    scanId?: string;
    moduleId?: string;
    issueType?: string;
    severity?: string;
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...filters } = opts;
    const where: any = { organizationId: orgId };
    if (filters.scanId)    where.scanId = filters.scanId;
    if (filters.moduleId)  where.moduleId = filters.moduleId;
    if (filters.issueType) {
      const types = filters.issueType.split(',').map(t => t.trim()).filter(Boolean);
      where.issueType = types.length === 1 ? types[0] : { in: types };
    }
    if (filters.severity)  where.severity = filters.severity;
    if (filters.isResolved !== undefined) where.isResolved = filters.isResolved;

    const [total, items] = await Promise.all([
      this.prisma.dataQualityIssue.count({ where }),
      this.prisma.dataQualityIssue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  async resolveIssue(orgId: string, issueId: string, userId: string) {
    const issue = await this.prisma.dataQualityIssue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });
    if (!issue) throw new NotFoundException('Issue not found');

    return this.prisma.dataQualityIssue.update({
      where: { id: issueId },
      data: { isResolved: true, resolvedAt: new Date(), resolvedById: userId },
    });
  }

  async resolveMany(orgId: string, issueIds: string[], userId: string) {
    return this.prisma.dataQualityIssue.updateMany({
      where: { id: { in: issueIds }, organizationId: orgId },
      data: { isResolved: true, resolvedAt: new Date(), resolvedById: userId },
    });
  }

  // ── Merge Records ────────────────────────────────────────────────────────────

  async mergeRecords(orgId: string, keepId: string, mergeId: string, userId: string, fieldMap: Record<string, unknown>) {
    // Load both records
    const [keep, merge] = await Promise.all([
      this.prisma.record.findFirst({ where: { id: keepId, organizationId: orgId, isDeleted: false } }),
      this.prisma.record.findFirst({ where: { id: mergeId, organizationId: orgId, isDeleted: false } }),
    ]);
    if (!keep || !merge) throw new NotFoundException('One or both records not found');

    const keepData = safeJson(keep.data);
    const mergeData = safeJson(merge.data);

    // Build merged data from fieldMap
    const merged: Record<string, unknown> = { ...keepData };
    for (const [fieldName, source] of Object.entries(fieldMap)) {
      if (source === 'merge') {
        merged[fieldName] = mergeData[fieldName];
      } else if (source === 'keep') {
        merged[fieldName] = keepData[fieldName];
      }
    }

    await this.prisma.$transaction([
      // Update keep record with merged data
      this.prisma.record.update({
        where: { id: keepId },
        data: { data: merged as any, updatedById: userId },
      }),
      // Soft-delete the merged record
      this.prisma.record.update({
        where: { id: mergeId },
        data: { isDeleted: true, updatedById: userId },
      }),
      // Resolve all issues for merged record
      this.prisma.dataQualityIssue.updateMany({
        where: { recordId: { in: [keepId, mergeId] }, organizationId: orgId },
        data: { isResolved: true, resolvedAt: new Date(), resolvedById: userId },
      }),
    ]);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        organizationId: orgId,
        action: 'MERGE_RECORDS',
        entityType: 'Record',
        entityId: keepId,
        metadata: { mergedFrom: mergeId, fieldMap } as any,
      },
    });

    return { keptId: keepId, mergedId: mergeId };
  }

  // ── Quick check (lightweight, called before save) ────────────────────────────

  async quickCheck(orgId: string, moduleId: string, data: Record<string, unknown>, excludeRecordId?: string): Promise<QuickCheckResult> {
    const config = await this.getConfig(orgId);
    if (!config.autoMode) return { hasIssues: false, warnings: [] };

    const fields = await this.prisma.field.findMany({
      where: { moduleId, isActive: true, module: { organizationId: orgId } },
    });

    const warnings: QuickCheckResult['warnings'] = [];

    for (const field of fields) {
      const val = data[field.name];

      // Missing required
      if (field.isRequired && !SKIP_REQUIRED_TYPES.has(field.type as string) && isEmpty(val)) {
        warnings.push({
          type: 'MISSING_FIELD',
          field: field.name,
          label: field.label,
          message: `${field.label} is required`,
        });
      }

      // Duplicate unique field
      if (field.isUnique && !SKIP_UNIQUE_TYPES.has(field.type as string) && !isEmpty(val)) {
        const existing = await this.prisma.record.findFirst({
          where: {
            moduleId,
            organizationId: orgId,
            isDeleted: false,
            id: excludeRecordId ? { not: excludeRecordId } : undefined,
          },
          select: { id: true, data: true },
        });
        // Simple: check if any existing record has same value
        const allRecords = await this.prisma.record.findMany({
          where: {
            moduleId, organizationId: orgId, isDeleted: false,
            ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
          },
          select: { id: true, data: true },
          take: 2000,
        });
        const dup = allRecords.find(r => {
          const d = safeJson(r.data);
          return String(d[field.name] ?? '').toLowerCase() === String(val).toLowerCase();
        });
        if (dup) {
          warnings.push({
            type: 'DUPLICATE',
            field: field.name,
            label: field.label,
            message: `A record with the same ${field.label} already exists`,
          });
        }
      }

      // Format validation
      if (val && typeof val === 'string') {
        if (field.type === 'EMAIL' && !isValidEmail(val)) {
          warnings.push({ type: 'INVALID_EMAIL', field: field.name, label: field.label, message: `Invalid email format` });
        }
        if (field.type === 'PHONE' && !isValidPhone(val)) {
          warnings.push({ type: 'INVALID_PHONE', field: field.name, label: field.label, message: `Invalid phone number` });
        }
        if (field.type === 'URL' && !isValidUrl(val)) {
          warnings.push({ type: 'INVALID_URL', field: field.name, label: field.label, message: `Invalid URL format` });
        }
      }
    }

    return { hasIssues: warnings.length > 0, warnings };
  }

  // ── Report ───────────────────────────────────────────────────────────────────

  async getReport(orgId: string, scanId: string) {
    const scan = await this.prisma.dataQualityScan.findFirst({
      where: { id: scanId, organizationId: orgId },
      include: { issues: { orderBy: { issueType: 'asc' } } },
    });
    if (!scan) throw new NotFoundException('Scan not found');

    const summary = scan.summary as unknown as ScanSummary;
    const issues = scan.issues;

    // Duplicate groups
    const dupIssues = issues.filter(i => i.issueType === 'DUPLICATE');
    const dupGroups = new Map<string, { moduleId: string; moduleName: string; field: string; recordIds: string[] }>();
    for (const i of dupIssues) {
      const d = i.details as any;
      const key = `${i.moduleId}__${i.fieldName}__${(d.duplicateGroup as string[])?.sort().join('|') ?? i.recordId}`;
      if (!dupGroups.has(key)) {
        dupGroups.set(key, { moduleId: i.moduleId, moduleName: i.moduleName, field: i.fieldName ?? '', recordIds: d.duplicateGroup ?? [i.recordId] });
      }
    }

    // Missing by field
    const missingIssues = issues.filter(i => i.issueType === 'MISSING_FIELD');
    const missingByField = new Map<string, { fieldName: string; label: string; count: number; modules: Set<string> }>();
    for (const i of missingIssues) {
      const k = `${i.moduleId}__${i.fieldName}`;
      if (!missingByField.has(k)) {
        missingByField.set(k, { fieldName: i.fieldName ?? '', label: (i.details as any)?.fieldLabel ?? i.fieldName ?? '', count: 0, modules: new Set() });
      }
      missingByField.get(k)!.count++;
      missingByField.get(k)!.modules.add(i.moduleName);
    }

    // Recommendations
    const recs: string[] = [];
    if (summary?.duplicates > 0) recs.push(`Merge ${summary.duplicates} duplicate records to maintain data integrity.`);
    if (summary?.missingFields > 0) recs.push(`Complete ${summary.missingFields} missing required fields to ensure data completeness.`);
    if (issues.filter(i => i.issueType === 'INVALID_EMAIL').length > 0)
      recs.push(`Correct ${issues.filter(i => i.issueType === 'INVALID_EMAIL').length} invalid email addresses.`);
    if (issues.filter(i => i.issueType === 'INVALID_PHONE').length > 0)
      recs.push(`Review ${issues.filter(i => i.issueType === 'INVALID_PHONE').length} invalid phone numbers.`);

    return {
      scan: { id: scan.id, createdAt: scan.createdAt, duration: scan.duration, status: scan.status },
      executive: {
        totalRecords: summary?.totalRecords ?? 0,
        totalIssues: summary?.totalIssues ?? 0,
        qualityScore: summary?.qualityScore ?? 100,
        cleanRecords: (summary?.totalRecords ?? 0) - Math.min(summary?.totalIssues ?? 0, summary?.totalRecords ?? 0),
      },
      duplicates: {
        groupCount: dupGroups.size,
        affectedRecords: dupIssues.length,
        groups: Array.from(dupGroups.values()).slice(0, 100),
      },
      missingData: {
        total: missingIssues.length,
        byField: Array.from(missingByField.values()).map(v => ({
          ...v,
          modules: Array.from(v.modules),
        })).sort((a, b) => b.count - a.count).slice(0, 20),
      },
      validation: {
        invalidEmails:  issues.filter(i => i.issueType === 'INVALID_EMAIL').length,
        invalidPhones:  issues.filter(i => i.issueType === 'INVALID_PHONE').length,
        invalidDates:   issues.filter(i => i.issueType === 'INVALID_DATE').length,
        invalidUrls:    issues.filter(i => i.issueType === 'INVALID_URL').length,
      },
      recommendations: recs,
    };
  }

  // ── Scheduled scan helper ────────────────────────────────────────────────────

  async runScheduledScans(schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
    const configs = await this.prisma.dataQualityConfig.findMany({
      where: { schedule },
    });
    for (const cfg of configs) {
      try {
        // Use system user ID placeholder
        await this.triggerScan(cfg.organizationId, 'SYSTEM', 'SCHEDULED');
      } catch (err) {
        this.logger.warn(`Scheduled scan failed for org ${cfg.organizationId}: ${err}`);
      }
    }
  }
}
