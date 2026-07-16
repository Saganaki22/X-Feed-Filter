import { SCHEMA_VERSION } from './constants.js';
import type { HideMode, MatchMode, Rule, RuleType, Settings } from './types.js';

/** Generate a unique id. Uses the platform RNG when available. */
export function uid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'r-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEFAULT_HIDE_MODE: HideMode = 'hide';

/** Factory for a new rule with sensible defaults. */
export function createRule(input: {
  type: RuleType;
  value: string;
  matchMode?: MatchMode;
  caseSensitive?: boolean;
  enabled?: boolean;
  note?: string;
  id?: string;
  createdAt?: number;
}): Rule {
  const now = Date.now();
  return {
    id: input.id ?? uid(),
    type: input.type,
    value: input.value,
    matchMode: input.matchMode ?? 'contains',
    caseSensitive: input.caseSensitive ?? false,
    enabled: input.enabled ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    note: input.note,
  };
}

/** A clean, fully-populated settings object. */
export function createDefaultSettings(): Settings {
  return {
    schemaVersion: SCHEMA_VERSION,
    masterEnabled: true,
    hideMode: DEFAULT_HIDE_MODE,
    rules: [],
  };
}
