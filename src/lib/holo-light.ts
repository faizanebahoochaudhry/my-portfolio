export function renderHoloLight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ryy: number,
  rxx: number,
) {
  const d = ctx.createImageData(w, h);
  const px = d.data;
  const gradAngle = ((145 + ryy * 4) * Math.PI) / 180;
  const cosA = Math.cos(gradAngle);
  const sinA = Math.sin(gradAngle);
  const offset = ryy * 0.08 + rxx * 0.05;
  const specPos = 0.5 + ryy * 0.05 - rxx * 0.04;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      const proj = nx * cosA + ny * sinA + offset;
      const bandIntensity = Math.sin(proj * Math.PI * 3.5) * 0.5 + 0.5;
      const hue = ((proj * 420 + ryy * 20) % 360 + 360) % 360;
      const h6 = hue / 60;
      const sector = Math.floor(h6) % 6;
      const f = h6 - Math.floor(h6);
      let rr = 0;
      let gg = 0;
      let bb = 0;
      if (sector === 0) {
        rr = 1;
        gg = f;
      } else if (sector === 1) {
        rr = 1 - f;
        gg = 1;
      } else if (sector === 2) {
        gg = 1;
        bb = f;
      } else if (sector === 3) {
        gg = 1 - f;
        bb = 1;
      } else if (sector === 4) {
        rr = f;
        bb = 1;
      } else {
        rr = 1;
        bb = 1 - f;
      }
      const irid = bandIntensity * 0.15;
      const dist = Math.abs(proj - specPos);
      const spec = Math.exp(-dist * dist * 60) * 0.22;
      const rv = spec + rr * irid;
      const gv = spec + gg * irid;
      const bv = spec + bb * irid;
      const n = 0;
      const maxC = Math.max(rv, gv, bv);
      const idx = (y * w + x) * 4;
      px[idx] = Math.max(0, Math.min(255, Math.round((rv + n) * 255)));
      px[idx + 1] = Math.max(0, Math.min(255, Math.round((gv + n) * 255)));
      px[idx + 2] = Math.max(0, Math.min(255, Math.round((bv + n) * 255)));
      px[idx + 3] = Math.max(0, Math.min(255, Math.round((maxC + n * 0.5) * 1.6 * 255)));
    }
  }
  ctx.putImageData(d, 0, 0);
}

export function installHoloLightGlobal() {
  if (typeof window === 'undefined') return;
  (
    window as Window & {
      __renderHoloLight?: typeof renderHoloLight;
    }
  ).__renderHoloLight = renderHoloLight;
}
