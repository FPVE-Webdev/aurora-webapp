/**
 * Health Monitor Component for Admin Dashboard
 *
 * Displays real-time health status of critical services
 * Warns when mock data is being used in production
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency: number;
  error: string | null;
}

interface HealthData {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    metno: ServiceHealth;
    noaa: ServiceHealth;
    supabase: ServiceHealth;
  };
  warnings: string[];
}

export function HealthMonitor() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
        setLastCheck(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin text-slate-400" />
          <span className="text-sm text-slate-400">Checking service health...</span>
        </div>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-700';
      case 'degraded':
        return 'border-yellow-700';
      case 'critical':
        return 'border-red-700';
      default:
        return 'border-slate-700';
    }
  };

  return (
    <div className={`rounded-lg border ${getBorderColor(health.overall)} bg-slate-800/50 p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Service Health</h3>
        {lastCheck && (
          <span className="text-xs text-slate-400">
            Last check: {lastCheck.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Warnings - Critical Alert */}
      {health.warnings.length > 0 && (
        <div className="rounded-md bg-red-900/20 border border-red-700 p-3 space-y-1">
          {health.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Services Status */}
      <div className="space-y-2">
        {Object.entries(health.services).map(([name, service]) => (
          <div key={name} className="flex items-center justify-between p-2 rounded bg-slate-900/50">
            <div className="flex items-center gap-2">
              {getStatusIcon(service.status)}
              <span className="text-sm text-white capitalize">{name}</span>
            </div>
            <div className="flex items-center gap-3">
              {service.latency > 0 && (
                <span className="text-xs text-slate-400">{service.latency}ms</span>
              )}
              <span className={`text-xs font-medium ${getStatusColor(service.status)} min-w-[60px] text-right`}>
                {service.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Status */}
      <div className="pt-2 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Overall Status</span>
          <span className={`text-sm font-bold ${getStatusColor(health.overall)}`}>
            {health.overall.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
