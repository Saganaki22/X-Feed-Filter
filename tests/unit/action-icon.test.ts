import { afterEach, describe, expect, it, vi } from 'vitest';

describe('setActionState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('decodes packaged icons and supplies image data to the toolbar API', async () => {
    const setIcon = vi.fn().mockResolvedValue(undefined);
    const setTitle = vi.fn().mockResolvedValue(undefined);
    const getURL = vi.fn((path: string) => `chrome-extension://test/${path}`);
    const getImageData = vi.fn((_: number, __: number, width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: 'srgb',
    }));

    class CanvasMock {
      getContext(): { drawImage: ReturnType<typeof vi.fn>; getImageData: typeof getImageData } {
        return { drawImage: vi.fn(), getImageData };
      }
    }

    vi.stubGlobal('chrome', { action: { setIcon, setTitle }, runtime: { getURL } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(new Blob()) }),
    );
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ close: vi.fn() }));
    vi.stubGlobal('OffscreenCanvas', CanvasMock);

    const { setActionState } = await import('../../src/shared/action-icon.js');
    expect(await setActionState(true)).toBe(true);
    expect(getURL).toHaveBeenCalledWith('icons/icon-enabled-16.png');
    expect(setIcon).toHaveBeenLastCalledWith({
      imageData: expect.objectContaining({ 16: expect.objectContaining({ width: 16 }) }),
    });

    expect(await setActionState(false)).toBe(true);
    expect(getURL).toHaveBeenCalledWith('icons/icon-disabled-16.png');
    expect(setIcon).toHaveBeenLastCalledWith({
      imageData: expect.objectContaining({ 16: expect.objectContaining({ width: 16 }) }),
    });
  });
});
