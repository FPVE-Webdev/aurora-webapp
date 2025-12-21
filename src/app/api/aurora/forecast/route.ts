/**
 * Aurora API - Forecast Endpoint
 * Multi-day aurora forecast (premium feature)
 */

import { NextResponse } from 'next/server';

const SUPABASE_FUNCTION_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/forecast';
const API_KEY = process.env.TROMSO_AI_API_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

if (!API_KEY) {
  console.warn('⚠️ TROMSO_AI_API_KEY is not set! API calls will fail.');
}

let cache: { data: any; timestamp: number; days: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'no';
  const days = parseInt(searchParams.get('days') || '3', 10);

  // Validate days parameter
  if (days < 1 || days > 7) {
    return NextResponse.json(
      { error: 'Invalid days parameter. Must be between 1 and 7.' },
      { status: 400 }
    );
  }

  // Check cache
  if (cache && cache.days === days && (Date.now() - cache.timestamp < CACHE_DURATION)) {
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
    // Fall through to mock data below
  } else {
    // Try Supabase Edge Function
    try {
      const headers: HeadersInit = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      };

      if (SUPABASE_ANON_KEY) {
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }

    const response = await fetch(
      `${SUPABASE_FUNCTION_URL}?days=${days}&lang=${lang}`,
      {
        headers,
        next: { revalidate: 1800 } // 30 minutes
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      cache = {
        data,
        timestamp: Date.now(),
        days
      };

      return NextResponse.json({
        ...data,
        meta: {
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
    }

      console.warn('⚠️ Supabase forecast endpoint error:', response.status);
    } catch (error) {
      console.error('❌ Failed to fetch forecast from Supabase:', error);
    }
  }

  // Fallback: Generate mock multi-day forecast
  const mockForecast = generateMockForecast(days, lang);
  
  return NextResponse.json({
    ...mockForecast,
    meta: {
      cached: false,
      fallback: true,
      timestamp: new Date().toISOString()
    }
  });
}

function generateMockForecast(days: number, lang: string) {
  const forecasts = [];
  const baseDate = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    // Simulate varying conditions
    const score = 50 + Math.floor(Math.random() * 40); // 50-90
    const kp = 3 + Math.random() * 4; // 3-7
    const cloudCoverage = Math.floor(Math.random() * 60); // 0-60%
    
    forecasts.push({
      date: date.toISOString().split('T')[0],
      score,
      level: score > 75 ? 'excellent' : score > 60 ? 'good' : 'moderate',
      confidence: score > 70 ? 'high' : 'medium',
      kp: parseFloat(kp.toFixed(1)),
      weather: {
        cloudCoverage,
        temperature: Math.floor(Math.random() * 10) - 5,
        conditions: cloudCoverage < 30 ? 'clear' : cloudCoverage < 60 ? 'partly_cloudy' : 'cloudy'
      },
      best_viewing_hours: ['22:00', '23:00', '00:00', '01:00', '02:00']
    });
  }

  return {
    status: 'success',
    days,
    forecasts,
    location: lang === 'no' ? 'Tromsø' : 'Tromsø',
    note: lang === 'no' 
      ? 'Dette er simulerte data. Koble til Supabase for ekte prognoser.'
      : 'This is simulated data. Connect to Supabase for real forecasts.'
  };
}

