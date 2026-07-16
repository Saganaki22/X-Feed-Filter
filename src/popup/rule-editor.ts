import type { Rule, RuleType } from '../shared/types.js';
import { validateRule } from '../shared/validation.js';
import { announce, focusAndSelect } from './accessibility.js';
import { store, type RuleInput } from './state.js';

export interface EditorEls {
  form: HTMLElement;
  type: HTMLSelectElement;
  value: HTMLInputElement;
  whole: HTMLInputElement;
  caseSensitive: HTMLInputElement;
  note: HTMLInputElement;
  advancedWrap: HTMLElement;
  moreBtn: HTMLButtonElement;
  addBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
  message: HTMLElement;
}

const PLACEHOLDERS: Record<RuleType, string> = {
  phrase: 'e.g. spoilers',
  handle: '@handle',
  hashtag: '#hashtag',
};

const TYPE_LABEL: Record<RuleType, string> = {
  phrase: 'Phrase',
  handle: 'Handle',
  hashtag: 'Hashtag',
};

/**
 * Manages the add/edit form at the top of the popup. In edit mode it loads an
 * existing rule's values into the fields and switches the primary button to
 * "Save".
 */
export class RuleEditor {
  private editingId: string | null = null;

  constructor(private readonly els: EditorEls) {
    this.bind();
    this.updatePlaceholder();
  }

  private bind(): void {
    this.els.moreBtn.addEventListener('click', () => this.toggleAdvanced());
    this.els.cancelBtn.addEventListener('click', () => this.cancelEdit());
    this.els.type.addEventListener('change', () => this.updatePlaceholder());
    this.els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
  }

  private toggleAdvanced(): void {
    const open = this.els.advancedWrap.hasAttribute('hidden');
    this.els.advancedWrap.toggleAttribute('hidden', !open);
    this.els.moreBtn.setAttribute('aria-expanded', String(open));
    if (open) focusAndSelect(this.els.note);
  }

  private updatePlaceholder(): void {
    const type = this.els.type.value as RuleType;
    this.els.value.placeholder = PLACEHOLDERS[type];
  }

  read(): RuleInput {
    return {
      type: this.els.type.value as RuleType,
      value: this.els.value.value,
      matchMode: this.els.whole.checked ? 'whole' : 'contains',
      caseSensitive: this.els.caseSensitive.checked,
      note: this.els.note.value.trim() || undefined,
    };
  }

  private show(message: string, kind: 'ok' | 'error'): void {
    this.els.message.textContent = message;
    this.els.message.dataset.kind = kind;
    announce(message);
  }

  private submit(): void {
    const input = this.read();
    const result = validateRule(input);
    if (!result.valid) {
      this.show(result.errors.join(' '), 'error');
      return;
    }
    const wasEditing = this.editingId;
    if (wasEditing) store.updateRule(wasEditing, input);
    else store.addRule(input);
    this.show(
      wasEditing
        ? `Updated “${input.value}”.`
        : `Added ${TYPE_LABEL[input.type]} filter “${input.value}”.`,
      'ok',
    );
    this.reset();
  }

  startEdit(rule: Rule): void {
    this.editingId = rule.id;
    this.els.type.value = rule.type;
    this.els.value.value = rule.value;
    this.els.whole.checked = rule.matchMode === 'whole';
    this.els.caseSensitive.checked = rule.caseSensitive;
    this.els.note.value = rule.note ?? '';
    this.els.addBtn.textContent = 'Save';
    this.els.cancelBtn.hidden = false;
    this.els.addBtn.setAttribute('aria-label', `Save changes to ${rule.value}`);
    this.updatePlaceholder();
    this.show(`Editing “${rule.value}”.`, 'ok');
    focusAndSelect(this.els.value);
  }

  cancelEdit(): void {
    if (this.editingId === null) return;
    this.reset();
    this.show('Edit cancelled.', 'ok');
  }

  reset(): void {
    this.editingId = null;
    this.els.type.value = 'phrase';
    this.els.value.value = '';
    this.els.whole.checked = false;
    this.els.caseSensitive.checked = false;
    this.els.note.value = '';
    this.els.addBtn.textContent = 'Add';
    this.els.addBtn.removeAttribute('aria-label');
    this.els.cancelBtn.hidden = true;
    this.els.message.textContent = '';
    delete this.els.message.dataset.kind;
    this.updatePlaceholder();
    this.els.value.focus();
  }

  getEditingId(): string | null {
    return this.editingId;
  }
}
