import { loadSettings, subscribeToSettings } from '../shared/storage.js';
import { extensionApi } from '../shared/browser-api.js';
import { xAdapter } from './adapters/x-adapter.js';
import { FilterEngine } from './engine.js';
import { FeedObserver } from './observer.js';
import { createContentMessageHandler } from './message-handler.js';
import { RouteWatcher } from './route-watcher.js';
import { SessionStats } from './session-stats.js';
import { VisibilityController } from './visibility.js';

/** Resolve the <body> even when the script runs at document_start. */
function bodyReady(): Promise<HTMLElement> {
  return new Promise((resolve) => {
    if (document.body) {
      resolve(document.body);
      return;
    }
    const obs = new MutationObserver(() => {
      if (document.body) {
        obs.disconnect();
        resolve(document.body);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        if (document.body) {
          obs.disconnect();
          resolve(document.body);
        }
      },
      { once: true },
    );
  });
}

async function main(): Promise<void> {
  const body = await bodyReady();

  const stats = new SessionStats();
  const visibility = new VisibilityController('hide');
  const engine = new FilterEngine({ adapter: xAdapter, visibility, stats });

  // Initial load + live updates from the popup/other contexts.
  const initial = await loadSettings();
  stats.onTargetSite = true;
  stats.masterEnabled = initial.masterEnabled;
  engine.setSettings(initial);

  const unsubscribe = subscribeToSettings((settings) => {
    stats.masterEnabled = settings.masterEnabled;
    engine.setSettings(settings);
  });

  // React to DOM additions: only forward scoped subtrees to the engine.
  const observer = new FeedObserver(xAdapter, (scopes) => {
    for (const scope of scopes) engine.requestScan(scope);
  });
  observer.start(body);

  // React to SPA navigations: reset tallies and re-scan the new view.
  const routeWatcher = new RouteWatcher(() => {
    stats.reset();
    engine.routeChanged();
  });
  routeWatcher.start();

  // Answer the popup's status / rescan requests (no extra permissions needed).
  const onMessage = createContentMessageHandler(engine, stats, loadSettings);
  extensionApi.runtime.onMessage.addListener(onMessage);

  // Best-effort cleanup if the script is ever torn down.
  window.addEventListener('pagehide', () => {
    observer.stop();
    routeWatcher.stop();
    unsubscribe();
    extensionApi.runtime.onMessage.removeListener(onMessage);
  });
}

void main();
