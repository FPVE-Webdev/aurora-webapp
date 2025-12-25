/**
 * NOAA Kp-Index API Endpoint
 * Fetches real-time planetary Kp-index from NOAA SWPC
 * Implements 1-hour caching to reduce load on NOAA servers
 */

import { NextResponse } from 'next/server';
import axios from 'axios';

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// In-memory cache
let cache: {
  data: KpResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

interface NoaaKpEntry {
  time_tag: string;
  kp: string;
  observed?: string;
  noaa_scale?: string;
}

interface KpHistoryEntry {
  time: string;
  value: number;
}

interface KpResponse {
  current: number;
  history: KpHistoryEntry[];
  lastUpdated: string;
  source: string;
  activityLevel: string;
  trend: string;
}

/**
 * Determine activity level based on Kp value
 */
function getActivityLevel(kp: number): string {
  if (kp < 2) return 'Quiet';
  if (kp < 4) return 'Unsettled';
  if (kp < 6) return 'Active';
  if (kp < 8) return 'Minor Storm';
  if (kp < 9) return 'Major Storm';
  return 'Severe Storm';
}

/**
 * Calculate trend from recent Kp values
 */
function calculateTrend(history: KpHistoryEntry[]): string {
  if (history.length < 3) return 'stable';

  const recent = history.slice(-3);
  const avg1 = recent[0].value;
  const avg2 = recent[2].value;
  const diff = avg2 - avg1;

  if (diff > 0.5) return 'rising';
  if (diff < -0.5) return 'falling';
  return 'stable';
}

export async function GET(request: Request) {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        ...cache.data,
        cached: true,
        cacheAge: Math.floor((now - cache.timestamp) / 1000),
      });
    }

    // Fetch from NOAA
    const response = await axios.get<NoaaKpEntry[]>(NOAA_KP_URL, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'aurora.tromso.ai/1.0',
      },
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response from NOAA API');
    }

    // Transform NOAA format to our format
    const history: KpHistoryEntry[] = response.data
      .filter((entry) => entry.kp !== null && entry.kp !== undefined)
      .map((entry) => ({
        time: entry.time_tag,
        value: parseFloat(entry.kp),
      }))
      .slice(-24); // Keep last 24 hours

    if (history.length === 0) {
      throw new Error('No valid Kp data received from NOAA');
    }

    const current = history[history.length - 1].value;
    const activityLevel = getActivityLevel(current);
    const trend = calculateTrend(history);

    const result: KpResponse = {
      current,
      history,
      lastUpdated: new Date().toISOString(),
      source: 'NOAA SWPC',
      activityLevel,
      trend,
    };

    // Update cache
    cache.data = result;
    cache.timestamp = now;

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching Kp index from NOAA:', error);

    // Return cached data if available, even if stale
    if (cache.data) {
      return NextResponse.json({
        ...cache.data,
        cached: true,
        stale: true,
        error: 'Using cached data due to fetch error',
        cacheAge: Math.floor((Date.now() - cache.timestamp) / 1000),
      });
    }

    // No cache available, return error
    return NextResponse.json(
      {
        error: 'Failed to fetch Kp index',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
