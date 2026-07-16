/**
 * Batching scheduler.
 *
 * X mutates the DOM constantly (virtualisation, lazy hydration, infinite
 * scroll). Re-scanning on every mutation would lock up the page. This collects
 * scan requests within a short window, coalesces them, then runs a single
 * pass on the next animation frame.
 *
 * A `null` scope means "scan the whole document" (used on first run and on
 * route changes); a non-null scope is the subtree that changed.
 */
export type ScanScope = HTMLElement | null;

export class ScanScheduler {
  private scopes = new Set<ScanScope>();
  private timer: number | null = null;
  private rafId: number | null = null;
  private readonly intervalMs: number;

  constructor(
    private readonly onFlush: (scopes: Set<ScanScope>) => void,
    intervalMs = 200,
  ) {
    this.intervalMs = intervalMs;
  }

  request(scope: ScanScope = null): void {
    this.scopes.add(scope);
    this.arm();
  }

  /** Run any pending scan immediately (used by RESCAN messages). */
  flushNow(): void {
    this.cancelTimers();
    this.drain();
  }

  dispose(): void {
    this.cancelTimers();
    this.scopes.clear();
  }

  private arm(): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.rafId = window.requestAnimationFrame(() => {
        this.rafId = null;
        this.drain();
      });
    }, this.intervalMs);
  }

  private drain(): void {
    if (this.scopes.size === 0) return;
    const snapshot = this.scopes;
    this.scopes = new Set();
    this.onFlush(snapshot);
  }

  private cancelTimers(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
