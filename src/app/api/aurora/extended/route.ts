/**
 * Aurora API - Extended 27-Day Forecast
 * Provides long-range aurora predictions based on solar rotation cycles
 * Premium feature - shows 3 complete solar rotations (27 days each)
 */

import { NextResponse } from 'next/server';

const NOAA_KP_FORECAST_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
const TIMEOUT_MS = 8000;
const USER_AGENT = 'Aurora.Tromso.ai/1.0 (support@tromso.ai)';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_VERSION = 1;

let cache: { data: any; timestamp: number; version: number } | null = null;

function classifyKp(kp: number): 'Very Low' | 'Low' | 'Moderate' | 'Strong' | 'Very Strong' {
  if (kp >= 7) return 'Very Strong';
  if (kp >= 5) return 'Strong';
  if (kp >= 3) return 'Moderate';
  if (kp >= 1) return 'Low';
  return 'Very Low';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';

  // Check cache
  if (cache && cache.version === CACHE_VERSION && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return NextResponse.json({
      ...cache.data,
      meta: {
        cached: true,
        cache_age: Math.floor((Date.now() - cache.timestamp) / 1000)
      }
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(NOAA_KP_FORECAST_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 21600 }, // 6 hours
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`NOAA forecast API returned ${response.status}`);
    }

    const data = await response.json();

    // NOAA format: Array of arrays [time_tag, kp]
    // Skip header row (index 0)
    const forecast = data.slice(1, 28).map((row: any[]) => {
      const kp = parseFloat(row[1]) || 0;
      const probability = Math.round((kp / 9) * 100);

      return {
        date: row[0], // ISO timestamp
        kp: Math.round(kp * 10) / 10,
        probability,
        classification: classifyKp(kp),
        level: kp >= 7 ? 'excellent' : kp >= 5 ? 'good' : kp >= 3 ? 'moderate' : 'low',
      };
    });

    const result = {
      status: 'success',
      forecast,
      summary: {
        total_days: forecast.length,
        best_days: forecast.filter((d: any) => d.kp >= 5).length,
        average_kp: Math.round((forecast.reduce((sum: number, d: any) => sum + d.kp, 0) / forecast.length) * 10) / 10,
        peak_kp: Math.max(...forecast.map((d: any) => d.kp)),
      },
      headline: lang === 'no'
        ? `${forecast.filter((d: any) => d.kp >= 5).length} gode dager de neste 27 dagene`
        : `${forecast.filter((d: any) => d.kp >= 5).length} good days in the next 27 days`,
    };

    cache = {
      data: result,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };

    console.log(`✅ 27-day forecast: ${result.summary.best_days} good days, avg KP ${result.summary.average_kp}`);

    return NextResponse.json({
      ...result,
      meta: {
        cached: false,
        source: 'NOAA SWPC 27-Day Forecast',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to fetch 27-day forecast:', error);

    return NextResponse.json(
      {
        error: '27-day forecast temporarily unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        retry_after: 300,
      },
      {
        status: 503,
        headers: {
          'Retry-After': '300',
        },
      }
    );
  }
}
