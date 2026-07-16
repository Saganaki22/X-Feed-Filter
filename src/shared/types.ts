/**
 * Core type definitions shared between popup, content script, and tests.
 *
 * Keeping these in one place guarantees the storage schema, the rule compiler,
 * the matcher, and the popup editor all agree on the shape of a rule.
 */

/** What a rule targets. */
export type RuleType = 'phrase' | 'handle' | 'hashtag';

/** How a phrase/text value is compared against a region's text. */
export type MatchMode = 'contains' | 'whole';

/** What happens to a post once it matches a rule. */
export type HideMode = 'hide' | 'placeholder';

/**
 * A user-defined filter rule.
 *
 * `value` is stored verbatim as the user typed it (e.g. "@KaiCenat",
 * "#StreamerUniversity", "Kai Cenat"). Normalisation happens at match time.
 */
export interface Rule {
  id: string;
  type: RuleType;
  value: string;
  matchMode: MatchMode;
  /** Default false — matching is case-insensitive by default. */
  caseSensitive: boolean;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  /** Optional user note, never used for matching. */
  note?: string;
}

/** The complete persisted settings object. */
export interface Settings {
  schemaVersion: number;
  /** Global on/off switch. When false, nothing is hidden. */
  masterEnabled: boolean;
  /** 'hide' removes the post; 'placeholder' replaces it with a compact card. */
  hideMode: HideMode;
  rules: Rule[];
}

/** Keys for the matchable text regions extracted from a post element. */
export type FieldKey =
  | 'text'
  | 'quotedText'
  | 'displayName'
  | 'quotedDisplayName'
  | 'handle'
  | 'quotedHandle'
  | 'repostAttribution';

/** Text fields extracted from a single post, keyed by region. */
export type PostFields = Partial<Record<FieldKey, string>>;

/**
 * Per-post text fields pre-normalised once, in two case variants, so every
 * rule reuses the same normalisation regardless of count.
 *  - `ci`: case-insensitive (lowercased) normalised text
 *  - `cs`: case-sensitive (still NFKC + whitespace-normalised) text
 */
export interface NormalizedFields {
  ci: PostFields;
  cs: PostFields;
}

/** A post as seen by the engine: the DOM nodes plus extracted text. */
export interface ExtractedPost {
  /** The semantic tweet root (e.g. [data-testid="tweet"]). */
  root: HTMLElement;
  /** The element that should actually be hidden/replaced (usually an ancestor). */
  hideTarget: HTMLElement;
  fields: PostFields;
}

/** A rule turned into a fast, self-contained matcher. */
export interface CompiledRule {
  id: string;
  type: RuleType;
  rawValue: string;
  matchMode: MatchMode;
  /** Which regions this rule applies to. */
  fieldKeys: readonly FieldKey[];
  /** Returns true if the rule matches any of the post's regions. */
  test: (fields: NormalizedFields) => boolean;
}

export interface MatchOutcome {
  matched: boolean;
  ruleId: string | null;
  ruleValue: string | null;
}

/* ----------------------------- messaging ----------------------------- */

export type ContentMessage = { type: 'GET_STATS' } | { type: 'RESCAN' } | { type: 'PING' };

export interface SessionStatsPayload {
  hidden: number;
  scanned: number;
  visible: number;
  onTargetSite: boolean;
  masterEnabled: boolean;
}

export type ContentResponse =
  { ok: true; stats?: SessionStatsPayload } | { ok: false; error: string };
