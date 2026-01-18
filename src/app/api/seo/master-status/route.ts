/**
 * SEO Master Status API
 * Provides server-side access to master status for dynamic metadata generation
 */

import { NextResponse } from 'next/server';
import { calculateMasterStatus, calculateSunElevation } from '@/lib/calculations/masterStatus';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cache: { status: string; emoji: string; timestamp: number } | null = null;

export async function GET() {
  // Check cache
  if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return NextResponse.json(cache);
  }

  try {
    // Default location: Tromsø
    const latitude = 69.6496;
    const longitude = 18.9560;

    // Fetch aurora data
    const auroraResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/aurora/now?lang=no`,
      { next: { revalidate: 300 } } // 5 min cache
    );
    const auroraData = auroraResponse.ok ? await auroraResponse.json() : null;

    // Fetch weather data
    const weatherResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/weather/${latitude}/${longitude}`,
      { next: { revalidate: 300 } }
    );
    const weatherData = weatherResponse.ok ? await weatherResponse.json() : null;

    // Extract values
    const kpIndex = auroraData ? scoreToKpIndex(auroraData.score || 50) : 3;
    const cloudCoverage = weatherData?.cloudCoverage ?? 50;
    const temperature = weatherData?.temperature ?? -5;

    // Calculate probability
    const { probability } = calculateAuroraProbability({
      kpIndex,
      cloudCoverage,
      temperature,
      latitude,
    });

    // Calculate sun elevation
    const sunElevation = calculateSunElevation(latitude, longitude, new Date());

    // Calculate master status
    const statusResult = calculateMasterStatus({
      probability,
      cloudCoverage,
      kpIndex,
      sunElevation,
      latitude,
      longitude,
    });

    const emoji = statusResult.status === 'GO' ? '🟢' : statusResult.status === 'WAIT' ? '🟡' : '🔴';

    const result = {
      status: statusResult.status,
      emoji,
      timestamp: Date.now(),
    };

    // Cache result
    cache = result;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch SEO master status:', error);

    // Fallback to neutral status
    return NextResponse.json({
      status: 'WAIT',
      emoji: '🟡',
      timestamp: Date.now(),
    });
  }
}
