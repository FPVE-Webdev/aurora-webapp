'use client';

/**
 * Client-side Builder.io Content Renderer
 *
 * This component handles the client-side rendering of Builder.io content.
 * It's separated into its own client component to allow the parent page
 * to remain server-side rendered.
 */

import { BuilderComponent, useIsPreviewing } from '@builder.io/react';
import { BuilderContent } from '@builder.io/sdk';

interface RenderBuilderContentProps {
  content: BuilderContent | null;
  model: string;
}

export function RenderBuilderContent({ content, model }: RenderBuilderContentProps) {
  // Check if we're in Builder.io preview mode
  const isPreviewing = useIsPreviewing();

  // Show Builder.io content in preview OR if content exists
  if (isPreviewing || content) {
    return <BuilderComponent model={model} content={content} />;
  }

  // Fallback for missing content (should not reach here due to parent 404 check)
  return null;
}
