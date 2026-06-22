import type { Metadata } from 'next';
import { site } from '@/data/site';
import { JsonLd } from '@/components/seo/JsonLd';
import { AboutPage } from '@/components/site/AboutPage';
import { breadcrumbSchema, buildPageMetadata, profilePageSchema } from '@/lib/seo';
import '@/styles/about.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'About',
  description: site.about.description,
  path: '/about',
  openGraphType: 'profile',
});

export default function AboutRoute() {
  return (
    <>
      <JsonLd data={[breadcrumbSchema('/about'), profilePageSchema()]} />
      <AboutPage />
    </>
  );
}
