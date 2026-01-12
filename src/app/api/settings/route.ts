import { NextResponse } from 'next/server';

/**
 * Public settings endpoint (not protected by admin auth)
 * Used by frontend to fetch app settings
 */
export async function GET() {
  try {
    // Return app settings from environment or defaults
    const settings = {
      mapMode: (process.env.NEXT_PUBLIC_MAP_MODE as 'demo' | 'live') || 'live',
      devMode: process.env.NODE_ENV === 'development',
      showBetaBadge: process.env.NEXT_PUBLIC_SHOW_BETA_BADGE === 'true' || true,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
