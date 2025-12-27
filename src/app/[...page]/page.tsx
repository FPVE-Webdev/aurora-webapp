/**
 * Builder.io Catch-All Route
 *
 * This route handles all dynamic pages created in Builder.io.
 * Pages created in the Builder.io visual editor will be rendered here.
 *
 * Examples:
 * - /about → Renders Builder.io page with URL path "/about"
 * - /blog/post-1 → Renders Builder.io page with URL path "/blog/post-1"
 */

import { builder } from '@builder.io/sdk';
import { RenderBuilderContent } from '@/components/builder/render-builder-content';

// Register custom components
import '@/builder-registry';

// Get Builder.io API key
const builderApiKey = process.env.NEXT_PUBLIC_BUILDER_API_KEY;

// Initialize Builder.io
if (builderApiKey) {
  builder.init(builderApiKey);
} else {
  console.warn('[Builder.io] API key not found. Set NEXT_PUBLIC_BUILDER_API_KEY in .env');
}

interface PageProps {
  params: Promise<{
    page: string[];
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const urlPath = '/' + (params?.page?.join('/') || '');

  // Fetch content from Builder.io
  const content = await builder
    .get('page', {
      userAttributes: {
        urlPath,
      },
      options: {
        // Enable edge caching
        cachebust: false,
      },
    })
    .toPromise();

  // If no content found, return 404
  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-gray-600">Page not found</p>
        </div>
      </div>
    );
  }

  // Render Builder.io content
  return <RenderBuilderContent content={content} model="page" />;
}

/**
 * Generate static params for known Builder.io pages
 * (Optional - for static generation)
 */
export async function generateStaticParams() {
  if (!builderApiKey) {
    return [];
  }

  // Fetch all published pages from Builder.io
  const pages = await builder.getAll('page', {
    options: { noTargeting: true },
    limit: 100,
  });

  return pages.map((page) => ({
    page: page.data?.url?.split('/').filter(Boolean) || [],
  }));
}
