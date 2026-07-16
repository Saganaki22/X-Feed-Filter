import { SCHEMA_VERSION } from './constants.js';
import { migrate } from './storage.js';
import type { Settings } from './types.js';

/** File payload written by export. */
export interface ExportPayload {
  app: 'x-feed-filter';
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
}

export const EXPORT_APP = 'x-feed-filter';

/** Build the export payload from settings (defensively normalised first). */
export function buildExportPayload(settings: Settings): ExportPayload {
  return {
    app: EXPORT_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: migrate(settings),
  };
}

/** Serialise settings to a pretty JSON string suitable for download. */
export function serializeExport(settings: Settings): string {
  return JSON.stringify(buildExportPayload(settings), null, 2);
}

/** Hard cap on imported payload size to avoid pathological inputs (1 MiB). */
export const MAX_IMPORT_BYTES = 1024 * 1024;

export interface ImportResult {
  ok: boolean;
  settings?: Settings;
  error?: string;
}

/**
 * Parse and validate an imported JSON string. Merge modes:
 *  - 'replace' — the imported rules entirely replace the current ones.
 *  - 'merge'   — imported rules are appended, de-duplicated by id.
 */
export function parseImport(
  text: string,
  current: Settings,
  mode: 'replace' | 'merge' = 'replace',
): ImportResult {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, error: 'Import file is empty.' };
  }
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'Import file is too large.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Import file is not valid JSON.' };
  }

  const obj = parsed as Record<string, unknown> | null;
  if (!obj || typeof obj !== 'object') {
    return { ok: false, error: 'Import file has an unexpected shape.' };
  }

  // Accept either a wrapped ExportPayload or a bare Settings object.
  const rawSettings: unknown = obj.app === EXPORT_APP && obj.settings ? obj.settings : parsed;

  const incoming = migrate(rawSettings);

  if (mode === 'merge') {
    const seen = new Set(current.rules.map((r) => r.id));
    const merged = [...current.rules];
    for (const r of incoming.rules) {
      let rule = r;
      while (seen.has(rule.id)) rule = { ...rule, id: renameId(rule.id) };
      seen.add(rule.id);
      merged.push(rule);
    }
    return {
      ok: true,
      settings: { ...incoming, rules: merged, masterEnabled: current.masterEnabled },
    };
  }

  return { ok: true, settings: incoming };
}

function renameId(id: string): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return id + '-' + Math.random().toString(36).slice(2, 8);
}
