import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAdapter } from '../../src/content/adapters/platform-adapter.js';
import { FilterEngine } from '../../src/content/engine.js';
import { SessionStats } from '../../src/content/session-stats.js';
import { VisibilityController } from '../../src/content/visibility.js';
import type { Settings } from '../../src/shared/types.js';

const settings: Settings = {
  schemaVersion: 1,
  masterEnabled: true,
  hideMode: 'hide',
  rules: [],
};

describe('FilterEngine candidate cache', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('extracts the same tweet node only once per settings generation', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="cell"><div data-testid="tweet">Same post</div></div>`;
    const candidate = document.querySelector<HTMLElement>('[data-testid="tweet"]')!;
    const target = document.getElementById('cell')!;
    const extract = vi.fn(() => ({
      root: candidate,
      hideTarget: target,
      fields: { text: 'Same post' },
    }));
    const adapter: PlatformAdapter = {
      name: 'test',
      candidateSelector: '[data-testid="tweet"]',
      containerSelector: null,
      findCandidates: () => [candidate],
      extract,
    };
    const engine = new FilterEngine({
      adapter,
      visibility: new VisibilityController('hide'),
      stats: new SessionStats(),
    });
    engine.setSettings(settings);

    const runScan = (
      engine as unknown as { runScan(scopes: Set<HTMLElement | null>): void }
    ).runScan.bind(engine);
    runScan(new Set([document.body]));
    runScan(new Set([document.body]));
    runScan(new Set([document.body]));

    expect(extract).toHaveBeenCalledTimes(1);

    engine.setSettings({ ...settings });
    runScan(new Set([document.body]));
    expect(extract).toHaveBeenCalledTimes(2);
  });
});
