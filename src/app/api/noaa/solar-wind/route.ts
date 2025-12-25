/**
 * NOAA Solar Wind API Endpoint
 * Fetches real-time solar wind speed and magnetic field (Bz) from NOAA SWPC
 * Implements 5-minute caching (solar wind updates frequently)
 */

import { NextResponse } from 'next/server';
import axios from 'axios';

const NOAA_SPEED_URL = 'https://services.swpc.noaa.gov/products/solar-wind/speed.json';
const NOAA_MAG_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json';
const CACHE_TTL = 300000; // 5 minutes in milliseconds

// In-memory cache
let cache: {
  data: SolarWindResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

interface SolarWindHistoryEntry {
  time: string;
  speed: number;
}

interface SolarWindResponse {
  speed: number;
  bz: number;
  history: SolarWindHistoryEntry[];
  lastUpdated: string;
  source: string;
  status: string;
}

/**
 * Determine aurora conditions based on solar wind parameters
 */
function getAuroraStatus(speed: number, bz: number): string {
  if (speed > 600 && bz < -5) {
    return 'EXTREME - Perfect aurora conditions';
  } else if (speed > 500 && bz < -3) {
    return 'STRONG - Good aurora conditions';
  } else if (speed > 400 && bz < 0) {
    return 'MODERATE - Possible aurora';
  } else {
    return 'QUIET - Low aurora activity expected';
  }
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

    // Fetch both speed and magnetic field data in parallel
    const [speedResponse, magResponse] = await Promise.all([
      axios.get<[string, number][]>(NOAA_SPEED_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'aurora.tromso.ai/1.0' },
      }),
      axios.get<[string, number][]>(NOAA_MAG_URL, {
        timeout: 10000,
        headers: { 'User-Agent': 'aurora.tromso.ai/1.0' },
      }),
    ]);

    // Validate responses
    if (
      !speedResponse.data ||
      !Array.isArray(speedResponse.data) ||
      speedResponse.data.length === 0
    ) {
      throw new Error('Invalid speed data from NOAA');
    }

    if (
      !magResponse.data ||
      !Array.isArray(magResponse.data) ||
      magResponse.data.length === 0
    ) {
      throw new Error('Invalid magnetic field data from NOAA');
    }

    // Extract latest values
    // NOAA format: [["2025-12-25 13:00", 450.2], ...]
    const speedData = speedResponse.data.slice(1); // Skip header row
    const magData = magResponse.data.slice(1); // Skip header row

    const latestSpeed = speedData[speedData.length - 1][1];
    const latestBz = magData[magData.length - 1][1];

    // Build 24-hour history (NOAA speed data is 10-min intervals, keep last 144 points)
    const history: SolarWindHistoryEntry[] = speedData
      .slice(-144)
      .map((entry) => ({
        time: entry[0],
        speed: entry[1],
      }));

    const status = getAuroraStatus(latestSpeed, latestBz);

    const result: SolarWindResponse = {
      speed: latestSpeed,
      bz: latestBz,
      history,
      lastUpdated: new Date().toISOString(),
      source: 'NOAA ACE Satellite',
      status,
    };

    // Update cache
    cache.data = result;
    cache.timestamp = now;

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching solar wind data from NOAA:', error);

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
        error: 'Failed to fetch solar wind data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
