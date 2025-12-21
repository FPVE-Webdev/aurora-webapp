/**
 * Aurora API - Now Endpoint
 * Fetches current aurora data from Supabase Edge Function
 */

import { NextResponse } from 'next/server';

const SUPABASE_FUNCTION_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/now';
const API_KEY = process.env.TROMSO_AI_API_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (more frequent for "now" data)

if (!API_KEY) {
  console.warn('⚠️ TROMSO_AI_API_KEY is not set! API calls will fail.');
}

let cache: { data: any; timestamp: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';

  // Check cache first
  if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
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

      if (SUPABASE_ANON_KEY) {
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }

    const response = await fetch(`${SUPABASE_FUNCTION_URL}?lang=${lang}`, {
      headers,
      next: { revalidate: 300 } // 5 minutes
    });

    if (response.ok) {
      const data = await response.json();
      
      cache = {
        data,
        timestamp: Date.now()
      };

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

  // Fallback to mock data
  const mockForecast = {
    score: 68,
    level: 'good',
    confidence: 'high',
    headline:
      lang === 'no'
        ? 'Nordlys synlig akkurat nå'
        : 'Northern lights visible right now',
    summary:
      lang === 'no'
        ? 'Moderate til sterk nordlysaktivitet observert. Gå ut nå for beste sjanse å se det!'
        : 'Moderate to strong aurora activity observed. Go outside now for the best chance to see it!',
    best_time:
      lang === 'no'
        ? 'Akkurat nå'
        : 'Right now',
    tips:
      lang === 'no'
        ? ['Gå bort fra bylys', 'La øynene tilpasse seg mørket', 'Se mot nord']
        : ['Move away from city lights', 'Let your eyes adjust to darkness', 'Look north'],
    updated: new Date().toISOString(),
  };

  return NextResponse.json(mockForecast, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Content-Type': 'application/json',
    },
  });
}

