/**
 * Tromso.ai Guide Links & Mapping
 *
 * Context-aware guide selection based on location for aurora viewing.
 * All guides are curated from tromso.ai/guides and link directly to external content.
 */

export interface GuideLink {
  title: string;
  url: string;
  description: string;
}

/**
 * Guide map organized by location context.
 * - 'tromso': Guides for Tromsø city (aurora hunting from home)
 * - 'remote': Guides for remote aurora spots (requires travel)
 * - 'all': Universal guides for any aurora viewer
 */
export const GUIDE_MAP: Record<string, GuideLink[]> = {
  'tromso': [
    {
      title: 'Best Aurora Spots',
      url: 'https://tromso.ai/guides/best-aurora-spots',
      description: 'Discover top spots for aurora hunting near Tromsø',
    },
    {
      title: 'Aurora Photography',
      url: 'https://tromso.ai/guides/aurora-photography',
      description: 'Simple techniques for capturing the Northern Lights',
    },
    {
      title: 'Sámi Culture',
      url: 'https://tromso.ai/guides/sami-culture',
      description: 'Respectful travel in indigenous Sápmi territory',
    },
  ],
  'remote': [
    {
      title: 'Winter Driving',
      url: 'https://tromso.ai/guides/winter-driving',
      description: 'Essential advice for driving on winter roads',
    },
    {
      title: 'Winter Safety',
      url: 'https://tromso.ai/guides/winter-safety',
      description: 'Dress right, stay warm, stay safe in Arctic winter',
    },
    {
      title: 'What to Pack',
      url: 'https://tromso.ai/guides/what-to-pack',
      description: 'Complete packing list for Arctic travel',
    },
  ],
  'all': [
    {
      title: 'Aurora Photography',
      url: 'https://tromso.ai/guides/aurora-photography',
      description: 'Camera settings and techniques for the Northern Lights',
    },
    {
      title: 'Winter Safety',
      url: 'https://tromso.ai/guides/winter-safety',
      description: 'Stay safe during Aurora viewing sessions',
    },
  ],
};

/**
 * Get relevant guides based on location context.
 * Returns location-specific guides for better UX.
 */
export function getRelevantGuides(spotId: string): GuideLink[] {
  if (spotId === 'tromso') {
    return GUIDE_MAP['tromso'];
  } else {
    // Remote location: include driving, safety, and packing guides
    return GUIDE_MAP['remote'];
  }
}
