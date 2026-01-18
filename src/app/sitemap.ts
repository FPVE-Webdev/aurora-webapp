import { MetadataRoute } from 'next';
import { SPOT_SLUGS } from '@/lib/constants/spotDatabase';

/**
 * Generate sitemap for SEO
 * Next.js automatically serves this at /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://aurora.tromso.ai';
  const now = new Date();

  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/live`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/forecast`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/settings`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Programmatic spot pages (Phase 3 SEO)
  const spotPages: MetadataRoute.Sitemap = SPOT_SLUGS.map((slug) => ({
    url: `${baseUrl}/spot/${slug}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.8,
  }));

  return [...mainPages, ...spotPages];
}
