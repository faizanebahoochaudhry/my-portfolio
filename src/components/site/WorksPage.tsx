'use client';

import { Fragment, memo, useLayoutEffect, useRef } from 'react';
import { site } from '@/data/site';
import { initWorkInteractions } from '@/lib/work-interactions';

const DIAL_TICKS = 120;

const worksRelevanceOrder = site.projectRelevanceOrder.join(',');

function splitTitleHtml(html: string) {
  const lines = html.split(/<br\s*\/?>/i);

  return lines.map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {lineIndex > 0 && <br />}
      {line
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word, wordIndex) => (
          <Fragment key={`${lineIndex}-${wordIndex}`}>
            {wordIndex > 0 && (
              <span className="proj__char proj__char--space" style={{ display: 'inline' }}>
                {' '}
              </span>
            )}
            <span className="proj__word" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {word.split('').map((char, charIndex) => (
                <span
                  key={charIndex}
                  className="proj__char"
                  style={{ display: 'inline-block' }}
                >
                  {char}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
    </Fragment>
  ));
}

const ProjectTitle = memo(function ProjectTitle({
  html,
  index,
  active,
}: {
  html: string;
  index: number;
  active: boolean;
}) {
  return (
    <h2 className={`proj__title${active ? ' is-active' : ''}`} data-index={index}>
      {splitTitleHtml(html)}
    </h2>
  );
});

export function WorksPage() {
  const projRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    document.body.classList.remove('home-page');
    const el = projRef.current;
    if (!el) return;
    return initWorkInteractions(el);
  }, []);

  const total = String(site.projects.length).padStart(2, '0');

  return (
    <section
      ref={projRef}
      className="proj"
      aria-label="Works"
      data-relevance-order={worksRelevanceOrder}
    >
      <div className="proj__glow" aria-hidden="true" />

      <div className="proj__deco-left" aria-hidden="true">
        <span className="proj__vertical-text">Selection — 2020/{site.year}</span>
        <div className="proj__line" />
      </div>

      <div className="proj__deco-top" aria-hidden="true">
        <div className="proj__sort">
          <span className="proj__sort-label">Sort by</span>
          <button type="button" className="proj__sort-btn is-active" data-sort="relevance">
            Relevance
          </button>
          <span className="proj__sort-sep">&middot;</span>
          <button type="button" className="proj__sort-btn" data-sort="date-desc">
            Date &darr;
          </button>
          <span className="proj__sort-sep">&middot;</span>
          <button type="button" className="proj__sort-btn" data-sort="date-asc">
            Date &uarr;
          </button>
        </div>
        <div className="proj__dash-line" />
        <button type="button" className="proj__view-toggle" aria-label="Switch view">
          <span className="proj__view-opt proj__view-opt--slider is-active">Slider</span>
          <span className="proj__view-sep">·</span>
          <span className="proj__view-opt proj__view-opt--list">List</span>
        </button>
      </div>

      <div className="proj__deco-corners" aria-hidden="true">
        <span className="proj__corner proj__corner--tl" />
        <span className="proj__corner proj__corner--tr" />
        <span className="proj__corner proj__corner--bl" />
        <span className="proj__corner proj__corner--br" />
      </div>

      <div className="proj__crosshair" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="proj__orbit" aria-hidden="true">
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
          <circle cx="60" cy="10" r="3" fill="currentColor" opacity="0.5" className="proj__orbit-dot" />
        </svg>
      </div>

      <div className="proj__grid-deco" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="proj__counter">
        <div className="proj__counter-num">
          <span className="proj__counter-current">01</span>
        </div>
        <span className="proj__counter-sep">/</span>
        <span className="proj__counter-total">{total}</span>
      </div>

      <div className="proj__list">
        <div className="proj__list-img-preview" />

        <table className="proj__list-table">
          <tbody>
            {site.projects.map((project, index) => (
              <tr
                key={project.slug}
                className="proj__list-row"
                data-index={index}
                data-img={project.image}
                data-year={project.sortYear}
              >
                <td className="proj__list-num">{String(index + 1).padStart(2, '0')}</td>
                <td className="proj__list-name">{project.name}</td>
                <td className="proj__list-client">{project.client}</td>
                <td className="proj__list-role">{project.role}</td>
                <td className="proj__list-year">{project.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="proj__images">
        {site.projects.map((project, index) => (
          <div
            key={project.slug}
            className={`proj__img${index === 0 ? ' is-active' : ''}`}
            data-index={index}
            data-sort-year={project.sortYear}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.image} alt={project.name} loading="lazy" decoding="async" />
          </div>
        ))}
      </div>

      <div className="proj__titles">
        {site.projects.map((project, index) => (
          <ProjectTitle
            key={project.slug}
            html={project.sliderTitle}
            index={index}
            active={index === 0}
          />
        ))}
      </div>

      <div className="proj__underline" aria-hidden="true" />

      <div className="proj__info">
        {site.projects.map((project, index) => (
          <div
            key={project.slug}
            className={`proj__desc${index === 0 ? ' is-active' : ''}`}
            data-index={index}
          >
            <p className="proj__client">{project.client}</p>
            <p className="proj__role">{project.role}</p>
          </div>
        ))}
      </div>

      <div className="proj__year-wrap">
        {site.projects.map((project, index) => (
          <span
            key={project.slug}
            className={`proj__year${index === 0 ? ' is-active' : ''}`}
            data-index={index}
          >
            {project.year}
          </span>
        ))}
      </div>

      <div className="proj__dial" aria-hidden="true">
        <div className="proj__dial-track">
          {Array.from({ length: DIAL_TICKS }).map((_, i) => (
            <span key={i} className="proj__dial-tick" />
          ))}
        </div>
      </div>

      <div className="proj__links">
        {site.projects.map((project, index) => {
          const href = 'url' in project && project.url ? project.url : `#${project.slug}`;
          const hasLink = !href.startsWith('#');

          return (
            <a
              key={project.slug}
              className={`proj__link${index === 0 ? ' is-active' : ''}`}
              href={href}
              data-index={index}
              aria-label={project.name}
              {...(hasLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            />
          );
        })}
      </div>

      <div className="proj__scroll-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span>Scroll</span>
      </div>
    </section>
  );
}
