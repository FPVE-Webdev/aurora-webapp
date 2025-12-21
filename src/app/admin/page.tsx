'use client';

import { useEffect, useState } from 'react';
import { Building2, Key, Activity, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalOrganizations: number;
  totalApiKeys: number;
  totalRequests: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch organizations
        const orgsRes = await fetch('/api/organizations');
        const orgsData = await orgsRes.json();

        // Fetch API keys
        const keysRes = await fetch('/api/api-keys');
        const keysData = await keysRes.json();

        // Fetch analytics
        const analyticsRes = await fetch('/api/analytics');
        const analyticsData = await analyticsRes.json();

        // Check if Supabase is configured
        if (orgsRes.status === 503 || keysRes.status === 503 || analyticsRes.status === 503) {
          setError('Supabase database not configured. B2B features are disabled.');
          setStats({
            totalOrganizations: 0,
            totalApiKeys: 0,
            totalRequests: 0,
            activeUsers: 0,
          });
        } else {
          setStats({
            totalOrganizations: Array.isArray(orgsData) ? orgsData.length : 0,
            totalApiKeys: Array.isArray(keysData) ? keysData.length : 0,
            totalRequests: analyticsData?.totalRequests || 0,
            activeUsers: analyticsData?.activeUsers || 0,
          });
        }
      } catch (err) {
        setError('Failed to load dashboard statistics');
        console.error('Dashboard stats error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Overview of Aurora B2B Platform</p>
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
                To enable B2B features, configure Supabase environment variables in your .env file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Organizations */}
        <Link
          href="/admin/organizations"
          className="bg-arctic-800 border border-white/10 rounded-lg p-6 hover:border-primary/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <TrendingUp className="w-5 h-5 text-white/30" />
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">Organizations</p>
            <p className="text-3xl font-bold text-white">{stats?.totalOrganizations || 0}</p>
          </div>
        </Link>

        {/* Total API Keys */}
        <Link
          href="/admin/api-keys"
          className="bg-arctic-800 border border-white/10 rounded-lg p-6 hover:border-primary/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Key className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-white/30" />
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">API Keys</p>
            <p className="text-3xl font-bold text-white">{stats?.totalApiKeys || 0}</p>
          </div>
        </Link>

        {/* Total Requests */}
        <Link
          href="/admin/analytics"
          className="bg-arctic-800 border border-white/10 rounded-lg p-6 hover:border-primary/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-white/30" />
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">Total Requests</p>
            <p className="text-3xl font-bold text-white">
              {stats?.totalRequests ? stats.totalRequests.toLocaleString() : 0}
            </p>
          </div>
        </Link>

        {/* Active Users */}
        <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-white/60 text-sm">Active Users</p>
            <p className="text-3xl font-bold text-white">{stats?.activeUsers || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/organizations"
            className="flex items-center gap-3 p-4 bg-arctic-900 rounded-lg hover:bg-arctic-700 transition-colors border border-white/5"
          >
            <Building2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-white font-medium">Manage Organizations</p>
              <p className="text-white/60 text-sm">View and edit organizations</p>
            </div>
          </Link>

          <Link
            href="/admin/api-keys"
            className="flex items-center gap-3 p-4 bg-arctic-900 rounded-lg hover:bg-arctic-700 transition-colors border border-white/5"
          >
            <Key className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-white font-medium">Manage API Keys</p>
              <p className="text-white/60 text-sm">Create and revoke keys</p>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="flex items-center gap-3 p-4 bg-arctic-900 rounded-lg hover:bg-arctic-700 transition-colors border border-white/5"
          >
            <Activity className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-white font-medium">View Analytics</p>
              <p className="text-white/60 text-sm">Track usage and performance</p>
            </div>
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-arctic-800 border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Database</span>
            <span className={`px-3 py-1 rounded-full text-sm ${error ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
              {error ? 'Not Configured' : 'Connected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">API</span>
            <span className="px-3 py-1 rounded-full text-sm bg-green-500/10 text-green-500">
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Rate Limiting</span>
            <span className="px-3 py-1 rounded-full text-sm bg-green-500/10 text-green-500">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
