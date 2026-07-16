import { setActionState } from '../shared/action-icon.js';
import { extensionApi } from '../shared/browser-api.js';
import { STORAGE_KEY } from '../shared/constants.js';
import { loadSettings, migrate } from '../shared/storage.js';

async function setFilteringIcon(enabled?: boolean): Promise<void> {
  const isEnabled = enabled ?? (await loadSettings()).masterEnabled;
  await setActionState(isEnabled);
}

extensionApi.runtime.onInstalled.addListener(() => void setFilteringIcon());
extensionApi.runtime.onStartup.addListener(() => void setFilteringIcon());
extensionApi.runtime.onMessage.addListener((message: unknown) => {
  if (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'SET_ACTION_STATE' &&
    typeof (message as { enabled?: unknown }).enabled === 'boolean'
  ) {
    void setActionState((message as { enabled: boolean }).enabled);
  }
});
extensionApi.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const change = changes[STORAGE_KEY];
  if (!change || change.newValue == null) return;
  void setFilteringIcon(migrate(change.newValue).masterEnabled);
});

void setFilteringIcon();
