export type HeroScramblePhrase = {
  type: 'scramble';
  text: string;
  map: number[];
};

export type HeroRisePhrase = {
  type: 'rise';
  text: string;
  map: number[];
};

export type HeroFallPhrase = HeroScramblePhrase | HeroRisePhrase;

export type MagneticTitleConfig = {
  text: string;
  phrases: HeroFallPhrase[];
};

type CharState = { x: number; y: number; vx: number; vy: number; targetX: number; targetY: number };

export function initMagneticTitle(
  el: HTMLElement,
  section: HTMLElement | null,
  config: MagneticTitleConfig,
): () => void {
  // Clear legacy persisted easter-egg state from earlier builds
  try {
    localStorage.removeItem('faizan-arrete');
    localStorage.removeItem('faizan-triggers');
  } catch {
    /* blocked */
  }
  document.querySelectorAll('.home-hero__locked-msg').forEach(el => el.remove());

  let mx = -9999,
    my = -9999;
  let prevMx = 0,
    prevMy = 0,
    mouseSpeed = 0;

  const onLeave = () => {
    mx = -9999;
    my = -9999;
    mouseSpeed = 0;
  };
  const onBlur = () => {
    mx = -9999;
    my = -9999;
    mouseSpeed = 0;
  };

  const ORIGINAL = config.text;
  const PHRASES = config.phrases;
  let magneticReady = false;
  let chars: HTMLSpanElement[] = [];
  let states: CharState[] = [];

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Physics constants
  const SPRING = 0.065;
  const DAMPING = 0.82;
  const THRESHOLD = isTouch ? 200 : 420;
  const STRENGTH = isTouch ? 60 : 110;

  // Easter egg: prolonged hover triggers fall → phrase reforms
  let interactionFrames = 0;
  const TRIGGER_FRAMES_BY_COUNT = PHRASES.map((_, i) => (5 + i * 2) * 60);
  let phase = 0;
  // 0=normal, 1=falling, 2=resting, 6=rise phrase, 7=rise hold, 8=full-reform
  // 10=scramble, 11=scramble hold, 12=unscramble
  let phaseTimer = 0;
  const GRAVITY = 0.45;
  const FLOOR_BOUNCE = -0.3;
  let triggerCount = 0;
  const onMove = (e: MouseEvent) => {
    const dx = e.clientX - prevMx;
    const dy = e.clientY - prevMy;
    mouseSpeed = Math.min(Math.sqrt(dx * dx + dy * dy), 60);
    prevMx = e.clientX;
    prevMy = e.clientY;
    mx = e.clientX;
    my = e.clientY;
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseleave', onLeave);
  window.addEventListener('blur', onBlur);

  // Touch tracking — map touch to mx/my so physics work the same
  if (isTouch && section) {
    section.addEventListener('touchstart', e => {
      const t = e.touches[0];
      mx = t.clientX;
      my = t.clientY;
      prevMx = mx;
      prevMy = my;
      mouseSpeed = 5;
    }, { passive: true });

    section.addEventListener('touchmove', e => {
      const t = e.touches[0];
      const dx = t.clientX - prevMx;
      const dy = t.clientY - prevMy;
      mouseSpeed = Math.min(Math.sqrt(dx * dx + dy * dy), 60);
      prevMx = t.clientX;
      prevMy = t.clientY;
      mx = t.clientX;
      my = t.clientY;
    }, { passive: true });

    section.addEventListener('touchend', () => {
      mouseSpeed = 0;
      // Let mx/my stay so chars spring back smoothly
      setTimeout(() => { mx = -9999; my = -9999; }, 600);
    }, { passive: true });
  }

  // Auto-fit: compute font-size so the widest word in EITHER text fits
  let fittedFontSize = 0;

  function computeFit() {
    const prevFs = el.style.fontSize;
    el.style.fontSize = '';
    void el.offsetHeight;

    const cs = getComputedStyle(el);
    const padL = parseFloat(cs.paddingLeft);
    const padR = parseFloat(cs.paddingRight);
    const availW = el.offsetWidth - padL - padR;
    const baseFontSize = parseFloat(cs.fontSize);

    el.style.fontSize = prevFs;

    if (availW <= 0 || baseFontSize <= 0) return;

    const clone = document.createElement('div');
    clone.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;'
      + 'width:' + el.offsetWidth + 'px;'
      + 'padding:' + cs.padding + ';'
      + 'font-family:' + cs.fontFamily + ';'
      + 'font-weight:' + cs.fontWeight + ';'
      + 'text-transform:' + cs.textTransform + ';'
      + 'letter-spacing:' + cs.letterSpacing + ';'
      + 'line-height:' + cs.lineHeight + ';'
      + 'font-size:' + baseFontSize + 'px;';
    document.body.appendChild(clone);

    let minNeeded = baseFontSize;

    [ORIGINAL].forEach(text => {
      const wordArr = text.split(' ');
      let html = '';
      wordArr.forEach((word, wi) => {
        html += '<span style="display:inline-block;white-space:nowrap">';
        for (const ch of word) {
          html += '<span style="display:inline-block">' + ch + '</span>';
        }
        html += '</span>';
        if (wi < wordArr.length - 1) html += ' ';
      });
      clone.innerHTML = html;

      let maxWordW = 0;
      for (let i = 0; i < clone.children.length; i++) {
        maxWordW = Math.max(maxWordW, (clone.children[i] as HTMLElement).offsetWidth);
      }

      if (maxWordW > availW) {
        const needed = baseFontSize * (availW / maxWordW) * 0.95;
        if (needed < minNeeded) minNeeded = needed;
      }
    });

    document.body.removeChild(clone);
    fittedFontSize = Math.max(16, Math.floor(minNeeded));
    el.style.fontSize = fittedFontSize + 'px';
  }

  function applyFit() {
    if (fittedFontSize > 0) {
      el.style.fontSize = fittedFontSize + 'px';
    }
  }

  function buildChars(text: string) {
    const wordArr = text.split(' ');
    let html = '';
    wordArr.forEach((word, wi) => {
      html += '<span class="word">';
      for (const ch of word) {
        html += '<span class="char">' + ch + '</span>';
      }
      html += '</span>';
      if (wi < wordArr.length - 1) html += ' ';
    });
    el.innerHTML = html;
    const newChars = el.querySelectorAll('.char');
    const newStates = Array.from(newChars).map(() => ({
      x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0
    }));
    return {
      chars: Array.from(newChars) as HTMLSpanElement[],
      states: newStates,
    };
  }

  // Stored rest positions (centers) — measured when chars are in natural layout
  let charRestCenters: { cx: number; cy: number }[] = [];

  function measureRestPositions() {
    charRestCenters = Array.from(chars).map(c => {
      const r = c.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
  }

  function initText(text: string, animate?: boolean) {
    const built = buildChars(text);
    chars = built.chars;
    states = built.states;
    chars.forEach(c => c.classList.add('is-in'));
    applyFit();
    el.classList.add('js-ready'); // reveal title now that chars are built

    if (animate) {
      magneticReady = false;
      chars.forEach(c => c.classList.remove('is-in'));
      chars.forEach((c, i) => {
        setTimeout(() => c.classList.add('is-in'), i * 40);
      });
      setTimeout(() => {
        magneticReady = true;
        el.classList.add('physics-active');
        measureRestPositions();
      }, chars.length * 40 + 500);
    } else {
      magneticReady = true;
      el.classList.add('physics-active');
      requestAnimationFrame(() => measureRestPositions());
    }
  }

  function startEntrance() {
    document.fonts.ready.then(() => {
      computeFit();
      initText(ORIGINAL, true);
    });
  }

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      computeFit();
      states.forEach(s => { s.x = 0; s.y = 0; s.vx = 0; s.vy = 0; });
      chars.forEach(c => { c.style.transform = ''; });
      requestAnimationFrame(() => measureRestPositions());
    }, 150);
  };
  window.addEventListener('resize', onResize);

  let readyObs: MutationObserver | null = null;
  if (document.body.classList.contains('is-ready')) {
    startEntrance();
  } else {
    readyObs = new MutationObserver(() => {
      if (document.body.classList.contains('is-ready')) {
        readyObs?.disconnect();
        readyObs = null;
        setTimeout(startEntrance, 200);
      }
    });
    readyObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function triggerFall() {
    phase = 1;
    phaseTimer = 0;
    magneticReady = false;
    interactionFrames = 0;
    triggerCount++;
    states.forEach(s => {
      s.vx = (Math.random() - 0.5) * 10;
      s.vy = -(Math.random() * 4 + 2);
    });
  }

  // Scramble: map[targetIndex] = originalIndex
  let scrambleOffsets: { x: number; y: number }[] = [];
  let activeScrambleTarget = '';
  let activeScrambleMap: number[] = [];

  function triggerScrambleReform(phrase: HeroScramblePhrase) {
    phase = 10;
    phaseTimer = 0;
    activeScrambleTarget = phrase.text;
    activeScrambleMap = phrase.map;

    // Build a clone of the target text to measure letter positions
    const cs = getComputedStyle(el);
    const clone = document.createElement('div');
    clone.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;'
      + 'width:' + el.offsetWidth + 'px;'
      + 'padding:' + cs.padding + ';'
      + 'font-family:' + cs.fontFamily + ';'
      + 'font-weight:' + cs.fontWeight + ';'
      + 'text-transform:' + cs.textTransform + ';'
      + 'letter-spacing:' + cs.letterSpacing + ';'
      + 'line-height:' + cs.lineHeight + ';'
      + 'font-size:' + cs.fontSize + ';'
      + 'text-align:' + cs.textAlign + ';';

    const words = activeScrambleTarget.split(' ');
    let html = '';
    words.forEach((word, wi) => {
      html += '<span class="word" style="display:inline-block">';
      for (const ch of word) {
        html += '<span style="display:inline-block">' + ch + '</span>';
      }
      html += '</span>';
      if (wi < words.length - 1) html += ' ';
    });
    clone.innerHTML = html;
    document.body.appendChild(clone);

    // Measure target positions (centers of each char in the clone)
    const targetChars = clone.querySelectorAll('span > span');
    const elRect = el.getBoundingClientRect();
    const cloneRect = clone.getBoundingClientRect();

    // Offset between clone and el positions
    const offX = elRect.left - cloneRect.left;
    const offY = elRect.top - cloneRect.top;

    scrambleOffsets = new Array(chars.length).fill(null).map(() => ({ x: 0, y: 0 }));

    for (let ti = 0; ti < activeScrambleMap.length && ti < targetChars.length; ti++) {
      const origIdx = activeScrambleMap[ti];
      if (origIdx >= chars.length || origIdx < 0) continue;

      const targetRect = targetChars[ti].getBoundingClientRect();
      const targetCx = targetRect.left + targetRect.width / 2 + offX;
      const targetCy = targetRect.top + targetRect.height / 2 + offY;

      if (charRestCenters[origIdx]) {
        scrambleOffsets[origIdx] = {
          x: targetCx - charRestCenters[origIdx].cx,
          y: targetCy - charRestCenters[origIdx].cy
        };
      }
    }

    document.body.removeChild(clone);
  }

  // Rise phrase easter egg — letters must exist in the title
  let arreteIndices: number[] = [];
  let arreteTargets: { x: number; y: number }[] = [];
  let activeRiseText = '';

  function startFullReform() {
    phase = 8;
    phaseTimer = 0;
    magneticReady = false;
  }

  function triggerArrete(phrase: HeroRisePhrase) {
    phase = 6;
    phaseTimer = 0;
    activeRiseText = phrase.text;

    const needed = phrase.text.replace(/\s/g, '').split('');
    const riseMap = phrase.map;

    if (riseMap.length === needed.length) {
      arreteIndices = [...riseMap];
    } else {
      const used = new Set<number>();
      arreteIndices = [];
      for (let n = 0; n < needed.length; n++) {
        let found = -1;
        for (let j = 0; j < chars.length; j++) {
          if (used.has(j)) continue;
          const ch = chars[j]?.textContent ?? '';
          if (ch.toLowerCase() === needed[n].toLowerCase()) {
            found = j;
            break;
          }
        }
        if (found >= 0) {
          arreteIndices.push(found);
          used.add(found);
        }
      }
    }

    const valid =
      arreteIndices.length === needed.length &&
      arreteIndices.every((idx, n) => {
        if (idx < 0 || idx >= chars.length) return false;
        const ch = chars[idx]?.textContent ?? '';
        return ch.toLowerCase() === needed[n].toLowerCase();
      });

    if (!valid) {
      startFullReform();
      return;
    }

    // Measure target positions for the rise phrase centered in viewport
    const clone = document.createElement('div');
    clone.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;'
      + 'font-family:' + getComputedStyle(el).fontFamily + ';'
      + 'font-weight:' + getComputedStyle(el).fontWeight + ';'
      + 'text-transform:' + getComputedStyle(el).textTransform + ';'
      + 'letter-spacing:' + getComputedStyle(el).letterSpacing + ';'
      + 'font-size:' + getComputedStyle(el).fontSize + ';'
      + 'line-height:' + getComputedStyle(el).lineHeight + ';'
      + 'display:inline-flex;';

    const word = activeRiseText;
    let html = '';
    for (const ch of word) {
      html += '<span style="display:inline-block">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
    }
    clone.innerHTML = html;
    document.body.appendChild(clone);

    // Center of the viewport
    const vpCx = window.innerWidth / 2;
    const vpCy = window.innerHeight / 2;
    const cloneRect = clone.getBoundingClientRect();
    const cloneCx = cloneRect.left + cloneRect.width / 2;
    const cloneCy = cloneRect.top + cloneRect.height / 2;

    arreteTargets = [];
    // Only use non-space spans for letter position mapping
    const allSpans = clone.querySelectorAll('span');
    const letterSpans = [];
    for (let s = 0; s < allSpans.length; s++) {
      if (word[s] !== ' ') letterSpans.push(allSpans[s]);
    }
    for (let k = 0; k < arreteIndices.length && k < letterSpans.length; k++) {
      const srcIdx = arreteIndices[k];
      const srcChar = chars[srcIdx];
      const srcState = states[srcIdx];
      if (!srcChar || !srcState) continue;

      const lr = letterSpans[k].getBoundingClientRect();
      const targetX = vpCx + (lr.left + lr.width / 2 - cloneCx);
      const targetY = vpCy + (lr.top + lr.height / 2 - cloneCy);
      const srcRect = srcChar.getBoundingClientRect();
      const srcRestX = srcRect.left + srcRect.width / 2 - srcState.x;
      const srcRestY = srcRect.top + srcRect.height / 2 - srcState.y;

      arreteTargets.push({ x: targetX - srcRestX, y: targetY - srcRestY });
    }

    document.body.removeChild(clone);
  }

  // Scroll-attraction interaction
  let scrollActive = false;
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  let scrollEnergy = 0;
  let scrollDir = 1;

  if (section) {
    section.addEventListener('wheel', e => {
      if (phase !== 0 || !magneticReady) return;
      e.preventDefault();

      const dir = e.deltaY > 0 ? 1 : -1;
      scrollEnergy += Math.min(Math.abs(e.deltaY) / 120, 1.0);
      scrollEnergy = Math.min(scrollEnergy, 12);
      scrollDir = dir;

      if (dir < 0 && phase === 0 && chars.length > 0) {
        const burst = Math.min(Math.abs(e.deltaY) / 50, 3);
        chars.forEach((char, i) => {
          const angle = Math.random() * Math.PI * 2;
          const power = burst * (0.5 + Math.random());
          states[i].vx += Math.cos(angle) * power;
          states[i].vy += Math.sin(angle) * power - burst * 0.5;
          states[i].vx += (i % 2 === 0 ? 1 : -1) * burst * 0.3;
        });
      }
      scrollActive = true;

      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollActive = false;
      }, 500);
    }, { passive: false });

    // Touch swipe on hero for scroll-like interaction
    if (isTouch) {
      let touchStartY = 0;
      section.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      section.addEventListener('touchmove', e => {
        if (phase !== 0 || !magneticReady) return;
        const diff = touchStartY - e.touches[0].clientY;
        if (Math.abs(diff) > 20) {
          const dir = diff > 0 ? 1 : -1;
          scrollEnergy += 0.15;
          scrollEnergy = Math.min(scrollEnergy, 12);
          scrollDir = dir;

          if (dir < 0 && chars.length > 0) {
            const burst = 0.8;
            chars.forEach((char, i) => {
              const angle = Math.random() * Math.PI * 2;
              const power = burst * (0.5 + Math.random());
              states[i].vx += Math.cos(angle) * power * 0.3;
              states[i].vy += Math.sin(angle) * power * 0.3;
            });
          }
          scrollActive = true;
          if (scrollTimer) clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => { scrollActive = false; }, 500);
        }
      }, { passive: true });
    }
  }

  // Main physics loop
  function update() {
    // Decay mouse speed per frame (in case mouseleave wasn't caught)
    mouseSpeed *= 0.92;
    if (mouseSpeed < 0.1) mouseSpeed = 0;

    if (phase === 0) {
      if (!magneticReady) { requestAnimationFrame(update); return; }

      let glowOn = false;
      let anyInteracting = false;
      const speedMult = 1 + mouseSpeed * 0.04;

      chars.forEach((char, i) => {
        const s = states[i];
        const rect = char.getBoundingClientRect();
        const restX = rect.left + rect.width / 2 - s.x;
        const restY = rect.top + rect.height / 2 - s.y;
        const dx = restX - mx;
        const dy = restY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (scrollEnergy > 0.1 && scrollDir > 0) {
          const attractStr = scrollEnergy * 0.006;
          s.vx += -dx * attractStr;
          s.vy += -dy * attractStr;
          s.vx *= 0.90;
          s.vy *= 0.90;

          const newDx = (restX + s.x + s.vx) - mx;
          if (dx !== 0 && Math.sign(newDx) !== Math.sign(dx)) {
            s.x = mx - restX;
            s.vx = 0;
          }
          const newDy = (restY + s.y + s.vy) - my;
          if (dy !== 0 && Math.sign(newDy) !== Math.sign(dy)) {
            s.y = my - restY;
            s.vy = 0;
          }

          anyInteracting = true;
          glowOn = true;
        } else if (dist < THRESHOLD && dist > 0) {
          glowOn = true;
          anyInteracting = true;
          const falloff = Math.pow(1 - dist / THRESHOLD, 2);
          const force = falloff * STRENGTH * speedMult;
          s.vx += (dx / dist) * force * 0.12;
          s.vy += (dy / dist) * force * 0.12;
        }

        s.vx += -s.x * SPRING;
        s.vy += -s.y * SPRING;
        s.vx *= DAMPING;
        s.vy *= DAMPING;
        s.x += s.vx;
        s.y += s.vy;

        const rot = s.vx * 1.8;
        const disp = Math.sqrt(s.x * s.x + s.y * s.y);
        const scale = scrollEnergy > 0.1 ? 1 : 1 + disp * 0.002;

        if (Math.abs(s.x) > 0.1 || Math.abs(s.y) > 0.1) {
          char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
        } else {
          s.x = 0; s.y = 0; s.vx = 0; s.vy = 0;
          char.style.transform = '';
        }
      });

      if (!scrollActive) scrollEnergy *= 0.93;
      else scrollEnergy *= 0.97;

      if (anyInteracting && mouseSpeed > 2) interactionFrames++;
      var triggerFrames =
        TRIGGER_FRAMES_BY_COUNT[Math.min(triggerCount, Math.max(0, TRIGGER_FRAMES_BY_COUNT.length - 1))] ??
        5 * 60;
      if (interactionFrames >= triggerFrames) triggerFall();

      if (section) section.classList.toggle('glow-active', glowOn);

    } else if (phase === 1) {
      phaseTimer++;
      const floorY = window.innerHeight;
      let allResting = true;

      chars.forEach((char, i) => {
        const s = states[i];
        const rect = char.getBoundingClientRect();

        s.vy += GRAVITY;
        s.vx *= 0.995;
        s.x += s.vx;
        s.y += s.vy;

        const restY = rect.top + rect.height / 2 - s.y;
        const absY = restY + s.y;
        if (absY > floorY - 40) {
          s.y = floorY - 40 - restY;
          if (Math.abs(s.vy) > 1.5) {
            s.vy *= FLOOR_BOUNCE;
          } else {
            s.vy = 0;
          }
          s.vx *= 0.92;
        } else {
          allResting = false;
        }

        const rot = s.vx * 2 + (i % 2 === 0 ? 1 : -1) * Math.min(phaseTimer * 0.3, 15);
        char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      });

      if ((allResting && phaseTimer > 30) || phaseTimer > 120) {
        phase = 2;
        phaseTimer = 0;
      }

    } else if (phase === 2) {
      // Resting on floor — branch based on trigger count
      phaseTimer++;
      if (phaseTimer >= 120) {
        if (triggerCount > PHRASES.length) {
          startFullReform();
        } else {
          const phrase = PHRASES[triggerCount - 1];
          if (phrase.type === 'scramble') {
            triggerScrambleReform(phrase);
          } else {
            triggerArrete(phrase);
          }
        }
      }

    } else if (phase === 6) {
      // Rise phrase: selected letters spring up, rest stay on floor
      phaseTimer++;
      let allSettled = true;
      const reformSpring = 0.07;
      const reformDamping = 0.74;
      const arreteSet = new Set(arreteIndices);

      chars.forEach((char, i) => {
        const s = states[i];

        if (arreteSet.has(i)) {
          // This letter is part of the rise phrase — spring toward target
          const ai = arreteIndices.indexOf(i);
          const target = arreteTargets[ai] || { x: 0, y: 0 };

          const startFrame = ai * 4;
          if (phaseTimer < startFrame) {
            allSettled = false;
            char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
            return;
          }

          const elapsed = phaseTimer - startFrame;
          const ramp = Math.min(1, elapsed / 12);
          const sp = reformSpring * ramp;

          s.vx += (target.x - s.x) * sp;
          s.vy += (target.y - s.y) * sp;
          s.vx *= reformDamping;
          s.vy *= reformDamping;
          s.x += s.vx;
          s.y += s.vy;

          if (Math.abs(s.x - target.x) > 0.3 || Math.abs(s.y - target.y) > 0.3 || Math.abs(s.vx) > 0.2 || Math.abs(s.vy) > 0.2) {
            allSettled = false;
          }

          const rot = s.vx * 0.5;
          char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
        } else {
          // Non-arrête letters: stay on floor, slight drift
          s.vx *= 0.98;
          s.x += s.vx;
          char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
        }
      });

      if (allSettled || phaseTimer > 100) {
        // Snap arrête letters
        arreteIndices.forEach((idx, ai) => {
          const target = arreteTargets[ai] || { x: 0, y: 0 };
          states[idx].x = target.x; states[idx].y = target.y;
          states[idx].vx = 0; states[idx].vy = 0;
          chars[idx].style.transform = 'translate(' + target.x.toFixed(1) + 'px,' + target.y.toFixed(1) + 'px)';
        });
        phase = 7;
        phaseTimer = 0;
      }

    } else if (phase === 7) {
      // Hold rise phrase, then reform back to the original title
      phaseTimer++;
      if (phaseTimer >= 300) {
        phase = 8;
        phaseTimer = 0;
      }

    } else if (phase === 8) {
      // Full reform: ALL letters spring back to original title positions
      phaseTimer++;
      let allSettled = true;
      const reformSpring = 0.08;
      const reformDamping = 0.72;

      chars.forEach((char, i) => {
        const s = states[i];
        const startFrame = i * 2;

        if (phaseTimer < startFrame) {
          allSettled = false;
          char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
          return;
        }

        const elapsed = phaseTimer - startFrame;
        const ramp = Math.min(1, elapsed / 10);
        const sp = reformSpring * ramp;

        s.vx += -s.x * sp;
        s.vy += -s.y * sp;
        s.vx *= reformDamping;
        s.vy *= reformDamping;
        s.x += s.vx;
        s.y += s.vy;

        if (Math.abs(s.x) > 0.3 || Math.abs(s.y) > 0.3 || Math.abs(s.vx) > 0.2 || Math.abs(s.vy) > 0.2) {
          allSettled = false;
        }

        const rot = s.vx * 0.6;
        char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      });

      if (allSettled || phaseTimer > 90) {
        states.forEach(s => { s.x = 0; s.y = 0; s.vx = 0; s.vy = 0; });
        chars.forEach(c => { c.style.transform = ''; });
        phase = 0;
        interactionFrames = 0;
        triggerCount = 0;
        magneticReady = true;
      }

    } else if (phase === 10) {
      // Scramble reform: spring all letters to scrambleTarget positions
      phaseTimer++;
      let allSettled = true;
      const reformSpring = 0.06;
      const reformDamping = 0.74;
      const STAGGER_DELAY = 3;

      chars.forEach((char, i) => {
        const s = states[i];
        const startFrame = i * STAGGER_DELAY;

        if (phaseTimer < startFrame) {
          allSettled = false;
          char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
          return;
        }

        const target = scrambleOffsets[i] || { x: 0, y: 0 };
        const elapsed = phaseTimer - startFrame;
        const ramp = Math.min(1, elapsed / 12);
        const sp = reformSpring * ramp;

        s.vx += (target.x - s.x) * sp;
        s.vy += (target.y - s.y) * sp;
        s.vx *= reformDamping;
        s.vy *= reformDamping;
        s.x += s.vx;
        s.y += s.vy;

        if (Math.abs(s.x - target.x) > 0.3 || Math.abs(s.y - target.y) > 0.3 || Math.abs(s.vx) > 0.2 || Math.abs(s.vy) > 0.2) {
          allSettled = false;
        }

        const rot = s.vx * 0.8;
        char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      });

      if (allSettled || phaseTimer > 120) {
        // Snap to scrambled positions
        chars.forEach((c, i) => {
          const s = states[i];
          const target = scrambleOffsets[i] || { x: 0, y: 0 };
          s.x = target.x; s.y = target.y; s.vx = 0; s.vy = 0;
          c.style.transform = 'translate(' + target.x.toFixed(1) + 'px,' + target.y.toFixed(1) + 'px)';
        });
        phase = 11;
        phaseTimer = 0;
      }

    } else if (phase === 11) {
      // Hold scrambled phrase
      phaseTimer++;
      if (phaseTimer >= 150) {
        phase = 12;
        phaseTimer = 0;
      }

    } else if (phase === 12) {
      // Unscramble: spring all letters back to correct title positions
      phaseTimer++;
      let allSettled = true;
      const reformSpring = 0.08;
      const reformDamping = 0.72;
      const STAGGER_DELAY = 2;

      chars.forEach((char, i) => {
        const s = states[i];
        // Reverse stagger: last chars move first for a chaotic feel
        const startFrame = (chars.length - 1 - i) * STAGGER_DELAY;

        if (phaseTimer < startFrame) {
          allSettled = false;
          char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
          return;
        }

        const elapsed = phaseTimer - startFrame;
        const ramp = Math.min(1, elapsed / 10);
        const sp = reformSpring * ramp;

        s.vx += -s.x * sp;
        s.vy += -s.y * sp;
        s.vx *= reformDamping;
        s.vy *= reformDamping;
        s.x += s.vx;
        s.y += s.vy;

        if (Math.abs(s.x) > 0.3 || Math.abs(s.y) > 0.3 || Math.abs(s.vx) > 0.2 || Math.abs(s.vy) > 0.2) {
          allSettled = false;
        }

        const rot = s.vx * 0.6;
        char.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      });

      if (allSettled || phaseTimer > 100) {
        states.forEach(s => { s.x = 0; s.y = 0; s.vx = 0; s.vy = 0; });
        chars.forEach(c => { c.style.transform = ''; });
        phase = 0;
        interactionFrames = 0;
        magneticReady = true;
      }
    }
  }

  let rafId = 0;
  let active = true;
  const wrappedUpdate = () => {
    if (!active) return;
    if (!document.hidden) {
      try {
        update();
      } catch {
        startFullReform();
      }
    }
    rafId = requestAnimationFrame(wrappedUpdate);
  };
  wrappedUpdate();

  return () => {
    active = false;
    cancelAnimationFrame(rafId);
    if (scrollTimer) clearTimeout(scrollTimer);
    if (resizeTimer) clearTimeout(resizeTimer);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseleave', onLeave);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('resize', onResize);
    readyObs?.disconnect();
  };
}
