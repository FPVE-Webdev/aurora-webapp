'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KpHistoryEntry {
  time: string;
  value: number;
}

interface KpData {
  current: number;
  history: KpHistoryEntry[];
  activityLevel: string;
  trend: string;
  lastUpdated: string;
  source: string;
}

const ACTIVITY_COLORS = {
  Quiet: '#003366',
  Unsettled: '#0066CC',
  Active: '#00CC00',
  'Minor Storm': '#FFCC00',
  'Major Storm': '#FF6600',
  'Severe Storm': '#CC0000',
};

export default function KpIndexChart() {
  const [kpData, setKpData] = useState<KpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKpData();

    // Refresh every 15 minutes
    const interval = setInterval(fetchKpData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchKpData = async () => {
    try {
      const response = await fetch('/api/noaa/kp-index');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setKpData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Kp index:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Current Kp Index</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Failed to load Kp index: {error}</p>
          <button
            onClick={fetchKpData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!kpData) return null;

  const activityColor = ACTIVITY_COLORS[kpData.activityLevel as keyof typeof ACTIVITY_COLORS] || '#666';

  // Format time for display (show only hour)
  const formattedHistory = kpData.history.map((entry) => ({
    ...entry,
    displayTime: new Date(entry.time).toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Current Kp Index</h2>

      {/* Current Value Display */}
      <div className="mb-6 text-center">
        <div className="inline-block">
          <div className="text-6xl font-bold mb-2" style={{ color: activityColor }}>
            {kpData.current.toFixed(1)}
          </div>
          <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {kpData.activityLevel}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Trend:{' '}
            <span className={`font-semibold ${
              kpData.trend === 'rising' ? 'text-orange-600' :
              kpData.trend === 'falling' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {kpData.trend.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayTime"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={[0, 9]}
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
            }}
            formatter={(value: number | undefined) => {
              if (value === undefined) return ['--', 'Kp Index'];
              return [value.toFixed(1), 'Kp Index'];
            }}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={activityColor}
            strokeWidth={2}
            dot={false}
            name="Kp Index"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Activity Scale Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ACTIVITY_COLORS.Quiet }}></div>
          <span className="text-gray-700 dark:text-gray-300">0-2: Quiet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ACTIVITY_COLORS.Unsettled }}></div>
          <span className="text-gray-700 dark:text-gray-300">2-4: Unsettled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ACTIVITY_COLORS.Active }}></div>
          <span className="text-gray-700 dark:text-gray-300">4-6: Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ACTIVITY_COLORS['Minor Storm'] }}></div>
          <span className="text-gray-700 dark:text-gray-300">6-8: Minor Storm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ACTIVITY_COLORS['Major Storm'] }}></div>
          <span className="text-gray-700 dark:text-gray-300">8-9: Major Storm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: ACTIVITY_COLORS['Severe Storm'] }}></div>
          <span className="text-gray-700 dark:text-gray-300">9: Severe Storm</span>
        </div>
      </div>

      {/* Source Attribution */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Data from {kpData.source} • Updated: {new Date(kpData.lastUpdated).toLocaleTimeString('no-NO')}
      </div>
    </div>
  );
}
