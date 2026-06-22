'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { site } from '@/data/site';
import { initAboutInteractions } from '@/lib/about-interactions';

export function AboutPage() {
  useEffect(() => {
    document.body.classList.remove('home-page');
    const cleanup = initAboutInteractions();
    return cleanup;
  }, []);

  return (
    <>
      <section className="about-bio">
        <div className="about-deco" aria-hidden="true">
          <span className="about-deco__corner about-deco__corner--tl" />
          <span className="about-deco__corner about-deco__corner--tr" />
          <span className="about-deco__corner about-deco__corner--bl" />
          <span className="about-deco__corner about-deco__corner--br" />
          <span className="about-deco__reg about-deco__reg--top" />
          <span className="about-deco__reg about-deco__reg--bottom" />
          <span className="about-deco__scale" />
          <span className="about-deco__focus" />
          <span className="about-deco__asterisk">✦</span>
          <span className="about-deco__annotation">{site.coords}</span>
          <span className="about-deco__rule about-deco__rule--left" />
          <span className="about-deco__rule about-deco__rule--right" />
          <span className="about-deco__orbit" />
          <span className="about-deco__dots" />
          <span className="about-deco__label">
            PROFILE — {site.year}
          </span>
        </div>

        <div className="about-bio__card" id="bioCard">
          <div className="about-bio__card-img">
            <Image
              src={site.portrait}
              alt={`Portrait of ${site.name}`}
              width={1214}
              height={880}
              sizes="(max-width: 1024px) 92vw, 460px"
              className="about-bio__portrait"
              priority
            />
          </div>

          <div className="about-bio__card-body">
            <div className="about-bio__card-title">
              <h2>{site.name}</h2>
              <span className="about-bio__card-type">{site.about.roleLabel}</span>
            </div>

            <div className="about-bio__card-stats">
              <div className="about-bio__card-stat">
                <span className="about-bio__card-stat-label">Type</span>
                <span className="about-bio__card-stat-value">{site.about.type}</span>
              </div>
              <div className="about-bio__card-stat">
                <span className="about-bio__card-stat-label">XP</span>
                <span className="about-bio__card-stat-value">{site.about.experience}</span>
              </div>
              <div className="about-bio__card-stat">
                <span className="about-bio__card-stat-label">Base</span>
                <span className="about-bio__card-stat-value">{site.about.base}</span>
              </div>
            </div>

            <div className="about-bio__card-desc" data-scroll-text>
              {site.about.description}
            </div>

            <div className="about-bio__card-skills">
              {site.about.skills.map((skill) => (
                <span key={skill}>★ {skill}</span>
              ))}
            </div>
          </div>

          <div className="about-bio__card-footer">
            <span>{site.about.cardId}</span>
            <span>{site.about.cardEdition}</span>
          </div>
        </div>

        <div className="about-bio__scroll-hint">
          <span>Scroll</span>
        </div>
      </section>

      <section className="about-exp">
        <h2 className="about-exp__heading">Experience</h2>
        <p className="about-exp__intro" data-scroll-text>
          {site.about.storyIntro}
        </p>
        <div className="about-exp__line" aria-hidden="true">
          <div className="about-exp__line-fill" />
        </div>

        {site.experience.map((item, index) => (
          <div
            key={`${item.year}-${item.title}-${index}`}
            className={`about-exp__item${index % 2 === 0 ? ' about-exp__item--flip' : ''}`}
          >
            <div className="about-exp__year-col" data-index={String(index + 1).padStart(2, '0')}>
              <span className="about-exp__year">{item.year}</span>
            </div>
            <div className="about-exp__dot-col">
              <span className="about-exp__dot" />
            </div>
            <div className="about-exp__card-col">
              <div className="about-exp__card">
                <span className="about-exp__period">{item.period}</span>
                {'lede' in item && item.lede ? (
                  <p className="about-exp__lede">{item.lede}</p>
                ) : null}
                <h3>{item.title}</h3>
                <span className="about-exp__company">{item.company}</span>
                {'stack' in item && item.stack?.length ? (
                  <p className="about-exp__stack">{item.stack.join(' · ')}</p>
                ) : null}
                <p className="about-exp__story">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="about-cta">
        <div className="about-cta__inner">
          <h2 className="about-cta__text">
            LET&apos;S WORK
            <br />
            TOGETHER
          </h2>
          <Link href="/contact" className="about-cta__link">
            Get in touch
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
