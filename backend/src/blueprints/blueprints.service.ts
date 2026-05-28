import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlueprintsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.blueprint.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const bp = await this.prisma.blueprint.findFirst({
      where: { id, organizationId: orgId },
      include: {
        module: {
          select: {
            id: true, name: true, slug: true, icon: true,
            fields: {
              where: { isActive: true },
              include: { options: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!bp) throw new NotFoundException('Blueprint not found');
    return bp;
  }

  async findForModule(moduleId: string, orgId: string) {
    return this.prisma.blueprint.findFirst({
      where: { moduleId, organizationId: orgId, isActive: true },
    });
  }

  async create(orgId: string, data: any) {
    const name = (data.name ?? '').toString().trim();
    if (!name) throw new BadRequestException('Name is required');
    if (!data.moduleId) throw new BadRequestException('Module is required');
    if (!data.statusFieldName) throw new BadRequestException('Status field is required');

    return this.prisma.blueprint.create({
      data: {
        name,
        description: data.description ? String(data.description) : null,
        moduleId: data.moduleId,
        statusFieldName: String(data.statusFieldName),
        phases: data.phases ?? [],
        transitions: data.transitions ?? [],
        fieldLocks: data.fieldLocks ?? {},
        treeData: data.treeData ?? null,
        organizationId: orgId,
      },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');

    const safe: any = {};
    if (data.name            !== undefined) safe.name            = String(data.name).trim();
    if (data.description     !== undefined) safe.description     = data.description ? String(data.description) : null;
    if (data.statusFieldName !== undefined) safe.statusFieldName = String(data.statusFieldName);
    if (data.phases          !== undefined) safe.phases          = data.phases;
    if (data.transitions     !== undefined) safe.transitions     = data.transitions;
    if (data.fieldLocks      !== undefined) safe.fieldLocks      = data.fieldLocks;
    if (data.rules           !== undefined) safe.rules           = data.rules;
    if (data.treeData        !== undefined) safe.treeData        = data.treeData;
    if (data.isActive        !== undefined) safe.isActive        = Boolean(data.isActive);

    return this.prisma.blueprint.update({ where: { id }, data: safe });
  }

  async remove(id: string, orgId: string) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');
    return this.prisma.blueprint.update({ where: { id }, data: { isActive: false } });
  }

  // ── Tree evaluation ─────────────────────────────────────────────────────────

  evaluateTree(treeData: any, recordData: any): { actions: any[] } {
    if (!treeData?.nodes?.length) return { actions: [] };
    const nodes: any[] = treeData.nodes;
    const out: any[] = [];
    const roots = nodes.filter((n: any) => !n.parentId);
    if (roots.length) this.walkNode(roots[0], nodes, recordData, out);
    return { actions: out };
  }

  private walkNode(node: any, allNodes: any[], data: any, out: any[]) {
    const children = allNodes.filter((n: any) => n.parentId === node.id);
    if (node.type === 'phase') {
      this.processChildren(children, allNodes, data, out);
    } else if (node.type === 'condition') {
      if (node.branchType === 'else') {
        this.processChildren(children, allNodes, data, out);
      } else {
        if (this.evalCondGroup(node.conditions, node.conditionsLogic, data)) {
          this.processChildren(children, allNodes, data, out);
        }
      }
    } else if (node.type === 'action') {
      out.push(...(node.actions ?? []));
    }
  }

  private processChildren(children: any[], allNodes: any[], data: any, out: any[]) {
    const conds = children.filter((c: any) => c.type === 'condition');
    const acts  = children.filter((c: any) => c.type === 'action');

    // Evaluate IF / ELSE IF / ELSE chains
    let i = 0;
    while (i < conds.length) {
      if (conds[i].branchType !== 'if') { i++; continue; }
      const chain = [conds[i]];
      let j = i + 1;
      while (j < conds.length && conds[j].branchType !== 'if') {
        chain.push(conds[j]);
        j++;
      }
      for (const n of chain) {
        if (n.branchType === 'else') {
          this.walkNode(n, allNodes, data, out);
          break;
        }
        if (this.evalCondGroup(n.conditions, n.conditionsLogic, data)) {
          this.walkNode(n, allNodes, data, out);
          break;
        }
      }
      i = j;
    }

    // Always run standalone action children
    for (const a of acts) this.walkNode(a, allNodes, data, out);
  }

  private evalCondGroup(conds: any[], logic: string, data: any): boolean {
    if (!conds?.length) return true;
    const results = conds.map((c: any) => this.evalCondition(c, data));
    return (logic ?? 'AND') === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  // ── Record evaluation (legacy + tree) ──────────────────────────────────────

  async evaluateForRecord(recordId: string, orgId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
    });
    if (!blueprint) {
      return { blueprint: null, currentPhase: null, lockedFields: [], availableTransitions: [], treeActions: [] };
    }

    const phases       = (blueprint.phases as any[]) || [];
    const transitions  = (blueprint.transitions as any[]) || [];
    const fieldLocks   = (blueprint.fieldLocks as any) || {};
    const recordData   = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];

    const currentPhase =
      phases.find((p: any) => p.id === currentValue || p.name === currentValue) ?? null;

    const lockedFields: string[] = currentPhase
      ? (fieldLocks[currentPhase.id] || fieldLocks[currentPhase.name] || [])
      : [];

    const availableTransitions = transitions.filter((t: any) => {
      if (t.fromPhaseId !== currentPhase?.id) return false;
      if (!t.conditions || t.conditions.length === 0) return true;
      const logic = t.conditionsLogic || 'AND';
      const results = (t.conditions as any[]).map((c: any) => this.evalCondition(c, recordData));
      return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });

    // Tree-based evaluation (new system)
    const treeActions = blueprint.treeData
      ? this.evaluateTree(blueprint.treeData, recordData).actions
      : [];

    return { blueprint, currentPhase, lockedFields, availableTransitions, treeActions };
  }

  private evalCondition(cond: any, data: Record<string, any>): boolean {
    const v  = data[cond.fieldName];
    const rv = String(cond.value ?? '');
    switch (cond.operator) {
      case 'equals':     return String(v ?? '') === rv;
      case 'not_equals': return String(v ?? '') !== rv;
      case 'contains':   return String(v ?? '').toLowerCase().includes(rv.toLowerCase());
      case 'gt':         return Number(v) > Number(rv);
      case 'lt':         return Number(v) < Number(rv);
      case 'gte':        return Number(v) >= Number(rv);
      case 'lte':        return Number(v) <= Number(rv);
      case 'is_empty':   return v === null || v === undefined || v === '';
      case 'not_empty':  return v !== null && v !== undefined && v !== '';
      default:           return false;
    }
  }
}
