import { describe, expect, it } from 'vitest';
import {
  normaliseFields,
  normaliseText,
  stripHandleMarker,
  stripHashtagMarker,
} from '../../src/shared/normalise.js';

describe('normaliseText', () => {
  it('collapses whitespace and trims', () => {
    expect(normaliseText('  Kai   Cenat  ')).toBe('kai cenat');
  });

  it('is case-insensitive by default and locale-aware', () => {
    expect(normaliseText('İSTANBUL')).toBe(normaliseText('İSTANBUL'));
    expect(normaliseText('STRASS').length).toBeGreaterThan(0);
  });

  it('preserves case when asked', () => {
    expect(normaliseText('Kai Cenat', true)).toBe('Kai Cenat');
  });

  it('applies NFKC to full-width letters', () => {
    expect(normaliseText('ｃａｔ')).toBe('cat');
  });

  it('strips zero-width characters', () => {
    expect(normaliseText('c\u200ba\u200bt')).toBe('cat');
    expect(normaliseText('cat\u200d')).toBe('cat');
  });

  it('handles null/undefined safely', () => {
    expect(normaliseText(undefined)).toBe('');
    expect(normaliseText(null)).toBe('');
  });
});

describe('stripHandleMarker / stripHashtagMarker', () => {
  it('strips an ASCII @', () => {
    expect(stripHandleMarker('@KaiCenat')).toBe('KaiCenat');
  });
  it('strips a fullwidth @', () => {
    expect(stripHandleMarker('＠KaiCenat')).toBe('KaiCenat');
  });
  it('strips an ASCII #', () => {
    expect(stripHashtagMarker('#Stream')).toBe('Stream');
  });
  it('strips a fullwidth #', () => {
    expect(stripHashtagMarker('＃Stream')).toBe('Stream');
  });
});

describe('normaliseFields', () => {
  it('produces ci and cs bags for present fields', () => {
    const out = normaliseFields({ text: 'Cat', handle: 'acme' });
    expect(out.ci.text).toBe('cat');
    expect(out.cs.text).toBe('Cat');
    expect(out.ci.handle).toBe('acme');
    expect(out.cs.handle).toBe('acme');
  });

  it('omits absent fields', () => {
    const out = normaliseFields({ text: 'Cat' });
    expect(out.ci.handle).toBeUndefined();
  });
});
