/**
 * Admin Health Check Endpoint
 *
 * Checks critical service availability:
 * - Met.no weather API
 * - NOAA space weather data
 * - Supabase connection
 */

import { NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/fetchers/metno';
import { getAdminSession } from '@/lib/admin-auth';

const TROMSO_LAT = 69.6489;
const TROMSO_LON = 18.9551;

export async function GET() {
  // Only allow admins
  const session = await getAdminSession();
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const health = {
    timestamp: new Date().toISOString(),
    services: {
      metno: { status: 'unknown' as 'healthy' | 'degraded' | 'down', latency: 0, error: null as string | null },
      noaa: { status: 'unknown' as 'healthy' | 'degraded' | 'down', latency: 0, error: null as string | null },
      supabase: { status: 'unknown' as 'healthy' | 'degraded' | 'down', latency: 0, error: null as string | null }
    },
    warnings: [] as string[]
  };

  // Check Met.no
  try {
    const start = Date.now();
    await fetchWeather(TROMSO_LAT, TROMSO_LON);
    health.services.metno.latency = Date.now() - start;
    health.services.metno.status = health.services.metno.latency < 2000 ? 'healthy' : 'degraded';
  } catch (error) {
    health.services.metno.status = 'down';
    health.services.metno.error = error instanceof Error ? error.message : 'Unknown error';
    health.warnings.push('⚠️ Met.no weather API is DOWN - mock data will be used as fallback');
  }

  // Check NOAA
  try {
    const start = Date.now();
    const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    health.services.noaa.latency = Date.now() - start;
    health.services.noaa.status = health.services.noaa.latency < 3000 ? 'healthy' : 'degraded';
  } catch (error) {
    health.services.noaa.status = 'down';
    health.services.noaa.error = error instanceof Error ? error.message : 'Unknown error';
    health.warnings.push('⚠️ NOAA space weather API is DOWN - aurora predictions may be inaccurate');
  }

  // Check Supabase
  try {
    const start = Date.now();
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!SUPABASE_URL) throw new Error('Supabase URL not configured');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      signal: AbortSignal.timeout(3000)
    });
    health.services.supabase.latency = Date.now() - start;
    health.services.supabase.status = response.ok && health.services.supabase.latency < 2000 ? 'healthy' : 'degraded';
  } catch (error) {
    health.services.supabase.status = 'down';
    health.services.supabase.error = error instanceof Error ? error.message : 'Unknown error';
    health.warnings.push('⚠️ Supabase is DOWN - using fallback data sources');
  }

  // Determine overall health
  const allHealthy = Object.values(health.services).every(s => s.status === 'healthy');
  const anyDown = Object.values(health.services).some(s => s.status === 'down');

  return NextResponse.json({
    ...health,
    overall: anyDown ? 'critical' : allHealthy ? 'healthy' : 'degraded'
  });
}
