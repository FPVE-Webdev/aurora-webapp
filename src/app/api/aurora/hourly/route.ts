/**
 * Aurora API - Hourly Forecast Endpoint
 * Hour-by-hour aurora forecast for timeline/animation
 */

import { NextResponse } from 'next/server';
import { seededRandom, timeSeed } from '@/lib/deterministicRandom';
import { generateTromsoForecast, generateSimpleForecast } from '@/lib/noaa/locationForecast';
import { weatherService } from '@/services/weatherService';
import { OBSERVATION_SPOTS } from '@/lib/constants';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import * as Sentry from '@sentry/nextjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yoooexmshwfpsrhzisgu.supabase.co';
const SUPABASE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/aurora/hourly`;
const API_KEY = process.env.TROMSO_AI_API_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour - values should be stable for entire hour

if (!API_KEY) {
  console.warn('⚠️ TROMSO_AI_API_KEY is not set! API calls will fail.');
}

// Cache per location - Map with cacheKey as key
const cacheMap = new Map<string, { data: any; timestamp: number; hours: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';
  const hours = parseInt(searchParams.get('hours') || '24', 10);
  const location = searchParams.get('location') || 'tromso';

  // Validate hours parameter
  if (hours < 1 || hours > 72) {
    return NextResponse.json(
      { error: 'Invalid hours parameter. Must be between 1 and 72.' },
      { status: 400 }
    );
  }

  // Create cache key based on current hour AND location to ensure stability per location
  const now = new Date();
  const cacheKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${hours}-${location}`;

  // Check cache with location-specific key
  const cachedEntry = cacheMap.get(cacheKey);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return NextResponse.json({
      ...cachedEntry.data,
      meta: {
        cached: true,
        cache_age: Math.floor((Date.now() - cachedEntry.timestamp) / 1000),
        cache_key: cacheKey
      }
    });
  }

  // Try Supabase Edge Function
  if (!API_KEY) {
    console.error('❌ TROMSO_AI_API_KEY not configured, falling back to mock data');
  } else {
    try {
      const headers: HeadersInit = {
        'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    };

    if (SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const response = await fetch(
      `${SUPABASE_FUNCTION_URL}?hours=${hours}&location=${location}&lang=${lang}`,
      {
        headers,
        next: { revalidate: 900 } // 15 minutes
      }
    );

    if (response.ok) {
      const data = await response.json();

      // DEBUG: Log what Supabase returns per location
      console.log(`
  ╔══════════════════════════════════════════
  ║ SUPABASE RESPONSE DEBUG
  ║ Location requested: ${location}
  ║ Data source: ${data.source || 'unknown'}
  ║ First hour cloudCoverage: ${data.hourly_forecast?.[0]?.weather?.cloudCoverage}
  ║ First hour temperature: ${data.hourly_forecast?.[0]?.weather?.temperature}
  ║ First hour symbolCode: ${data.hourly_forecast?.[0]?.weather?.symbolCode}
  ║ Response has ${data.hourly_forecast?.length || 0} hours
  ║ Generated at: ${data.generated_at}
  ╚══════════════════════════════════════════
      `);

      // Store in location-specific cache
      cacheMap.set(cacheKey, {
        data,
        timestamp: Date.now(),
        hours
      });

      return NextResponse.json({
        ...data,
        meta: {
          cached: false,
          timestamp: new Date().toISOString(),
          cache_key: cacheKey,
          debug: {
            location_requested: location,
            supabase_url: `${SUPABASE_FUNCTION_URL}?hours=${hours}&location=${location}`,
            first_hour_clouds: data.hourly_forecast?.[0]?.weather?.cloudCoverage
          }
        }
      });
    }

      console.warn('⚠️ Supabase hourly endpoint error:', response.status);
    } catch (error) {
      console.error('❌ Failed to fetch hourly from Supabase:', error);
    }
  }

  // Fallback: Try real Met.no weather data first, then NOAA-based forecast for Tromsø, then simple forecast
  let fallbackData;

  // Step 1: Try fetching real weather data from Met.no (requires global KP)
  try {
    // Fetch current global KP from NOAA
    const kpResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/noaa/kp-index`);
    const kpData = kpResponse.ok ? await kpResponse.json() : null;
    const globalKp = kpData?.current ?? 3.67; // Fallback to moderate KP

    const realWeatherData = await generateRealWeatherHourly(hours, location, globalKp);
    if (realWeatherData) {
      // Cache the real weather data
      cacheMap.set(cacheKey, {
        data: realWeatherData,
        timestamp: Date.now(),
        hours
      });

      return NextResponse.json({
        ...realWeatherData,
        meta: {
          cached: false,
          fallback: false,
          realWeather: true,
          timestamp: new Date().toISOString(),
          cache_key: cacheKey
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ Real weather fetch failed, trying NOAA-based forecast:', error);
  }

  // Step 2: If Met.no fails, try NOAA-based forecast for Tromsø
  if (location === 'tromso') {
    try {
      // Generate NOAA-based forecast for Tromsø
      const noaaForecast = await generateTromsoForecast(hours);

      console.warn(`⚠️ Using NOAA fallback for ${location} (Supabase unavailable)`);

      // Convert to hourly API format
      fallbackData = {
        status: 'success',
        location,
        hours: noaaForecast.length,
        source: 'noaa-fallback', // Mark as fallback
        hourly_forecast: noaaForecast.map(f => {
          const [hour] = f.hour.split(':');
          const forecastDate = new Date();
          forecastDate.setHours(parseInt(hour), 0, 0, 0);

          return {
            time: forecastDate.toISOString(),
            hour: parseInt(hour),
            probability: f.probability,
            // KP removed - it's a global planetary index, not location-specific
            weather: {
              cloudCoverage: f.cloudCoverage,
              temperature: f.temperature,
              windSpeed: 10, // Default, not provided by NOAA forecast
              conditions: f.cloudCoverage < 30 ? 'clear' : f.cloudCoverage < 60 ? 'partly_cloudy' : 'cloudy'
            },
            visibility: f.visibility
          };
        }),
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️ NOAA-based forecast failed, using simple forecast:', error);

      // Fallback to simple forecast
      console.warn(`⚠️ Using SIMPLE MOCK fallback for ${location} (NOAA failed)`);
      const simpleForecast = generateSimpleForecast(hours);
      fallbackData = {
        status: 'success',
        location,
        hours: simpleForecast.length,
        source: 'mock-simple-fallback', // Mark as mock
        hourly_forecast: simpleForecast.map(f => {
          const [hour] = f.hour.split(':');
          const forecastDate = new Date();
          forecastDate.setHours(parseInt(hour), 0, 0, 0);

          return {
            time: forecastDate.toISOString(),
            hour: parseInt(hour),
            probability: f.probability,
            // KP removed - it's a global planetary index, not location-specific
            weather: {
              cloudCoverage: f.cloudCoverage,
              temperature: f.temperature,
              windSpeed: 10,
              conditions: f.cloudCoverage < 30 ? 'clear' : f.cloudCoverage < 60 ? 'partly_cloudy' : 'cloudy'
            },
            visibility: f.visibility
          };
        }),
        generated_at: new Date().toISOString()
      };
    }
  } else {
    // For non-Tromsø locations, try real weather first
    console.warn(`⚠️ Non-Tromsø location ${location}: trying real weather data`);
    fallbackData = await generateRealWeatherHourly(hours, location, 3.67); // Use default KP

    if (!fallbackData) {
      console.error(`❌ Real weather failed for ${location}, using MOCK data`);
      fallbackData = generateMockHourly(hours, location);
    }
  }

  // Cache the fallback data with location-specific key for stability
  cacheMap.set(cacheKey, {
    data: fallbackData,
    timestamp: Date.now(),
    hours
  });

  return NextResponse.json({
    ...fallbackData,
    meta: {
      cached: false,
      fallback: true,
      timestamp: new Date().toISOString(),
      cache_key: cacheKey
    }
  });
}

function generateMockHourly(hours: number, location: string) {
  const hourlyData = [];
  const baseDate = new Date();

  // Create location-specific seed by hashing location name
  const locationSeed = location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Deterministic base KP: same for entire day but different per location
  const todaySeed = timeSeed(baseDate) + locationSeed;
  const baseKp = 5 + seededRandom(todaySeed) * 2; // Consistent 5-7 for today per location

  for (let i = 0; i < hours; i++) {
    const date = new Date(baseDate);
    date.setHours(date.getHours() + i);

    // Deterministic variation based on hour seed AND location
    const hourSeed = timeSeed(date) + locationSeed;
    const kpVariation = (Math.sin(i / 4) + seededRandom(hourSeed + 1) - 0.5) * 1.5;
    const kp = Math.max(0, Math.min(9, baseKp + kpVariation));

    const cloudVariation = (Math.sin(i / 6 + locationSeed * 0.01) + seededRandom(hourSeed + 2)) * 30;
    const cloudCoverage = Math.max(0, Math.min(100, 30 + cloudVariation));

    const probability = Math.floor(
      Math.max(0, Math.min(100, (kp / 9) * 100 * (1 - cloudCoverage / 150)))
    );

    hourlyData.push({
      time: date.toISOString(),
      hour: date.getHours(),
      probability,
      // KP removed - it's a global planetary index, not location-specific
      weather: {
        cloudCoverage: Math.floor(cloudCoverage),
        temperature: Math.floor(seededRandom(hourSeed + 3) * 10) - 5,
        windSpeed: Math.floor(seededRandom(hourSeed + 4) * 15) + 5,
        conditions: cloudCoverage < 30 ? 'clear' : cloudCoverage < 60 ? 'partly_cloudy' : 'cloudy'
      },
      visibility: cloudCoverage < 30 ? 'excellent' : cloudCoverage < 60 ? 'good' : 'poor'
    });
  }

  return {
    status: 'success',
    location,
    hours,
    hourly_forecast: hourlyData,
    generated_at: new Date().toISOString()
  };
}

/**
 * Generate hourly forecast with REAL weather data from Met.no
 */
async function generateRealWeatherHourly(hours: number, location: string, globalKp: number) {
  try {
    // Find spot coordinates
    const spot = OBSERVATION_SPOTS.find(s => s.id === location);
    if (!spot) {
      console.warn(`⚠️ Unknown location: ${location}, falling back to mock data`);
      return null;
    }

    // Fetch real weather data from Met.no
    const metnoForecast = await weatherService.getHourlyForecast(spot.latitude, spot.longitude, hours);

    if (!metnoForecast || metnoForecast.length === 0) {
      const isProduction = process.env.NODE_ENV === 'production';
      console.warn(`⚠️ No Met.no data for ${location}, falling back to mock data`);

      // Alert in production when falling back to mock data
      if (isProduction) {
        Sentry.captureMessage(`Met.no weather data unavailable for ${location}`, {
          level: 'warning',
          tags: {
            component: 'generateRealWeatherHourly',
            location,
            severity: 'high',
            impact: 'mock_data_fallback'
          },
          extra: {
            spotName: spot.name,
            coordinates: { lat: spot.latitude, lon: spot.longitude },
            requestedHours: hours
          }
        });
      }
      return null;
    }

    console.log(`✅ Real weather data fetched for ${location}: ${metnoForecast.length} hours from Met.no`);

    // Map Met.no data to our hourly format with real probability calculations
    const hourlyData = metnoForecast.map((metHour, i) => {
      const date = new Date(metHour.time);

      // Calculate real probability using actual weather conditions and global KP
      const probResult = calculateAuroraProbability({
        kpIndex: globalKp,
        cloudCoverage: metHour.cloudCoverage,
        temperature: metHour.temperature,
        latitude: spot.latitude,
        longitude: spot.longitude,
        date: date
      });

      return {
        time: metHour.time,
        hour: date.getHours(),
        probability: probResult.probability,
        weather: {
          cloudCoverage: Math.round(metHour.cloudCoverage),
          temperature: Math.round(metHour.temperature),
          windSpeed: 10, // Met.no doesn't provide windSpeed in timeseries instant, use default
          conditions: metHour.symbolCode || (metHour.cloudCoverage < 30 ? 'clear' : metHour.cloudCoverage < 60 ? 'partly_cloudy' : 'cloudy'),
          symbolCode: metHour.symbolCode
        },
        visibility: metHour.cloudCoverage < 30 ? 'excellent' : metHour.cloudCoverage < 60 ? 'good' : 'poor',
        canSeeAurora: probResult.canView
      };
    });

    return {
      status: 'success',
      location,
      hours: hourlyData.length,
      hourly_forecast: hourlyData,
      generated_at: new Date().toISOString(),
      source: 'met.no'
    };
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error fetching real weather for ${location}:`, errorMessage);

    // Report to Sentry in production
    if (isProduction) {
      Sentry.captureException(error, {
        tags: {
          component: 'generateRealWeatherHourly',
          location,
          severity: 'high',
          impact: 'weather_fetch_failed'
        },
        extra: {
          errorMessage,
          fallbackBehavior: 'Using mock weather data'
        }
      });
    }

    return null;
  }
}

