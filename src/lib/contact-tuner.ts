export type ContactTunerElements = {
  hero: HTMLElement;
  canvas: HTMLCanvasElement;
  labelEl: HTMLElement;
  titleEl: HTMLElement;
  line2El: HTMLAnchorElement;
  hintEl: HTMLElement;
  statusEl: HTMLElement;
  statusTextEl: HTMLElement;
  freqEl: HTMLElement;
  signalEl: HTMLElement;
  needleEl: HTMLElement;
};

export type ContactStation = {
  id: string;
  spot: number;
  range: number;
  title: string;
  line2: string;
  line2Href: string;
  lockable?: boolean;
};

export type ContactTunerCopy = {
  label: string;
  stations: ContactStation[];
  line2Mask: string;
  hintDrag: string;
  hintFreq: string;
  statusSearching: string;
  statusLocked: string;
};

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._-+—';
const MAGNET_ZONE = 0.015;
const DRAG_SCALE = 1 / 900;
const FREQ_MIN = 87.5;
const FREQ_RANGE = 20.4;

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function stationClarity(pos: number, spot: number, range: number) {
  const raw = Math.max(0, 1 - Math.abs(pos - spot) / range);
  return smoothstep(raw);
}

function scramble(str: string, noise: number) {
  if (noise <= 0.01) return str;
  return str
    .split('')
    .map((ch) => {
      if (ch === '\n' || ch === ' ') return ch;
      return Math.random() < noise ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : ch;
    })
    .join('');
}

function morphText(from: string, to: string, t: number) {
  const maxLen = Math.max(from.length, to.length);
  let out = '';
  for (let i = 0; i < maxLen; i++) {
    const a = from[i] ?? '';
    const b = to[i] ?? '';
    const threshold = (i + 1) / maxLen;
    if (a && b) out += t >= threshold ? b : a;
    else if (a) out += t < 1 - threshold * 0.5 ? a : '';
    else if (b) out += t >= threshold * 0.85 ? b : '—';
  }
  return out;
}

function generateY(x: number, time: number, cl: number) {
  const clean =
    Math.sin(x * 0.012 + time * 2) * 0.35 + Math.sin(x * 0.028 + time * 1.7) * 0.15;
  const seed = Math.sin(x * 0.5 + time * 30) * 43758.5453;
  const noise = ((seed - Math.floor(seed)) * 2 - 1) * 0.55;
  return cl * clean + (1 - cl) * noise;
}

export function initContactTuner(elements: ContactTunerElements, copy: ContactTunerCopy) {
  const {
    hero,
    canvas,
    labelEl,
    titleEl,
    line2El,
    hintEl,
    statusEl,
    statusTextEl,
    freqEl,
    signalEl,
    needleEl,
  } = elements;

  const stations = [...copy.stations].sort((a, b) => a.spot - b.spot);
  const sweetStation = stations.find((s) => s.lockable) ?? stations[0];

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let W = 0;
  let H = 0;
  let dpr = 1;
  let gridCanvas: HTMLCanvasElement | null = null;

  let position = 0;
  let clarity = 0;
  let activeStationId = '';
  let dragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let connected = false;
  let tick = 0;
  let lowClarityTime = 0;
  let hintStage = 0;
  let hintVisible = true;
  let scrambleInterval = 3;
  let lastPos = -1;
  let idleFrames = 0;
  let rafId = 0;
  let autoRevealTimer = 0;
  let hintHideTimer = 0;

  const HINT_TIMINGS = [15 * 60, 10 * 60, 8 * 60];

  const getBlend = () => {
    const clarities = stations.map((s) => ({
      station: s,
      clarity: stationClarity(position, s.spot, s.range),
    }));

    const maxClarity = Math.max(...clarities.map((c) => c.clarity), 0);
    const primary = clarities.reduce((best, cur) =>
      cur.clarity > best.clarity ? cur : best,
    );

    let from = stations[0];
    let to = stations[stations.length - 1];
    for (let i = 0; i < stations.length - 1; i++) {
      if (position >= stations[i].spot && position <= stations[i + 1].spot) {
        from = stations[i];
        to = stations[i + 1];
        break;
      }
    }

    const span = to.spot - from.spot;
    const blendT = span > 0 ? smoothstep((position - from.spot) / span) : 0;

    return { clarities, maxClarity, primary, from, to, blendT };
  };

  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gridCanvas = null;
  };

  const getX = (e: MouseEvent | TouchEvent) =>
    'clientX' in e ? e.clientX : e.touches[0]?.clientX ?? 0;

  const onStart = (e: MouseEvent | TouchEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    dragging = true;
    dragStartX = getX(e);
    dragStartPos = position;
  };

  const onMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging) return;
    const dx = getX(e) - dragStartX;
    position = Math.max(0, Math.min(1, dragStartPos + dx * DRAG_SCALE));
  };

  const onEnd = () => {
    dragging = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      position = Math.max(0, position - 0.005);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      position = Math.min(1, position + 0.005);
    }
  };

  const applyMagnetism = () => {
    let snapSpot: number | null = null;
    let minDist = MAGNET_ZONE;
    for (const station of stations) {
      const dist = Math.abs(position - station.spot);
      if (dist < minDist) {
        minDist = dist;
        snapSpot = station.spot;
      }
    }
    if (snapSpot !== null && minDist > 0.001) position = snapSpot;
  };

  const ensureGrid = () => {
    if (gridCanvas && gridCanvas.width === canvas.width && gridCanvas.height === canvas.height) {
      return;
    }
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    const gc = gridCanvas.getContext('2d');
    if (!gc) return;
    gc.setTransform(dpr, 0, 0, dpr, 0, 0);
    gc.strokeStyle = 'rgba(255,255,255,0.025)';
    gc.lineWidth = 1;
    const hN = 8;
    const vN = 12;
    for (let i = 0; i <= hN; i++) {
      const y = (H / hN) * i;
      gc.beginPath();
      gc.moveTo(0, y);
      gc.lineTo(W, y);
      gc.stroke();
    }
    for (let i = 0; i <= vN; i++) {
      const x = (W / vN) * i;
      gc.beginPath();
      gc.moveTo(x, 0);
      gc.lineTo(x, H);
      gc.stroke();
    }
  };

  const drawGrid = () => {
    ensureGrid();
    if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0);
  };

  const drawWave = (time: number, cl: number) => {
    const cy = H * 0.5;
    const amp = H * 0.28;
    const step = cl < 0.4 ? 6 : 4;

    ctx.beginPath();
    for (let x = 0; x < W; x += step) {
      const y = cy + generateY(x, time, cl) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    if (cl > 0.15) {
      ctx.strokeStyle = `rgba(255,255,255,${0.015 + cl * 0.02})`;
      ctx.lineWidth = 12;
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255,255,255,${0.04 + cl * 0.04})`;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${0.15 + cl * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const lockSignal = () => {
    if (connected) return;
    connected = true;
    statusEl.classList.add('is-connected');
    statusTextEl.textContent = copy.statusLocked;
    line2El.style.borderBottomColor = 'rgba(255,255,255,0.4)';
    labelEl.textContent = copy.label;
    titleEl.textContent = sweetStation.title;
    line2El.textContent = sweetStation.line2;
    line2El.href = sweetStation.line2Href;
    hintEl.style.opacity = '0';
    hintVisible = false;
  };

  const updateText = () => {
    const { maxClarity, primary, from, to, blendT } = getBlend();
    clarity = maxClarity;
    activeStationId = primary.station.id;

    const noise = 1 - maxClarity;
    const freq = (FREQ_MIN + position * FREQ_RANGE).toFixed(1);
    const snr = (maxClarity * 32).toFixed(1);

    freqEl.textContent = `${freq} MHz`;
    signalEl.textContent = `SNR ${snr} dB`;
    needleEl.style.left = `${position * 100}%`;

    const targetTitle = morphText(from.title, to.title, blendT);
    const useFromLine2 = blendT < 0.42;
    const useToLine2 = blendT > 0.58;
    const targetLine2 = useFromLine2
      ? from.line2
      : useToLine2
        ? to.line2
        : morphText(from.line2 || copy.line2Mask, to.line2 || copy.line2Mask, blendT);
    const targetHref = blendT < 0.5 ? from.line2Href : to.line2Href;

    labelEl.textContent = copy.label;
    scrambleInterval = maxClarity < 0.2 ? 4 : maxClarity < 0.6 ? 2 : 1;

    if (tick % scrambleInterval === 0 || maxClarity > 0.97) {
      titleEl.textContent = scramble(targetTitle, noise);
      line2El.textContent = targetLine2 ? scramble(targetLine2, noise) : '';
    }

    if (targetLine2 && targetHref) line2El.href = targetHref;
    line2El.style.visibility = targetLine2 ? 'visible' : 'hidden';

    if (tick % 4 === 0) {
      labelEl.style.opacity = String(0.3 + maxClarity * 0.7);
      titleEl.style.opacity = String(0.5 + maxClarity * 0.5);
      line2El.style.opacity = String(targetLine2 ? 0.3 + maxClarity * 0.7 : 0);
    }

    if (maxClarity > 0.5) {
      if (hintVisible) {
        hintEl.style.opacity = '0';
        hintVisible = false;
      }
      lowClarityTime = 0;
    } else if (hintVisible) {
      if (hintStage === 0 && tick > HINT_TIMINGS[0]) {
        hintEl.style.opacity = '0';
        hintVisible = false;
        hintStage = 1;
      }
    } else {
      lowClarityTime++;
      const wait = HINT_TIMINGS[Math.min(hintStage, HINT_TIMINGS.length - 1)];
      if (lowClarityTime > wait) {
        lowClarityTime = 0;
        const text = hintStage < 2 ? copy.hintDrag : copy.hintFreq;
        hintEl.textContent = text;
        hintEl.style.opacity = hintStage < 2 ? '0.65' : '0.9';
        hintVisible = true;
        if (hintStage < 2) hintStage++;
        if (hintStage <= 2) {
          window.clearTimeout(hintHideTimer);
          hintHideTimer = window.setTimeout(() => {
            if (hintVisible) {
              hintEl.style.opacity = '0';
              hintVisible = false;
            }
          }, 5000);
        }
      }
    }

    const onSweet = activeStationId === sweetStation.id;
    if (maxClarity > 0.96 && onSweet && !connected) {
      lockSignal();
    } else if ((maxClarity <= 0.9 || !onSweet) && connected) {
      connected = false;
      statusEl.classList.remove('is-connected');
      statusTextEl.textContent = copy.statusSearching;
      line2El.style.borderBottomColor = '';
    }
  };

  const frame = () => {
    tick++;

    const posChanged = Math.abs(position - lastPos) > 0.0001;
    if (!posChanged && !dragging) idleFrames++;
    else idleFrames = 0;
    lastPos = position;

    applyMagnetism();

    let shouldDrawCanvas = true;
    if (idleFrames > 30 && clarity < 0.5) {
      shouldDrawCanvas = tick % 4 === 0;
    } else if (clarity < 0.3) {
      shouldDrawCanvas = tick % 2 === 0;
    }

    if (shouldDrawCanvas) {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      drawWave(tick * 0.016, clarity);
    }

    updateText();
    rafId = window.requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize);
  hero.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  hero.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  hero.addEventListener('touchend', onEnd);
  document.addEventListener('keydown', onKeyDown);
  rafId = window.requestAnimationFrame(frame);

  autoRevealTimer = window.setTimeout(() => {
    if (!connected) lockSignal();
  }, 8000);

  return () => {
    window.cancelAnimationFrame(rafId);
    window.clearTimeout(autoRevealTimer);
    window.clearTimeout(hintHideTimer);
    window.removeEventListener('resize', resize);
    hero.removeEventListener('mousedown', onStart);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    hero.removeEventListener('touchstart', onStart);
    window.removeEventListener('touchmove', onMove);
    hero.removeEventListener('touchend', onEnd);
    document.removeEventListener('keydown', onKeyDown);
  };
}
