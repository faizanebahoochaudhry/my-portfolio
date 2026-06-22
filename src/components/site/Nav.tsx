'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { site } from '@/data/site';
import { ScrambleText } from '@/components/site/ScrambleText';

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav.classList.toggle('is-scrolled', y > 10);
        if (y > 60 && y > lastY) nav.classList.add('is-hidden');
        else nav.classList.remove('is-hidden');
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const linkClass = (href: string) => {
    const active =
      href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(`${href}/`);
    return `nav__link${active ? ' is-active' : ''}`;
  };

  return (
    <header>
      <nav className="nav" aria-label="Main navigation">
        <Link href="/" className="nav__logo">
          <ScrambleText scrambleTo={site.logoScrambleTo}>{`${site.shortName}.`}</ScrambleText>
        </Link>
        <div className="nav__links">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <ScrambleText scrambleTo={item.hover}>{item.label}</ScrambleText>
            </Link>
          ))}
        </div>
        <button
          type="button"
          className={`nav__toggle${open ? ' is-open' : ''}`}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className={`nav__mobile-menu${open ? ' is-open' : ''}`}>
        {site.nav.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
