import type { MetadataRoute } from 'next';
import { getSitemapRoutes } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return getSitemapRoutes();
}
