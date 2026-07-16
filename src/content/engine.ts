import { compileRules } from '../shared/rule-compiler.js';
import { matchFields } from '../shared/rule-matcher.js';
import { normaliseFields } from '../shared/normalise.js';
import type { CompiledRule, ContentMessage, ContentResponse, Settings } from '../shared/types.js';
import type { PlatformAdapter } from './adapters/platform-adapter.js';
import { ScanScheduler, type ScanScope } from './scheduler.js';
import { SessionStats } from './session-stats.js';
import { VisibilityController } from './visibility.js';

export interface EngineDeps {
  adapter: PlatformAdapter;
  visibility: VisibilityController;
  stats: SessionStats;
}

interface CachedEvaluation {
  hideTarget: HTMLElement;
  /** null means the candidate did not match. */
  matchedValue: string | null;
}

/**
 * The filtering core. Owns the compiled rule set, the scheduler, and the scan
 * loop. Pure DOM/adapter work happens here; nothing in this file knows X's
 * selectors (those live in the adapter) or storage (that's index.ts).
 */
export class FilterEngine {
  private readonly scheduler: ScanScheduler;
  private settings: Settings | null = null;
  private compiled: CompiledRule[] = [];
  /** Tweet node -> outcome for the current settings/route generation. */
  private evaluated = new WeakMap<HTMLElement, CachedEvaluation>();

  constructor(private readonly deps: EngineDeps) {
    this.scheduler = new ScanScheduler((scopes) => this.runScan(scopes));
  }

  /** Queue a scoped (or full, when null) scan. */
  requestScan(scope: ScanScope = null): void {
    this.scheduler.request(scope);
  }

  /**
   * Apply new settings: recompile rules, sync hide mode and flags, reveal
   * everything (so removed/changed rules take effect), then re-scan fully.
   */
  setSettings(settings: Settings): void {
    this.evaluated = new WeakMap();
    this.settings = settings;
    this.deps.stats.masterEnabled = settings.masterEnabled;
    this.compiled = settings.masterEnabled ? compileRules(settings.rules) : [];
    this.deps.visibility.setMode(settings.hideMode);
    this.deps.visibility.restoreAll();
    this.requestScan(null);
  }

  /** Synchronously run a full rescan now (used by the RESCAN message). */
  rescanNow(): void {
    this.evaluated = new WeakMap();
    this.deps.visibility.restoreAll();
    this.requestScan(null);
    this.scheduler.flushNow();
  }

  /** X may reuse the page shell across routes, so existing nodes need one fresh pass. */
  routeChanged(): void {
    this.evaluated = new WeakMap();
    this.deps.visibility.restoreAll();
    this.requestScan(null);
  }

  handleMessage(msg: ContentMessage, _sender: unknown): ContentResponse {
    switch (msg.type) {
      case 'PING':
        return { ok: true };
      case 'GET_STATS':
        return { ok: true, stats: this.deps.stats.snapshot() };
      case 'RESCAN':
        this.rescanNow();
        return { ok: true, stats: this.deps.stats.snapshot() };
      default:
        return { ok: false, error: 'Unknown message type.' };
    }
  }

  private runScan(scopes: Set<ScanScope>): void {
    const settings = this.settings;
    if (!settings) return;

    const { adapter, visibility, stats } = this.deps;
    const whole = scopes.has(null);
    const roots: ParentNode[] = whole
      ? [document]
      : ([...scopes].filter((s): s is HTMLElement => s !== null) as HTMLElement[]);

    const seen = new Set<HTMLElement>();

    for (const scope of roots) {
      let candidates: HTMLElement[];
      try {
        candidates = adapter.findCandidates(scope);
      } catch {
        continue;
      }

      for (const candidate of candidates) {
        if (seen.has(candidate)) continue;
        seen.add(candidate);

        const cached = this.evaluated.get(candidate);
        if (cached) {
          // Reassert a cached match cheaply in case X reinserted the same tweet
          // node. Avoid extraction, normalization, and rule matching entirely.
          if (cached.matchedValue !== null && settings.masterEnabled) {
            visibility.apply(cached.hideTarget, cached.matchedValue, candidate);
          }
          continue;
        }

        let post;
        try {
          post = adapter.extract(candidate);
        } catch {
          continue;
        }
        if (!post) continue;

        stats.recordScanned();

        if (settings.masterEnabled && this.compiled.length > 0) {
          const normalized = normaliseFields(post.fields);
          const outcome = matchFields(this.compiled, normalized);
          if (outcome.matched) {
            const matchedValue = outcome.ruleValue ?? '';
            this.evaluated.set(candidate, { hideTarget: post.hideTarget, matchedValue });
            if (visibility.apply(post.hideTarget, matchedValue, post.root)) {
              stats.recordHidden();
            }
            continue;
          }
        }

        // Not matched, or filtering disabled: make sure it's visible.
        this.evaluated.set(candidate, { hideTarget: post.hideTarget, matchedValue: null });
        visibility.restore(post.hideTarget);
        stats.recordVisible();
      }
    }
  }
}
