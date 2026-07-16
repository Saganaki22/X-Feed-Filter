import type { NormalizedFields, PostFields } from './types.js';

/**
 * Unicode-aware normalisation for matching.
 *
 * Pipeline: NFKC (compatibility composition — folds fullwidth, ligatures,
 * superscripts etc.) → strip zero-width / soft-hyphen junk used to evade
 * filters → collapse whitespace runs → trim → optional locale-aware lowercasing.
 *
 * We deliberately do NOT strip diacritics by default: matching "café" to
 * "cafe" would change meaning. NFKC alone handles most evasion (e.g. "ｃａｔ").
 */

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
const WS_RUN = /\s+/g;

export function normaliseText(input: string | null | undefined, caseSensitive = false): string {
  if (!input) return '';
  let s = String(input).normalize('NFKC');
  s = s.replace(ZERO_WIDTH, '');
  s = s.replace(WS_RUN, ' ').trim();
  return caseSensitive ? s : s.toLocaleLowerCase();
}

/**
 * Normalise every extracted region of a post once into both case variants.
 * Fields that are absent are simply omitted from both bags.
 */
export function normaliseFields(raw: PostFields): NormalizedFields {
  const ci: PostFields = {};
  const cs: PostFields = {};
  for (const key of Object.keys(raw) as (keyof PostFields)[]) {
    const v = raw[key];
    if (v == null) continue;
    ci[key] = normaliseText(v, false);
    cs[key] = normaliseText(v, true);
  }
  return { ci, cs };
}

/** Strip a single leading @ (ASCII or fullwidth) — used for handle rules. */
export function stripHandleMarker(value: string): string {
  return value.replace(/^[@＠\s]+/, '').trim();
}

/** Strip a single leading # (ASCII or fullwidth) — used for hashtag rules. */
export function stripHashtagMarker(value: string): string {
  return value.replace(/^[#＃\s]+/, '').trim();
}
