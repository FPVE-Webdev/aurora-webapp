'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Activity, Clock, Loader2 } from 'lucide-react';

interface AnalyticsData {
  totalRequests: number;
  activeUsers: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints?: {
    endpoint: string;
    count: number;
  }[];
  recentActivity?: {
    timestamp: string;
    endpoint: string;
    status: number;
    response_time: number;
  }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/analytics');

        if (res.status === 503) {
          setError('Supabase database not configured. B2B features are disabled.');
          setAnalytics({
            totalRequests: 0,
            activeUsers: 0,
            averageResponseTime: 0,
            errorRate: 0,
          });
        } else if (!res.ok) {
          throw new Error('Failed to fetch analytics');
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
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-white/60">API usage statistics and performance metrics</p>
      </div>

      {/* Warning if Supabase not configured */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-500 text-2xl">⚠️</div>
            <div>
              <h3 className="text-yellow-500 font-semibold mb-1">Configuration Required</h3>
              <p className="text-white/70 text-sm">{error}</p>
              <p className="text-white/60 text-sm mt-2">
                To enable B2B features, configure Supabase environment variables.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Requests */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">Total Requests</p>
            <p className="text-3xl font-bold text-white">
              {analytics?.totalRequests?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">Active Users</p>
            <p className="text-3xl font-bold text-white">{analytics?.activeUsers || 0}</p>
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
            <p className="text-3xl font-bold text-white">
              {analytics?.averageResponseTime ? `${analytics.averageResponseTime}ms` : '0ms'}
            </p>
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">Error Rate</p>
            <p className="text-3xl font-bold text-white">
              {analytics?.errorRate ? `${analytics.errorRate.toFixed(2)}%` : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Endpoints */}
      {analytics?.topEndpoints && analytics.topEndpoints.length > 0 && (
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
                  <span className="text-white/60">{endpoint.count.toLocaleString()} requests</span>
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

      {/* Recent Activity */}
      {analytics?.recentActivity && analytics.recentActivity.length > 0 && (
        <div className="bg-arctic-800 border border-white/10 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-arctic-900 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {analytics.recentActivity.map((activity, index) => (
                  <tr key={index} className="hover:bg-arctic-700 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-white font-mono text-sm">{activity.endpoint}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          activity.status >= 200 && activity.status < 300
                            ? 'bg-green-500/10 text-green-500'
                            : activity.status >= 400
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/70">{activity.response_time}ms</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!error && !analytics?.topEndpoints && !analytics?.recentActivity && (
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No analytics data yet</h3>
          <p className="text-white/60">
            Analytics will appear here once your API starts receiving requests
          </p>
        </div>
      )}
    </div>
  );
}
