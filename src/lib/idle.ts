export function runWhenIdle(callback: () => void, timeout = 2000): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout });
  }

  return window.setTimeout(callback, 1);
}

export function cancelWhenIdle(id: number): void {
  if (id === 0 || typeof window === 'undefined') {
    return;
  }

  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
    return;
  }

  window.clearTimeout(id);
}
