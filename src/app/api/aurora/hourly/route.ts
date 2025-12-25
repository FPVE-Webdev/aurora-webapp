/**
 * Aurora API - Hourly Forecast Endpoint
 * Hour-by-hour aurora forecast for timeline/animation
 */

import { NextResponse } from 'next/server';
import { seededRandom, timeSeed } from '@/lib/deterministicRandom';

const SUPABASE_FUNCTION_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/hourly';
const API_KEY = process.env.TROMSO_AI_API_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

if (!API_KEY) {
  console.warn('⚠️ TROMSO_AI_API_KEY is not set! API calls will fail.');
}

let cache: { data: any; timestamp: number; hours: number } | null = null;

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

  // Check cache
  if (cache && cache.hours === hours && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return NextResponse.json({
      ...cache.data,
      meta: {
        cached: true,
        cache_age: Math.floor((Date.now() - cache.timestamp) / 1000)
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
      
      cache = {
        data,
        timestamp: Date.now(),
        hours
      };

      return NextResponse.json({
        ...data,
        meta: {
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
    }

      console.warn('⚠️ Supabase hourly endpoint error:', response.status);
    } catch (error) {
      console.error('❌ Failed to fetch hourly from Supabase:', error);
    }
  }

  // Fallback: Generate mock hourly data
  const mockData = generateMockHourly(hours, location);
  
  return NextResponse.json({
    ...mockData,
    meta: {
      cached: false,
      fallback: true,
      timestamp: new Date().toISOString()
    }
  });
}

function generateMockHourly(hours: number, location: string) {
  const hourlyData = [];
  const baseDate = new Date();

  // Deterministic base KP: same for entire day
  const todaySeed = timeSeed(baseDate);
  const baseKp = 5 + seededRandom(todaySeed) * 2; // Consistent 5-7 for today

  for (let i = 0; i < hours; i++) {
    const date = new Date(baseDate);
    date.setHours(date.getHours() + i);

    // Deterministic variation based on hour seed
    const hourSeed = timeSeed(date);
    const kpVariation = (Math.sin(i / 4) + seededRandom(hourSeed + 1) - 0.5) * 1.5;
    const kp = Math.max(0, Math.min(9, baseKp + kpVariation));

    const cloudVariation = (Math.sin(i / 6) + seededRandom(hourSeed + 2)) * 30;
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

