import type { ContentMessage, ContentResponse, Settings } from '../shared/types.js';
import type { FilterEngine } from './engine.js';
import type { SessionStats } from './session-stats.js';

type LoadSettings = () => Promise<Settings>;

/**
 * Build the content-script message listener.
 *
 * Both explicit rescans and save notifications reload storage first. This
 * lets the tab recover even if a storage.onChanged event was delayed, missed,
 * or invalidated by an unpacked-extension reload.
 */
export function createContentMessageHandler(
  engine: FilterEngine,
  stats: SessionStats,
  loadSettings: LoadSettings,
): (
  msg: ContentMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ContentResponse) => void,
) => boolean {
  return (msg, sender, sendResponse) => {
    if (msg.type === 'RESCAN' || msg.type === 'SETTINGS_UPDATED') {
      void loadSettings()
        .then((settings) => {
          stats.masterEnabled = settings.masterEnabled;
          engine.setSettingsNow(settings);
          sendResponse({ ok: true, stats: stats.snapshot() });
        })
        .catch(() => {
          sendResponse({ ok: false, error: 'Could not reload saved filters.' });
        });
      return true;
    }

    sendResponse(engine.handleMessage(msg, sender));
    return false;
  };
}
