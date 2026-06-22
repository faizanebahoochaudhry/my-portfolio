'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

type ScrambleTextProps = {
  children: string;
  scrambleTo?: string;
  className?: string;
};

export function ScrambleText({ children, scrambleTo, className }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const original = children;
    const target = scrambleTo ?? original;
    let interval: number | undefined;

    const scrambleToText = (dest: string) => {
      let iteration = 0;
      const fromLen = el.textContent?.length ?? 0;
      const destLen = dest.length;
      const maxLen = Math.max(destLen, fromLen);
      window.clearInterval(interval);
      interval = window.setInterval(() => {
        let result = '';
        const progress = maxLen > 0 ? iteration / maxLen : 1;
        const currentLen = Math.round(fromLen + (destLen - fromLen) * progress);
        for (let i = 0; i < currentLen; i += 1) {
          result += i < iteration ? dest[i] ?? '' : POOL[Math.floor(Math.random() * POOL.length)];
        }
        el.textContent = result;
        iteration += 1 / 3;
        if (iteration >= maxLen) {
          window.clearInterval(interval);
          el.textContent = dest;
        }
      }, 30);
    };

    const onEnter = () => scrambleToText(target);
    const onLeave = () => {
      if (scrambleTo) scrambleToText(original);
      else {
        window.clearInterval(interval);
        el.textContent = original;
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.clearInterval(interval);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [children, scrambleTo]);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

export function ScrambleInline({ children }: { children: ReactNode }) {
  return <span data-scramble>{children}</span>;
}
