import type { Metadata } from 'next';
import { site } from '@/data/site';
import { JsonLd } from '@/components/seo/JsonLd';
import { ContactPage } from '@/components/site/ContactPage';
import { breadcrumbSchema, buildPageMetadata, contactPageSchema } from '@/lib/seo';
import '@/styles/contact.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact',
  description: `${site.status} ${site.location}.`,
  path: '/contact',
});

export default function ContactRoute() {
  return (
    <>
      <JsonLd data={[breadcrumbSchema('/contact'), contactPageSchema()]} />
      <ContactPage />
    </>
  );
}
