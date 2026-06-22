'use client';

import { useEffect, useRef } from 'react';
import { site } from '@/data/site';
import { initContactTuner, type ContactStation } from '@/lib/contact-tuner';

const PHONE_SPOT = (100 - 87.5) / 20.4;

const CONTACT_STATIONS: ContactStation[] = [
  {
    id: 'sweet',
    spot: 0.319,
    range: 0.11,
    title: "LET'S CONNECT\nNOW",
    line2: site.email,
    line2Href: `mailto:${site.email}`,
    lockable: true,
  },
  {
    id: 'phone',
    spot: PHONE_SPOT,
    range: 0.09,
    title: "CALL ME\nNOW",
    line2: site.phone,
    line2Href: site.phoneHref,
  },
  {
    id: 'easter',
    spot: 0.907,
    range: 0.12,
    title: 'Looking for\nsomething?',
    line2: '',
    line2Href: '',
  },
];

const CONTACT_COPY = {
  label: 'Contact',
  stations: CONTACT_STATIONS,
  line2Mask: '————@————————.——',
  hintDrag: 'Drag horizontally to tune the signal',
  hintFreq: 'Try 94 MHz, 100 MHz, or 106 MHz…',
  statusSearching: 'Searching for signal…',
  statusLocked: 'Signal locked',
};

export function ContactPage() {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const line2Ref = useRef<HTMLAnchorElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusTextRef = useRef<HTMLSpanElement>(null);
  const freqRef = useRef<HTMLSpanElement>(null);
  const signalRef = useRef<HTMLSpanElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.remove('home-page');
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    const labelEl = labelRef.current;
    const titleEl = titleRef.current;
    const line2El = line2Ref.current;
    const hintEl = hintRef.current;
    const statusEl = statusRef.current;
    const statusTextEl = statusTextRef.current;
    const freqEl = freqRef.current;
    const signalEl = signalRef.current;
    const needleEl = needleRef.current;

    if (
      !hero ||
      !canvas ||
      !labelEl ||
      !titleEl ||
      !line2El ||
      !hintEl ||
      !statusEl ||
      !statusTextEl ||
      !freqEl ||
      !signalEl ||
      !needleEl
    ) {
      return;
    }

    return initContactTuner(
      {
        hero,
        canvas,
        labelEl,
        titleEl,
        line2El,
        hintEl,
        statusEl,
        statusTextEl,
        freqEl,
        signalEl,
        needleEl,
      },
      CONTACT_COPY,
    );
  }, []);

  return (
    <section className="contact-hero" ref={heroRef}>
      <canvas
        className="contact-scope"
        ref={canvasRef}
        aria-label="Interactive radio signal tuner"
      />

      <div className="contact-hero__content">
        <p className="contact-hero__label" ref={labelRef}>
          Contact
        </p>
        <h1 className="contact-hero__title" ref={titleRef}>
          {`—————\n———————`}
        </h1>
        <a
          href={`mailto:${site.email}`}
          className="contact-hero__line2"
          ref={line2Ref}
        >
          ————@————————.——
        </a>
      </div>

      <div className="contact-scope__readout">
        <span className="contact-scope__freq" ref={freqRef}>
          87.5 MHz
        </span>
        <span className="contact-scope__sep" aria-hidden="true">
          |
        </span>
        <span className="contact-scope__signal" ref={signalRef}>
          SNR 0.0 dB
        </span>
      </div>

      <div className="contact-band" aria-hidden="true">
        <div className="contact-band__track">
          <div className="contact-band__needle" ref={needleRef} />
        </div>
        <div className="contact-band__labels">
          <span>88</span>
          <span>92</span>
          <span>96</span>
          <span>100</span>
          <span>104</span>
          <span>108</span>
        </div>
      </div>

      <nav className="contact-socials" aria-label="Social profiles">
        {site.socials.map((social, index) => (
          <span key={social.label} className="contact-socials__item">
            {index > 0 && <span className="contact-socials__sep" aria-hidden="true">·</span>}
            <a
              href={social.href}
              className="contact-socials__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {social.label}
            </a>
          </span>
        ))}
        <span className="contact-socials__sep" aria-hidden="true">·</span>
        <a href={`mailto:${site.email}`} className="contact-socials__link">
          Email
        </a>
      </nav>

      <div className="contact-hero__hint" ref={hintRef}>
        <span>{CONTACT_COPY.hintDrag}</span>
      </div>

      <div className="contact-hero__status" ref={statusRef}>
        <span className="contact-hero__status-dot" />
        <span ref={statusTextRef}>{CONTACT_COPY.statusSearching}</span>
      </div>
    </section>
  );
}
