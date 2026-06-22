'use client';

import { useEffect, useRef } from 'react';

const HOVER_SELECTOR = 'a, button, [data-magnetic-text], input, textarea';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;
    let rafId = 0;
    let active = true;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      updateHover(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (e.pointerType === 'mouse') updateHover(e.clientX, e.clientY);
    };

    const updateHover = (clientX: number, clientY: number) => {
      const under = document.elementFromPoint(clientX, clientY);
      cursor.classList.toggle('cursor--hover', !!under?.closest(HOVER_SELECTOR));
      cursor.classList.toggle('cursor--dragging', document.body.classList.contains('is-dragging'));
    };

    const onLeave = () => cursor.classList.add('cursor--hidden');
    const onEnter = () => cursor.classList.remove('cursor--hidden');

    const tick = () => {
      if (!active) return;

      if (!document.hidden) {
        const follow = document.body.classList.contains('is-dragging') ? 1 : 0.14;
        cx += (x - cx) * follow;
        cy += (y - cy) * follow;
        cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    rafId = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return <div ref={cursorRef} className="cursor" aria-hidden="true" />;
}
