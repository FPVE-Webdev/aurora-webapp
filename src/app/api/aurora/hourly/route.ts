/**
 * Aurora API - Hourly Forecast Endpoint
 * Hour-by-hour aurora forecast for timeline/animation
 */

import { NextResponse } from 'next/server';
import { seededRandom, timeSeed } from '@/lib/deterministicRandom';
import { generateTromsoForecast, generateSimpleForecast } from '@/lib/noaa/locationForecast';

const SUPABASE_FUNCTION_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/hourly';
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
  ║ First hour cloudCoverage: ${data.hourly_forecast?.[0]?.weather?.cloudCoverage}
  ║ First hour temperature: ${data.hourly_forecast?.[0]?.weather?.temperature}
  ║ Response has ${data.hourly_forecast?.length || 0} hours
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

  // Fallback: Try NOAA-based forecast for Tromsø, then simple forecast
  let fallbackData;

  if (location === 'tromso') {
    try {
      // Generate NOAA-based forecast for Tromsø
      const noaaForecast = await generateTromsoForecast(hours);

      // Convert to hourly API format
      fallbackData = {
        status: 'success',
        location,
        hours: noaaForecast.length,
        hourly_forecast: noaaForecast.map(f => {
          const [hour] = f.hour.split(':');
          const forecastDate = new Date();
          forecastDate.setHours(parseInt(hour), 0, 0, 0);

          return {
            time: forecastDate.toISOString(),
            hour: parseInt(hour),
            probability: f.probability,
            kp: f.kp,
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
      const simpleForecast = generateSimpleForecast(hours);
      fallbackData = {
        status: 'success',
        location,
        hours: simpleForecast.length,
        hourly_forecast: simpleForecast.map(f => {
          const [hour] = f.hour.split(':');
          const forecastDate = new Date();
          forecastDate.setHours(parseInt(hour), 0, 0, 0);

          return {
            time: forecastDate.toISOString(),
            hour: parseInt(hour),
            probability: f.probability,
            kp: f.kp,
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
    // For non-Tromsø locations, use mock data
    fallbackData = generateMockHourly(hours, location);
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
      kp: parseFloat(kp.toFixed(1)),
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

