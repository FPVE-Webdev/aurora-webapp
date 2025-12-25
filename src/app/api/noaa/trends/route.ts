/**
 * NOAA Trend Analysis API Endpoint
 * Analyzes historical trends in space weather data
 * Phase 2: Advanced Analytics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

export async function GET(request: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    // Validate hours parameter
    if (hours < 1 || hours > 168) {
      // Max 7 days
      return NextResponse.json(
        { error: 'Hours parameter must be between 1 and 168 (7 days)' },
        { status: 400 }
      );
    }

    // Calculate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    // Fetch data for trend analysis
    const { data, error } = await supabase
      .from('noaa_historical_data')
      .select('timestamp, kp_index, solar_wind_speed, bz_component, aurora_probability')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        trends: null,
        message: 'No data available for the specified period',
      });
    }

    // Calculate trends
    const trends = calculateTrends(data, hours);

    return NextResponse.json({
      success: true,
      trends,
      period: {
        start: startTime.toISOString(),
        end: new Date().toISOString(),
        hours,
      },
      dataPoints: data.length,
    });
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

interface TrendData {
  timestamp: string;
  kp_index?: number;
  solar_wind_speed?: number;
  bz_component?: number;
  aurora_probability?: number;
}

interface Trends {
  kp: TrendAnalysis | null;
  solarWind: TrendAnalysis | null;
  magneticField: TrendAnalysis | null;
  auroraProbability: TrendAnalysis | null;
}

interface TrendAnalysis {
  current: number;
  average: number;
  trend: 'rising' | 'falling' | 'stable';
  changeRate: number; // Per hour
  percentChange: number;
  forecast: {
    nextHour: number;
    next3Hours: number;
    next6Hours: number;
  };
}

function calculateTrends(data: TrendData[], hours: number): Trends {
  return {
    kp: analyzeTrend(
      data.map((d) => ({ time: d.timestamp, value: d.kp_index })),
      hours
    ),
    solarWind: analyzeTrend(
      data.map((d) => ({ time: d.timestamp, value: d.solar_wind_speed })),
      hours
    ),
    magneticField: analyzeTrend(
      data.map((d) => ({ time: d.timestamp, value: d.bz_component })),
      hours
    ),
    auroraProbability: analyzeTrend(
      data.map((d) => ({ time: d.timestamp, value: d.aurora_probability })),
      hours
    ),
  };
}

function analyzeTrend(
  data: { time: string; value?: number }[],
  hours: number
): TrendAnalysis | null {
  // Filter out null/undefined values
  const validData = data.filter((d) => d.value !== null && d.value !== undefined);

  if (validData.length < 2) {
    return null;
  }

  const values = validData.map((d) => d.value!);
  const current = values[values.length - 1];
  const first = values[0];
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate change rate
  const totalChange = current - first;
  const changeRate = totalChange / hours;
  const percentChange = ((current - first) / first) * 100;

  // Determine trend direction
  const recentValues = values.slice(-Math.min(3, values.length));
  const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const oldValues = values.slice(0, Math.min(3, values.length));
  const oldAvg = oldValues.reduce((a, b) => a + b, 0) / oldValues.length;

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (recentAvg > oldAvg * 1.05) trend = 'rising';
  else if (recentAvg < oldAvg * 0.95) trend = 'falling';

  // Simple linear forecast
  const forecast = {
    nextHour: Math.max(0, current + changeRate * 1),
    next3Hours: Math.max(0, current + changeRate * 3),
    next6Hours: Math.max(0, current + changeRate * 6),
  };

  return {
    current: Math.round(current * 100) / 100,
    average: Math.round(average * 100) / 100,
    trend,
    changeRate: Math.round(changeRate * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
    forecast: {
      nextHour: Math.round(forecast.nextHour * 100) / 100,
      next3Hours: Math.round(forecast.next3Hours * 100) / 100,
      next6Hours: Math.round(forecast.next6Hours * 100) / 100,
    },
  };
}
