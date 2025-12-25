/**
 * Aurora API - Now Endpoint
 * Fetches REAL current aurora data from NOAA SWPC and Met.no
 * NO MOCK DATA in production
 */

import { NextResponse } from 'next/server';
import { fetchCurrentKp, fetchSolarWind, calculateAuroraProbability, kpToLevel } from '@/lib/fetchers/noaa';
import { fetchWeather } from '@/lib/fetchers/metno';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';

// Tromsø coordinates (default location)
const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (live data)
const CACHE_VERSION = 2; // Increment to invalidate old cache

let cache: { data: any; timestamp: number; version: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';
  const lat = parseFloat(searchParams.get('lat') || DEFAULT_LAT.toString());
  const lon = parseFloat(searchParams.get('lon') || DEFAULT_LON.toString());

  // Check cache first (with version validation)
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
    // Fetch real data from NOAA and Met.no in parallel
    const [kp, weather, solarWind] = await Promise.all([
      fetchCurrentKp(),
      fetchWeather(lat, lon),
      fetchSolarWind(),
    ]);

    // Calculate aurora probability with enhanced factors
    const probability = calculateAuroraProbability(
      kp,
      weather.cloudCoverage,
      solarWind?.bz_gsm,
      solarWind?.speed,
      solarWind?.density
    );
    const score = Math.round((kp / 9) * 100); // Convert KP to 0-100 score
    const level = kpToLevel(kp);

    // Generate localized content
    const forecast = {
      score,
      kp: Math.round(kp * 10) / 10,
      probability,
      level,
      confidence: 'high' as const,
      headline:
        lang === 'no'
          ? probability > 70
            ? 'Nordlys synlig akkurat nå!'
            : probability > 40
            ? 'Nordlys mulig nå'
            : 'Lave sjanser for nordlys nå'
          : probability > 70
          ? 'Northern lights visible right now!'
          : probability > 40
          ? 'Northern lights possible now'
          : 'Low chances for aurora now',
      summary:
        lang === 'no'
          ? probability > 70
            ? `Sterk nordlysaktivitet (KP ${kp.toFixed(1)}). Gå ut nå for beste sjanse!`
            : probability > 40
            ? `Moderat nordlysaktivitet (KP ${kp.toFixed(1)}). Sjekk himmelen regelmessig.`
            : `Lav nordlysaktivitet (KP ${kp.toFixed(1)}). Vær tålmodig.`
          : probability > 70
          ? `Strong aurora activity (KP ${kp.toFixed(1)}). Go outside now for best chance!`
          : probability > 40
          ? `Moderate aurora activity (KP ${kp.toFixed(1)}). Check the sky regularly.`
          : `Low aurora activity (KP ${kp.toFixed(1)}). Be patient.`,
      best_time: lang === 'no' ? 'Akkurat nå' : 'Right now',
      tips:
        lang === 'no'
          ? ['Gå bort fra bylys', 'La øynene tilpasse seg mørket (10 min)', 'Se mot nord']
          : ['Move away from city lights', 'Let your eyes adjust to darkness (10 min)', 'Look north'],
      updated: new Date().toISOString(),
      weather: {
        cloudCoverage: weather.cloudCoverage,
        temperature: weather.temperature,
        windSpeed: weather.windSpeed,
        conditions: weather.conditions,
      },
      location: {
        lat,
        lon,
        name: lat === DEFAULT_LAT && lon === DEFAULT_LON ? 'Tromsø' : 'Custom location',
      },
    };

    // Cache the response
    cache = {
      data: forecast,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };

    console.log(`✅ Real aurora data: KP ${kp.toFixed(1)}, ${weather.cloudCoverage}% clouds, ${probability}% probability`);

    return NextResponse.json({
      ...forecast,
      meta: {
        cached: false,
        source: 'NOAA SWPC + Met.no',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to fetch real aurora data:', error);

    // CRITICAL: In production, return error instead of mock data
    return NextResponse.json(
      {
        error: 'Aurora data temporarily unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        retry_after: 60,
      },
      {
        status: 503,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }
}
