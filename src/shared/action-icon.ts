import { extensionApi } from './browser-api.js';

const enabledIcons = {
  16: 'icons/icon-enabled-16.png',
  32: 'icons/icon-enabled-32.png',
  48: 'icons/icon-enabled-48.png',
  128: 'icons/icon-enabled-128.png',
};

const disabledIcons = {
  16: 'icons/icon-disabled-16.png',
  32: 'icons/icon-disabled-32.png',
  48: 'icons/icon-disabled-48.png',
  128: 'icons/icon-disabled-128.png',
};

const imageDataCache = new Map<boolean, Promise<Record<string, ImageData>>>();

function loadIconImageData(enabled: boolean): Promise<Record<string, ImageData>> {
  const cached = imageDataCache.get(enabled);
  if (cached) return cached;

  const icons = enabled ? enabledIcons : disabledIcons;
  const pending = Promise.all(
    Object.entries(icons).map(async ([sizeText, path]) => {
      const size = Number(sizeText);
      const response = await fetch(extensionApi.runtime.getURL(path));
      if (!response.ok) throw new Error(`Could not read ${path}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = new OffscreenCanvas(size, size);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create icon canvas');
      context.drawImage(bitmap, 0, 0, size, size);
      bitmap.close();
      return [sizeText, context.getImageData(0, 0, size, size)] as const;
    }),
  ).then((entries) => Object.fromEntries(entries));

  imageDataCache.set(enabled, pending);
  return pending;
}

/** Update the real browser toolbar/action icon, not only the popup branding. */
export async function setActionState(enabled: boolean): Promise<boolean> {
  try {
    const action = extensionApi.action ?? extensionApi.browserAction;
    if (!action) return false;
    const imageData = await loadIconImageData(enabled);
    await Promise.all([
      action.setIcon({ imageData }),
      action.setTitle({
        title: `X Feed Filter — filtering ${enabled ? 'enabled' : 'disabled'}`,
      }),
    ]);
    return true;
  } catch (error) {
    console.warn('[X Feed Filter] Could not update the toolbar icon.', error);
    return false;
  }
}
