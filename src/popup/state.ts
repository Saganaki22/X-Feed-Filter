import { loadSettings, saveSettings } from '../shared/storage.js';
import type { HideMode, MatchMode, Rule, RuleType, Settings } from '../shared/types.js';
import { createDefaultSettings, createRule, uid } from '../shared/defaults.js';

export interface RuleInput {
  type: RuleType;
  value: string;
  matchMode: MatchMode;
  caseSensitive: boolean;
  note?: string;
}

type Listener = (settings: Settings) => void;
type PersistedListener = () => void;

/**
 * Thin async wrapper over chrome.storage.local for the popup UI.
 * Every mutation is persisted in order. After each completed write the popup
 * can directly nudge the active content script; storage.onChanged remains a
 * cross-tab fallback.
 */
export class PopupStore {
  private settings: Settings = createDefaultSettings();
  private readonly listeners = new Set<Listener>();
  private readonly persistedListeners = new Set<PersistedListener>();
  private saveQueue: Promise<void> = Promise.resolve();

  async load(): Promise<Settings> {
    this.settings = await loadSettings();
    this.emit();
    return this.settings;
  }

  get(): Settings {
    return this.settings;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  subscribePersisted(fn: PersistedListener): () => void {
    this.persistedListeners.add(fn);
    return () => this.persistedListeners.delete(fn);
  }

  async setMaster(enabled: boolean): Promise<void> {
    this.settings = { ...this.settings, masterEnabled: enabled };
    await this.persist();
  }

  async setHideMode(mode: HideMode): Promise<void> {
    this.settings = { ...this.settings, hideMode: mode };
    await this.persist();
  }

  async addRule(input: RuleInput): Promise<Rule> {
    const rule = createRule(input);
    this.settings = { ...this.settings, rules: [...this.settings.rules, rule] };
    await this.persist();
    return rule;
  }

  async updateRule(id: string, input: RuleInput): Promise<void> {
    const rules = this.settings.rules.map((r) =>
      r.id === id ? { ...r, ...input, updatedAt: Date.now() } : r,
    );
    this.settings = { ...this.settings, rules };
    await this.persist();
  }

  async toggleRule(id: string, enabled: boolean): Promise<void> {
    const rules = this.settings.rules.map((r) =>
      r.id === id ? { ...r, enabled, updatedAt: Date.now() } : r,
    );
    this.settings = { ...this.settings, rules };
    await this.persist();
  }

  async deleteRule(id: string): Promise<void> {
    this.settings = { ...this.settings, rules: this.settings.rules.filter((r) => r.id !== id) };
    await this.persist();
  }

  /** Used by import (optionally renaming clashing ids). */
  async setRules(rules: Rule[]): Promise<void> {
    this.settings = { ...this.settings, rules };
    await this.persist();
  }

  async reset(): Promise<void> {
    this.settings = createDefaultSettings();
    await this.persist();
  }

  private async persist(): Promise<void> {
    const snapshot = this.settings;
    const write = this.saveQueue.then(() => saveSettings(snapshot));
    this.saveQueue = write.catch(() => undefined);
    await write;
    this.emit();
    for (const fn of this.persistedListeners) fn();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.settings);
  }
}

export const store = new PopupStore();
export { uid };
