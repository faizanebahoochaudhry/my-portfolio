import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import './globals.css';
import { site } from '@/data/site';
import { AmbientLights } from '@/components/site/AmbientLights';
import { TransitionOverlay } from '@/components/site/TransitionOverlay';
import { CustomCursor } from '@/components/site/CustomCursor';
import { CursorParticles } from '@/components/site/CursorParticles';
import { Nav } from '@/components/site/Nav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${site.name} | ${site.role}`,
  description: site.about.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`} suppressHydrationWarning>
      <body className={`${inter.className} is-ready`} suppressHydrationWarning>
        <AmbientLights />
        <TransitionOverlay />
        <CursorParticles />
        <CustomCursor />
        <Nav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
