export function readEffectColors() {
  const root = getComputedStyle(document.documentElement);
  const primary = root.getPropertyValue('--effect-rgb').trim() || '94, 228, 213';
  const soft = root.getPropertyValue('--effect-rgb-soft').trim() || primary;
  const deep = root.getPropertyValue('--effect-rgb-deep').trim() || primary;
  const canvasStroke = root.getPropertyValue('--canvas-stroke').trim() || 'rgba(230, 237, 248, 0.08)';
  const canvasStrokeStrong =
    root.getPropertyValue('--canvas-stroke-strong').trim() || 'rgba(94, 228, 213, 0.22)';
  return { primary, soft, deep, canvasStroke, canvasStrokeStrong };
}
