import { CSS, HIDDEN_BY_ATTR } from '../shared/constants.js';
import type { HideMode } from '../shared/types.js';

interface PlaceholderState {
  card: HTMLElement;
  original: HTMLElement;
  toolbar: HTMLElement;
  label: HTMLElement;
  toggle: HTMLButtonElement;
}

/** Controls hiding/restoring posts and renders reversible placeholder cards. */
export class VisibilityController {
  private mode: HideMode;
  private readonly managed = new WeakSet<HTMLElement>();
  /** Outer hide target -> placeholder and the latest semantic tweet root. */
  private readonly placeholders = new WeakMap<HTMLElement, PlaceholderState>();
  private readonly revealed = new WeakSet<HTMLElement>();

  constructor(mode: HideMode = 'hide') {
    this.mode = mode;
  }

  setMode(mode: HideMode): void {
    if (this.mode === mode) return;
    this.restoreAll();
    this.mode = mode;
  }

  getMode(): HideMode {
    return this.mode;
  }

  /** Returns true if this call newly hid the target. */
  apply(target: HTMLElement, matchedValue: string, tweetRoot = target): boolean {
    if (this.mode === 'hide') {
      if (target.classList.contains(CSS.hidden)) return false;
      target.classList.add(CSS.hidden);
      target.setAttribute(HIDDEN_BY_ATTR, matchedValue);
      this.managed.add(target);
      return true;
    }

    const existing = this.placeholders.get(target);
    if (existing) {
      if (tweetRoot !== existing.original) {
        existing.original.remove();
        existing.original = tweetRoot;
      }

      if (this.revealed.has(target)) {
        // The user explicitly chose Show; keep X's latest tweet root inside
        // the same card so the in-place Hide control remains available.
        existing.card.append(existing.original);
      } else if (tweetRoot.isConnected) {
        // X may recreate the tweet while virtualising. Swap the new copy out
        // immediately so the post can never sit beside its placeholder.
        tweetRoot.replaceWith(existing.card);
      }
      return false;
    }

    target.classList.remove(CSS.hidden);
    target.setAttribute(HIDDEN_BY_ATTR, matchedValue);
    this.managed.add(target);

    const state = this.makePlaceholder(matchedValue, target, tweetRoot);
    this.placeholders.set(target, state);
    tweetRoot.replaceWith(state.card);
    return true;
  }

  /** Fully undo a hide on a target. */
  restore(target: HTMLElement): boolean {
    let changed = false;
    const state = this.placeholders.get(target);
    if (state) {
      if (state.card.isConnected) state.card.replaceWith(state.original);
      else state.card.remove();
      this.placeholders.delete(target);
      this.revealed.delete(target);
      changed = true;
    }
    if (target.classList.contains(CSS.hidden)) {
      target.classList.remove(CSS.hidden);
      changed = true;
    }
    if (target.hasAttribute(HIDDEN_BY_ATTR)) {
      target.removeAttribute(HIDDEN_BY_ATTR);
      changed = true;
    }
    this.managed.delete(target);
    return changed;
  }

  restoreAll(): void {
    document.querySelectorAll<HTMLElement>(`[${HIDDEN_BY_ATTR}]`).forEach((el) => this.restore(el));
  }

  isManaged(target: HTMLElement): boolean {
    return this.managed.has(target);
  }

  private makePlaceholder(
    matchedValue: string,
    target: HTMLElement,
    original: HTMLElement,
  ): PlaceholderState {
    const card = document.createElement('div');
    card.className = CSS.placeholder;
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'off');

    const toolbar = document.createElement('div');
    toolbar.className = `${CSS.placeholder}__toolbar`;

    const label = document.createElement('span');
    label.className = `${CSS.placeholder}__label`;
    label.textContent = 'Post hidden';

    const match = document.createElement('span');
    match.className = `${CSS.placeholder}__match`;
    match.textContent = matchedValue ? `matched “${matchedValue}”` : 'matched a filter';
    match.title = matchedValue;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = CSS.placeholderShow;
    toggle.textContent = 'Show';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggle(target);
    });

    toolbar.append(label, match, toggle);
    card.append(toolbar);
    return { card, original, toolbar, label, toggle };
  }

  private toggle(target: HTMLElement): void {
    const state = this.placeholders.get(target);
    if (!state) return;

    if (this.revealed.has(target)) {
      state.original.remove();
      state.card.classList.remove(`${CSS.placeholder}--revealed`);
      state.label.textContent = 'Post hidden';
      state.toggle.textContent = 'Show';
      state.toggle.setAttribute('aria-pressed', 'false');
      this.revealed.delete(target);
      return;
    }

    state.card.classList.add(`${CSS.placeholder}--revealed`);
    state.label.textContent = 'Post shown';
    state.toggle.textContent = 'Hide';
    state.toggle.setAttribute('aria-pressed', 'true');
    state.card.append(state.original);
    this.revealed.add(target);
  }
}
