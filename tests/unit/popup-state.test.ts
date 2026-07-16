import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSettings } from '../../src/shared/defaults.js';

const storageMocks = vi.hoisted(() => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

vi.mock('../../src/shared/storage.js', () => storageMocks);

import { PopupStore } from '../../src/popup/state.js';

describe('PopupStore persistence', () => {
  beforeEach(() => {
    storageMocks.loadSettings.mockReset().mockResolvedValue(createDefaultSettings());
    storageMocks.saveSettings.mockReset();
  });

  it('waits for storage and preserves mutation order before announcing a save', async () => {
    let finishFirst!: () => void;
    storageMocks.saveSettings
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);

    const store = new PopupStore();
    await store.load();
    const persisted = vi.fn();
    store.subscribePersisted(persisted);

    const first = store.addRule({
      type: 'phrase',
      value: 'first',
      matchMode: 'contains',
      caseSensitive: false,
    });
    const second = store.addRule({
      type: 'phrase',
      value: 'second',
      matchMode: 'contains',
      caseSensitive: false,
    });

    await vi.waitFor(() => expect(storageMocks.saveSettings).toHaveBeenCalledTimes(1));
    expect(persisted).not.toHaveBeenCalled();

    finishFirst();
    await first;
    await second;

    expect(storageMocks.saveSettings).toHaveBeenCalledTimes(2);
    expect(storageMocks.saveSettings.mock.calls[0]![0].rules).toHaveLength(1);
    expect(storageMocks.saveSettings.mock.calls[1]![0].rules).toHaveLength(2);
    expect(persisted).toHaveBeenCalledTimes(2);
  });
});
