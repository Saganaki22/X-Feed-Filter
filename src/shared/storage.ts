import { SCHEMA_VERSION, STORAGE_KEY } from './constants.js';
import { extensionApi } from './browser-api.js';
import { createDefaultSettings } from './defaults.js';
import type { HideMode, MatchMode, Rule, RuleType, Settings } from './types.js';

type AnyObject = Record<string, unknown>;

function isObject(x: unknown): x is AnyObject {
  return typeof x === 'object' && x !== null;
}

const RULE_TYPES: readonly RuleType[] = ['phrase', 'handle', 'hashtag'];
const MATCH_MODES: readonly MatchMode[] = ['contains', 'whole'];
const HIDE_MODES: readonly HideMode[] = ['hide', 'placeholder'];

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function coerceEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function coerceRule(raw: unknown): Rule | null {
  if (!isObject(raw)) return null;
  const id = asString(raw.id) || cryptoRandomId();
  const type = coerceEnum<RuleType>(raw.type, RULE_TYPES, 'phrase');
  const value = asString(raw.value);
  if (value === undefined || value.trim() === '') return null;

  return {
    id,
    type,
    value,
    matchMode: coerceEnum<MatchMode>(raw.matchMode, MATCH_MODES, 'contains'),
    caseSensitive: asBool(raw.caseSensitive, false),
    enabled: asBool(raw.enabled, true),
    createdAt: asNumber(raw.createdAt, Date.now()),
    updatedAt: asNumber(raw.updatedAt, Date.now()),
    note: asString(raw.note),
  };
}

function cryptoRandomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'r-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Convert an arbitrary, possibly-older, possibly-malformed stored blob into a
 * valid, fully-populated Settings object. Never throws: on any doubt it falls
 * back to defaults. Used both at load time and on import.
 */
export function migrate(raw: unknown): Settings {
  const base = createDefaultSettings();
  if (!isObject(raw)) return base;

  const rulesIn = Array.isArray(raw.rules) ? raw.rules : [];
  const rules: Rule[] = [];
  const seen = new Set<string>();
  for (const r of rulesIn) {
    const rule = coerceRule(r);
    if (!rule) continue;
    if (seen.has(rule.id)) rule.id = cryptoRandomId();
    seen.add(rule.id);
    rules.push(rule);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    masterEnabled: asBool(raw.masterEnabled, base.masterEnabled),
    hideMode: coerceEnum<HideMode>(raw.hideMode, HIDE_MODES, base.hideMode),
    rules,
  };
}

/** Merge any missing top-level keys from defaults without mutating input. */
export function withDefaults(raw: unknown): Settings {
  return migrate(raw);
}

/** Load settings from extension storage, always returning a valid object. */
export async function loadSettings(): Promise<Settings> {
  try {
    const got = await extensionApi.storage.local.get(STORAGE_KEY);
    const raw = got[STORAGE_KEY];
    return migrate(raw);
  } catch {
    return createDefaultSettings();
  }
}

/** Persist settings atomically. */
export async function saveSettings(settings: Settings): Promise<void> {
  const toStore: Settings = { ...settings, schemaVersion: SCHEMA_VERSION };
  await extensionApi.storage.local.set({ [STORAGE_KEY]: toStore });
}

/**
 * Subscribe to settings changes fired by chrome.storage.onChanged (e.g. when
 * the popup edits something). Returns an unsubscribe function.
 */
export function subscribeToSettings(cb: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area !== 'local') return;
    const change = changes[STORAGE_KEY];
    if (!change || change.newValue == null) return;
    cb(migrate(change.newValue));
  };
  extensionApi.storage.onChanged.addListener(handler);
  return () => extensionApi.storage.onChanged.removeListener(handler);
}
