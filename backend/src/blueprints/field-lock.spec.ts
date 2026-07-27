import {
  normalizeStageLock,
  getLockInfoForRecordData,
  canOverrideLock,
  partitionLockedFields,
} from './field-lock';

describe('normalizeStageLock', () => {
  it('wraps a legacy string[] shape (locked fields, no override permissions)', () => {
    expect(normalizeStageLock(['gpa', 'status'], 'bp1', 'stage1')).toEqual({
      fields: ['gpa', 'status'],
      overrideRoles: [],
      overrideUserIds: [],
      blueprintId: 'bp1',
      stageId: 'stage1',
    });
  });

  it('reads the full object shape as-is', () => {
    const raw = { fields: ['gpa'], overrideRoles: ['ADMIN'], overrideUserIds: ['u1'] };
    expect(normalizeStageLock(raw, 'bp1', 'stage1')).toEqual({
      fields: ['gpa'],
      overrideRoles: ['ADMIN'],
      overrideUserIds: ['u1'],
      blueprintId: 'bp1',
      stageId: 'stage1',
    });
  });

  it('tolerates a malformed object by defaulting missing arrays to empty', () => {
    expect(normalizeStageLock({ fields: 'not-an-array' }, 'bp1', 'stage1').fields).toEqual([]);
  });

  it('falls back to an empty lock for null/undefined/other', () => {
    expect(normalizeStageLock(null, 'bp1', 'stage1').fields).toEqual([]);
    expect(normalizeStageLock(undefined, 'bp1', 'stage1').fields).toEqual([]);
    expect(normalizeStageLock(42, 'bp1', 'stage1').fields).toEqual([]);
  });
});

describe('getLockInfoForRecordData', () => {
  function mockPrisma(blueprint: any) {
    return { blueprint: { findFirst: jest.fn().mockResolvedValue(blueprint) } } as any;
  }

  it('returns null when the module has no active blueprint', async () => {
    const prisma = mockPrisma(null);
    const result = await getLockInfoForRecordData(prisma, 'mod1', 'org1', { status: 'Approved' });
    expect(result).toBeNull();
  });

  it('returns null when the record data has no value matching a known phase', async () => {
    const prisma = mockPrisma({
      id: 'bp1',
      statusFieldName: 'status',
      phases: [{ id: 'p1', name: 'Draft' }],
      fieldLocks: { p1: ['gpa'] },
    });
    const result = await getLockInfoForRecordData(prisma, 'mod1', 'org1', { status: 'Unknown' });
    expect(result).toBeNull();
  });

  it('returns null when the current stage has no configured locks', async () => {
    const prisma = mockPrisma({
      id: 'bp1',
      statusFieldName: 'status',
      phases: [{ id: 'p1', name: 'Draft' }],
      fieldLocks: {},
    });
    const result = await getLockInfoForRecordData(prisma, 'mod1', 'org1', { status: 'p1' });
    expect(result).toBeNull();
  });

  it('matches the current stage by phase id or by phase name', async () => {
    const prisma = mockPrisma({
      id: 'bp1',
      statusFieldName: 'status',
      phases: [{ id: 'p1', name: 'Approved' }],
      fieldLocks: { p1: ['gpa'] },
    });
    const byId = await getLockInfoForRecordData(prisma, 'mod1', 'org1', { status: 'p1' });
    expect(byId?.fields).toEqual(['gpa']);

    const byName = await getLockInfoForRecordData(prisma, 'mod1', 'org1', { status: 'Approved' });
    expect(byName?.fields).toEqual(['gpa']);
  });

  it('returns null when the matched lock config has zero locked fields', async () => {
    const prisma = mockPrisma({
      id: 'bp1',
      statusFieldName: 'status',
      phases: [{ id: 'p1', name: 'Approved' }],
      fieldLocks: { p1: [] },
    });
    const result = await getLockInfoForRecordData(prisma, 'mod1', 'org1', { status: 'p1' });
    expect(result).toBeNull();
  });
});

describe('canOverrideLock', () => {
  const lock = { fields: ['gpa'], overrideRoles: ['REGISTRAR'], overrideUserIds: ['u42'], blueprintId: 'bp1', stageId: 'p1' };

  it('always allows ADMIN and SUPER_ADMIN regardless of configured overrides', () => {
    expect(canOverrideLock(lock, { id: 'u1', role: 'ADMIN' })).toBe(true);
    expect(canOverrideLock(lock, { id: 'u1', role: 'SUPER_ADMIN' })).toBe(true);
  });

  it('allows a user whose role is in overrideRoles', () => {
    expect(canOverrideLock(lock, { id: 'u1', role: 'REGISTRAR' })).toBe(true);
  });

  it('allows a user explicitly named in overrideUserIds', () => {
    expect(canOverrideLock(lock, { id: 'u42', role: 'STAFF' })).toBe(true);
  });

  it('denies a user with neither a matching role nor an explicit grant', () => {
    expect(canOverrideLock(lock, { id: 'u1', role: 'STAFF' })).toBe(false);
    expect(canOverrideLock(lock, { id: 'u1' })).toBe(false);
  });
});

describe('partitionLockedFields', () => {
  const lock = { fields: ['gpa'], overrideRoles: ['REGISTRAR'], overrideUserIds: [], blueprintId: 'bp1', stageId: 'p1' };

  it('passes everything through unchanged when there is no active lock', () => {
    const result = partitionLockedFields({ gpa: 4.0, name: 'Ann' }, null, { id: 'u1' }, false);
    expect(result).toEqual({ allowed: { gpa: 4.0, name: 'Ann' }, skipped: [], overridden: [] });
  });

  it('passes through fields the lock does not cover', () => {
    const result = partitionLockedFields({ name: 'Ann' }, lock, { id: 'u1' }, false);
    expect(result).toEqual({ allowed: { name: 'Ann' }, skipped: [], overridden: [] });
  });

  it('skips a locked field for a user who cannot override it', () => {
    const result = partitionLockedFields({ gpa: 4.0 }, lock, { id: 'u1', role: 'STAFF' }, true);
    expect(result.allowed).toEqual({});
    expect(result.skipped).toEqual([{ field: 'gpa', reason: 'LOCKED' }]);
    expect(result.overridden).toEqual([]);
  });

  it('holds back an authorized override until a reason is supplied', () => {
    const result = partitionLockedFields({ gpa: 4.0 }, lock, { id: 'u1', role: 'REGISTRAR' }, false);
    expect(result.allowed).toEqual({});
    expect(result.skipped).toEqual([{ field: 'gpa', reason: 'REASON_REQUIRED' }]);
    expect(result.overridden).toEqual([]);
  });

  it('applies the change and records it as an override once authorized with a reason', () => {
    const result = partitionLockedFields({ gpa: 4.0 }, lock, { id: 'u1', role: 'REGISTRAR' }, true);
    expect(result.allowed).toEqual({ gpa: 4.0 });
    expect(result.skipped).toEqual([]);
    expect(result.overridden).toEqual(['gpa']);
  });
});
