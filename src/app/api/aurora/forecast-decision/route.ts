/**
 * Forecast Decision API Endpoint
 *
 * POST /api/aurora/forecast-decision
 *
 * Accepts hourly forecast data and returns Site-AI decision output.
 * This is the integration point between the forecast data layer and frontend.
 *
 * Input: SiteAIInput (hourly forecasts + KP data)
 * Output: SiteAIDecision (complete decision object)
 *
 * Caching: 1 hour (same as underlying forecast data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeSiteAIDecision } from '@/lib/site-ai';
import { SiteAIInput, SiteAIDecision } from '@/types/siteAI';

// Enable caching for this endpoint
// The output is deterministic, so same TTL as underlying data is safe
const CACHE_TTL = 3600; // 1 hour

/**
 * POST handler for forecast decision computation.
 * Validates input, computes decision, and returns with proper caching headers.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const input = body as SiteAIInput;

    // Validate input
    if (!input.hourlyForecasts || input.hourlyForecasts.length === 0) {
      return NextResponse.json(
        { error: 'No hourly forecasts provided' },
        { status: 400 }
      );
    }

    if (typeof input.globalKp !== 'number' || input.globalKp < 0 || input.globalKp > 9) {
      return NextResponse.json(
        { error: 'Invalid globalKp value (must be 0-9)' },
        { status: 400 }
      );
    }

    if (!['increasing', 'stable', 'decreasing'].includes(input.kpTrend)) {
      return NextResponse.json(
        { error: "Invalid kpTrend (must be 'increasing', 'stable', or 'decreasing')" },
        { status: 400 }
      );
    }

    // Validate each forecast window
    for (const forecast of input.hourlyForecasts) {
      if (!forecast.time || !forecast.time.match(/^\d{4}-\d{2}-\d{2}T/)) {
        return NextResponse.json(
          { error: 'Invalid time format in forecast (must be ISO 8601)' },
          { status: 400 }
        );
      }
      if (
        typeof forecast.cloudCover !== 'number' ||
        forecast.cloudCover < 0 ||
        forecast.cloudCover > 100
      ) {
        return NextResponse.json(
          { error: 'Invalid cloudCover (must be 0-100)' },
          { status: 400 }
        );
      }
      if (typeof forecast.solarElevation !== 'number') {
        return NextResponse.json(
          { error: 'Invalid solarElevation (must be a number)' },
          { status: 400 }
        );
      }
      if (
        typeof forecast.kpIndex !== 'number' ||
        forecast.kpIndex < 0 ||
        forecast.kpIndex > 9
      ) {
        return NextResponse.json(
          { error: 'Invalid kpIndex (must be 0-9)' },
          { status: 400 }
        );
      }
    }

    // Compute Site-AI decision
    const decision: SiteAIDecision = computeSiteAIDecision(input);

    // Return decision with cache headers
    const response = NextResponse.json(decision, { status: 200 });

    // Set cache headers for deterministic output
    response.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    response.headers.set('Content-Type', 'application/json');

    return response;
  } catch (error) {
    // Log error for monitoring
    console.error('Error computing Site-AI forecast decision:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check / endpoint documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/aurora/forecast-decision',
    method: 'POST',
    description: 'Computes Site-AI forecast decision from hourly forecast data',
    cacheControl: `max-age=${CACHE_TTL}`,
    documentation: 'See /docs/SITE-AI.md',
  });
}
