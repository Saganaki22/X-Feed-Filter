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

/**
 * Thin async wrapper over chrome.storage.local for the popup UI.
 * Every mutation persists immediately; chrome.storage.onChanged then nudges
 * the content script to recompile and re-scan.
 */
class PopupStore {
  private settings: Settings = createDefaultSettings();
  private readonly listeners = new Set<Listener>();

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

  async setMaster(enabled: boolean): Promise<void> {
    this.settings = { ...this.settings, masterEnabled: enabled };
    await this.persist();
  }

  async setHideMode(mode: HideMode): Promise<void> {
    this.settings = { ...this.settings, hideMode: mode };
    await this.persist();
  }

  addRule(input: RuleInput): Rule {
    const rule = createRule(input);
    this.settings = { ...this.settings, rules: [...this.settings.rules, rule] };
    void this.persist();
    return rule;
  }

  updateRule(id: string, input: RuleInput): void {
    const rules = this.settings.rules.map((r) =>
      r.id === id ? { ...r, ...input, updatedAt: Date.now() } : r,
    );
    this.settings = { ...this.settings, rules };
    void this.persist();
  }

  toggleRule(id: string, enabled: boolean): void {
    const rules = this.settings.rules.map((r) =>
      r.id === id ? { ...r, enabled, updatedAt: Date.now() } : r,
    );
    this.settings = { ...this.settings, rules };
    void this.persist();
  }

  deleteRule(id: string): void {
    this.settings = { ...this.settings, rules: this.settings.rules.filter((r) => r.id !== id) };
    void this.persist();
  }

  /** Used by import (optionally renaming clashing ids). */
  setRules(rules: Rule[]): void {
    this.settings = { ...this.settings, rules };
    void this.persist();
  }

  async reset(): Promise<void> {
    this.settings = createDefaultSettings();
    await this.persist();
  }

  private async persist(): Promise<void> {
    const snapshot = this.settings;
    await saveSettings(snapshot);
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.settings);
  }
}

export const store = new PopupStore();
export { uid };
