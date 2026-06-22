// @ts-nocheck
import { installHoloLightGlobal } from './holo-light';

declare global {
  interface Window {
    _recacheMagnetic?: () => void;
    __renderHoloLight?: (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      ryy: number,
      rxx: number,
    ) => void;
  }
}

export function initWorkInteractions(root) {
  installHoloLightGlobal();
  var wrap = root || document.querySelector('.proj');
  if (!wrap) return function () {};

  if (wrap.dataset.workInit === '1') return function () {};
  wrap.dataset.workInit = '1';

  document.body.style.overflow = 'hidden';

  var destroyed = false;
  var parallaxRafId = null;
  var magneticRafId = null;
  var cleanups = [];
  function track(el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    cleanups.push(function () { el.removeEventListener(type, fn, opts); });
  }

  var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  var current = 0;
  var isAnimating = false;
  var animFrameId = null;
  var prevAnimCleanup = null;

  var images = wrap.querySelectorAll('.proj__img');
  var titles = wrap.querySelectorAll('.proj__title');
  var descs = wrap.querySelectorAll('.proj__desc');
  var years = wrap.querySelectorAll('.proj__year');
  var links = wrap.querySelectorAll('.proj__link');
  var counterCurrent = wrap.querySelector('.proj__counter-current');
  var dialTrack = wrap.querySelector('.proj__dial-track');
  var imgContainer = wrap.querySelector('.proj__images');
  var TOTAL = images.length;

  var PROJECT_YEARS = [];
  for (var yi = 0; yi < images.length; yi++) {
    PROJECT_YEARS.push(parseInt(images[yi].getAttribute('data-sort-year') || '0', 10));
  }
  var relStr = wrap.getAttribute('data-relevance-order');
  var RELEVANCE_ORDER = relStr
    ? relStr.split(',').map(function (s) { return parseInt(s.trim(), 10); })
    : Array.from({ length: TOTAL }, function (_, i) { return i; });

  var DIAL_STEP = 56;

  // Mouse state
  var mouseNX = 0.5, mouseNY = 0.5;
  var parPanX = 0, parPanY = 0;

  initMouseTracking();
  initSort();
  /* ---------- Plastified Holographic Sleeve ---------- */
  var HOLO_W = 120, HOLO_H = 90;
  var holoCtx = null;
  var lastHoloKey = '';
  var holoSleeve = null;
  var holoOverlay = null;
  function initHoloSleeve() {
    // Frame behind images (visible dark border)
    holoSleeve = document.createElement('div');
    holoSleeve.className = 'proj__holo-sleeve';
    holoSleeve.setAttribute('aria-hidden', 'true');
    imgContainer.appendChild(holoSleeve);
    // Transparent overlay on top (canvas + holo border)
    holoOverlay = document.createElement('div');
    holoOverlay.className = 'proj__holo-overlay';
    holoOverlay.setAttribute('aria-hidden', 'true');
    var hc = document.createElement('canvas');
    hc.className = 'proj__holo-canvas';
    hc.width = HOLO_W;
    hc.height = HOLO_H;
    holoOverlay.appendChild(hc);
    holoCtx = hc.getContext('2d');
    imgContainer.appendChild(holoOverlay);
  }

  if (!isTouch) {
    initHoloSleeve();
    initMagnetic();
    initParallax();
  }
  initWheel();
  initKeyboard();
  if (isTouch) initTouch();
  initListView();

  /* ---------- Mouse Tracking ---------- */
  function initMouseTracking() {
    track(document, 'mousemove', function (e) {
      if (imgContainer) {
        var rect = imgContainer.getBoundingClientRect();
        mouseNX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        mouseNY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      }
    });
  }

  /* ---------- Idle Parallax (3D tilt + pan) ---------- */
  // Shared parallax state so animation can read current pan values

  function initParallax() {
    var tiltX = 0, tiltY = 0;
    var TILT = 4;
    var PAN = 18;
    var DAMP = 0.04;

    function update() {
      var ttx = (mouseNX - 0.5) * TILT;
      var tty = (mouseNY - 0.5) * -TILT;
      var tpx = (mouseNX - 0.5) * -PAN;
      var tpy = (mouseNY - 0.5) * -PAN;

      tiltX += (ttx - tiltX) * DAMP;
      tiltY += (tty - tiltY) * DAMP;
      parPanX += (tpx - parPanX) * DAMP;
      parPanY += (tpy - parPanY) * DAMP;

      // Container tilt: ALWAYS apply (even during animation) — keeps tilt alive
      var el = images[current];
      if (el) {
        el.style.transform = 'perspective(1000px) rotateY(' + tiltX.toFixed(2) + 'deg) rotateX(' + tiltY.toFixed(2) + 'deg)';
      }

      // Holographic sleeve: follow active image tilt + render holo light
      if (holoCtx && window.__renderHoloLight) {
        var tiltTransform = 'perspective(1000px) rotateY(' + tiltX.toFixed(2) + 'deg) rotateX(' + tiltY.toFixed(2) + 'deg)';
        if (holoSleeve) holoSleeve.style.transform = tiltTransform;
        if (holoOverlay) holoOverlay.style.transform = tiltTransform;
        var holoY = tiltY * 5, holoX = tiltX * 5;
        var hk = Math.round(holoY * 10) + ',' + Math.round(holoX * 10);
        if (hk !== lastHoloKey) {
          lastHoloKey = hk;
          window.__renderHoloLight(holoCtx, HOLO_W, HOLO_H, holoY, holoX);
        }
      }

      // Inner pan: only when NOT animating (animation controls inner during transition)
      if (!isAnimating && el) {
        var inner = el.querySelector('img') || el.querySelector('.img-placeholder');
        if (inner) {
          inner.style.transform = 'translate(' + parPanX.toFixed(1) + 'px,' + parPanY.toFixed(1) + 'px) scale(1.08)';
        }
      }

      if (!destroyed) parallaxRafId = requestAnimationFrame(update);
    }
    parallaxRafId = requestAnimationFrame(update);
  }

  /* ---------- Auto-size titles: max 2 lines, word-aware ---------- */
  function autoSizeTitles() {
    var titlesContainer = document.querySelector('.proj__titles');
    if (!titlesContainer) return;
    var refWidth = titlesContainer.clientWidth;
    var maxTitleH = window.innerHeight * 0.25; // max 25vh

    for (var i = 0; i < titles.length; i++) {
      var t = titles[i];
      var origPos = t.style.position;
      var origVis = t.style.visibility;
      var origOpa = t.style.opacity;
      var origDisp = t.style.display;
      var origW = t.style.width;
      t.style.position = 'relative';
      t.style.visibility = 'hidden';
      t.style.opacity = '1';
      t.style.display = 'block';
      t.style.width = refWidth + 'px';
      t.style.fontSize = '';

      var cs = getComputedStyle(t);
      var baseSize = parseFloat(cs.fontSize);
      var size = baseSize;
      var minSize = 20;
      var wordEls = t.querySelectorAll('.proj__word');

      function wordOverflows() {
        for (var w = 0; w < wordEls.length; w++) {
          if (wordEls[w].getBoundingClientRect().width > refWidth + 2) return true;
        }
        return false;
      }

      function heightOverflows(s) {
        return t.scrollHeight > s * 0.9 * 2.3;
      }

      function isMulti(s) { return t.scrollHeight > s * 0.9 * 1.15; }

      // Step 1: Fit in 2 lines, no word overflow, max 25vh height
      while ((wordOverflows() || heightOverflows(size) || t.scrollHeight > maxTitleH) && size > minSize) {
        size -= 2;
        t.style.fontSize = size + 'px';
      }

      // Step 2: Multi-line titles get 30% additional reduction
      if (isMulti(size) && size > minSize) {
        var target = Math.round(size * 0.7);
        if (target < minSize) target = minSize;
        size = target;
        t.style.fontSize = size + 'px';
        while ((wordOverflows() || heightOverflows(size) || t.scrollHeight > maxTitleH) && size > minSize) {
          size -= 2;
          t.style.fontSize = size + 'px';
        }
      }

      t.style.position = origPos || '';
      t.style.visibility = origVis || '';
      t.style.opacity = origOpa || '';
      t.style.display = origDisp || '';
      t.style.width = origW || '';
    }
  }
  track(window, 'resize', function() {
    if (destroyed) return;
    for (var i = 0; i < titles.length; i++) titles[i].style.fontSize = '';
    autoSizeTitles();
  });

  /* ---------- Magnetic Deformation ---------- */
  function initMagnetic() {
    var mx = 0, my = 0;
    var RADIUS = 250, STRENGTH = 35, DAMPING = 0.08;
    var charData = [];

    function cachePositions() {
      charData = [];
      var activeTitle = titles[current];
      if (!activeTitle) return;
      var chars = activeTitle.querySelectorAll('.proj__char');
      for (var i = 0; i < chars.length; i++) {
        var rect = chars[i].getBoundingClientRect();
        charData.push({
          el: chars[i],
          ox: rect.left + rect.width / 2,
          oy: rect.top + rect.height / 2,
          cx: 0, cy: 0, tx: 0, ty: 0, cr: 0, tr: 0
        });
      }
    }

    window._recacheMagnetic = cachePositions;
    track(document, 'mousemove', function (e) { mx = e.clientX; my = e.clientY; });

    function update() {
      for (var i = 0; i < charData.length; i++) {
        var d = charData[i];
        var dx = d.ox - mx, dy = d.oy - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS) {
          var force = (1 - dist / RADIUS) * STRENGTH;
          var angle = Math.atan2(dy, dx);
          d.tx = Math.cos(angle) * force;
          d.ty = Math.sin(angle) * force;
          d.tr = (dx / RADIUS) * 12;
        } else { d.tx = 0; d.ty = 0; d.tr = 0; }
        d.cx += (d.tx - d.cx) * DAMPING;
        d.cy += (d.ty - d.cy) * DAMPING;
        d.cr += (d.tr - d.cr) * DAMPING;
        d.el.style.transform = 'translate(' + d.cx.toFixed(1) + 'px,' + d.cy.toFixed(1) + 'px) rotate(' + d.cr.toFixed(1) + 'deg)';
      }
      if (!destroyed) magneticRafId = requestAnimationFrame(update);
    }

    setTimeout(function () {
      if (!destroyed) {
        cachePositions();
        magneticRafId = requestAnimationFrame(update);
      }
    }, 600);
  }

  /* ---------- Easing library ---------- */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
  function easeInQuad(t) { return t * t; }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------- Flash overlay (cinematic cut) ---------- */
  var flashOverlay = document.createElement('div');
  flashOverlay.style.cssText = 'position:absolute;inset:0;background:white;opacity:0;z-index:100;pointer-events:none;border-radius:inherit;mix-blend-mode:overlay;';
  // Append to first active image; will be moved on slide change
  var activeImg = images[current];
  if (activeImg) activeImg.appendChild(flashOverlay);

  applySort('relevance');

  /* ---------- Force-finish current animation ---------- */
  function finishCurrentAnimation() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (prevAnimCleanup) {
      prevAnimCleanup();
      prevAnimCleanup = null;
    }
    if (flashOverlay) flashOverlay.style.opacity = '0';
  }

  /* ---------- Reset all images to clean state ---------- */
  function resetAllImages() {
    for (var i = 0; i < images.length; i++) {
      var el = images[i];
      var inner = el.querySelector('img') || el.querySelector('.img-placeholder');
      el.style.transformOrigin = '';
      el.style.clipPath = '';
      if (i === current) {
        el.classList.add('is-active');
        el.style.opacity = '';
        el.style.zIndex = '';
        // Don't reset container transform — parallax handles it
        el.style.filter = '';
        if (inner) { inner.style.transform = 'scale(1.08)'; inner.style.filter = ''; inner.style.transition = ''; }
      } else {
        el.classList.remove('is-active');
        el.style.opacity = '';
        el.style.zIndex = '';
        el.style.filter = '';
        if (inner) { inner.style.transform = ''; inner.style.filter = ''; inner.style.transition = ''; }
      }
      if (titles[i]) titles[i].classList.remove('is-leaving');
      if (descs[i]) descs[i].classList.remove('is-leaving');
      if (i === current) {
        if (titles[i]) titles[i].classList.add('is-active');
        if (descs[i]) descs[i].classList.add('is-active');
        if (years[i]) years[i].classList.add('is-active');
        if (links[i]) links[i].classList.add('is-active');
      } else {
        if (titles[i]) titles[i].classList.remove('is-active');
        if (descs[i]) descs[i].classList.remove('is-active');
        if (years[i]) years[i].classList.remove('is-active');
        if (links[i]) links[i].classList.remove('is-active');
      }
    }
    isAnimating = false;
  }

  /* ---------- Go To Project (Camera Focus — Interruptible) ---------- */
  /*
   * Camera focus-pull transition:
   * 1. Current image: zoom in + defocus (blur hunting/searching)
   * 2. Brief exposure flash at peak blur
   * 3. Swap to new image (still blurred)
   * 4. New image: focus lock (blur hunts then sharpens) + zoom out
   * Never two images visible — swap happens at peak blur.
   */
  function goTo(index, direction) {
    if (index === current || index < 0 || index >= TOTAL) return;

    if (isAnimating) {
      finishCurrentAnimation();
      resetAllImages();
    }

    isAnimating = true;
    var prev = current;
    current = index;
    var dir = direction || (index > prev ? 1 : -1);

    var enterEl = images[current];
    var leaveEl = images[prev];
    var enterInner = enterEl.querySelector('img') || enterEl.querySelector('.img-placeholder');
    var leaveInner = leaveEl.querySelector('img') || leaveEl.querySelector('.img-placeholder');

    enterEl.style.opacity = '0';
    enterEl.style.zIndex = '2';
    leaveEl.style.zIndex = '3';
    leaveEl.style.opacity = '1';
    if (enterInner) enterInner.style.transition = 'none';

    // Move flash overlay to the leaving image (it's on top during transition)
    leaveEl.appendChild(flashOverlay);

    var start = null;
    var DUR = 900;
    var SWAP = 0.42;
    var swapped = false;

    prevAnimCleanup = function () {
      enterEl.style.opacity = '1';
      enterEl.style.zIndex = '';
      enterEl.style.filter = '';
      enterEl.classList.add('is-active');
      if (enterInner) {
        enterInner.style.transition = '';
        // Don't reset inner transform/filter — let parallax take over smoothly
        // At t=1 the animation already sets scale(1.08) and blur(0)
        enterInner.style.filter = '';
      }
      leaveEl.classList.remove('is-active');
      leaveEl.style.opacity = '';
      leaveEl.style.zIndex = '';
      leaveEl.style.filter = '';
      if (leaveInner) {
        leaveInner.style.transform = '';
        leaveInner.style.filter = '';
      }
      flashOverlay.style.opacity = '0';
      isAnimating = false;
      // isAnimating = false triggers parallax to resume on next frame
    };

    function animate(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / DUR, 1);

      /*
       * All effects on the INNER image only — container stays fixed.
       * Timeline:
       *   0.00–0.15  Smooth zoom in, gentle blur start
       *   0.15–0.38  Focus hunting — blur oscillates (camera searching)
       *   0.38–0.46  Peak blur + flash → SWAP
       *   0.46–0.65  New image hunting focus (weaker oscillation)
       *   0.65–1.00  Lock focus — smooth dezoom, blur → 0
       */

      // --- Blur envelope (peaks at SWAP) ---
      var blurBase;
      if (t <= SWAP) {
        blurBase = easeInQuad(t / SWAP) * 18;
      } else {
        blurBase = (1 - easeOutQuart((t - SWAP) / (1 - SWAP))) * 18;
      }

      // Focus hunting: oscillation strongest 0.15–SWAP (pre-flash searching)
      var huntBand;
      if (t < 0.12) {
        huntBand = 0;
      } else if (t < SWAP) {
        // Ramp up hunting from 0.12 to peak at SWAP
        huntBand = easeInQuad((t - 0.12) / (SWAP - 0.12));
      } else if (t < 0.62) {
        // Post-swap: weaker hunting that fades out
        huntBand = 0.5 * (1 - easeOutCubic((t - SWAP) / (0.62 - SWAP)));
      } else {
        huntBand = 0;
      }
      // Two-frequency oscillation for realism
      var hunt1 = Math.sin(t * 55) * 5;
      var hunt2 = Math.sin(t * 33 + 1.7) * 2.5;
      var hunting = (hunt1 + hunt2) * huntBand;

      var blur = Math.max(0, blurBase + hunting);

      // --- Scale on INNER image (zoom into the image) ---
      var baseScale = 1.08; // default inner scale
      var zoomExtra;
      if (t <= SWAP) {
        zoomExtra = easeInQuad(t / SWAP) * 0.12;
      } else {
        zoomExtra = (1 - easeOutQuart((t - SWAP) / (1 - SWAP))) * 0.12;
      }
      var innerScale = baseScale + zoomExtra;

      // --- Flash at swap point ---
      var flashDist = Math.abs(t - SWAP);
      var flashIntensity = flashDist < 0.07 ? (1 - flashDist / 0.07) * 0.30 : 0;
      flashOverlay.style.opacity = flashIntensity.toFixed(3);

      // --- Brightness pulse ---
      var bright = 1 + flashIntensity * 0.4;

      // --- Swap images at peak blur ---
      if (t >= SWAP && !swapped) {
        swapped = true;
        leaveEl.style.opacity = '0';
        enterEl.style.opacity = '1';
      }

      // Determine which inner image to animate
      var activeInner = swapped ? enterInner : leaveInner;
      var inactiveEl = swapped ? leaveEl : enterEl;
      inactiveEl.style.opacity = '0';

      if (activeInner) {
        // Include current parallax pan so there's no jump at start/end
        var yShift = (t <= SWAP)
          ? dir * easeInQuad(t / SWAP) * -2
          : dir * (1 - easeOutQuart((t - SWAP) / (1 - SWAP))) * 2;

        activeInner.style.transform =
          'translate(' + parPanX.toFixed(1) + 'px,' + (parPanY + yShift * 5).toFixed(1) + 'px) scale(' + innerScale.toFixed(4) + ')';
        activeInner.style.filter =
          'blur(' + blur.toFixed(1) + 'px) brightness(' + bright.toFixed(2) + ')';
      }

      if (t < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        animFrameId = null;
        prevAnimCleanup();
        prevAnimCleanup = null;
        if (window._recacheMagnetic) window._recacheMagnetic();
      }
    }

    animFrameId = requestAnimationFrame(animate);

    // Text
    for (var i = 0; i < TOTAL; i++) {
      titles[i].classList.remove('is-active', 'is-leaving');
      descs[i].classList.remove('is-active', 'is-leaving');
      years[i].classList.remove('is-active');
    }
    titles[current].classList.add('is-active');
    descs[current].classList.add('is-active');
    years[current].classList.add('is-active');

    if (dialTrack) {
      dialTrack.style.transform = 'translateY(' + (current * -DIAL_STEP) + 'px)';
    }

    for (var j = 0; j < TOTAL; j++) { links[j].classList.remove('is-active'); }
    links[current].classList.add('is-active');

    counterCurrent.textContent = String(current + 1).padStart(2, '0');
  }

  /* ---------- Wheel ---------- */
  function initWheel() {
    var THRESHOLD = 30, COOLDOWN = 350, lastTime = 0;
    track(wrap, 'wheel', function (e) {
      // In list view, allow normal scrolling
      if (wrap.classList.contains('is-list-view')) return;
      e.preventDefault();
      var now = Date.now();
      if (now - lastTime < COOLDOWN || Math.abs(e.deltaY) < THRESHOLD) return;
      lastTime = now;
      var dir = e.deltaY > 0 ? 1 : -1;
      goTo(current + dir, dir);
    }, { passive: false });
  }

  /* ---------- Dial Drag + Click ---------- */
  function initDialDrag() {
    var dial = wrap.querySelector('.proj__dial');
    if (!dial) return;
    var dragging = false, didDrag = false, startY = 0, startProject = 0;

    function onDown(e) {
      dragging = true;
      didDrag = false;
      startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      startProject = current;
      dial.style.cursor = 'grabbing';
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      var y = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      var delta = startY - y;
      if (Math.abs(delta) > 5) didDrag = true;
      var steps = Math.round(delta / 25);
      var target = Math.max(0, Math.min(TOTAL - 1, startProject + steps));
      if (target !== current) {
        var dir = target > current ? 1 : -1;
        goTo(target, dir);
      }
    }

    function onUp(e) {
      if (!dragging) return;
      var wasDrag = didDrag;
      dragging = false;
      dial.style.cursor = '';

      if (!wasDrag) {
        var rect = dial.getBoundingClientRect();
        var y = e.type === 'touchend' ? (e.changedTouches ? e.changedTouches[0].clientY : 0) : e.clientY;
        var mid = rect.top + rect.height / 2;
        if (y < mid) {
          goTo(current - 1, -1);
        } else {
          goTo(current + 1, 1);
        }
      }
    }

    track(dial, 'mousedown', onDown);
    track(dial, 'touchstart', onDown, { passive: false });
    track(document, 'mousemove', onMove);
    track(document, 'touchmove', onMove, { passive: true });
    track(document, 'mouseup', onUp);
    track(document, 'touchend', onUp);
    dial.style.cursor = 'grab';
  }

  initDialDrag();

  /* ---------- Touch ---------- */
  function initTouch() {
    var startY = 0, THRESHOLD = 50, COOLDOWN = 350, lastTime = 0;
    track(wrap, 'touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
    track(wrap, 'touchend', function (e) {
      if (wrap.classList.contains('is-list-view')) return;
      var now = Date.now();
      if (now - lastTime < COOLDOWN) return;
      var diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < THRESHOLD) return;
      lastTime = now;
      var dir = diff > 0 ? 1 : -1;
      goTo(current + dir, dir);
    }, { passive: true });
  }

  /* ---------- Keyboard ---------- */
  function initKeyboard() {
    var COOLDOWN = 350, lastTime = 0;
    track(document, 'keydown', function (e) {
      if (wrap.classList.contains('is-list-view')) return;
      var now = Date.now();
      if (now - lastTime < COOLDOWN) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); lastTime = now; goTo(current + 1, 1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); lastTime = now; goTo(current - 1, -1); }
    });
  }

  /* ---------- List View Toggle ---------- */
  function toCssUrl(src) {
    return 'url("' + encodeURI(src) + '")';
  }

  function initListView() {
    var toggle = wrap.querySelector('.proj__view-toggle');
    var listWrap = wrap.querySelector('.proj__list');
    var preview = wrap.querySelector('.proj__list-img-preview');
    var rows = wrap.querySelectorAll('.proj__list-row');
    var decoTop = wrap.querySelector('.proj__deco-top');
    var isListMode = false;
    var previewX = 0, previewY = 0;
    var targetX = 0, targetY = 0;
    var previewRaf = null;
    var previewVisible = false;
    var SCROLL_THRESHOLD = 60;

    if (!toggle || !listWrap) return;

    var optSlider = toggle.querySelector('.proj__view-opt--slider');
    var optList = toggle.querySelector('.proj__view-opt--list');

    function hidePreview() {
      if (preview) preview.classList.remove('is-visible');
      previewVisible = false;
      if (previewRaf) { cancelAnimationFrame(previewRaf); previewRaf = null; }
    }

    function setListMode(nextList) {
      if (nextList === isListMode) return;
      isListMode = nextList;
      if (isListMode) {
        wrap.classList.add('is-list-view');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        if (optSlider) optSlider.classList.remove('is-active');
        if (optList) optList.classList.add('is-active');
      } else {
        wrap.classList.remove('is-list-view');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = '';
        if (optSlider) optSlider.classList.add('is-active');
        if (optList) optList.classList.remove('is-active');
        if (decoTop) decoTop.classList.remove('is-hidden');
        listWrap.scrollTop = 0;
        hidePreview();
      }
    }

    track(listWrap, 'scroll', function () {
      if (!isListMode || !decoTop) return;
      if (listWrap.scrollTop > SCROLL_THRESHOLD) {
        decoTop.classList.add('is-hidden');
      } else {
        decoTop.classList.remove('is-hidden');
      }
    });

    track(toggle, 'click', function (e) {
      e.preventDefault();
      setListMode(!isListMode);
    });

    function followLoop() {
      previewX += (targetX - previewX) * 0.12;
      previewY += (targetY - previewY) * 0.12;
      if (preview) {
        preview.style.left = previewX + 'px';
        preview.style.top = previewY + 'px';
      }
      if (previewVisible && !destroyed) {
        previewRaf = requestAnimationFrame(followLoop);
      }
    }

    track(listWrap, 'mousemove', function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    rows.forEach(function (row) {
      track(row, 'mouseenter', function () {
        if (!isListMode || !preview) return;
        var imgSrc = row.getAttribute('data-img');
        if (imgSrc) {
          preview.style.backgroundImage = toCssUrl(imgSrc);
          preview.classList.add('is-visible');
          if (!previewVisible) {
            previewVisible = true;
            previewX = targetX;
            previewY = targetY;
            followLoop();
          }
        }
      });

      track(row, 'click', function () {
        if (!isListMode) return;
        var idx = parseInt(row.getAttribute('data-index'), 10);
        var link = links[idx];
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) === '#') return;
        window.open(href, '_blank', 'noopener,noreferrer');
      });
    });

    var table = wrap.querySelector('.proj__list-table');
    if (table) {
      track(table, 'mouseleave', function () {
        hidePreview();
      });
    }
  }

  /* ---------- Global Sort ---------- */
  function initSort() {
    var sortWrap = wrap.querySelector('.proj__sort');
    var closeTimer = null;
    var TOLERANCE = 400;

    function getSortBtns() {
      return wrap.querySelectorAll('.proj__sort-btn');
    }

    if (sortWrap) {
      track(sortWrap, 'mouseenter', function () {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        sortWrap.classList.add('is-open');
      });
      track(sortWrap, 'mouseleave', function () {
        closeTimer = setTimeout(function () {
          sortWrap.classList.remove('is-open');
          closeTimer = null;
        }, TOLERANCE);
      });
      track(sortWrap, 'focusin', function () {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        sortWrap.classList.add('is-open');
      });
      track(sortWrap, 'focusout', function (e) {
        var next = e.relatedTarget;
        if (next && sortWrap.contains(next)) return;
        closeTimer = setTimeout(function () {
          sortWrap.classList.remove('is-open');
          closeTimer = null;
        }, TOLERANCE);
      });
    }

    if (sortWrap) {
      track(sortWrap, 'click', function (e) {
        var el = e.target;
        if (el && el.nodeType !== 1) el = el.parentElement;
        var btn = el && el.closest ? el.closest('.proj__sort-btn') : null;
        if (!btn || !sortWrap.contains(btn)) return;
        e.preventDefault();
        var mode = btn.getAttribute('data-sort');
        if (!mode) return;
        getSortBtns().forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        applySort(mode);
        setTimeout(function () { sortWrap.classList.remove('is-open'); }, 250);
      });
    }
  }

  function applySort(mode) {
    if (!mode) return;

    // Build sorted order of original indices
    var indices;

    if (mode === 'relevance') {
      indices = RELEVANCE_ORDER.slice();
    } else {
      indices = [];
      for (var i = 0; i < TOTAL; i++) indices.push(i);
    }

    if (mode === 'date-desc') {
      indices.sort(function (a, b) {
        if (PROJECT_YEARS[b] !== PROJECT_YEARS[a]) return PROJECT_YEARS[b] - PROJECT_YEARS[a];
        return a - b;
      });
    } else if (mode === 'date-asc') {
      indices.sort(function (a, b) {
        if (PROJECT_YEARS[a] !== PROJECT_YEARS[b]) return PROJECT_YEARS[a] - PROJECT_YEARS[b];
        return a - b;
      });
    }

    // Finish any animation and reset
    if (isAnimating) {
      finishCurrentAnimation();
    }

    // Reorder DOM in each container
    var imgParent = wrap.querySelector('.proj__images');
    var titleParent = wrap.querySelector('.proj__titles');
    var descParent = wrap.querySelector('.proj__info');
    var yearParent = wrap.querySelector('.proj__year-wrap');
    var linkParent = wrap.querySelector('.proj__links');
    var listTbody = wrap.querySelector('.proj__list-table tbody');

    // Build maps from original data-index to element
    function buildMap(nodeList) {
      var map = {};
      for (var i = 0; i < nodeList.length; i++) {
        var key = nodeList[i].getAttribute('data-index');
        if (key !== null) map[key] = nodeList[i];
      }
      return map;
    }

    var imgMap = buildMap(images);
    var titleMap = buildMap(titles);
    var descMap = buildMap(descs);
    var yearMap = buildMap(years);
    var linkMap = buildMap(links);
    var rowMap = {};
    if (listTbody) {
      var rowArr = listTbody.querySelectorAll('.proj__list-row');
      for (var r = 0; r < rowArr.length; r++) {
        var rowKey = rowArr[r].getAttribute('data-index');
        if (rowKey !== null) rowMap[rowKey] = rowArr[r];
      }
    }

    indices.forEach(function (origIdx) {
      var key = String(origIdx);
      if (imgParent && imgMap[key]) imgParent.appendChild(imgMap[key]);
      if (titleParent && titleMap[key]) titleParent.appendChild(titleMap[key]);
      if (descParent && descMap[key]) descParent.appendChild(descMap[key]);
      if (yearParent && yearMap[key]) yearParent.appendChild(yearMap[key]);
      if (linkParent && linkMap[key]) linkParent.appendChild(linkMap[key]);
      if (listTbody && rowMap[key]) listTbody.appendChild(rowMap[key]);
    });

    if (listTbody) {
      var sortedRows = listTbody.querySelectorAll('.proj__list-row');
      for (var ri = 0; ri < sortedRows.length; ri++) {
        var numCell = sortedRows[ri].querySelector('.proj__list-num');
        if (numCell) numCell.textContent = String(ri + 1).padStart(2, '0');
      }
    }

    // Re-append holo elements at end of image container
    var holoS = imgParent && imgParent.querySelector('.proj__holo-sleeve');
    var holoO = imgParent && imgParent.querySelector('.proj__holo-overlay');
    if (holoS) imgParent.appendChild(holoS);
    if (holoO) imgParent.appendChild(holoO);

    // Re-query NodeLists
    images = wrap.querySelectorAll('.proj__img');
    titles = wrap.querySelectorAll('.proj__title');
    descs = wrap.querySelectorAll('.proj__desc');
    years = wrap.querySelectorAll('.proj__year');
    links = wrap.querySelectorAll('.proj__link');

    // Reset to first project in sorted order
    current = 0;
    parPanX = 0;
    parPanY = 0;
    resetAllImages();
    if (counterCurrent) counterCurrent.textContent = '01';
    if (dialTrack) dialTrack.style.transform = 'translateY(0px)';

    var activeAfter = images[current];
    if (flashOverlay) {
      if (activeAfter && flashOverlay.parentNode !== activeAfter) {
        activeAfter.appendChild(flashOverlay);
      }
      flashOverlay.style.opacity = '0';
    }

    for (var ti = 0; ti < titles.length; ti++) titles[ti].style.fontSize = '';
    autoSizeTitles();
    var titlesEl = wrap.querySelector('.proj__titles');
    if (titlesEl) titlesEl.classList.add('is-sized');

    if (window._recacheMagnetic) {
      setTimeout(function () {
        if (!destroyed && window._recacheMagnetic) window._recacheMagnetic();
      }, 200);
    }
  }

  return function cleanupWorkInteractions() {
    destroyed = true;
    wrap.dataset.workInit = '';
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (parallaxRafId) cancelAnimationFrame(parallaxRafId);
    if (magneticRafId) cancelAnimationFrame(magneticRafId);
    if (prevAnimCleanup) prevAnimCleanup();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    window._recacheMagnetic = undefined;
    cleanups.forEach(function (fn) { fn(); });
  };
}
