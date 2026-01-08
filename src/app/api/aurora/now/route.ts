/**
 * Aurora API - Now Endpoint
 * Fetches REAL current aurora data from NOAA SWPC and Met.no
 * NO MOCK DATA in production
 */

import { NextResponse } from 'next/server';
import { fetchCurrentKp, fetchSolarWind, kpToLevel } from '@/lib/fetchers/noaa';
import { fetchWeather } from '@/lib/fetchers/metno';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';

// Tromsø coordinates (default location)
const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (live data)
const CACHE_VERSION = 4; // Increment to invalidate old cache (daylight fix)

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

    // Calculate aurora probability with daylight check
    const probabilityResult = calculateAuroraProbability({
      kpIndex: kp,
      cloudCoverage: weather.cloudCoverage,
      temperature: weather.temperature,
      latitude: lat,
      longitude: lon,
      date: new Date(),
    });
    const probability = probabilityResult.probability;
    const canView = probabilityResult.canView;
    const score = Math.round((kp / 9) * 100); // Convert KP to 0-100 score
    const level = kpToLevel(kp);

    // Classify metrics for user-friendly display
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

    // Generate localized content
    const forecast = {
      score,
      kp: Math.round(kp * 10) / 10,
      probability,
      canView, // Daylight check result
      level,
      confidence: 'high' as const,

      // Extended metrics (Phase 2)
      extended_metrics: solarWind ? {
        solar_wind: {
          speed: Math.round(solarWind.speed),
          unit: 'km/s',
          status: classifySolarWind(solarWind.speed),
          favorable: solarWind.speed > 450
        },
        bz_factor: {
          value: Math.round(solarWind.bz_gsm * 10) / 10,
          unit: 'nT',
          status: classifyBz(solarWind.bz_gsm),
          favorable: solarWind.bz_gsm < 0
        },
        particle_density: {
          value: Math.round(solarWind.density * 10) / 10,
          unit: 'p/cm³',
          status: solarWind.density > 5 ? 'High' : solarWind.density > 2 ? 'Normal' : 'Low'
        },
        updated: solarWind.time_tag
      } : null,
      headline:
        !canView
          ? (lang === 'no' ? 'For lyst for nordlys' : 'Too bright for aurora')
          : lang === 'no'
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
        !canView
          ? (lang === 'no'
            ? `Det er for lyst til å se nordlys nå (KP ${kp.toFixed(1)}). Sjekk igjen etter mørkets frembrudd.`
            : `It's too bright to see aurora now (KP ${kp.toFixed(1)}). Check again after dark.`)
          : lang === 'no'
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
      best_time: !canView
        ? (probabilityResult.nextViewableTime
          ? new Date(probabilityResult.nextViewableTime).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })
          : (lang === 'no' ? 'Senere i kveld' : 'Later tonight'))
        : (lang === 'no' ? 'Akkurat nå' : 'Right now'),
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
