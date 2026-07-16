/**
 * Detects X's client-side (SPA) route changes.
 *
 * We deliberately DO NOT patch `history.pushState`/`replaceState`: content
 * scripts share the DOM with the page, and overriding those would mutate X's
 * own JavaScript objects (a hard "don't" in the plan) and risk breaking X.
 * Instead we poll `location` on a short interval plus react to `popstate`.
 * Polling a string is cheap and side-effect free.
 */
export class RouteWatcher {
  private timer: number | null = null;
  private current = '';

  constructor(private readonly onChange: (path: string) => void) {}

  start(): void {
    this.current = this.signature();
    window.addEventListener('popstate', this.onPop);
    this.timer = window.setInterval(() => this.check(), 750);
  }

  stop(): void {
    window.removeEventListener('popstate', this.onPop);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private onPop = (): void => this.check();

  private signature(): string {
    return location.pathname + location.search + location.hash;
  }

  private check(): void {
    const now = this.signature();
    if (now !== this.current) {
      this.current = now;
      this.onChange(now);
    }
  }
}
