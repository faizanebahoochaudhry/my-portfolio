import type { Metadata } from 'next';
import { site } from '@/data/site';
import { JsonLd } from '@/components/seo/JsonLd';
import { WorksPage } from '@/components/site/WorksPage';
import { breadcrumbSchema, buildPageMetadata, worksCollectionSchema } from '@/lib/seo';
import '@/styles/work.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Works',
  description: site.about.storyIntro,
  path: '/works',
});

export default function WorksRoute() {
  return (
    <>
      <JsonLd data={[breadcrumbSchema('/works'), worksCollectionSchema()]} />
      <WorksPage />
    </>
  );
}
