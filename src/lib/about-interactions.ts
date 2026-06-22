type BioWord = {
  el: HTMLSpanElement;
  z0: number;
  rx0: number;
  z: number;
  rx: number;
  op: number;
};

type ExpCardState = {
  el: HTMLElement;
  yearEl: HTMLElement | null;
  rx: number;
  ry: number;
  trx: number;
  tryy: number;
  active: boolean;
  dragActive: boolean;
  released: boolean;
  dragX: number;
  dragVX: number;
  startMX: number;
  startDragX: number;
  prevMX: number;
  springK: number;
  dragDamping: number;
  maxStretch: number;
  wallDir: number;
  yearBumpX: number;
  yearHitCount: number;
  yearHitThreshold: number;
  yearDetached: boolean;
  yearDetachType: number;
  yearPendAngle: number;
  yearPendVel: number;
  yearDragging: boolean;
  yearReachedBottom: boolean;
  yearMagnetLocked: boolean;
};

function setPageDragging(active: boolean) {
  document.body.classList.toggle('is-dragging', active);
}

function getPageBgColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#080c14';
}

type CardDrag = {
  active: boolean;
  hovering: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  startMX: number;
  startMY: number;
  startX: number;
  startY: number;
  prevMX: number;
  prevMY: number;
  spin: number;
  spinV: number;
  scale: number;
  springK: number;
  damping: number;
  released: boolean;
  settled: boolean;
  settledAt: number;
  recovering: boolean;
  frozenRX: number;
  frozenRY: number;
  frozenSpin: number;
  liftScale: number;
};

function hsvToRgb(hue: number) {
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
  return { rr, gg, bb };
}

export function initAboutInteractions() {
  const aboutPage = document.querySelector('.about-bio') || document.querySelector('.about-exp');
  if (!aboutPage) return () => {};

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let smoothY = window.scrollY;
  let prevSmoothY = smoothY;
  let velocity = 0;
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let rafId = 0;

  const bioCard = document.getElementById('bioCard');
  const bioTilt = { rx: 0, ry: 0, trx: 0, tryy: 0 };
  let bioCanvas: HTMLCanvasElement | null = null;
  let bioCtx: CanvasRenderingContext2D | null = null;
  const LW = 200;
  const LH = 150;

  const cardDrag: CardDrag = {
    active: false,
    hovering: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    startMX: 0,
    startMY: 0,
    startX: 0,
    startY: 0,
    prevMX: 0,
    prevMY: 0,
    spin: 0,
    spinV: 0,
    scale: 1,
    springK: 0.04,
    damping: 0.88,
    released: false,
    settled: false,
    settledAt: 0,
    recovering: false,
    frozenRX: 0,
    frozenRY: 0,
    frozenSpin: 0,
    liftScale: 1,
  };

  const cleanups: Array<() => void> = [];

  if (bioCard && !isTouch) {
    bioCanvas = document.createElement('canvas');
    bioCanvas.className = 'about-bio__light-canvas';
    bioCanvas.width = LW;
    bioCanvas.height = LH;
    bioCanvas.setAttribute('aria-hidden', 'true');
    bioCard.insertBefore(bioCanvas, bioCard.firstChild);
    bioCtx = bioCanvas.getContext('2d');
    bioCard.style.willChange = 'transform';

    const onEnter = () => {
      cardDrag.hovering = true;
    };
    const onMove = (e: MouseEvent) => {
      const r = bioCard.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      if (!cardDrag.active) {
        bioTilt.tryy = (px - 0.5) * 18;
        bioTilt.trx = (0.5 - py) * 12;
      }
    };
    const onLeave = () => {
      cardDrag.hovering = false;
      if (!cardDrag.active) {
        bioTilt.trx = 0;
        bioTilt.tryy = 0;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      cardDrag.active = true;
      cardDrag.released = false;
      cardDrag.settled = false;
      cardDrag.recovering = false;
      cardDrag.startMX = e.clientX;
      cardDrag.startMY = e.clientY;
      cardDrag.prevMX = e.clientX;
      cardDrag.prevMY = e.clientY;
      cardDrag.startX = cardDrag.x;
      cardDrag.startY = cardDrag.y;
      cardDrag.vx = 0;
      cardDrag.vy = 0;
      cardDrag.spinV = 0;
      setPageDragging(true);
      bioCard.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!cardDrag.active) return;
      cardDrag.x = cardDrag.startX + (e.clientX - cardDrag.startMX);
      cardDrag.y = cardDrag.startY + (e.clientY - cardDrag.startMY);
      cardDrag.vx = e.clientX - cardDrag.prevMX;
      cardDrag.vy = e.clientY - cardDrag.prevMY;
      cardDrag.prevMX = e.clientX;
      cardDrag.prevMY = e.clientY;
      bioTilt.tryy = Math.max(-30, Math.min(30, cardDrag.vx * 2));
      bioTilt.trx = Math.max(-20, Math.min(20, -cardDrag.vy * 1.5));
    };
    const onUp = (e: PointerEvent) => {
      if (!cardDrag.active) return;
      cardDrag.active = false;
      cardDrag.released = true;
      setPageDragging(false);
      const speed = Math.hypot(cardDrag.vx, cardDrag.vy);
      cardDrag.spinV = (cardDrag.vx > 0 ? 1 : -1) * Math.min(speed * 1.2, 25);
    };

    bioCard.addEventListener('mouseenter', onEnter);
    bioCard.addEventListener('mousemove', onMove);
    bioCard.addEventListener('mouseleave', onLeave);
    bioCard.addEventListener('pointerdown', onDown);
    bioCard.addEventListener('pointermove', onPointerMove);
    bioCard.addEventListener('pointerup', onUp);
    bioCard.addEventListener('pointercancel', onUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    cleanups.push(() => {
      bioCard.removeEventListener('mouseenter', onEnter);
      bioCard.removeEventListener('mousemove', onMove);
      bioCard.removeEventListener('mouseleave', onLeave);
      bioCard.removeEventListener('pointerdown', onDown);
      bioCard.removeEventListener('pointermove', onPointerMove);
      bioCard.removeEventListener('pointerup', onUp);
      bioCard.removeEventListener('pointercancel', onUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    });
  }

  let lastLightKey = '';
  const renderCardLight = (tiltRY: number, tiltRX: number) => {
    if (!bioCtx) return;
    const key = `${Math.round(tiltRY * 10)},${Math.round(tiltRX * 10)}`;
    if (key === lastLightKey) return;
    lastLightKey = key;

    const imgData = bioCtx.createImageData(LW, LH);
    const d = imgData.data;
    const gradAngle = ((145 + tiltRY * 3) * Math.PI) / 180;
    const cosA = Math.cos(gradAngle);
    const sinA = Math.sin(gradAngle);
    const offset = tiltRY * 0.06 + tiltRX * 0.04;
    const specPos = 0.5 + tiltRY * 0.04 - tiltRX * 0.03;

    for (let y = 0; y < LH; y++) {
      for (let x = 0; x < LW; x++) {
        const nx = x / LW;
        const ny = y / LH;
        const proj = nx * cosA + ny * sinA + offset;
        const bandIntensity = Math.sin(proj * Math.PI * 5) * 0.5 + 0.5;
        const hue = ((proj * 360 * 1.5 + tiltRY * 15) % 360 + 360) % 360;
        const { rr, gg, bb } = hsvToRgb(hue);
        const iridStrength = bandIntensity * 0.12;
        const distFromSpec = Math.abs(proj - specPos);
        const specular = Math.exp(-distFromSpec * distFromSpec * 80) * 0.18;
        const rv = specular + rr * iridStrength;
        const gv = specular + gg * iridStrength;
        const bv = specular + bb * iridStrength;
        const noise = (Math.random() - 0.5) * 0.006;
        const maxC = Math.max(rv, gv, bv);
        const idx = (y * LW + x) * 4;
        d[idx] = Math.max(0, Math.min(255, Math.round((rv + noise) * 255)));
        d[idx + 1] = Math.max(0, Math.min(255, Math.round((gv + noise) * 255)));
        d[idx + 2] = Math.max(0, Math.min(255, Math.round((bv + noise) * 255)));
        d[idx + 3] = Math.max(0, Math.min(255, Math.round((maxC + noise * 0.5) * 1.8 * 255)));
      }
    }
    bioCtx.putImageData(imgData, 0, 0);
  };

  const bioWords: BioWord[] = [];
  document.querySelectorAll('[data-scroll-text]').forEach((p) => {
    const raw = p.textContent?.trim().split(/\s+/) ?? [];
    p.innerHTML = '';
    raw.forEach((word) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, opacity';
      span.style.marginRight = '0.3em';
      span.style.backfaceVisibility = 'hidden';
      p.appendChild(span);
      bioWords.push({
        el: span,
        z0: -80 - Math.random() * 60,
        rx0: 25 + Math.random() * 20,
        z: -80,
        rx: 25,
        op: 0.08,
      });
    });
  });

  const expSection = document.querySelector('.about-exp');
  const expLine = document.querySelector<HTMLElement>('.about-exp__line');
  const expLineFill = document.querySelector<HTMLElement>('.about-exp__line-fill');
  const expItems = document.querySelectorAll<HTMLElement>('.about-exp__item');
  const expCards: ExpCardState[] = [];

  function createLineBump(card: HTMLElement, wallDir: number, cardState: ExpCardState) {
    if (!expLine || !expSection) return;

    const sectionRect = expSection.getBoundingClientRect();
    const lineRect = expLine.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const impactY = cardRect.top + cardRect.height * 0.5 - sectionRect.top;

    const fillPct = expLineFill ? parseFloat(expLineFill.style.height) || 0 : 0;
    const impactRelative = (cardRect.top + cardRect.height * 0.5 - lineRect.top) / lineRect.height;
    const isFilled = impactRelative * 100 < fillPct;
    const strokeColor = isFilled ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.08)';
    const glowColor = isFilled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
    const bumpDir = -wallDir;
    const bumpH = 160;
    const maxOff = 18;
    const svgW = maxOff * 2 + 6;
    const cx = svgW / 2;
    const pageBg = getPageBgColor();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(svgW));
    svg.setAttribute('height', String(bumpH));
    svg.style.cssText =
      `position:absolute;pointer-events:none;z-index:1;overflow:visible;left:50%;top:${impactY - bumpH / 2}px;transform:translateX(-50%);`;

    const cover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    cover.setAttribute('x', String(cx - 2));
    cover.setAttribute('y', '0');
    cover.setAttribute('width', '4');
    cover.setAttribute('height', String(bumpH));
    cover.setAttribute('fill', pageBg);
    svg.appendChild(cover);

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('stroke', glowColor);
    glow.setAttribute('stroke-width', '3');
    glow.setAttribute('fill', 'none');
    glow.setAttribute('filter', 'blur(3px)');
    svg.appendChild(glow);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', '1');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    expSection.appendChild(svg);

    const buildPath = (off: number) =>
      `M ${cx} 0` +
      ` C ${cx} ${bumpH * 0.2}, ${cx + off} ${bumpH * 0.35}, ${cx + off} ${bumpH * 0.5}` +
      ` C ${cx + off} ${bumpH * 0.65}, ${cx} ${bumpH * 0.8}, ${cx} ${bumpH}`;

    const startTime = performance.now();
    const duration = 800;
    const yearMaxShift = 8;
    let bumpRaf = 0;

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const decay = Math.exp(-t * 5);
      const osc = Math.cos(t * Math.PI * 4);
      const off = maxOff * decay * osc * bumpDir;
      const d = buildPath(off);
      path.setAttribute('d', d);
      glow.setAttribute('d', d);
      glow.setAttribute('stroke-opacity', String((0.35 * decay).toFixed(3)));
      cardState.yearBumpX = yearMaxShift * decay * osc * bumpDir;

      if (t < 1 && Math.abs(off) > 0.2) {
        bumpRaf = requestAnimationFrame(animate);
      } else {
        svg.remove();
        cardState.yearBumpX = 0;
      }
    };

    bumpRaf = requestAnimationFrame(animate);
    cleanups.push(() => {
      cancelAnimationFrame(bumpRaf);
      svg.remove();
      cardState.yearBumpX = 0;
    });
  }

  function triggerYearDetach(s: ExpCardState) {
    if (!s.yearEl) return;
    s.yearDetached = true;
    s.yearDetachType = Math.random() < 0.5 ? 1 : 2;
    s.yearEl.style.width = 'fit-content';
    s.yearEl.style.transition = 'none';

    const kickDir = s.yearDetachType === 1
      ? (s.wallDir === 1 ? 2 : -2)
      : (s.wallDir === 1 ? -2 : 2);

    if (s.yearDetachType === 1) {
      if (s.wallDir === 1) {
        s.yearEl.style.marginLeft = 'auto';
        s.yearEl.style.marginRight = '0';
        s.yearEl.style.transformOrigin = '0% 0%';
      } else {
        s.yearEl.style.marginLeft = '0';
        s.yearEl.style.marginRight = 'auto';
        s.yearEl.style.transformOrigin = '100% 0%';
      }
    } else if (s.wallDir === 1) {
      s.yearEl.style.marginLeft = 'auto';
      s.yearEl.style.marginRight = '0';
      s.yearEl.style.transformOrigin = '100% 0%';
    } else {
      s.yearEl.style.marginLeft = '0';
      s.yearEl.style.marginRight = 'auto';
      s.yearEl.style.transformOrigin = '0% 0%';
    }

    s.yearPendVel = kickDir;
    s.yearPendAngle = 0;
    s.yearReachedBottom = false;
    s.yearMagnetLocked = false;
  }

  expItems.forEach((item) => {
    const card = item.querySelector<HTMLElement>('.about-exp__card');
    const year = item.querySelector<HTMLElement>('.about-exp__year');
    if (!card || isTouch || vw <= 1024) return;

    const isFlip = item.classList.contains('about-exp__item--flip');
    const state: ExpCardState = {
      el: card,
      yearEl: year,
      rx: 0,
      ry: 0,
      trx: 0,
      tryy: 0,
      active: false,
      dragActive: false,
      released: false,
      dragX: 0,
      dragVX: 0,
      startMX: 0,
      startDragX: 0,
      prevMX: 0,
      springK: 0.06,
      dragDamping: 0.82,
      maxStretch: 1200,
      wallDir: isFlip ? -1 : 1,
      yearBumpX: 0,
      yearHitCount: 0,
      yearHitThreshold: 5 + Math.floor(Math.pow(Math.random(), 1.8) * 8),
      yearDetached: false,
      yearDetachType: 0,
      yearPendAngle: 0,
      yearPendVel: 0,
      yearDragging: false,
      yearReachedBottom: false,
      yearMagnetLocked: false,
    };

    card.style.userSelect = 'none';
    card.style.touchAction = 'pan-y';

    const onMove = (e: MouseEvent) => {
      if (!state.dragActive) {
        state.active = true;
        const r = card.getBoundingClientRect();
        state.tryy = ((e.clientX - r.left) / r.width - 0.5) * 18;
        state.trx = (0.5 - (e.clientY - r.top) / r.height) * 12;
      }
    };
    const onLeave = () => {
      if (!state.dragActive) {
        state.trx = 0;
        state.tryy = 0;
        state.active = false;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      state.dragActive = true;
      state.released = false;
      state.startMX = e.clientX;
      state.startDragX = state.dragX;
      state.prevMX = e.clientX;
      state.dragVX = 0;
      setPageDragging(true);
      card.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!state.dragActive) return;
      let rawDx = e.clientX - state.startMX + state.startDragX;
      if (state.wallDir === 1) rawDx = Math.max(0, rawDx);
      else rawDx = Math.min(0, rawDx);
      const sign = rawDx >= 0 ? 1 : -1;
      state.dragX = sign * state.maxStretch * Math.tanh(Math.abs(rawDx) / state.maxStretch);
      state.dragVX = (e.clientX - state.prevMX) * 0.8;
      state.prevMX = e.clientX;
      state.tryy = Math.max(-1, Math.min(1, state.dragVX * 0.08));
      state.trx = 0;
    };
    const onUp = () => {
      if (!state.dragActive) return;
      state.dragActive = false;
      state.released = true;
      setPageDragging(false);
    };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    if (year) {
      let yearDragActive = false;
      let yearAnchorX = 0;
      let yearAnchorY = 0;
      let yearPrevMouseAngle = 0;
      let yearCumulativeAngle = 0;

      const onYearDown = (e: PointerEvent) => {
        if (!state.yearDetached) return;
        e.preventDefault();
        e.stopPropagation();
        yearDragActive = true;
        state.yearDragging = true;
        state.yearPendVel = 0;
        const savedTransform = year.style.transform;
        year.style.transform = 'rotate(0deg)';
        const cleanRect = year.getBoundingClientRect();
        year.style.transform = savedTransform;
        const origin = getComputedStyle(year).transformOrigin.split(' ');
        yearAnchorX = cleanRect.left + parseFloat(origin[0]);
        yearAnchorY = cleanRect.top + parseFloat(origin[1]);
        yearPrevMouseAngle = (Math.atan2(e.clientY - yearAnchorY, e.clientX - yearAnchorX) * 180) / Math.PI;
        yearCumulativeAngle = state.yearPendAngle;
        year.setPointerCapture(e.pointerId);
      };

      const onYearMove = (e: PointerEvent) => {
        if (!yearDragActive) return;
        const mouseAngle = (Math.atan2(e.clientY - yearAnchorY, e.clientX - yearAnchorX) * 180) / Math.PI;
        let delta = mouseAngle - yearPrevMouseAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        yearPrevMouseAngle = mouseAngle;
        yearCumulativeAngle += delta;
        while (yearCumulativeAngle > 180) yearCumulativeAngle -= 360;
        while (yearCumulativeAngle < -180) yearCumulativeAngle += 360;
        let rawAngle = yearCumulativeAngle;

        if (state.yearMagnetLocked) {
          if (Math.abs(rawAngle) > 25) state.yearMagnetLocked = false;
          else {
            state.yearPendAngle += (0 - state.yearPendAngle) * 0.2;
            return;
          }
        }

        let targetAngle = rawAngle;
        if (state.yearReachedBottom && Math.abs(rawAngle) < 30) {
          const t = 1 - Math.abs(rawAngle) / 30;
          const pull = t * t * t;
          targetAngle = rawAngle * (1 - pull * 0.85);
        }
        const lerpSpeed = Math.abs(targetAngle) < 10 ? 0.15 : 0.3;
        state.yearPendAngle += (targetAngle - state.yearPendAngle) * lerpSpeed;
        if (Math.abs(state.yearPendAngle) < 3) {
          state.yearMagnetLocked = true;
          state.yearPendAngle = 0;
        }
      };

      const onYearUp = () => {
        if (!yearDragActive) return;
        yearDragActive = false;
        state.yearDragging = false;
        if (state.yearMagnetLocked) {
          state.yearPendAngle = 0;
          state.yearPendVel = 0;
        }
        state.yearMagnetLocked = false;
      };

      year.addEventListener('pointerdown', onYearDown);
      year.addEventListener('pointermove', onYearMove);
      year.addEventListener('pointerup', onYearUp);
      year.addEventListener('pointercancel', onYearUp);
      cleanups.push(() => {
        year.removeEventListener('pointerdown', onYearDown);
        year.removeEventListener('pointermove', onYearMove);
        year.removeEventListener('pointerup', onYearUp);
        year.removeEventListener('pointercancel', onYearUp);
      });
    }

    cleanups.push(() => {
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
      card.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    });

    expCards.push(state);
  });

  const ctaText = document.querySelector<HTMLElement>('.about-cta__text');
  const ctaLetters: Array<{
    el: HTMLSpanElement;
    z: number;
    ry: number;
    rz: number;
    i: number;
  }> = [];

  if (ctaText) {
    ctaText.style.perspective = '800px';
    ctaText.style.transformStyle = 'preserve-3d';
    const html = ctaText.innerHTML;
    const parts = html.split(/(<br\s*\/?>)/gi);
    ctaText.innerHTML = '';
    let ctaIdx = 0;
    parts.forEach((part) => {
      if (/^<br/i.test(part)) {
        ctaText.appendChild(document.createElement('br'));
        return;
      }
      for (const ch of part) {
        if (ch === ' ') {
          ctaText.appendChild(document.createTextNode(' '));
          continue;
        }
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.display = 'inline-block';
        span.style.willChange = 'transform';
        span.style.backfaceVisibility = 'hidden';
        ctaText.appendChild(span);
        ctaLetters.push({
          el: span,
          z: -300 - Math.random() * 200,
          ry: (Math.random() - 0.5) * 90,
          rz: (Math.random() - 0.5) * 30,
          i: ctaIdx++,
        });
      }
    });
  }

  const t0 = performance.now();
  const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

  const tick = (now: number) => {
    const elapsed = now - t0;
    const targetY = window.scrollY;
    prevSmoothY = smoothY;
    smoothY += (targetY - smoothY) * 0.1;
    velocity += (smoothY - prevSmoothY - velocity) * 0.12;

    bioWords.forEach((w) => {
      const rect = w.el.getBoundingClientRect();
      const progress = 1 - Math.max(0, Math.min(1, (rect.top - vh * 0.7) / (vh * 0.2)));
      const e = 1 - (1 - progress) ** 3;
      w.z = w.z0 * (1 - e);
      w.rx = w.rx0 * (1 - e);
      w.op = 0.08 + e * 0.92;
      w.el.style.opacity = w.op.toFixed(2);
      w.el.style.transform = `perspective(600px) translateZ(${w.z.toFixed(0)}px) rotateX(${w.rx.toFixed(1)}deg)`;
    });

    if (bioCard) {
      const bioRect = bioCard.getBoundingClientRect();
      if (bioRect.top < vh * 0.85 && !bioCard.classList.contains('is-visible')) {
        bioCard.classList.add('is-visible');
      }

      if (
        !isTouch &&
        !cardDrag.hovering &&
        !cardDrag.active &&
        !cardDrag.released &&
        Math.abs(cardDrag.x) < 1 &&
        Math.abs(cardDrag.y) < 1
      ) {
        const t = elapsed * 0.001;
        bioTilt.tryy = Math.sin(t * 0.7) * 3 + Math.sin(t * 1.3) * 1.5;
        bioTilt.trx = Math.cos(t * 0.5) * 2 + Math.cos(t * 1.1) * 1;
      }

      if (cardDrag.released) {
        cardDrag.x += cardDrag.vx;
        cardDrag.y += cardDrag.vy;
        cardDrag.vx = (cardDrag.vx - cardDrag.springK * cardDrag.x) * cardDrag.damping;
        cardDrag.vy = (cardDrag.vy - cardDrag.springK * cardDrag.y) * cardDrag.damping;
        bioTilt.tryy = Math.max(-30, Math.min(30, cardDrag.vx * 3));
        bioTilt.trx = Math.max(-20, Math.min(20, -cardDrag.vy * 2));
        cardDrag.spin += cardDrag.spinV;
        cardDrag.spinV *= 0.94;

        const speed = Math.abs(cardDrag.vx) + Math.abs(cardDrag.vy);
        const dist = Math.abs(cardDrag.x) + Math.abs(cardDrag.y);
        if (speed < 0.3 && dist < 1) {
          cardDrag.x = 0;
          cardDrag.y = 0;
          cardDrag.vx = 0;
          cardDrag.vy = 0;
          if (!cardDrag.settled) {
            cardDrag.settled = true;
            cardDrag.settledAt = performance.now();
            cardDrag.frozenRX = bioTilt.rx;
            cardDrag.frozenRY = bioTilt.ry;
            const visualAngle = (cardDrag.spin * 0.15) % 360;
            const normalizedAngle = ((visualAngle % 360) + 360) % 360;
            const shortAngle = normalizedAngle > 180 ? normalizedAngle - 360 : normalizedAngle;
            cardDrag.frozenSpin = shortAngle / 0.15;
            cardDrag.spin = cardDrag.frozenSpin;
          }

          const timeSinceSettle = performance.now() - cardDrag.settledAt;
          if (timeSinceSettle > 3000) {
            const t0r = timeSinceSettle - 3000;
            const liftDur = 500;
            const rotateDur = 1400;
            const setDownDur = 500;
            const liftEnd = liftDur;
            const rotateEnd = liftEnd + rotateDur;
            const totalEnd = rotateEnd + setDownDur;

            if (t0r < liftEnd) {
              cardDrag.liftScale = 1 + smootherstep(Math.min(1, t0r / liftDur)) * 0.06;
              bioTilt.trx = cardDrag.frozenRX;
              bioTilt.tryy = cardDrag.frozenRY;
            } else if (t0r < rotateEnd) {
              cardDrag.liftScale = 1.06;
              const t = smootherstep(Math.min(1, (t0r - liftEnd) / rotateDur));
              bioTilt.rx = cardDrag.frozenRX * (1 - t);
              bioTilt.ry = cardDrag.frozenRY * (1 - t);
              cardDrag.spin = cardDrag.frozenSpin * (1 - t);
              bioTilt.trx = bioTilt.rx;
              bioTilt.tryy = bioTilt.ry;
            } else if (t0r < totalEnd) {
              const t = smootherstep(Math.min(1, (t0r - rotateEnd) / setDownDur));
              cardDrag.liftScale = 1 + (1 - t) * 0.06;
              bioTilt.rx = 0;
              bioTilt.ry = 0;
              bioTilt.trx = 0;
              bioTilt.tryy = 0;
              cardDrag.spin = 0;
            } else {
              cardDrag.released = false;
              cardDrag.settled = false;
              cardDrag.spin = 0;
              cardDrag.spinV = 0;
              cardDrag.liftScale = 1;
              bioTilt.rx = 0;
              bioTilt.ry = 0;
              bioTilt.trx = 0;
              bioTilt.tryy = 0;
            }
          } else {
            bioTilt.trx = cardDrag.frozenRX;
            bioTilt.tryy = cardDrag.frozenRY;
            cardDrag.liftScale = 1;
          }
        }
      }

      bioTilt.rx += (bioTilt.trx - bioTilt.rx) * 0.06;
      bioTilt.ry += (bioTilt.tryy - bioTilt.ry) * 0.06;

      if (bioCard.classList.contains('is-visible')) {
        if (!isTouch) {
          let sc = 1;
          if (cardDrag.active) sc = 1.03;
          else if (cardDrag.liftScale !== 1) sc = cardDrag.liftScale;
          else if (cardDrag.released) {
            sc = 1 + Math.min(0.04, (Math.abs(cardDrag.vx) + Math.abs(cardDrag.vy)) * 0.003);
          }
          bioCard.style.transform = `translate(${cardDrag.x.toFixed(1)}px, ${cardDrag.y.toFixed(1)}px) rotateX(${bioTilt.rx.toFixed(2)}deg) rotateY(${bioTilt.ry.toFixed(2)}deg) rotateZ(${(cardDrag.spin * 0.15).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
          const shX = (-bioTilt.ry * 2 - cardDrag.x * 0.1).toFixed(1);
          const shY = (22 + bioTilt.rx * 1.5 - cardDrag.y * 0.1).toFixed(1);
          const shBlur = (55 + Math.abs(bioTilt.rx) + Math.abs(bioTilt.ry) * 2).toFixed(0);
          bioCard.style.boxShadow = `${shX}px ${shY}px ${shBlur}px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)`;
        }
        renderCardLight(bioTilt.ry, bioTilt.rx);
      }
    }

    if (expSection) {
      const sRect = expSection.getBoundingClientRect();
      if (expLineFill) {
        const start = sRect.top - vh * 0.5;
        const end = sRect.bottom - vh;
        const total = end - start;
        if (total > 0) {
          const pct = Math.max(0, Math.min(100, (-start / total) * 100));
          expLineFill.style.height = `${pct}%`;
        }
      }
      expItems.forEach((item) => {
        const r = item.getBoundingClientRect();
        if (r.top < vh * 0.82) item.classList.add('is-visible');
        const year = item.querySelector<HTMLElement>('.about-exp__year');
        if (year && item.classList.contains('is-visible')) {
          const center = r.top + r.height / 2;
          const dist = Math.abs(center - vh * 0.5) / vh;
          const prox = Math.max(0, 1 - dist * 1.8);
          const cs = expCards.find((card) => card.yearEl === year) ?? null;
          const bumpX = cs?.yearBumpX ?? 0;

          if (cs?.yearDetached && (cs.yearDetachType === 1 || cs.yearDetachType === 2)) {
            if (!cs.yearDragging) {
              let gravTarget: number;
              if (cs.yearDetachType === 1) {
                gravTarget = cs.wallDir === 1 ? 80 : -80;
              } else {
                gravTarget = cs.wallDir === 1 ? -80 : 80;
              }
              if (!cs.yearReachedBottom && Math.abs(cs.yearPendAngle) > 50) {
                cs.yearReachedBottom = true;
              }
              const magnetActive = cs.yearReachedBottom;
              const absAngle = Math.abs(cs.yearPendAngle);
              let magnetMix = 0;
              if (magnetActive) {
                if (absAngle < 12) magnetMix = 1;
                else if (absAngle < 25) {
                  const t = (absAngle - 12) / 13;
                  magnetMix = 1 - t * t;
                }
              }
              const gravForce = (gravTarget - cs.yearPendAngle) * 0.005;
              const magForce = (0 - cs.yearPendAngle) * 0.04;
              cs.yearPendVel += gravForce * (1 - magnetMix) + magForce * magnetMix;
              cs.yearPendVel *= 0.98 - magnetMix * 0.1;
              cs.yearPendAngle += cs.yearPendVel;

              if (magnetMix > 0.5 && Math.abs(cs.yearPendVel) < 0.1 && Math.abs(cs.yearPendAngle) < 1) {
                cs.yearDetached = false;
                cs.yearPendAngle = 0;
                cs.yearPendVel = 0;
                cs.yearHitCount = 0;
                cs.yearHitThreshold = 5 + Math.floor(Math.pow(Math.random(), 1.8) * 8);
                year.style.width = '';
                year.style.margin = '';
                year.style.transformOrigin = '';
                year.style.cursor = '';
              }
            }
            year.style.opacity = (0.1 + prox * 0.35).toFixed(2);
            year.style.transform =
              `scale(${(1 + prox * 0.08).toFixed(3)}) translateY(${(velocity * 0.3).toFixed(1)}px) translateX(${bumpX.toFixed(1)}px) rotate(${cs.yearPendAngle.toFixed(1)}deg)`;
            year.style.cursor = cs.yearDetached ? 'grab' : '';
          } else {
            year.style.opacity = (0.1 + prox * 0.35).toFixed(2);
            year.style.transform =
              `scale(${(1 + prox * 0.08).toFixed(3)}) translateY(${(velocity * 0.3).toFixed(1)}px) translateX(${bumpX.toFixed(1)}px)`;
            year.style.cursor = '';
          }
        }
      });
    }

    expCards.forEach((s) => {
      if (s.released) {
        const fx = -s.springK * s.dragX;
        s.dragVX = (s.dragVX + fx) * s.dragDamping;
        s.dragX += s.dragVX;
        if (s.wallDir === 1 && s.dragX < 0) {
          s.dragX = 0;
          s.dragVX = Math.abs(s.dragVX) * 0.3;
          if (Math.abs(s.dragVX) > 0.5) {
            createLineBump(s.el, s.wallDir, s);
            s.yearHitCount += 1;
            if (s.yearHitCount >= s.yearHitThreshold && !s.yearDetached) triggerYearDetach(s);
          }
        }
        if (s.wallDir === -1 && s.dragX > 0) {
          s.dragX = 0;
          s.dragVX = -Math.abs(s.dragVX) * 0.3;
          if (Math.abs(s.dragVX) > 0.5) {
            createLineBump(s.el, s.wallDir, s);
            s.yearHitCount += 1;
            if (s.yearHitCount >= s.yearHitThreshold && !s.yearDetached) triggerYearDetach(s);
          }
        }
        s.tryy = Math.max(-1, Math.min(1, s.dragVX * 0.08));
        if (Math.abs(s.dragX) < 0.3 && Math.abs(s.dragVX) < 0.08) {
          s.dragX = 0;
          s.dragVX = 0;
          s.released = false;
          s.tryy = 0;
        }
      }
      s.rx += (s.trx - s.rx) * 0.07;
      s.ry += (s.tryy - s.ry) * 0.07;
      const hasTilt = Math.abs(s.rx) > 0.15 || Math.abs(s.ry) > 0.15 || s.active;
      const hasDrag = Math.abs(s.dragX) > 0.3;
      if (hasTilt || hasDrag) {
        s.el.style.transform =
          `perspective(600px) translateX(${s.dragX.toFixed(1)}px) rotateX(${s.rx.toFixed(1)}deg) rotateY(${s.ry.toFixed(1)}deg) translateZ(12px)`;
      } else {
        s.el.style.transform = '';
      }
    });

    if (ctaText && ctaLetters.length) {
      const ctaRect = ctaText.getBoundingClientRect();
      const ctaProgress = 1 - Math.max(0, Math.min(1, (ctaRect.top - vh * 0.75) / (vh * 0.25)));
      ctaLetters.forEach((cl) => {
        const t = Math.max(0, Math.min(1, ctaProgress - cl.i * 0.015));
        const e = 1 - (1 - t) ** 4;
        cl.el.style.opacity = e.toFixed(2);
        cl.el.style.transform = `translateZ(${(cl.z * (1 - e)).toFixed(0)}px) rotateY(${(cl.ry * (1 - e)).toFixed(1)}deg) rotateZ(${(cl.rz * (1 - e)).toFixed(1)}deg)`;
      });
    }

    rafId = requestAnimationFrame(tick);
  };

  const onResize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  rafId = requestAnimationFrame(tick);
  cleanups.push(() => cancelAnimationFrame(rafId));

  return () => {
    setPageDragging(false);
    cleanups.forEach((fn) => fn());
    bioCanvas?.remove();
  };
}
