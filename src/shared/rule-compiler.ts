import { RULE_FIELD_MAP } from './constants.js';
import { normaliseText, stripHandleMarker, stripHashtagMarker } from './normalise.js';
import type { CompiledRule, NormalizedFields, Rule } from './types.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-phrase test: needle must be bounded by string edges or by a character
 * that is not a letter, number, or underscore. Uses Unicode property escapes so
 * it behaves sensibly across scripts (CJK, Cyrillic, …).
 */
const BOUNDARY_RE = (needle: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}_])${needle}(?=$|[^\\p{L}\\p{N}_])`, 'u');

function wholeMatch(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (haystack === needle) return true;
  return BOUNDARY_RE(escapeRegex(needle)).test(haystack);
}

function containsMatch(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.includes(needle);
}

type Comparator = (haystack: string, needle: string) => boolean;

function pickComparator(whole: boolean): Comparator {
  return whole ? wholeMatch : containsMatch;
}

/**
 * Turn one rule into a self-contained matcher. Returns null for rules that can
 * never match (empty value) so the engine can skip them.
 */
export function compileRule(rule: Rule): CompiledRule | null {
  const fieldKeys = RULE_FIELD_MAP[rule.type];

  // Prepare the needle per type.
  let needle: string;
  if (rule.type === 'handle') {
    needle = normaliseText(stripHandleMarker(rule.value), rule.caseSensitive);
  } else if (rule.type === 'hashtag') {
    // Keep the '#' so we match the actual hashtag token, not arbitrary text.
    needle = '#' + normaliseText(stripHashtagMarker(rule.value), rule.caseSensitive);
  } else {
    needle = normaliseText(rule.value, rule.caseSensitive);
  }
  if (!needle || needle === '#') return null;

  const whole = rule.matchMode === 'whole';
  const compare = pickComparator(whole);

  // Which case bag to read from, plus a per-type haystack transform.
  const bag = (f: NormalizedFields) => (rule.caseSensitive ? f.cs : f.ci);
  let transform: (s: string) => string;
  if (rule.type === 'handle') {
    // Handles: ignore '@' markers in the field text.
    transform = (s) => s.replace(/[@＠]/g, ' ');
  } else {
    transform = (s) => s;
  }

  const test = (fields: NormalizedFields): boolean => {
    const src = bag(fields);
    for (const k of fieldKeys) {
      const v = src[k];
      if (!v) continue;
      if (compare(transform(v), needle)) return true;
    }
    return false;
  };

  return {
    id: rule.id,
    type: rule.type,
    rawValue: rule.value,
    matchMode: rule.matchMode,
    fieldKeys,
    test,
  };
}

/** Compile every enabled rule; disabled and empty rules are dropped. */
export function compileRules(rules: readonly Rule[]): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    const c = compileRule(r);
    if (c) out.push(c);
  }
  return out;
}
