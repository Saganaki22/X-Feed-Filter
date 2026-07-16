import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMock = vi.hoisted(() => ({
  addRule: vi.fn(),
  updateRule: vi.fn(),
}));

vi.mock('../../src/popup/state.js', () => ({ store: storeMock }));

import { RuleEditor } from '../../src/popup/rule-editor.js';

function makeEditor(): RuleEditor {
  document.body.innerHTML = `
    <form id="form">
      <select id="type"><option value="phrase">Phrase</option></select>
      <input id="value">
      <input id="whole" type="checkbox">
      <input id="case" type="checkbox">
      <input id="note">
      <div id="advanced" hidden></div>
      <button id="more" type="button"></button>
      <button id="add" type="submit">Add</button>
      <button id="cancel" type="button" hidden></button>
      <p id="message"></p>
    </form>`;

  const get = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  return new RuleEditor({
    form: get('form'),
    type: get('type'),
    value: get('value'),
    whole: get('whole'),
    caseSensitive: get('case'),
    note: get('note'),
    advancedWrap: get('advanced'),
    moreBtn: get('more'),
    addBtn: get('add'),
    cancelBtn: get('cancel'),
    message: get('message'),
  });
}

describe('RuleEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('submits a valid rule once without validating the cleared input again', () => {
    makeEditor();
    const value = document.getElementById('value') as HTMLInputElement;
    value.value = 'spoilers';

    (document.getElementById('add') as HTMLButtonElement).click();

    expect(storeMock.addRule).toHaveBeenCalledTimes(1);
    expect(storeMock.addRule).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'phrase', value: 'spoilers' }),
    );
    expect(document.getElementById('message')?.textContent).not.toContain('cannot be empty');
  });
});
