'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Activity, Clock, Loader2, Users, DollarSign, Zap } from 'lucide-react';

interface AdminAnalyticsData {
  period: { start: string; end: string };
  summary: {
    totalRequests: number;
    activeUsers: number;
    widgetImpressions: number;
    averageResponseTime: number;
    errorRate: string | number;
    cachedPercentage: string | number;
  };
  organizations: {
    active: number;
    trialing: number;
    paid: number;
  };
  revenue: {
    total: number;
    currency: string;
  };
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  dailyTrends: Array<any>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/analytics?admin=true');

        if (res.status === 401) {
          setError('Unauthorized. Please ensure you are logged in.');
        } else if (res.status === 503) {
          setError('Supabase database not configured.');
        } else if (!res.ok) {
          throw new Error(`Failed to fetch analytics: ${res.status}`);
        } else {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        console.error('Analytics fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Platform Analytics</h1>
        <p className="text-white/60">
          Last 30 days • {analytics?.period.start} to {analytics?.period.end}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div>
              <h3 className="text-yellow-500 font-semibold mb-1">Data Not Available</h3>
              <p className="text-white/70 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {analytics && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Requests */}
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Zap className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white/60 text-sm">Total Requests</p>
                <p className="text-3xl font-bold text-white">
                  {analytics.summary.totalRequests.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Active Users */}
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white/60 text-sm">Active Users</p>
                <p className="text-3xl font-bold text-white">{analytics.summary.activeUsers.toLocaleString()}</p>
              </div>
            </div>

            {/* Average Response Time */}
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white/60 text-sm">Avg Response Time</p>
                <p className="text-3xl font-bold text-white">{analytics.summary.averageResponseTime}ms</p>
              </div>
            </div>

            {/* Error Rate */}
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <Activity className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white/60 text-sm">Error Rate</p>
                <p className="text-3xl font-bold text-white">{analytics.summary.errorRate}%</p>
              </div>
            </div>
          </div>

          {/* Organizations & Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organizations */}
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Customers</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Active Organizations</span>
                  <span className="text-2xl font-bold text-primary">{analytics.organizations.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Trial Period</span>
                  <span className="text-2xl font-bold text-yellow-400">{analytics.organizations.trialing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Paid Subscriptions</span>
                  <span className="text-2xl font-bold text-green-400">{analytics.organizations.paid}</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Total Revenue (30 days)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-400">
                      {Math.round(analytics.revenue.total).toLocaleString()}
                    </span>
                    <span className="text-white/60 text-sm">{analytics.revenue.currency}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Widget Impressions</span>
                  <span className="text-2xl font-bold text-primary">
                    {analytics.summary.widgetImpressions.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Cache Hit Rate</span>
                  <span className="text-2xl font-bold text-blue-400">{analytics.summary.cachedPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Endpoints */}
          {analytics.topEndpoints && analytics.topEndpoints.length > 0 && (
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Top Endpoints</h2>
              <div className="space-y-3">
                {analytics.topEndpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 font-mono text-sm">#{index + 1}</span>
                      <code className="text-white font-mono text-sm">{endpoint.endpoint}</code>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white/60 text-sm">{endpoint.count.toLocaleString()} requests</span>
                      <div className="w-32 bg-arctic-900 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(endpoint.count / (analytics.topEndpoints?.[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Trends Chart (Simple) */}
          {analytics.dailyTrends && analytics.dailyTrends.length > 0 && (
            <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Daily Requests Trend</h2>
              <div className="space-y-2">
                {analytics.dailyTrends.slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-white/60 text-sm w-20">{day.date}</span>
                    <div className="flex-1 bg-arctic-900 rounded-full h-8">
                      <div
                        className="bg-primary h-8 rounded-full flex items-center justify-center transition-all"
                        style={{
                          width: `${(day.total_requests / (analytics.dailyTrends[0]?.total_requests || 1)) * 100}%`,
                        }}
                      >
                        {day.total_requests > 1000 && (
                          <span className="text-white text-xs font-medium">
                            {(day.total_requests / 1000).toFixed(1)}k
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-white/70 text-sm w-20 text-right">
                      {day.total_requests.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!error && !analytics && (
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No analytics data yet</h3>
          <p className="text-white/60">Analytics will appear once data is available</p>
        </div>
      )}
    </div>
  );
}
