/**
 * Aurora API - Tonight Endpoint
 * Fetches REAL aurora forecast for tonight from NOAA SWPC and Met.no
 *
 * Note: Upstream services can be slow or intermittently unavailable.
 * This endpoint is written to be resilient and prefer returning a cached/stale
 * response rather than breaking the UI.
 */

import { NextResponse } from 'next/server';
import {
  fetchCurrentKp,
  fetchPlanetaryKp,
  fetchSolarWind,
  calculateAuroraProbability,
  kpToLevel,
  calculateBestViewingWindow,
} from '@/lib/fetchers/noaa';
import { fetchWeather } from '@/lib/fetchers/metno';

// Tromsø coordinates (default location)
const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const CACHE_VERSION = 4; // Increment to invalidate old cache

let cache: { data: any; timestamp: number; version: number } | null = null;

function responseFromCache(extraMeta?: Record<string, unknown>) {
  if (!cache) return null;

  return NextResponse.json({
    ...cache.data,
    meta: {
      cached: true,
      stale: true,
      cache_age: Math.floor((Date.now() - cache.timestamp) / 1000),
      ...extraMeta,
    },
  });
}

function fallbackWeather() {
  return {
    cloudCoverage: 100,
    temperature: 0,
    windSpeed: 0,
    conditions: 'overcast' as const,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';
  const lat = parseFloat(searchParams.get('lat') || DEFAULT_LAT.toString());
  const lon = parseFloat(searchParams.get('lon') || DEFAULT_LON.toString());

  // Fresh cache
  if (cache && cache.version === CACHE_VERSION && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return NextResponse.json({
      ...cache.data,
      meta: {
        cached: true,
        stale: false,
        cache_age: Math.floor((Date.now() - cache.timestamp) / 1000),
      },
    });
  }

  try {
    // Fetch upstream data concurrently, but tolerate partial failures.
    const [kpRes, weatherRes, solarWindRes] = await Promise.allSettled([
      fetchCurrentKp(),
      fetchWeather(lat, lon),
      fetchSolarWind(),
    ]);

    // KP is required for a meaningful forecast; try a fallback NOAA endpoint before giving up.
    let kp: number | null = null;
    if (kpRes.status === 'fulfilled') {
      kp = kpRes.value;
    } else {
      try {
        kp = await fetchPlanetaryKp();
      } catch {
        kp = null;
      }
    }

    if (kp === null) {
      const cachedResponse = responseFromCache({ reason: 'kp_unavailable' });
      if (cachedResponse) return cachedResponse;

      return NextResponse.json(
        {
          error: 'Aurora forecast temporarily unavailable',
          message: 'Failed to fetch KP index from NOAA',
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

    const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : fallbackWeather();
    const solarWind = solarWindRes.status === 'fulfilled' ? solarWindRes.value : null;

    const probability = calculateAuroraProbability(
      kp,
      weather.cloudCoverage,
      solarWind?.bz_gsm,
      solarWind?.speed,
      solarWind?.density
    );

    const score = Math.round((kp / 9) * 100); // Convert KP to 0-100 score
    const level = kpToLevel(kp);
    const viewingWindow = calculateBestViewingWindow(kp, lat);

    const classifySolarWind = (speed: number) => {
      if (speed > 600) return 'Very High';
      if (speed > 450) return 'High';
      if (speed > 350) return 'Normal';
      return 'Low';
    };

    const classifyBz = (bz: number) => {
      if (bz < -3) return 'Excellent';
      if (bz < -1.5) return 'Very Good';
      if (bz < 0) return 'Good';
      if (bz < 1.5) return 'Neutral';
      return 'Unfavorable';
    };

    const forecast = {
      score,
      kp: Math.round(kp * 10) / 10,
      probability,
      level,
      confidence: 'high' as const,

      // Extended metrics (Phase 2)
      extended_metrics: solarWind
        ? {
            solar_wind: {
              speed: Math.round(solarWind.speed),
              unit: 'km/s',
              status: classifySolarWind(solarWind.speed),
              favorable: solarWind.speed > 450,
            },
            bz_factor: {
              value: Math.round(solarWind.bz_gsm * 10) / 10,
              unit: 'nT',
              status: classifyBz(solarWind.bz_gsm),
              favorable: solarWind.bz_gsm < 0,
            },
            particle_density: {
              value: Math.round(solarWind.density * 10) / 10,
              unit: 'p/cm³',
              status:
                solarWind.density > 5 ? 'High' : solarWind.density > 2 ? 'Normal' : 'Low',
            },
            updated: solarWind.time_tag,
          }
        : null,

      headline:
        lang === 'no'
          ? probability > 70
            ? 'Utmerkede sjanser for nordlys i kveld!'
            : probability > 40
              ? 'Gode sjanser for nordlys i kveld'
              : 'Moderate sjanser for nordlys i kveld'
          : probability > 70
            ? 'Excellent chances for northern lights tonight!'
            : probability > 40
              ? 'Good chances for northern lights tonight'
              : 'Moderate chances for northern lights tonight',
      summary:
        lang === 'no'
          ? probability > 70
            ? `Meget sterk nordlysaktivitet forventet (KP ${kp.toFixed(1)}). ${weather.cloudCoverage < 30 ? 'Klar himmel perfekt for observasjon!' : `${weather.cloudCoverage}% skydekke kan redusere sikt.`}${solarWind?.bz_gsm && solarWind.bz_gsm < -3 ? ' Solvindfaktor svært gunstig!' : ''}`
            : probability > 40
              ? `God nordlysaktivitet forventet (KP ${kp.toFixed(1)}). ${weather.cloudCoverage < 50 ? 'Gode værforhold.' : `${weather.cloudCoverage}% skydekke kan påvirke sikt.`}`
              : `Moderat nordlysaktivitet (KP ${kp.toFixed(1)}). Sjekk himmelen regelmessig.`
          : probability > 70
            ? `Very strong aurora activity expected (KP ${kp.toFixed(1)}). ${weather.cloudCoverage < 30 ? 'Clear skies perfect for viewing!' : `${weather.cloudCoverage}% cloud cover may reduce visibility.`}${solarWind?.bz_gsm && solarWind.bz_gsm < -3 ? ' Solar wind conditions excellent!' : ''}`
            : probability > 40
              ? `Good aurora activity expected (KP ${kp.toFixed(1)}). ${weather.cloudCoverage < 50 ? 'Good weather conditions.' : `${weather.cloudCoverage}% cloud cover may affect visibility.`}`
              : `Moderate aurora activity (KP ${kp.toFixed(1)}). Check the sky regularly.`,
      best_time:
        lang === 'no'
          ? `${viewingWindow.start} - ${viewingWindow.end} (topp: ${viewingWindow.peakTime})`
          : `${viewingWindow.start} - ${viewingWindow.end} (peak: ${viewingWindow.peakTime})`,
      viewing_window: viewingWindow,
      tips:
        lang === 'no'
          ? [
              'Finn et sted med lite lys',
              'Kle deg varmt (temp: ' + weather.temperature.toFixed(1) + '°C)',
              'Ha tålmodighet - nordlys kommer i bølger',
            ]
          : [
              'Find a location with minimal light pollution',
              'Dress warmly (temp: ' + weather.temperature.toFixed(1) + '°C)',
              'Be patient - aurora comes in waves',
            ],
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

    cache = {
      data: forecast,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };

    return NextResponse.json({
      ...forecast,
      meta: {
        cached: false,
        stale: false,
        source: 'NOAA SWPC + Met.no',
        timestamp: new Date().toISOString(),
        partial: {
          kp: kpRes.status === 'fulfilled' ? 'primary' : 'fallback',
          weather: weatherRes.status === 'fulfilled' ? 'met.no' : 'fallback',
          solar_wind: solarWind ? 'noaa' : 'unavailable',
        },
      },
    });
  } catch (error) {
    console.error('❌ Failed to fetch real aurora forecast:', error);

    const cachedResponse = responseFromCache({ reason: 'upstream_error' });
    if (cachedResponse) return cachedResponse;

    return NextResponse.json(
      {
        error: 'Aurora forecast temporarily unavailable',
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
