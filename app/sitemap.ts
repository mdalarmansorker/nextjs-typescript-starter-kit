import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Served at /sitemap.xml. List the public pages search engines should index; for pages from the API
 * (blog posts, products), fetch them here and add one entry each.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL('/', appUrl).href, changeFrequency: 'weekly', priority: 1 }];
}
