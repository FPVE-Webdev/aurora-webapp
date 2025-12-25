/**
 * Aurora API - Tonight Endpoint
 * Fetches data from Supabase Edge Function or returns cached/mock data
 */

import { NextResponse } from 'next/server';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';

const SUPABASE_FUNCTION_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/tonight';
const API_KEY = process.env.TROMSO_AI_API_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

if (!API_KEY) {
  console.warn('⚠️ TROMSO_AI_API_KEY is not set! API calls will fail.');
}

let cache: { data: any; timestamp: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';

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

  // Check if API key is available
  if (!API_KEY) {
    console.error('❌ TROMSO_AI_API_KEY not configured, falling back to mock data');
  } else {
    // Try to fetch from Supabase Edge Function
    try {
      const headers: HeadersInit = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      };

      // Add Supabase anon key if available
      if (SUPABASE_ANON_KEY) {
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }

      const response = await fetch(`${SUPABASE_FUNCTION_URL}?lang=${lang}`, {
        headers,
        next: { revalidate: 900 } // 15 minutes
      });

      if (response.ok) {
        const data = await response.json();

        // Cache the response
        cache = {
          data,
          timestamp: Date.now()
        };

        console.log('✅ Fetched fresh aurora forecast from Supabase');
        return NextResponse.json({
          ...data,
          meta: {
            cached: false,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.warn('⚠️ Supabase Edge Function returned error:', response.status);
    } catch (error) {
      console.error('❌ Failed to fetch from Supabase:', error);
    }
  }

  // Fallback to mock data if Supabase fails
  console.log('⚠️ Using fallback mock data');
  const score = 72;
  const mockForecast = {
    score,
    kp: scoreToKpIndex(score), // Consistent KP mapping: 72 → 6
    level: 'good' as const,
    confidence: 'high' as const,
    headline:
      lang === 'no'
        ? 'Gode sjanser for nordlys i kveld'
        : 'Good chances for northern lights tonight',
    summary:
      lang === 'no'
        ? 'Sterk solvind og lav skydekke gir gode forhold for nordlys. Best tid å se er mellom 21:00 og 02:00.'
        : 'Strong solar wind and low cloud cover provide good conditions for aurora. Best viewing time is between 21:00 and 02:00.',
    best_time:
      lang === 'no'
        ? 'Mellom 21:00 og 02:00'
        : 'Between 21:00 and 02:00',
    tips:
      lang === 'no'
        ? ['Finn et sted med lite lys', 'Kle deg varmt', 'Ha tålmodighet']
        : ['Find a location with minimal light pollution', 'Dress warmly', 'Be patient'],
    updated: new Date().toISOString(),
  };

  return NextResponse.json(mockForecast, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Content-Type': 'application/json',
    },
  });
}
