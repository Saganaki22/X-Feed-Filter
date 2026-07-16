/** Small accessibility helpers shared by the popup UI. */

let announceRegion: HTMLElement | null = null;

export function setAnnounceRegion(el: HTMLElement | null): void {
  announceRegion = el;
}

/** Push a message to the live region for screen readers. */
export function announce(message: string): void {
  const region = announceRegion;
  if (!region) return;
  region.textContent = '';
  // Re-set on next tick so repeated identical messages still announce.
  window.setTimeout(() => {
    if (region) region.textContent = message;
  }, 30);
}

/** Focus an element and select its text if it's an input. */
export function focusAndSelect(el: HTMLElement): void {
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.select();
}
