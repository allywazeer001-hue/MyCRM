import { applyIntegrationMapping, ResolvedIntegrationMapping } from './integration-mapping';

describe('applyIntegrationMapping', () => {
  it('overwrites the destination when behavior is UPDATE_EXISTING, even if a value already exists', () => {
    const current = { phone: '0655555555' };
    const source = { phone: '0712345678' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'phone', destinationFieldName: 'phone', behavior: 'UPDATE_EXISTING' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({ phone: '0712345678' });
  });

  it('leaves an existing value untouched when behavior is FILL_IF_EMPTY', () => {
    const current = { phone: '0655555555' };
    const source = { phone: '0712345678' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'phone', destinationFieldName: 'phone', behavior: 'FILL_IF_EMPTY' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({ phone: '0655555555' });
  });

  it('fills an empty destination when behavior is FILL_IF_EMPTY', () => {
    const current = { phone: '' };
    const source = { phone: '0712345678' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'phone', destinationFieldName: 'phone', behavior: 'FILL_IF_EMPTY' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({ phone: '0712345678' });
  });

  it('treats null and undefined destinations as empty for FILL_IF_EMPTY', () => {
    const source = { email: 'a@b.com' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'email', destinationFieldName: 'email', behavior: 'FILL_IF_EMPTY' },
    ];
    expect(applyIntegrationMapping({ email: null }, source, mappings).data).toEqual({ email: 'a@b.com' });
    expect(applyIntegrationMapping({}, source, mappings).data).toEqual({ email: 'a@b.com' });
  });

  it('only touches mapped destination keys, leaving every other key untouched', () => {
    const current = { firstName: 'Ally', lastName: 'Waziri', notes: 'keep me' };
    const source = { firstName: 'New', lastName: 'Name' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'firstName', destinationFieldName: 'firstName', behavior: 'UPDATE_EXISTING' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({
      firstName: 'New', lastName: 'Waziri', notes: 'keep me',
    });
  });

  it('skips a mapping whose source value is undefined (field not present on the source record)', () => {
    const current = { email: 'existing@example.com' };
    const source = {};
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'email', destinationFieldName: 'email', behavior: 'UPDATE_EXISTING' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({ email: 'existing@example.com' });
  });

  it('skips a mapping with a missing source or destination field name', () => {
    const current = { email: 'existing@example.com' };
    const source = { email: 'new@example.com' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: '', destinationFieldName: 'email', behavior: 'UPDATE_EXISTING' },
      { sourceFieldName: 'email', destinationFieldName: '', behavior: 'UPDATE_EXISTING' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({ email: 'existing@example.com' });
  });

  it('applies multiple independent mappings in one pass', () => {
    const current = { firstName: '', lastName: 'Kept', phone: '' };
    const source = { firstName: 'Ally', lastName: 'Overwritten', phone: '0712345678' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'firstName', destinationFieldName: 'firstName', behavior: 'FILL_IF_EMPTY' },
      { sourceFieldName: 'lastName', destinationFieldName: 'lastName', behavior: 'FILL_IF_EMPTY' },
      { sourceFieldName: 'phone', destinationFieldName: 'phone', behavior: 'UPDATE_EXISTING' },
    ];
    expect(applyIntegrationMapping(current, source, mappings).data).toEqual({
      firstName: 'Ally', lastName: 'Kept', phone: '0712345678',
    });
  });

  it('does not mutate the original currentValues object', () => {
    const current = { email: '' };
    const source = { email: 'new@example.com' };
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'email', destinationFieldName: 'email', behavior: 'FILL_IF_EMPTY' },
    ];
    const result = applyIntegrationMapping(current, source, mappings);
    expect(current).toEqual({ email: '' });
    expect(result.data).not.toBe(current);
  });

  // Re-selection behavior — the actual bug this feature was built to fix:
  // a FILL_IF_EMPTY field must update on a fresh re-selection (the visitor
  // picked a different record), but must NOT clobber a value the visitor
  // deliberately typed themselves after the last auto-fill.
  describe('re-selecting a different record (previouslyAutoFilled)', () => {
    const mappings: ResolvedIntegrationMapping[] = [
      { sourceFieldName: 'phone', destinationFieldName: 'phone', behavior: 'FILL_IF_EMPTY' },
    ];

    it('updates a FILL_IF_EMPTY field on re-selection when the visitor never touched it', () => {
      const first = applyIntegrationMapping({}, { phone: '0700000001' }, mappings);
      expect(first.data).toEqual({ phone: '0700000001' });

      const second = applyIntegrationMapping(first.data, { phone: '0700000002' }, mappings, first.autoFilled);
      expect(second.data).toEqual({ phone: '0700000002' });
    });

    it('does NOT overwrite a value the visitor manually typed after the first auto-fill', () => {
      const first = applyIntegrationMapping({}, { phone: '0700000001' }, mappings);
      const edited = { ...first.data, phone: '0799999999' }; // visitor typed their own number

      const second = applyIntegrationMapping(edited, { phone: '0700000002' }, mappings, first.autoFilled);
      expect(second.data).toEqual({ phone: '0799999999' });
    });

    it('carries forward autoFilled entries across multiple mappings so unrelated fields stay tracked', () => {
      const twoMappings: ResolvedIntegrationMapping[] = [
        { sourceFieldName: 'phone', destinationFieldName: 'phone', behavior: 'FILL_IF_EMPTY' },
        { sourceFieldName: 'email', destinationFieldName: 'email', behavior: 'FILL_IF_EMPTY' },
      ];
      const first = applyIntegrationMapping({}, { phone: '0700000001', email: 'a@b.com' }, twoMappings);
      expect(first.autoFilled).toEqual({ phone: '0700000001', email: 'a@b.com' });

      const second = applyIntegrationMapping(first.data, { phone: '0700000002', email: 'c@d.com' }, twoMappings, first.autoFilled);
      expect(second.data).toEqual({ phone: '0700000002', email: 'c@d.com' });
    });
  });
});
