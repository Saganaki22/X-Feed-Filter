import type { FieldKey, RuleType } from './types.js';

/** Single storage key holding the whole settings object. */
export const STORAGE_KEY = 'x_feed_filter:settings';

/** Current persisted schema version. Bump when the shape changes. */
export const SCHEMA_VERSION = 1;

/**
 * Which text regions each rule type is evaluated against.
 * Centralised here so the compiler and tests share one source of truth.
 */
export const RULE_FIELD_MAP: Record<RuleType, readonly FieldKey[]> = {
  phrase: ['text', 'quotedText', 'displayName', 'quotedDisplayName', 'repostAttribution'],
  handle: ['handle', 'quotedHandle'],
  hashtag: ['text', 'quotedText'],
};

/** Default field used when surfacing *why* a post matched (for placeholders). */
export const PLACEHOLDER_SUMMARY_FIELDS: readonly FieldKey[] = ['text', 'quotedText'];

/** CSS class hooks applied to hidden/placeholder nodes. Namespaced to avoid clashes. */
export const CSS = {
  hidden: 'xff-hidden',
  placeholder: 'xff-placeholder',
  placeholderHost: 'xff-placeholder-host',
  placeholderHostRevealed: 'xff-placeholder-host--revealed',
  placeholderShow: 'xff-placeholder__show',
  processed: 'xff-processed',
} as const;

/** Attribute stamped on a hide target so we can restore it. */
export const HIDDEN_BY_ATTR = 'data-xff-hidden';
/** Attribute recording which rule value caused the hide (for placeholders). */
export const MATCH_ATTR = 'data-xff-match';
/** Attribute recording a stable per-post id for dedupe. */
export const POST_ID_ATTR = 'data-xff-id';
