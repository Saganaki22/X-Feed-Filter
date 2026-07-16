import type { CompiledRule, MatchOutcome, NormalizedFields } from './types.js';

/**
 * Evaluate a post's normalised fields against the compiled rule set.
 * First matching rule wins; rule order is the user's list order so users can
 * prioritise by reordering.
 */
export function matchFields(
  compiled: readonly CompiledRule[],
  fields: NormalizedFields,
): MatchOutcome {
  for (const rule of compiled) {
    if (rule.test(fields)) {
      return { matched: true, ruleId: rule.id, ruleValue: rule.rawValue };
    }
  }
  return { matched: false, ruleId: null, ruleValue: null };
}
