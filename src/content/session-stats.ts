/**
 * In-memory session counters for the content script.
 *
 * These never touch storage (per the plan: don't write storage per hide) and
 * hold no post text — only aggregate counts plus a couple of state flags the
 * popup may read.
 */
import type { SessionStatsPayload } from '../shared/types.js';

export class SessionStats {
  scanned = 0;
  hidden = 0;
  visible = 0;
  masterEnabled = true;
  onTargetSite = true;

  recordScanned(n = 1): void {
    this.scanned += n;
  }
  recordHidden(n = 1): void {
    this.hidden += n;
  }
  recordVisible(n = 1): void {
    this.visible += n;
  }

  reset(): void {
    this.scanned = 0;
    this.hidden = 0;
    this.visible = 0;
  }

  snapshot(): SessionStatsPayload {
    return {
      hidden: this.hidden,
      scanned: this.scanned,
      visible: this.visible,
      onTargetSite: this.onTargetSite,
      masterEnabled: this.masterEnabled,
    };
  }
}
