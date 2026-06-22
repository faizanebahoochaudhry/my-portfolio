export function runWhenIdle(callback: () => void, timeout = 2000): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }

  return window.setTimeout(callback, 1);
}

export function cancelWhenIdle(id: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
    return;
  }

  window.clearTimeout(id);
}
