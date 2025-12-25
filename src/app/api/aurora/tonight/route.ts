/**
 * Aurora API - Tonight Endpoint
 * Fetches REAL aurora forecast for tonight from NOAA SWPC and Met.no
 * NO MOCK DATA in production
 */

import { NextResponse } from 'next/server';
import { fetchCurrentKp, fetchSolarWind, calculateAuroraProbability, kpToLevel, calculateBestViewingWindow } from '@/lib/fetchers/noaa';
import { fetchWeather } from '@/lib/fetchers/metno';

// Tromsø coordinates (default location)
const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

let cache: { data: any; timestamp: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';
  const lat = parseFloat(searchParams.get('lat') || DEFAULT_LAT.toString());
  const lon = parseFloat(searchParams.get('lon') || DEFAULT_LON.toString());

  // Check cache first
  if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    console.log('✅ Returning cached aurora forecast');
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

    // Calculate best viewing window
    const viewingWindow = calculateBestViewingWindow(kp, lat);

    // Generate localized content for tonight
    const forecast = {
      score,
      kp: Math.round(kp * 10) / 10,
      probability,
      level,
      confidence: 'high' as const,
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
        lang === 'no' ? `${viewingWindow.start} - ${viewingWindow.end} (topp: ${viewingWindow.peakTime})` : `${viewingWindow.start} - ${viewingWindow.end} (peak: ${viewingWindow.peakTime})`,
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

    // Cache the response
    cache = {
      data: forecast,
      timestamp: Date.now()
    };

    console.log(`✅ Real aurora forecast: KP ${kp.toFixed(1)}, ${weather.cloudCoverage}% clouds, ${probability}% tonight`);

    return NextResponse.json({
      ...forecast,
      meta: {
        cached: false,
        source: 'NOAA SWPC + Met.no',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to fetch real aurora forecast:', error);

    // CRITICAL: In production, return error instead of mock data
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
