/**
 * Aurora API - Aurora Oval Endpoint
 * Live NOAA aurora oval data for map visualization
 */

import { NextResponse } from 'next/server';

const SUPABASE_FUNCTION_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/oval';
const API_KEY = process.env.TROMSO_AI_API_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (live data)

if (!API_KEY) {
  console.warn('⚠️ TROMSO_AI_API_KEY is not set! API calls will fail.');
}

let cache: { data: any; timestamp: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolution = searchParams.get('resolution') || 'medium';

  // Check cache
  if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return NextResponse.json({
      ...cache.data,
      meta: {
        cached: true,
        cache_age: Math.floor((Date.now() - cache.timestamp) / 1000)
      }
    });
  }

  // Try Supabase Edge Function (which fetches from NOAA Ovation)
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
      `${SUPABASE_FUNCTION_URL}?resolution=${resolution}`,
      {
        headers,
        next: { revalidate: 300 } // 5 minutes
      }
    );

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

      console.warn('⚠️ Supabase oval endpoint error:', response.status);
    } catch (error) {
      console.error('❌ Failed to fetch aurora oval from Supabase:', error);
    }
  }

  // Fallback: Generate mock aurora oval data
  const mockOval = generateMockAuroraOval();
  
  return NextResponse.json({
    ...mockOval,
    meta: {
      cached: false,
      fallback: true,
      timestamp: new Date().toISOString()
    }
  });
}

function generateMockAuroraOval() {
  // Generate a simplified aurora oval centered around magnetic north pole
  // In reality, this would be GeoJSON from NOAA Ovation model
  
  const centerLat = 70; // Approximate aurora zone latitude
  const currentKp = 5 + Math.random() * 2; // Simulate current KP
  
  // Generate oval points (simplified circular approximation)
  const ovalPoints = [];
  const radius = 10 + (9 - currentKp) * 2; // Smaller oval at high KP
  
  for (let angle = 0; angle < 360; angle += 15) {
    const rad = (angle * Math.PI) / 180;
    const lat = centerLat + radius * Math.cos(rad);
    const lon = angle - 180; // Wrap around globe
    
    ovalPoints.push([lon, lat]);
  }
  
  // Close the oval
  ovalPoints.push(ovalPoints[0]);

  return {
    status: 'success',
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Aurora Oval',
          kp: parseFloat(currentKp.toFixed(1)),
          intensity: currentKp > 6 ? 'high' : currentKp > 4 ? 'moderate' : 'low',
          timestamp: new Date().toISOString()
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ovalPoints]
        }
      }
    ],
    current_kp: parseFloat(currentKp.toFixed(1)),
    forecast_time: new Date().toISOString(),
    note: 'Simulated aurora oval. Connect to Supabase for real NOAA Ovation data.'
  };
}

