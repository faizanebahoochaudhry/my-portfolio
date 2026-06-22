'use client';

import { useEffect, useRef } from 'react';
import { readEffectColors } from '@/lib/effect-colors';


type Light = {
  cx: number;
  cy: number;
  r: number;
  a: number;
  phase: number;
};

const SCALE = 0.15;

const LIGHTS: Light[] = [
  { cx: 0.12, cy: 0.18, r: 0.4, a: 0.13, phase: 0 },
  { cx: 0.82, cy: 0.76, r: 0.34, a: 0.1, phase: 1.8 },
  { cx: 0.76, cy: 0.1, r: 0.3, a: 0.085, phase: 3.2 },
  { cx: 0.08, cy: 0.82, r: 0.32, a: 0.105, phase: 4.7 },
  { cx: 0.48, cy: 0.48, r: 0.26, a: 0.06, phase: 2.5 },
  { cx: 0.55, cy: 0.25, r: 0.28, a: 0.08, phase: 5.5 },
];

export function AmbientLights() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let t = 0;
    let rafId = 0;
    let active = true;
    let colors = readEffectColors();

    const resize = () => {
      w = Math.ceil(window.innerWidth * SCALE);
      h = Math.ceil(window.innerHeight * SCALE);
      canvas.width = w;
      canvas.height = h;
      colors = readEffectColors();
    };

    const draw = () => {
      if (!active) return;

      if (!document.hidden) {
        ctx.clearRect(0, 0, w, h);
        t += 0.006;

        LIGHTS.forEach((light, lightIndex) => {
          const rgb =
            lightIndex % 3 === 0
              ? colors.soft
              : lightIndex % 3 === 1
                ? colors.primary
                : colors.deep;
          const bx =
            (light.cx +
              Math.sin(t * 1.1 + light.phase) * 0.08 +
              Math.sin(t * 0.5 + light.phase * 2.3) * 0.05 +
              Math.sin(t * 0.2 + light.phase * 0.7) * 0.03) *
            w;
          const by =
            (light.cy +
              Math.cos(t * 0.9 + light.phase * 1.2) * 0.07 +
              Math.cos(t * 0.4 + light.phase * 1.8) * 0.06 +
              Math.cos(t * 0.15 + light.phase * 0.5) * 0.04) *
            h;
          const baseR = light.r * Math.min(w, h);

          for (let j = 0; j < 4; j += 1) {
            const ox =
              bx + Math.sin(t * (0.4 + j * 0.1) + j * 1.7 + light.phase) * baseR * 0.35;
            const oy =
              by + Math.cos(t * (0.35 + j * 0.08) + j * 2.3 + light.phase * 0.8) * baseR * 0.3;
            const sr = baseR * (0.55 + j * 0.12);
            const sa = light.a * (0.4 - j * 0.05);

            const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, sr * 1.2);
            grad.addColorStop(0, `rgba(${rgb},${sa.toFixed(4)})`);
            grad.addColorStop(0.5, `rgba(${rgb},${(sa * 0.3).toFixed(4)})`);
            grad.addColorStop(1, `rgba(${rgb},0)`);
            ctx.fillStyle = grad;

            ctx.beginPath();
            const steps = 20;
            const seed = light.phase + j * 3.14;
            for (let s = 0; s <= steps; s += 1) {
              const angle = (s / steps) * Math.PI * 2;
              const distort =
                1 +
                0.25 * Math.sin(angle * 2 + t * 0.6 + seed) +
                0.15 * Math.sin(angle * 3 + t * 0.4 + seed * 1.7) +
                0.1 * Math.sin(angle * 5 + t * 0.9 + seed * 0.5);
              const pr = sr * distort;
              const px = ox + Math.cos(angle) * pr;
              const py = oy + Math.sin(angle) * pr;
              if (s === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          }
        });
      }

      rafId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    rafId = requestAnimationFrame(draw);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-lights" aria-hidden="true" />;
}
