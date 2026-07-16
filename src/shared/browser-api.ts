/**
 * Use the standards-style Promise API in Firefox and Chrome's Promise-capable
 * Manifest V3 API elsewhere. Firefox exposes both namespaces, but `browser`
 * is the native Promise implementation.
 */
type BrowserGlobal = typeof globalThis & {
  browser?: typeof chrome;
  chrome?: typeof chrome;
};

const browserGlobal = globalThis as BrowserGlobal;

// The cast keeps pure helpers importable in Node-based tests, where neither
// global exists. Extension entry points only call this API inside a browser.
export const extensionApi = (browserGlobal.browser ?? browserGlobal.chrome) as typeof chrome;
