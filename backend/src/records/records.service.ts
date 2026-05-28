import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private workflows: WorkflowsService,
  ) {}

  async create(moduleId: string, orgId: string, userId: string, data: Record<string, any>) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, include: { options: true } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const enrichedData = { ...data };
    for (const field of mod.fields) {
      if (field.type === 'AUTO_NUMBER') {
        enrichedData[field.name] = await this.generateAutoNumber(field, moduleId, orgId);
      }
    }

    const record = await this.prisma.record.create({
      data: { moduleId, organizationId: orgId, createdById: userId, data: enrichedData },
    });

    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: orgId,
        action: 'RECORD_CREATED', entityType: mod.name, entityId: record.id,
        metadata: { moduleId },
      },
    });

    // Fire RECORD_CREATED workflows asynchronously (don't block the response)
    this.workflows.executeForRecord('RECORD_CREATED', moduleId, orgId, record).catch(() => {});

    return record;
  }

  private async generateAutoNumber(field: any, moduleId: string, orgId: string): Promise<string> {
    const settings = (field.settings as any) || {};
    const prefix = settings.prefix || '';
    const suffix = settings.suffix || '';
    const startingNumber = settings.startingNumber ?? 1;
    const paddingLength = settings.paddingLength ?? 5;
    const count = await this.prisma.record.count({ where: { moduleId, organizationId: orgId } });
    const nextNum = count + startingNumber;
    const padded = String(nextNum).padStart(paddingLength, '0');
    const parts = [prefix, padded, suffix].filter(Boolean);
    return parts.join('-');
  }

  async findAll(moduleId: string, orgId: string, query: any) {
    const { page = 1, limit = 25, search, filterGroup, sortField, sortDir } = query;
    const where: any = { moduleId, organizationId: orgId, isDeleted: false };

    const hasFilter = !!(filterGroup || search);

    let records = await this.prisma.record.findMany({
      where,
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: sortDir === 'asc' ? 'asc' : 'desc' },
      take: hasFilter ? 5000 : Number(limit),
      skip: hasFilter ? 0 : (Number(page) - 1) * Number(limit),
    });

    if (search) {
      const s = (search as string).toLowerCase();
      records = records.filter(r => JSON.stringify(r.data).toLowerCase().includes(s));
    }

    if (filterGroup) {
      try {
        const fg = typeof filterGroup === 'string' ? JSON.parse(filterGroup) : filterGroup;
        records = records.filter(r => this.applyFilterGroup(r.data as any, fg));
      } catch {}
    }

    const total = hasFilter ? records.length : await this.prisma.record.count({ where });

    const paged = hasFilter
      ? records.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit))
      : records;

    return {
      data: paged,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  private applyFilterGroup(data: any, group: any): boolean {
    const results: boolean[] = [
      ...group.conditions.map((c: any) => this.applyCondition(data, c)),
      ...(group.groups || []).map((g: any) => this.applyFilterGroup(data, g)),
    ];
    if (results.length === 0) return true;
    return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private applyCondition(data: any, c: any): boolean {
    const raw = data?.[c.field];
    const val = raw ?? '';
    const cv = c.value ?? '';

    switch (c.operator) {
      case 'is':           return String(val) === String(cv);
      case 'is_not':       return String(val) !== String(cv);
      case 'contains':     return String(val).toLowerCase().includes(String(cv).toLowerCase());
      case 'not_contains': return !String(val).toLowerCase().includes(String(cv).toLowerCase());
      case 'starts_with':  return String(val).toLowerCase().startsWith(String(cv).toLowerCase());
      case 'ends_with':    return String(val).toLowerCase().endsWith(String(cv).toLowerCase());
      case 'empty':        return !raw || raw === '' || (Array.isArray(raw) && raw.length === 0);
      case 'not_empty':    return !!raw && raw !== '' && !(Array.isArray(raw) && raw.length === 0);
      case 'eq':           return Number(val) === Number(cv);
      case 'neq':          return Number(val) !== Number(cv);
      case 'lt':           return Number(val) < Number(cv);
      case 'lte':          return Number(val) <= Number(cv);
      case 'gt':           return Number(val) > Number(cv);
      case 'gte':          return Number(val) >= Number(cv);
      case 'between':      return Number(val) >= Number(cv) && Number(val) <= Number(c.value2);
      case 'today':        { const d = new Date(); const v = new Date(val); return v.toDateString() === d.toDateString(); }
      case 'yesterday':    { const d = new Date(); d.setDate(d.getDate() - 1); return new Date(val).toDateString() === d.toDateString(); }
      case 'this_week':    { const now = new Date(); const ws = new Date(now); ws.setDate(now.getDate() - now.getDay()); return new Date(val) >= ws && new Date(val) <= now; }
      case 'this_month':   { const now = new Date(); const d = new Date(val); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
      case 'last_month':   { const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const d = new Date(val); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
      case 'date_between': { const d = new Date(val); return d >= new Date(cv) && d <= new Date(c.value2); }
      default:             return true;
    }
  }

  async findOne(id: string, orgId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        module: {
          include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { options: true } } },
        },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        files: true,
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async update(id: string, orgId: string, userId: string, data: Record<string, any>) {
    const record = await this.prisma.record.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const existingData = (record.data as Record<string, any>) || {};
    const mergedData = { ...existingData, ...data };

    const updated = await this.prisma.record.update({
      where: { id },
      data: { data: mergedData, updatedById: userId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: orgId,
        action: 'RECORD_UPDATED', entityType: 'Record', entityId: id,
        metadata: { changes: data },
      },
    });

    // Fire RECORD_UPDATED workflows asynchronously
    this.workflows.executeForRecord(
      'RECORD_UPDATED', record.moduleId, orgId,
      { ...updated, data: mergedData },
      existingData,
    ).catch(() => {});

    return updated;
  }

  async softDelete(id: string, orgId: string, userId: string) {
    const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId } });
    if (!record) throw new NotFoundException('Record not found');
    await this.prisma.record.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId, organizationId: orgId, action: 'RECORD_DELETED', entityType: 'Record', entityId: id, metadata: {} },
    });
    return { success: true };
  }

  async bulkDelete(ids: string[], orgId: string, userId: string) {
    await this.prisma.record.updateMany({
      where: { id: { in: ids }, organizationId: orgId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true, count: ids.length };
  }

  async bulkUpdateField(ids: string[], fieldName: string, value: any, orgId: string) {
    let updated = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        const record = await this.prisma.record.findFirst({
          where: { id, organizationId: orgId, isDeleted: false },
        });
        if (!record) { errors.push(id); continue; }
        const currentData = (record.data as Record<string, any>) || {};
        await this.prisma.record.update({
          where: { id },
          data: { data: { ...currentData, [fieldName]: value } },
        });
        updated++;
      } catch {
        errors.push(id);
      }
    }
    return { updated, errors, total: ids.length };
  }

  async addComment(recordId: string, orgId: string, userId: string, content: string) {
    const record = await this.prisma.record.findFirst({ where: { id: recordId, organizationId: orgId } });
    if (!record) throw new NotFoundException('Record not found');
    return this.prisma.comment.create({
      data: { recordId, userId, content },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async exportCsv(moduleId: string, orgId: string, filterGroup?: string): Promise<string> {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const result = await this.findAll(moduleId, orgId, { page: 1, limit: 5000, filterGroup });
    const fields = mod.fields.filter(f => !['FILE', 'IMAGE', 'SIGNATURE'].includes(f.type));

    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = ['ID', ...fields.map(f => f.label), 'Created At'].map(esc).join(',');
    const rows = result.data.map(r => {
      const d = r.data as Record<string, any>;
      return [
        r.id,
        ...fields.map(f => Array.isArray(d[f.name]) ? (d[f.name] as string[]).join('; ') : d[f.name]),
        new Date(r.createdAt).toISOString(),
      ].map(esc).join(',');
    });

    return [header, ...rows].join('\n');
  }

  // import methods removed

  private parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const vals = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
    return { headers, rows };
  }

  async importPreview(csvText: string) {
    const { headers, rows } = this.parseCsv(csvText);
    return { headers, preview: rows.slice(0, 5), total: rows.length };
  }

  async importCsv(
    moduleId: string, orgId: string, userId: string,
    csvText: string, mapping: Record<string, string>,
  ) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, include: { options: true } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const { rows } = this.parseCsv(csvText);
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const data: Record<string, any> = {};
        for (const [csvCol, fieldName] of Object.entries(mapping)) {
          if (fieldName && rows[i][csvCol] !== undefined && rows[i][csvCol] !== '') {
            data[fieldName] = rows[i][csvCol];
          }
        }
        for (const field of mod.fields) {
          if (field.type === 'AUTO_NUMBER') {
            data[field.name] = await this.generateAutoNumber(field, moduleId, orgId);
          }
        }
        await this.prisma.record.create({
          data: { moduleId, organizationId: orgId, createdById: userId, data },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err?.message || 'Unknown error'}`);
      }
    }

    if (imported > 0) {
      await this.prisma.auditLog.create({
        data: {
          userId, organizationId: orgId,
          action: 'RECORDS_IMPORTED', entityType: mod.name, entityId: moduleId,
          metadata: { imported, errors: errors.length },
        },
      });
    }

    return { imported, errors, total: rows.length };
  }

  async getImportTemplate(moduleId: string, orgId: string): Promise<string> {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const fields = mod.fields.filter(f => !['AUTO_NUMBER', 'FILE', 'IMAGE', 'SIGNATURE'].includes(f.type));
    const esc = (v: string) => /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const header = fields.map(f => esc(f.label)).join(',');
    const example = fields.map(f => {
      switch (f.type) {
        case 'NUMBER': case 'DECIMAL': case 'CURRENCY': return '100';
        case 'BOOLEAN': return 'true';
        case 'DATE': return '2025-01-15';
        case 'DATETIME': return '2025-01-15T09:00:00';
        case 'EMAIL': return 'example@email.com';
        case 'PHONE': return '+1-555-0100';
        case 'URL': return 'https://example.com';
        case 'RATING': return '4';
        case 'PROGRESS': return '50';
        default: return `Example ${f.label}`;
      }
    }).map(esc).join(',');
    return [header, example].join('\n');
  }

  async lookupSearch(orgId: string, targetModuleId: string, displayField: string, search: string) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: targetModuleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Target module not found');

    const records = await this.prisma.record.findMany({
      where: { moduleId: targetModuleId, organizationId: orgId, isDeleted: false },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const filtered = search
      ? records.filter(r => {
          const val = (r.data as any)?.[displayField];
          return val && String(val).toLowerCase().includes(search.toLowerCase());
        })
      : records.slice(0, 20);

    return filtered.map(r => ({
      id: r.id,
      label: (r.data as any)?.[displayField] ?? r.id,
      data: r.data,
    }));
  }
}
