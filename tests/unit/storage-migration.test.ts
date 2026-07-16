import { describe, expect, it } from 'vitest';
import { migrate } from '../../src/shared/storage.js';
import { createDefaultSettings } from '../../src/shared/defaults.js';
import { SCHEMA_VERSION } from '../../src/shared/constants.js';

describe('migrate', () => {
  it('returns defaults for non-object input', () => {
    const out = migrate(null);
    expect(out).toEqual(createDefaultSettings());
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('returns defaults for malformed input', () => {
    expect(migrate('hello')).toEqual(createDefaultSettings());
    expect(migrate(42)).toEqual(createDefaultSettings());
    expect(migrate({})).toEqual(createDefaultSettings());
  });

  it('merges partial input with defaults', () => {
    const out = migrate({ masterEnabled: false });
    expect(out.masterEnabled).toBe(false);
    expect(out.hideMode).toBe('hide');
    expect(out.rules).toEqual([]);
  });

  it('coerces invalid enums back to defaults', () => {
    const out = migrate({ hideMode: 'explode', masterEnabled: 'yes' });
    expect(out.hideMode).toBe('hide');
    expect(out.masterEnabled).toBe(true);
  });

  it('keeps well-formed rules and fills missing fields', () => {
    const out = migrate({ rules: [{ id: 'x', type: 'phrase', value: 'cat' }] });
    expect(out.rules).toHaveLength(1);
    const r = out.rules[0]!;
    expect(r).toMatchObject({
      id: 'x',
      type: 'phrase',
      value: 'cat',
      matchMode: 'contains',
      caseSensitive: false,
      enabled: true,
    });
  });

  it('drops rules without a value', () => {
    const out = migrate({
      rules: [
        { type: 'phrase', value: '' },
        { type: 'handle', value: 'ok' },
      ],
    });
    expect(out.rules).toHaveLength(1);
    expect(out.rules[0]!.value).toBe('ok');
  });

  it('renames clashing duplicate ids', () => {
    const out = migrate({
      rules: [
        { id: 'dup', type: 'phrase', value: 'a' },
        { id: 'dup', type: 'phrase', value: 'b' },
      ],
    });
    expect(out.rules).toHaveLength(2);
    expect(new Set(out.rules.map((r) => r.id)).size).toBe(2);
  });

  it('forces schemaVersion to current', () => {
    const out = migrate({ schemaVersion: 0, rules: [] });
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
