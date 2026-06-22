'use client';

import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { site } from '@/data/site';
import { AdaptiveText } from '@/components/site/AdaptiveText';
import { initMagneticTitle } from '@/lib/magnetic-title';
import { cancelWhenIdle, runWhenIdle } from '@/lib/idle';

const TechLogoLoop = dynamic(
  () => import('@/components/site/TechLogoLoop').then((mod) => mod.TechLogoLoop),
  { ssr: false },
);

function fitHiddenTitle(el: HTMLElement) {
  const words = el.querySelectorAll<HTMLElement>('.home-hero__title-fallback .word');
  if (!words.length) return;

  el.style.fontSize = '';
  const cs = getComputedStyle(el);
  const padL = parseFloat(cs.paddingLeft);
  const padR = parseFloat(cs.paddingRight);
  const availW = el.clientWidth - padL - padR;
  const baseFontSize = parseFloat(cs.fontSize);
  if (availW <= 0 || baseFontSize <= 0) return;

  let maxWordW = 0;
  words.forEach((word) => {
    maxWordW = Math.max(maxWordW, word.scrollWidth);
  });

  if (maxWordW > 0 && availW > 0) {
    const next = Math.max(16, Math.floor(baseFontSize * (availW / maxWordW) * 0.95));
    if (next <= baseFontSize) {
      el.style.fontSize = `${next}px`;
    }
  }
}

export function HomeHero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [showTechLoop, setShowTechLoop] = useState(false);

  useEffect(() => {
    document.body.classList.add('home-page');
    return () => document.body.classList.remove('home-page');
  }, []);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const section = el.closest('.home-hero') as HTMLElement | null;

    fitHiddenTitle(el);
    document.fonts?.ready.then(() => fitHiddenTitle(el));

    const onResize = () => fitHiddenTitle(el);
    window.addEventListener('resize', onResize);

    const cleanup = initMagneticTitle(el, section, {
      text: site.heroTitle,
      phrases: site.heroFallPhrases.map((phrase) => ({
        ...phrase,
        map: [...phrase.map],
      })),
    });

    return () => {
      window.removeEventListener('resize', onResize);
      cleanup();
    };
  }, []);

  useEffect(() => {
    const idleId = runWhenIdle(() => setShowTechLoop(true), 2200);
    return () => cancelWhenIdle(idleId);
  }, []);

  return (
    <section className="home-hero">
      <div className="home-hero__center">
        <h1
          className="home-hero__title"
          ref={titleRef}
          data-magnetic-text
          aria-label={site.heroTitle}
        >
          <span className="home-hero__title-fallback" aria-hidden="true">
            {site.heroTitleLines.map((line) => (
              <span key={line} className="word">
                {line}
              </span>
            ))}
          </span>
        </h1>
      </div>

      <div className="home-hero__deco-top" aria-hidden="true">
        <span className="home-hero__coords">{site.coords}</span>
        <div className="home-hero__dash-line" />
        <span className="home-hero__status">{site.status}</span>
      </div>

      <div className="home-hero__deco-corners" aria-hidden="true">
        <span className="home-hero__corner home-hero__corner--tl" />
        <span className="home-hero__corner home-hero__corner--tr" />
        <span className="home-hero__corner home-hero__corner--bl" />
        <span className="home-hero__corner home-hero__corner--br" />
      </div>

      <div className="home-hero__crosshair" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="home-hero__orbit" aria-hidden="true">
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="4 6"
            opacity="0.3"
          />
          <circle cx="60" cy="10" r="3" fill="currentColor" opacity="0.5" className="home-hero__orbit-dot" />
        </svg>
      </div>

      <div className="home-hero__grid-deco" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="home-hero__scroll-hint" aria-hidden="true">
        <span className="home-hero__scroll-line" />
      </div>

      <div className="home-hero__footer">
        <div className="home-hero__bottom">
          <div className="home-hero__info">
            <AdaptiveText>{site.name}</AdaptiveText>
            <span className="home-hero__sep">·</span>
            <AdaptiveText>{site.location}</AdaptiveText>
          </div>

          <div className="home-hero__contact">
            <a href={`mailto:${site.email}`} className="home-hero__link">
              <AdaptiveText>{site.email}</AdaptiveText>
            </a>
            <span className="home-hero__sep">·</span>
            <a href={site.phoneHref} className="home-hero__link">
              <AdaptiveText>{site.phone}</AdaptiveText>
            </a>
          </div>

          <div className="home-hero__socials">
            {site.socials.map((social, index) => (
              <span key={social.label} className="home-hero__social-item">
                {index > 0 && <span className="home-hero__sep">·</span>}
                <a
                  href={social.href}
                  className="home-hero__link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AdaptiveText>{social.label}</AdaptiveText>
                </a>
              </span>
            ))}
          </div>

          <span className="home-hero__copy">
            <AdaptiveText>{`© ${site.year}`}</AdaptiveText>
          </span>
        </div>

        {showTechLoop ? <TechLogoLoop /> : <div className="tech-loop tech-loop--placeholder" aria-hidden="true" />}
      </div>
    </section>
  );
}
