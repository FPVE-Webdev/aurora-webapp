/**
 * Usage Analytics API
 *
 * GET /api/analytics - Get usage statistics
 * Query params:
 * - organization_id: Filter by organization (required)
 * - api_key_id: Filter by specific API key (optional)
 * - start_date: Start date (YYYY-MM-DD)
 * - end_date: End date (YYYY-MM-DD)
 * - granularity: 'day' | 'hour' (default: 'day')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const apiKeyId = searchParams.get('api_key_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const granularity = searchParams.get('granularity') || 'day';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get daily summary from materialized view
    if (granularity === 'day') {
      let query = supabase
        .from('daily_usage_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (apiKeyId) {
        query = query.eq('api_key_id', apiKeyId);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch analytics', details: error.message },
          { status: 400 }
        );
      }

      // Calculate totals
      const totals = data.reduce(
        (acc, day) => {
          acc.total_requests += day.total_requests || 0;
          acc.widget_impressions += day.widget_impressions || 0;
          acc.successful_requests += day.successful_requests || 0;
          acc.failed_requests += day.failed_requests || 0;
          acc.cached_requests += day.cached_requests || 0;
          acc.unique_visitors += day.unique_visitors || 0;
          return acc;
        },
        {
          total_requests: 0,
          widget_impressions: 0,
          successful_requests: 0,
          failed_requests: 0,
          cached_requests: 0,
          unique_visitors: 0,
        }
      );

      return NextResponse.json({
        period: { start, end },
        granularity: 'day',
        data,
        totals,
        avg_response_time:
          data.reduce((sum, d) => sum + (d.avg_response_time || 0), 0) / (data.length || 1),
      });
    }

    // Hourly granularity - query raw usage_analytics
    const { data, error } = await supabase
      .from('usage_analytics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('timestamp', `${start}T00:00:00Z`)
      .lte('timestamp', `${end}T23:59:59Z`)
      .order('timestamp', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch analytics', details: error.message },
        { status: 400 }
      );
    }

    // Group by hour
    const hourlyData = data.reduce((acc, record) => {
      const hour = new Date(record.timestamp).toISOString().substring(0, 13) + ':00:00Z';

      if (!acc[hour]) {
        acc[hour] = {
          hour,
          total_requests: 0,
          widget_impressions: 0,
          successful_requests: 0,
          failed_requests: 0,
          response_times: [],
        };
      }

      acc[hour].total_requests++;
      if (record.widget_impression) acc[hour].widget_impressions++;
      if (record.status_code === 200) acc[hour].successful_requests++;
      if (record.status_code >= 400) acc[hour].failed_requests++;
      if (record.response_time_ms) acc[hour].response_times.push(record.response_time_ms);

      return acc;
    }, {} as Record<string, any>);

    const formattedData = Object.values(hourlyData).map((hour: any) => ({
      hour: hour.hour,
      total_requests: hour.total_requests,
      widget_impressions: hour.widget_impressions,
      successful_requests: hour.successful_requests,
      failed_requests: hour.failed_requests,
      avg_response_time:
        hour.response_times.reduce((sum: number, t: number) => sum + t, 0) /
        (hour.response_times.length || 1),
    }));

    return NextResponse.json({
      period: { start, end },
      granularity: 'hour',
      data: formattedData,
    });
  } catch (error) {
    console.error('[API] Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
