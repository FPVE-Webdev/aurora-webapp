/**
 * NOAA Historical Data API Endpoint
 * Provides access to stored historical space weather data
 * Phase 2: Advanced Analytics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const metric = searchParams.get('metric') || 'all';

    // Validate days parameter
    if (days < 1 || days > 90) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 90' },
        { status: 400 }
      );
    }

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query based on metric
    let query = supabase
      .from('noaa_historical_data')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    // Execute query
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = calculateStatistics(data || [], metric);

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days,
      },
      statistics: stats,
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch historical data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate statistics for the dataset
 */
function calculateStatistics(data: any[], metric: string) {
  if (data.length === 0) {
    return null;
  }

  const stats: any = {};

  // Kp statistics
  const kpValues = data
    .map((d) => d.kp_index)
    .filter((v): v is number => v !== null && v !== undefined);

  if (kpValues.length > 0) {
    stats.kp = {
      avg: average(kpValues),
      min: Math.min(...kpValues),
      max: Math.max(...kpValues),
      median: median(kpValues),
      count: kpValues.length,
    };
  }

  // Solar wind statistics
  const speedValues = data
    .map((d) => d.solar_wind_speed)
    .filter((v): v is number => v !== null && v !== undefined);

  if (speedValues.length > 0) {
    stats.solarWind = {
      avgSpeed: average(speedValues),
      minSpeed: Math.min(...speedValues),
      maxSpeed: Math.max(...speedValues),
      count: speedValues.length,
    };
  }

  // Bz statistics
  const bzValues = data
    .map((d) => d.bz_component)
    .filter((v): v is number => v !== null && v !== undefined);

  if (bzValues.length > 0) {
    stats.magneticField = {
      avgBz: average(bzValues),
      minBz: Math.min(...bzValues),
      maxBz: Math.max(...bzValues),
      negativeBzPercentage: (bzValues.filter((v) => v < 0).length / bzValues.length) * 100,
    };
  }

  // Aurora probability statistics
  const probValues = data
    .map((d) => d.aurora_probability)
    .filter((v): v is number => v !== null && v !== undefined);

  if (probValues.length > 0) {
    stats.auroraProbability = {
      avg: average(probValues),
      min: Math.min(...probValues),
      max: Math.max(...probValues),
      highProbabilityPercentage: (probValues.filter((v) => v > 70).length / probValues.length) * 100,
    };
  }

  return stats;
}

/**
 * Calculate average of number array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

/**
 * Calculate median of number array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
