'use client';

import { useEffect, useRef } from 'react';
import { site } from '@/data/site';
import { ScrambleText } from '@/components/site/ScrambleText';
import { TechLogoLoop } from '@/components/site/TechLogoLoop';
import { initMagneticTitle } from '@/lib/magnetic-title';

export function HomeHero() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.body.classList.add('home-page');
    return () => document.body.classList.remove('home-page');
  }, []);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const section = el.closest('.home-hero') as HTMLElement | null;
    return initMagneticTitle(el, section, {
      text: site.heroTitle,
      phrases: site.heroFallPhrases.map((phrase) => ({
        ...phrase,
        map: [...phrase.map],
      })),
    });
  }, []);

  return (
    <section className="home-hero">
      <div className="home-hero__center">
        <h1
          className="home-hero__title"
          ref={titleRef}
          data-magnetic-text
          aria-label={site.heroTitle}
        />

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
            <ScrambleText>{site.name}</ScrambleText>
            <span className="home-hero__sep">·</span>
            <ScrambleText>{site.location}</ScrambleText>
          </div>

          <div className="home-hero__contact">
            <a href={`mailto:${site.email}`} className="home-hero__link">
              <ScrambleText>{site.email}</ScrambleText>
            </a>
            <span className="home-hero__sep">·</span>
            <a href={site.phoneHref} className="home-hero__link">
              <ScrambleText>{site.phone}</ScrambleText>
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
                  <ScrambleText>{social.label}</ScrambleText>
                </a>
              </span>
            ))}
          </div>

          <span className="home-hero__copy">
            <ScrambleText>{`© ${site.year}`}</ScrambleText>
          </span>
        </div>

        <TechLogoLoop />
      </div>
    </section>
  );
}
