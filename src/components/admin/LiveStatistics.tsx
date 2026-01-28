/**
 * Live Statistics Widget
 *
 * Displays real-time KPIs for the admin dashboard
 * Shows: active users, queries per minute, premium percentage
 */

import { Users, Zap, TrendingUp, Loader2 } from 'lucide-react';

interface LiveStatisticsProps {
  activeUsers: number;
  queriesPerMinute: string;
  premiumPercentage: string;
  isLoading?: boolean;
  isConnected?: boolean;
}

export function LiveStatistics({
  activeUsers,
  queriesPerMinute,
  premiumPercentage,
  isLoading = false,
  isConnected = false,
}: LiveStatisticsProps) {
  // Determine connection status styling
  const connectionColor = isConnected
    ? 'bg-green-500/20 border-green-500/30 text-green-400'
    : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';

  const connectionText = isConnected ? 'Live' : 'Polling';

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Live Metrics</h3>
        <div className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${connectionColor}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
          {connectionText}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Users */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-sm">Active Users</p>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              ) : (
                activeUsers
              )}
            </p>
            <p className="text-white/50 text-xs">Last 5 minutes</p>
          </div>
        </div>

        {/* Queries Per Minute */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-sm">Queries/Min</p>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              ) : (
                queriesPerMinute
              )}
            </p>
            <p className="text-white/50 text-xs">Estimated rate</p>
          </div>
        </div>

        {/* Premium Percentage */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-sm">Premium Usage</p>
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-white">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
              ) : (
                `${premiumPercentage}%`
              )}
            </p>
            <p className="text-white/50 text-xs">Of all queries</p>
          </div>
        </div>
      </div>
    </div>
  );
}
