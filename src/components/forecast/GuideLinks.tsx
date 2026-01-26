/**
 * GuideLinks Component
 *
 * Context-aware guide links to tromso.ai/guides.
 * Shows relevant aurora viewing guides based on selected location.
 * - Tromsø: Aurora tips (spots, photography, culture)
 * - Remote: Practical guides (driving, safety, packing)
 */

'use client';

import { getRelevantGuides, GuideLink } from '@/lib/constants/guides';
import { ExternalLink } from 'lucide-react';

interface GuideLinkProps {
  spotId: string;
  spotName: string;
}

export function GuideLinks({ spotId, spotName }: GuideLinkProps) {
  const guides = getRelevantGuides(spotId);

  if (!guides || guides.length === 0) return null;

  const isHomeLocation = spotId === 'tromso';

  return (
    <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        {isHomeLocation ? (
          <>
            <span>📚</span> Aurora Tips
          </>
        ) : (
          <>
            <span>📍</span> Planning Guide for {spotName}
          </>
        )}
      </h3>

      <div className="space-y-2">
        {guides.map((guide) => (
          <GuideItem key={guide.url} guide={guide} />
        ))}
      </div>

      <p className="text-xs text-white/50 mt-3">Powered by tromso.ai guides</p>
    </div>
  );
}

/**
 * Individual guide link item with title and description
 */
function GuideItem({ guide }: { guide: GuideLink }) {
  return (
    <a
      href={guide.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/80 hover:text-white group"
    >
      <span className="text-lg leading-tight mt-0.5 flex-shrink-0">→</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
          {guide.title}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
        <div className="text-xs text-white/60 mt-0.5">{guide.description}</div>
      </div>
    </a>
  );
}
