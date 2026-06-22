import type { Metadata } from 'next';
import { site } from '@/data/site';
import { JsonLd } from '@/components/seo/JsonLd';
import { HomeHero } from '@/components/site/HomeHero';
import { breadcrumbSchema, buildPageMetadata } from '@/lib/seo';
import '@/styles/home.css';

export const metadata: Metadata = buildPageMetadata({
  title: `${site.name} | ${site.role}`,
  description: site.about.description,
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema('/')} />
      <HomeHero />
    </>
  );
}
