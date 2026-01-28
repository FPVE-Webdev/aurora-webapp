/**
 * Usage Analytics API
 *
 * GET /api/analytics - Get usage statistics
 * Query params:
 * - organization_id: Filter by organization (optional for admin, required otherwise)
 * - api_key_id: Filter by specific API key (optional)
 * - start_date: Start date (YYYY-MM-DD)
 * - end_date: End date (YYYY-MM-DD)
 * - granularity: 'day' | 'hour' (default: 'day')
 * - admin: 'true' for admin overview (requires authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/admin-auth';

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
    const isAdmin = searchParams.get('admin') === 'true';

    // Admin mode - requires authentication
    if (isAdmin) {
      const adminSession = await getAdminSession();
      if (!adminSession?.authenticated) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Return admin overview with aggregated data
      return getAdminOverview(supabase, startDate, endDate);
    }

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

/**
 * Admin overview - aggregated statistics across all organizations
 */
async function getAdminOverview(supabase: any, startDate?: string | null, endDate?: string | null) {
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get daily usage summary for all organizations
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_usage_summary')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (dailyError) {
      throw dailyError;
    }

    // Aggregate totals
    const totals = (dailyData || []).reduce(
      (acc: {
        total_requests: number;
        widget_impressions: number;
        successful_requests: number;
        failed_requests: number;
        cached_requests: number;
        unique_visitors: number;
        avg_response_time: number;
      }, day: any) => ({
        total_requests: acc.total_requests + (day.total_requests || 0),
        widget_impressions: acc.widget_impressions + (day.widget_impressions || 0),
        successful_requests: acc.successful_requests + (day.successful_requests || 0),
        failed_requests: acc.failed_requests + (day.failed_requests || 0),
        cached_requests: acc.cached_requests + (day.cached_requests || 0),
        unique_visitors: acc.unique_visitors + (day.unique_visitors || 0),
        avg_response_time:
          acc.avg_response_time + (day.avg_response_time || 0),
      }),
      {
        total_requests: 0,
        widget_impressions: 0,
        successful_requests: 0,
        failed_requests: 0,
        cached_requests: 0,
        unique_visitors: 0,
        avg_response_time: 0,
      }
    );

    // Calculate average response time
    const dataCount = dailyData?.length || 1;
    totals.avg_response_time = Math.round(totals.avg_response_time / dataCount);

    // Get organization count
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get trial subscriptions
    const { count: trialSubscriptions } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trialing');

    // Get total revenue from paid invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('created_at', start);

    const totalRevenue = (invoices || []).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

    // Top endpoints by requests
    const { data: endpoints } = await supabase
      .from('daily_usage_summary')
      .select('endpoint, total_requests')
      .gte('date', start)
      .lte('date', end)
      .order('total_requests', { ascending: false })
      .limit(5);

    // Aggregate endpoints
    const topEndpoints = (endpoints || []).reduce((acc: { endpoint: string; count: number }[], item: any) => {
      const existing = acc.find((e) => e.endpoint === item.endpoint);
      if (existing) {
        existing.count += item.total_requests || 0;
      } else {
        acc.push({ endpoint: item.endpoint || 'unknown', count: item.total_requests || 0 });
      }
      return acc;
    }, [] as { endpoint: string; count: number }[]);

    topEndpoints.sort((a: { endpoint: string; count: number }, b: { endpoint: string; count: number }) => b.count - a.count);

    return NextResponse.json({
      period: { start, end },
      summary: {
        totalRequests: totals.total_requests,
        activeUsers: totals.unique_visitors,
        widgetImpressions: totals.widget_impressions,
        averageResponseTime: totals.avg_response_time,
        errorRate: totals.total_requests > 0
          ? ((totals.failed_requests / totals.total_requests) * 100).toFixed(2)
          : 0,
        cachedPercentage: totals.total_requests > 0
          ? ((totals.cached_requests / totals.total_requests) * 100).toFixed(2)
          : 0,
      },
      organizations: {
        active: orgCount || 0,
        trialing: trialSubscriptions || 0,
        paid: activeSubscriptions || 0,
      },
      revenue: {
        total: totalRevenue,
        currency: 'NOK',
      },
      topEndpoints: topEndpoints.slice(0, 5),
      dailyTrends: dailyData || [],
    });
  } catch (error) {
    console.error('[API] Error in admin overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin overview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
