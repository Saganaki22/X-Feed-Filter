import { describe, expect, it } from 'vitest';
import { createRule } from '../../src/shared/defaults.js';
import { compileRules } from '../../src/shared/rule-compiler.js';
import { matchFields } from '../../src/shared/rule-matcher.js';
import { normaliseFields } from '../../src/shared/normalise.js';
import type { PostFields } from '../../src/shared/types.js';

function run(values: string[], fields: PostFields) {
  const compiled = compileRules(values.map((v) => createRule({ type: 'phrase', value: v })));
  return matchFields(compiled, normaliseFields(fields));
}

describe('matchFields', () => {
  it('returns no match when nothing applies', () => {
    const out = run(['cat'], { text: 'just dogs here' });
    expect(out.matched).toBe(false);
    expect(out.ruleId).toBeNull();
  });

  it('first matching rule wins (rule order is respected)', () => {
    const out = run(['dog', 'cat'], { text: 'a cat and a dog' });
    expect(out.matched).toBe(true);
    expect(out.ruleValue).toBe('dog');
  });

  it('carries the matched rule value for placeholders', () => {
    const out = run(['Streamer University'], { text: 'Streamer University rocks' });
    expect(out.matched).toBe(true);
    expect(out.ruleValue).toBe('Streamer University');
  });

  it('does not match against fields outside a rule type', () => {
    const compiled = compileRules([createRule({ type: 'handle', value: 'kai' })]);
    // handle rules only look at handle/quotedHandle, never text
    const out = matchFields(compiled, normaliseFields({ text: 'kai' }));
    expect(out.matched).toBe(false);
  });
});
