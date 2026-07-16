import { CSS } from '../shared/constants.js';
import type { PlatformAdapter } from './adapters/platform-adapter.js';

/**
 * MutationObserver wrapper tuned for X's chatty, virtualised DOM.
 *
 * - watches only `childList` (additions) — X re-creates nodes rather than
 *   editing them, so we don't need attributes/characterData.
 * - ignores mutations caused by our own placeholder insertion so we never
 *   feed back into ourselves.
 * - only forwards added elements that actually can contain a post, so the
 *   scheduler isn't woken for the many irrelevant nodes X inserts.
 */
const SELF_SELECTOR = `.${CSS.placeholder}, .${CSS.placeholder} *`;

export class FeedObserver {
  private mo: MutationObserver | null = null;

  constructor(
    private readonly adapter: PlatformAdapter,
    private readonly onAdded: (scopes: HTMLElement[]) => void,
  ) {}

  start(root: Node): void {
    this.stop();
    this.mo = new MutationObserver((records) => this.handle(records));
    this.mo.observe(root, { childList: true, subtree: true });
  }

  stop(): void {
    this.mo?.disconnect();
    this.mo = null;
  }

  private isSelfMutation(el: HTMLElement): boolean {
    if (el.closest(SELF_SELECTOR)) return true;
    if (el.matches?.(SELF_SELECTOR)) return true;
    return false;
  }

  private handle(records: MutationRecord[]): void {
    const sel = this.adapter.candidateSelector;
    const scopes = new Map<HTMLElement, true>();

    for (const record of records) {
      if (record.addedNodes.length === 0) continue;
      for (const node of Array.from(record.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as HTMLElement;
        if (this.isSelfMutation(el)) continue;
        const couldContain = el.matches(sel) || el.querySelector(sel) != null;
        if (couldContain) scopes.set(el, true);
      }
    }

    if (scopes.size > 0) this.onAdded([...scopes.keys()]);
  }
}
