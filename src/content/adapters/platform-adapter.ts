import type { ExtractedPost } from '../../shared/types.js';

/**
 * A platform adapter isolates everything that knows about the host site's DOM.
 * Swapping this object is how the engine would support a different site; the
 * engine itself never touches site-specific selectors.
 */
export interface PlatformAdapter {
  readonly name: string;
  /** CSS selector that matches a post root (e.g. a tweet). */
  readonly candidateSelector: string;
  /** Optional selector for elements that may contain posts (scan roots). */
  readonly containerSelector: string | null;
  /** Find candidate post elements within a scope. */
  findCandidates(scope: ParentNode): HTMLElement[];
  /**
   * Extract matchable fields and the hide target from a candidate.
   * Return null to ignore the node (e.g. a nested/quoted duplicate).
   */
  extract(candidate: HTMLElement): ExtractedPost | null;
}
