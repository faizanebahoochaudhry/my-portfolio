export function runWhenIdle(callback: () => void, timeout = 2000): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  if ('requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback, { timeout });
  }

  return setTimeout(callback, 1) as unknown as number;
}

export function cancelWhenIdle(id: number): void {
  if (id === 0 || typeof window === 'undefined') {
    return;
  }

  if ('cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(id);
    return;
  }

  clearTimeout(id);
}
