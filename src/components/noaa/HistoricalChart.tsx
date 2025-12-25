'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HistoricalData {
  timestamp: string;
  kp_index?: number;
  solar_wind_speed?: number;
  bz_component?: number;
  aurora_probability?: number;
}

export default function HistoricalChart() {
  const [data, setData] = useState<HistoricalData[]>([]);
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<'kp' | 'solar_wind' | 'bz' | 'probability'>('kp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistoricalData();
  }, [days]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/noaa/historical?days=${days}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      setData(result.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching historical data:', err);
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
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Historical Trends</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={fetchHistoricalData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleDateString('no-NO', { month: 'short', day: 'numeric' }),
    value: metric === 'kp' ? d.kp_index :
           metric === 'solar_wind' ? d.solar_wind_speed :
           metric === 'bz' ? d.bz_component :
           d.aurora_probability,
  })).filter((d) => d.value !== null && d.value !== undefined);

  const metricConfig = {
    kp: { label: 'Kp Index', color: '#0066CC', domain: [0, 9] },
    solar_wind: { label: 'Solar Wind Speed (km/s)', color: '#00CC00', domain: [300, 800] },
    bz: { label: 'Bz Component (nT)', color: '#FF6600', domain: [-20, 20] },
    probability: { label: 'Aurora Probability (%)', color: '#CC0000', domain: [0, 100] },
  };

  const config = metricConfig[metric];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Historical Trends</h2>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Period
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>Last 24 hours</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Metric
          </label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="kp">Kp Index</option>
            <option value="solar_wind">Solar Wind Speed</option>
            <option value="bz">Magnetic Field (Bz)</option>
            <option value="probability">Aurora Probability</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={config.domain as [number, number]}
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              name={config.label}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No data available for the selected period
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Historical data from NOAA SWPC • {chartData.length} data points
      </div>
    </div>
  );
}
