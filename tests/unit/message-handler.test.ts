import { describe, expect, it, vi } from 'vitest';
import { createContentMessageHandler } from '../../src/content/message-handler.js';
import type { FilterEngine } from '../../src/content/engine.js';
import { SessionStats } from '../../src/content/session-stats.js';
import type { ContentResponse, Settings } from '../../src/shared/types.js';

const settings: Settings = {
  schemaVersion: 1,
  masterEnabled: true,
  hideMode: 'hide',
  rules: [],
};

describe('content message handler', () => {
  it.each(['RESCAN', 'SETTINGS_UPDATED'] as const)(
    'reloads persisted settings before handling %s',
    async (type) => {
      const setSettingsNow = vi.fn();
      const engine = {
        setSettingsNow,
        handleMessage: vi.fn(),
      } as unknown as FilterEngine;
      const stats = new SessionStats();
      const loadSettings = vi.fn().mockResolvedValue(settings);
      const sendResponse = vi.fn<(response: ContentResponse) => void>();
      const handler = createContentMessageHandler(engine, stats, loadSettings);

      const keepsChannelOpen = handler({ type }, {} as chrome.runtime.MessageSender, sendResponse);

      expect(keepsChannelOpen).toBe(true);
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledOnce());
      expect(loadSettings).toHaveBeenCalledOnce();
      expect(setSettingsNow).toHaveBeenCalledWith(settings);
      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    },
  );
});
