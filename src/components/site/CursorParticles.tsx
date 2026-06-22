'use client';

import { useEffect, useRef } from 'react';
import { readEffectColors } from '@/lib/effect-colors';


type Particle = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
};

const REVEAL_R = 220;
const REPULSE_R = 180;
const REPULSE_FORCE = 4.5;
const COLLAPSE_FORCE = 0.1;
const HOME_SPRING = 0.005;
const FRICTION = 0.88;
const JITTER = 0.8;
const DART_CHANCE = 0.025;
const DART_FORCE = 3.5;
const CONNECT_R = 60;
const SPACING = 32;
const SIZE = 1.35;
const BASE_ALPHA = 0.055;
const CURSOR_ALPHA = 0.42;

export function CursorParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let mx = -9999;
    let my = -9999;
    let prevCx = -9999;
    let prevCy = -9999;
    let mouseSpeed = 0;
    let rafId = 0;
    let active = true;
    let col = readEffectColors().soft;

    const refreshColors = () => {
      col = readEffectColors().soft;
    };

    const seedParticles = () => {
      particles = [];
      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const hx = c * SPACING + (Math.random() - 0.5) * SPACING * 0.6;
          const hy = r * SPACING + (Math.random() - 0.5) * SPACING * 0.6;
          particles.push({
            homeX: hx,
            homeY: hy,
            x: hx,
            y: hy,
            vx: 0,
            vy: 0,
            alpha: 0,
          });
        }
      }
    };

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      refreshColors();
      seedParticles();
    };

    const onMove = (e: MouseEvent | PointerEvent) => {
      prevCx = mx;
      prevCy = my;
      mx = e.clientX;
      my = e.clientY;
      mouseSpeed = Math.sqrt((mx - prevCx) ** 2 + (my - prevCy) ** 2);
    };

    const onLeave = () => {
      mx = -9999;
      my = -9999;
      mouseSpeed = 0;
    };

    const loop = () => {
      if (!active) return;

      if (!document.hidden) {
        ctx.clearRect(0, 0, w, h);

        mouseSpeed *= 0.9;
        const isMoving = mouseSpeed > 0.8;
        const visible: Particle[] = [];

        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const nearCursor = dist < REVEAL_R * 1.35;
          const hasVel = Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05;
          if (!nearCursor && !hasVel && p.alpha < BASE_ALPHA * 0.5) continue;

          const cursorGlow = nearCursor ? Math.max(0, 1 - dist / REVEAL_R) : 0;
          const targetA =
            BASE_ALPHA +
            cursorGlow * CURSOR_ALPHA +
            (isMoving && nearCursor ? cursorGlow * 0.2 : 0);
          p.alpha += (targetA - p.alpha) * (targetA > p.alpha ? 0.14 : 0.06);

          if (dist < REPULSE_R && dist > 0) {
            const forceScale = isMoving ? 1 : 0.35;
            const force = (1 - dist / REPULSE_R) * REPULSE_FORCE * forceScale;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            if (isMoving) {
              p.vx += (Math.random() - 0.5) * JITTER;
              p.vy += (Math.random() - 0.5) * JITTER;
              if (Math.random() < DART_CHANCE) {
                const angle = Math.random() * Math.PI * 2;
                p.vx += Math.cos(angle) * DART_FORCE;
                p.vy += Math.sin(angle) * DART_FORCE;
              }
            }
          } else if (!isMoving && dist < REVEAL_R && dist > 3 && p.alpha > BASE_ALPHA) {
            p.vx -= (dx / dist) * COLLAPSE_FORCE;
            p.vy -= (dy / dist) * COLLAPSE_FORCE;
          }

          p.vx += (p.homeX - p.x) * HOME_SPRING;
          p.vy += (p.homeY - p.y) * HOME_SPRING;
          p.vx *= FRICTION;
          p.vy *= FRICTION;
          p.x += p.vx;
          p.y += p.vy;

          if (p.alpha > 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, SIZE, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${col},${p.alpha.toFixed(3)})`;
            ctx.fill();
            visible.push(p);
          }
        }

        ctx.lineWidth = 0.3;
        for (let i = 0; i < visible.length; i += 1) {
          for (let j = i + 1; j < visible.length; j += 1) {
            const a = visible[i];
            const b = visible[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < CONNECT_R * CONNECT_R) {
              const dist = Math.sqrt(d2);
              const lineA = (1 - dist / CONNECT_R) * Math.min(a.alpha, b.alpha) * 0.18;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `rgba(${col},${lineA.toFixed(3)})`;
              ctx.stroke();
            }
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="cursor-particles" aria-hidden="true" />;
}
