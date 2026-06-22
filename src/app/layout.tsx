import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import './globals.css';
import { JsonLd } from '@/components/seo/JsonLd';
import { ClientFx } from '@/components/site/ClientFx';
import { buildRootMetadata, personSchema, websiteSchema } from '@/lib/seo';
import { TransitionOverlay } from '@/components/site/TransitionOverlay';
import { Nav } from '@/components/site/Nav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.simpleicons.org" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} is-ready`} suppressHydrationWarning>
        <JsonLd data={[personSchema(), websiteSchema()]} />
        <ClientFx />
        <TransitionOverlay />
        <Nav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
