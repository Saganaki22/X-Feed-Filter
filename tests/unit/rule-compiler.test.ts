import { describe, expect, it } from 'vitest';
import { createRule } from '../../src/shared/defaults.js';
import { compileRule, compileRules } from '../../src/shared/rule-compiler.js';
import { normaliseFields } from '../../src/shared/normalise.js';
import type { PostFields } from '../../src/shared/types.js';

function match(rule: ReturnType<typeof createRule>, fields: PostFields): boolean {
  const compiled = compileRule(rule);
  if (!compiled) throw new Error('rule did not compile');
  return compiled.test(normaliseFields(fields));
}

describe('phrase rules', () => {
  it('matches via contains by default (case-insensitive)', () => {
    const rule = createRule({ type: 'phrase', value: 'Kai Cenat' });
    expect(match(rule, { text: 'watching kai cenat live' })).toBe(true);
    expect(match(rule, { text: 'kai cenatic behaviour' })).toBe(true); // contains
    expect(match(rule, { text: 'nothing here' })).toBe(false);
  });

  it('whole-word mode respects Unicode boundaries', () => {
    const rule = createRule({ type: 'phrase', value: 'cat', matchMode: 'whole' });
    expect(match(rule, { text: 'the cat sat' })).toBe(true);
    expect(match(rule, { text: 'a category of things' })).toBe(false);
    expect(match(rule, { text: 'cat!' })).toBe(true);
  });

  it('case-sensitive mode distinguishes case', () => {
    const rule = createRule({ type: 'phrase', value: 'Cat', caseSensitive: true });
    expect(match(rule, { text: 'a Cat' })).toBe(true);
    expect(match(rule, { text: 'a cat' })).toBe(false);
  });

  it('matches across all phrase field regions', () => {
    const rule = createRule({ type: 'phrase', value: 'spammer' });
    expect(match(rule, { displayName: 'Big Spammer' })).toBe(true);
    expect(match(rule, { quotedText: 'quoted spammer text' })).toBe(true);
    expect(match(rule, { repostAttribution: 'A spammer reposted' })).toBe(true);
  });
});

describe('handle rules', () => {
  it('matches by handle, ignoring the @ marker', () => {
    const rule = createRule({ type: 'handle', value: '@KaiCenat' });
    expect(match(rule, { handle: 'KaiCenat' })).toBe(true);
    expect(match(rule, { handle: 'someone_else' })).toBe(false);
  });

  it('contains mode matches substrings; whole mode does not', () => {
    const contains = createRule({ type: 'handle', value: 'cat', matchMode: 'contains' });
    const whole = createRule({ type: 'handle', value: 'cat', matchMode: 'whole' });
    expect(match(contains, { handle: '@catalog' })).toBe(true);
    expect(match(whole, { handle: '@catalog' })).toBe(false);
    expect(match(whole, { handle: 'cat' })).toBe(true);
  });
});

describe('hashtag rules', () => {
  it('matches the hashtag token in text', () => {
    const rule = createRule({ type: 'hashtag', value: '#StreamerUniversity' });
    expect(match(rule, { text: 'so excited for #StreamerUniversity' })).toBe(true);
    expect(match(rule, { text: 'streameruniversity is bad' })).toBe(false);
  });

  it('whole mode does not match a longer hashtag', () => {
    const rule = createRule({ type: 'hashtag', value: 'Stream', matchMode: 'whole' });
    expect(match(rule, { text: '#StreamerUniversity' })).toBe(false);
    expect(match(rule, { text: '#Stream rules' })).toBe(true);
  });
});

describe('compileRules', () => {
  it('drops disabled and empty rules', () => {
    const rules = [
      createRule({ type: 'phrase', value: 'ok' }),
      createRule({ type: 'phrase', value: 'ok', enabled: false }),
      createRule({ type: 'phrase', value: '   ' }),
      createRule({ type: 'hashtag', value: '#' }),
    ];
    expect(compileRules(rules)).toHaveLength(1);
  });
});
