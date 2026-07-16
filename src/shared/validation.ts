import { stripHandleMarker, stripHashtagMarker } from './normalise.js';
import type { Rule, RuleType } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_VALUE_LEN = 280;

// X handles: letters, digits, underscore. Historically ≤15 chars; now longer,
// so we don't cap length, just the character set.
const HANDLE_RE = /^[A-Za-z0-9_]+$/;
// Hashtags: letters, digits, underscore (and we allow most Unicode letters).
const HASHTAG_RE = /^[\p{L}\p{N}_]+$/u;

export function validateRule(input: {
  type: RuleType;
  value: string;
  matchMode?: 'contains' | 'whole';
  caseSensitive?: boolean;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const value = (input.value ?? '').trim();

  if (value === '') {
    errors.push('Value cannot be empty.');
  }
  if (value.length > MAX_VALUE_LEN) {
    errors.push(`Value is too long (max ${MAX_VALUE_LEN} characters).`);
  }

  if (input.type === 'handle') {
    const cleaned = stripHandleMarker(value);
    if (cleaned === '') {
      errors.push('Handle is empty after removing the leading “@”.');
    } else if (!HANDLE_RE.test(cleaned)) {
      errors.push('Handles may only contain letters, numbers, and underscores.');
    }
    // Handles are case-insensitive on X; warn if the user enabled case sensitivity.
    if (input.caseSensitive) {
      warnings.push('Handles are case-insensitive on X; case sensitivity is ignored for handles.');
    }
  } else if (input.type === 'hashtag') {
    const cleaned = stripHashtagMarker(value);
    if (cleaned === '') {
      errors.push('Hashtag is empty after removing the leading “#”.');
    } else if (!HASHTAG_RE.test(cleaned)) {
      errors.push('Hashtags may only contain letters, numbers, and underscores.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** True when two rules are functionally identical for matching purposes. */
export function isDuplicateRule(
  existing: readonly Rule[],
  candidate: Pick<Rule, 'type' | 'value' | 'matchMode' | 'caseSensitive'>,
  ignoreId?: string,
): boolean {
  const a = `${candidate.type}|${candidate.value.trim().toLocaleLowerCase()}|${candidate.matchMode}|${candidate.caseSensitive}`;
  return existing.some(
    (r) =>
      r.id !== ignoreId &&
      `${r.type}|${r.value.trim().toLocaleLowerCase()}|${r.matchMode}|${r.caseSensitive}` === a,
  );
}
