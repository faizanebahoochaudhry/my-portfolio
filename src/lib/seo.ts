import type { Metadata } from 'next';
import { site } from '@/data/site';

export const SITE_ICON = '/Faizan e Bahoo Chaudhry Logo.png';
export const OG_IMAGE = site.portrait;

const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/works', label: 'Works' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
] as const;

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export const seoKeywords = [
  site.name,
  site.role,
  site.about.roleLabel,
  site.about.type,
  ...site.about.skills,
  site.location,
  'portfolio',
  'web developer',
  'software engineer',
] as const;

export function buildPageMetadata({
  title,
  description,
  path,
  openGraphType = 'website',
}: {
  title: string;
  description: string;
  path: string;
  openGraphType?: 'website' | 'profile';
}): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,
    keywords: [...seoKeywords],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site.name,
      locale: 'en_US',
      type: openGraphType,
      images: [
        {
          url: OG_IMAGE,
          width: 1214,
          height: 880,
          alt: `${site.name} — ${site.about.roleLabel}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export function buildRootMetadata(): Metadata {
  const title = `${site.name} | ${site.role}`;

  return {
    metadataBase: new URL(getSiteUrl()),
    ...buildPageMetadata({
      title,
      description: site.about.description,
      path: '/',
    }),
    title: {
      default: title,
      template: `%s | ${site.name}`,
    },
    applicationName: site.name,
    authors: [{ name: site.name, url: getSiteUrl() }],
    creator: site.name,
    publisher: site.name,
    category: 'technology',
    icons: {
      icon: [{ url: SITE_ICON, type: 'image/png' }],
      apple: SITE_ICON,
      shortcut: SITE_ICON,
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

export function breadcrumbSchema(path: string) {
  const trail = [{ name: 'Home', path: '/' }];

  if (path !== '/') {
    const match = ROUTES.find((route) => route.path === path);
    if (match) trail.push({ name: match.label, path: match.path });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${getSiteUrl()}/#person`,
    name: site.name,
    givenName: site.shortName,
    jobTitle: site.about.roleLabel,
    description: site.about.description,
    image: absoluteUrl(site.portrait),
    url: getSiteUrl(),
    email: site.email,
    telephone: site.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lahore',
      addressCountry: 'PK',
    },
    sameAs: site.socials.map((social) => social.href),
    knowsAbout: [...site.about.skills],
    worksFor: {
      '@type': 'Organization',
      name: 'TechAelia',
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getSiteUrl()}/#website`,
    name: site.name,
    description: site.about.description,
    url: getSiteUrl(),
    inLanguage: 'en',
    author: { '@id': `${getSiteUrl()}/#person` },
  };
}

export function profilePageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${getSiteUrl()}/about#profile`,
    name: `About ${site.name}`,
    description: site.about.description,
    url: absoluteUrl('/about'),
    mainEntity: { '@id': `${getSiteUrl()}/#person` },
  };
}

export function contactPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${getSiteUrl()}/contact#contact`,
    name: `Contact ${site.name}`,
    description: `${site.status}. ${site.location}.`,
    url: absoluteUrl('/contact'),
    mainEntity: { '@id': `${getSiteUrl()}/#person` },
  };
}

export function worksCollectionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${getSiteUrl()}/works#collection`,
    name: `${site.portfolioLabel} — ${site.name}`,
    description: site.about.storyIntro,
    url: absoluteUrl('/works'),
    author: { '@id': `${getSiteUrl()}/#person` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: site.projects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CreativeWork',
          name: project.name,
          description: `${project.client} — ${project.role}`,
          image: absoluteUrl(project.image),
          dateCreated: project.year,
          author: { '@id': `${getSiteUrl()}/#person` },
          ...('url' in project && project.url && !project.url.startsWith('#')
            ? { url: project.url.startsWith('/') ? absoluteUrl(project.url) : project.url }
            : {}),
        },
      })),
    },
  };
}

export function getSitemapRoutes() {
  return ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(site.year, 0, 1),
    changeFrequency: route.path === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: route.path === '/' ? 1 : 0.8,
  }));
}
