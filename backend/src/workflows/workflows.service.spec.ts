import { Test } from '@nestjs/testing';
import { WorkflowsService } from './workflows.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';

function buildRecord(data: any, moduleId = 'mod1', orgId = 'org1') {
  return { id: `rec-${Math.random()}`, data, moduleId, organizationId: orgId, createdById: null };
}

describe('WorkflowsService — rule group execution', () => {
  let service: WorkflowsService;
  let mockPrisma: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockPrisma = {
      workflow: { findMany: jest.fn(), findFirst: jest.fn() },
      workflowExecution: {
        create: jest.fn().mockResolvedValue({ id: 'exec-1' }),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      record: { update: jest.fn().mockResolvedValue({ updatedAt: new Date() }) },
      blueprint: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    mockGateway = {
      emitToModule: jest.fn(),
      emitToOrg: jest.fn(),
      emitToUser: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppGateway, useValue: mockGateway },
      ],
    }).compile();

    service = moduleRef.get(WorkflowsService);
  });

  it('legacy workflow (no rule groups) evaluates and executes exactly as before', async () => {
    const wf = {
      id: 'wf-legacy',
      isRepeatable: true,
      conditions: [{ field: 'status', operator: 'is', value: 'Active' }],
      actions: [{ type: 'SET_FIELD', config: { field: 'flag', value: 'yes' }, order: 0 }],
      ruleGroups: [],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_CREATED', 'mod1', 'org-legacy', buildRecord({ status: 'Active' }, 'mod1', 'org-legacy'));

    expect(mockPrisma.workflowExecution.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.record.update).toHaveBeenCalledTimes(1);
  });

  it('legacy workflow does not execute when its flat conditions do not match', async () => {
    const wf = {
      id: 'wf-legacy-2',
      isRepeatable: true,
      conditions: [{ field: 'status', operator: 'is', value: 'Active' }],
      actions: [{ type: 'SET_FIELD', config: { field: 'flag', value: 'yes' }, order: 0 }],
      ruleGroups: [],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_CREATED', 'mod1', 'org-legacy-2', buildRecord({ status: 'Inactive' }, 'mod1', 'org-legacy-2'));

    expect(mockPrisma.workflowExecution.create).not.toHaveBeenCalled();
    expect(mockPrisma.record.update).not.toHaveBeenCalled();
  });

  it('runs actions for every matching rule group — does not stop after the first match', async () => {
    const wf = {
      id: 'wf-multi',
      isRepeatable: true,
      conditions: [],
      actions: [],
      ruleGroups: [
        {
          id: 'g1',
          isActive: true,
          conditions: { type: 'group', operator: 'AND', children: [{ type: 'condition', field: 'status', operator: 'is', value: 'Active' }] },
          actions: [{ type: 'SET_FIELD', config: { field: 'f1', value: '1' }, order: 0 }],
        },
        {
          id: 'g2',
          isActive: true,
          conditions: { type: 'group', operator: 'AND', children: [{ type: 'condition', field: 'status', operator: 'is', value: 'Active' }] },
          actions: [{ type: 'SET_FIELD', config: { field: 'f2', value: '2' }, order: 0 }],
        },
      ],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_CREATED', 'mod1', 'org-multi', buildRecord({ status: 'Active' }, 'mod1', 'org-multi'));

    // Both rule groups matched and fired their own action — one execution row for the trigger, two record updates.
    expect(mockPrisma.workflowExecution.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.record.update).toHaveBeenCalledTimes(2);
  });

  it('skips an inactive rule group entirely, even if its conditions would match', async () => {
    const wf = {
      id: 'wf-inactive',
      isRepeatable: true,
      conditions: [],
      actions: [],
      ruleGroups: [
        {
          id: 'g1',
          isActive: false,
          conditions: { type: 'group', operator: 'AND', children: [] },
          actions: [{ type: 'SET_FIELD', config: { field: 'f1', value: '1' }, order: 0 }],
        },
      ],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_CREATED', 'mod1', 'org-inactive', buildRecord({}, 'mod1', 'org-inactive'));

    expect(mockPrisma.workflowExecution.create).not.toHaveBeenCalled();
    expect(mockPrisma.record.update).not.toHaveBeenCalled();
  });

  it('fires only the matching sibling group when one group matches and another does not', async () => {
    const wf = {
      id: 'wf-mixed',
      isRepeatable: true,
      conditions: [],
      actions: [],
      ruleGroups: [
        {
          id: 'g-no-match',
          isActive: true,
          conditions: { type: 'group', operator: 'AND', children: [{ type: 'condition', field: 'status', operator: 'is', value: 'Closed' }] },
          actions: [{ type: 'SET_FIELD', config: { field: 'shouldNotRun', value: '1' }, order: 0 }],
        },
        {
          id: 'g-match',
          isActive: true,
          conditions: { type: 'group', operator: 'AND', children: [{ type: 'condition', field: 'status', operator: 'is', value: 'Active' }] },
          actions: [{ type: 'SET_FIELD', config: { field: 'shouldRun', value: '1' }, order: 0 }],
        },
      ],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_CREATED', 'mod1', 'org-mixed', buildRecord({ status: 'Active' }, 'mod1', 'org-mixed'));

    expect(mockPrisma.record.update).toHaveBeenCalledTimes(1);
    const [[, updateArgs]] = mockPrisma.record.update.mock.calls.map((c: any) => [c[0], c[0]]);
    expect(updateArgs.data.data.shouldRun).toBe('1');
    expect(updateArgs.data.data.shouldNotRun).toBeUndefined();
  });

  it('skips the whole workflow when no rule group matches', async () => {
    const wf = {
      id: 'wf-none-match',
      isRepeatable: true,
      conditions: [],
      actions: [],
      ruleGroups: [
        {
          id: 'g1',
          isActive: true,
          conditions: { type: 'group', operator: 'AND', children: [{ type: 'condition', field: 'status', operator: 'is', value: 'Closed' }] },
          actions: [{ type: 'SET_FIELD', config: { field: 'f1', value: '1' }, order: 0 }],
        },
      ],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_CREATED', 'mod1', 'org-none', buildRecord({ status: 'Active' }, 'mod1', 'org-none'));

    expect(mockPrisma.workflowExecution.create).not.toHaveBeenCalled();
    expect(mockPrisma.record.update).not.toHaveBeenCalled();
  });

  it('excludes blueprint-linked workflows from the native-trigger query — they only run through their specific transition', async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([]);

    await service.executeForRecord('RECORD_UPDATED', 'mod1', 'org-linked', buildRecord({ gpa: 3.9 }, 'mod1', 'org-linked'));

    expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ linkedTransitionId: null }),
      }),
    );
  });

  it('executeWorkflowById still runs a linked workflow directly, bypassing the native-trigger exclusion', async () => {
    const wf = {
      id: 'wf-linked',
      isActive: true,
      linkedBlueprintId: 'bp-1',
      linkedTransitionId: 't-1',
      conditions: [],
      actions: [],
      ruleGroups: [
        {
          id: 'g1',
          isActive: true,
          conditions: { type: 'group', operator: 'AND', children: [{ type: 'condition', field: 'gpa', operator: 'gte', value: '3.5' }] },
          actions: [{ type: 'SET_FIELD', config: { field: 'status', value: 'Graduated' }, order: 0 }],
        },
      ],
    };
    mockPrisma.workflow.findFirst.mockResolvedValue(wf);

    await service.executeWorkflowById('wf-linked', 'org-linked', buildRecord({ gpa: 3.9 }, 'mod1', 'org-linked'));

    expect(mockPrisma.record.update).toHaveBeenCalledTimes(1);
  });
});

describe('WorkflowsService — field lock enforcement in action execution', () => {
  let service: WorkflowsService;
  let mockPrisma: any;
  let mockGateway: any;

  const lockedBlueprint = {
    id: 'bp1',
    statusFieldName: 'status',
    phases: [{ id: 'p1', name: 'Approved' }],
    fieldLocks: { p1: ['gpa'] },
  };

  beforeEach(async () => {
    mockPrisma = {
      workflow: { findMany: jest.fn(), findFirst: jest.fn() },
      workflowExecution: {
        create: jest.fn().mockResolvedValue({ id: 'exec-1' }),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      record: { update: jest.fn().mockResolvedValue({ updatedAt: new Date() }) },
      blueprint: { findFirst: jest.fn().mockResolvedValue(lockedBlueprint) },
    };
    mockGateway = { emitToModule: jest.fn(), emitToOrg: jest.fn(), emitToUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppGateway, useValue: mockGateway },
      ],
    }).compile();

    service = moduleRef.get(WorkflowsService);
  });

  it('SET_FIELD skips a field locked at the record\'s current stage', async () => {
    const wf = {
      id: 'wf-set-locked',
      isRepeatable: true,
      conditions: [],
      actions: [{ type: 'SET_FIELD', config: { field: 'gpa', value: '2.0' }, order: 0 }],
      ruleGroups: [],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_UPDATED', 'mod1', 'org1', buildRecord({ status: 'p1', gpa: 3.9 }, 'mod1', 'org1'));

    expect(mockPrisma.record.update).not.toHaveBeenCalled();
  });

  it('SET_FIELD applies the change when allowLockOverride is set on the action', async () => {
    const wf = {
      id: 'wf-set-override',
      isRepeatable: true,
      conditions: [],
      actions: [{ type: 'SET_FIELD', config: { field: 'gpa', value: '2.0', allowLockOverride: true }, order: 0 }],
      ruleGroups: [],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_UPDATED', 'mod1', 'org1', buildRecord({ status: 'p1', gpa: 3.9 }, 'mod1', 'org1'));

    expect(mockPrisma.record.update).toHaveBeenCalledTimes(1);
  });

  it('UPDATE_RECORD drops only the locked field from its patch, keeping unlocked fields', async () => {
    const wf = {
      id: 'wf-update-locked',
      isRepeatable: true,
      conditions: [],
      actions: [{
        type: 'UPDATE_RECORD',
        config: { updates: [{ field: 'gpa', value: '2.0' }, { field: 'notes', value: 'reviewed' }] },
        order: 0,
      }],
      ruleGroups: [],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_UPDATED', 'mod1', 'org1', buildRecord({ status: 'p1', gpa: 3.9 }, 'mod1', 'org1'));

    expect(mockPrisma.record.update).toHaveBeenCalledTimes(1);
    const [[updateArgs]] = mockPrisma.record.update.mock.calls;
    expect(updateArgs.data.data.notes).toBe('reviewed');
    expect(updateArgs.data.data.gpa).toBe(3.9);
  });

  it('UPDATE_RECORD applies every field when allowLockOverride is set on the action', async () => {
    const wf = {
      id: 'wf-update-override',
      isRepeatable: true,
      conditions: [],
      actions: [{
        type: 'UPDATE_RECORD',
        config: { updates: [{ field: 'gpa', value: '2.0' }], allowLockOverride: true },
        order: 0,
      }],
      ruleGroups: [],
    };
    mockPrisma.workflow.findMany.mockResolvedValue([wf]);

    await service.executeForRecord('RECORD_UPDATED', 'mod1', 'org1', buildRecord({ status: 'p1', gpa: 3.9 }, 'mod1', 'org1'));

    const [[updateArgs]] = mockPrisma.record.update.mock.calls;
    expect(updateArgs.data.data.gpa).toBe('2.0');
  });
});
