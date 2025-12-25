'use client';

import React, { useState, useEffect } from 'react';

interface SolarWindData {
  speed: number;
  bz: number;
  status: string;
  lastUpdated: string;
  source: string;
}

export default function SolarWindGauge() {
  const [windData, setWindData] = useState<SolarWindData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSolarWind();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSolarWind, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSolarWind = async () => {
    try {
      const response = await fetch('/api/noaa/solar-wind');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setWindData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching solar wind data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Solar Wind Conditions</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Failed to load: {error}</p>
          <button
            onClick={fetchSolarWind}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!windData) return null;

  // Calculate gauge percentage (0-1000 km/s scale)
  const speedPercent = Math.min((windData.speed / 1000) * 100, 100);

  // Determine gauge color
  const getGaugeColor = () => {
    if (windData.speed > 700) return 'bg-red-500';
    if (windData.speed > 500) return 'bg-orange-500';
    if (windData.speed > 400) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Determine status emoji and color
  const getStatusStyle = () => {
    if (windData.status.includes('EXTREME')) return { emoji: '🔴', color: 'text-red-600' };
    if (windData.status.includes('STRONG')) return { emoji: '🟠', color: 'text-orange-600' };
    if (windData.status.includes('MODERATE')) return { emoji: '🟡', color: 'text-yellow-600' };
    return { emoji: '🟢', color: 'text-green-600' };
  };

  const statusStyle = getStatusStyle();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Solar Wind Conditions</h2>

      {/* Speed Display */}
      <div className="mb-6 text-center">
        <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
          {windData.speed.toFixed(0)} <span className="text-2xl text-gray-500">km/s</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Solar Wind Speed</div>
      </div>

      {/* Gauge Bar */}
      <div className="mb-6">
        <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getGaugeColor()} transition-all duration-500 ease-out`}
            style={{ width: `${speedPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>0</span>
          <span>250</span>
          <span>500</span>
          <span>750</span>
          <span>1000</span>
        </div>
      </div>

      {/* Bz Indicator */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Magnetic Field (Bz):
          </span>
          <span className={`text-2xl font-bold ${
            windData.bz < 0 ? 'text-green-600' : 'text-gray-600'
          }`}>
            {windData.bz.toFixed(1)} nT
          </span>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {windData.bz < -5 ? (
            <span className="text-green-600 font-semibold">✓ Negative Bz = Aurora fuel!</span>
          ) : windData.bz < 0 ? (
            <span className="text-yellow-600">Slightly negative Bz - some aurora potential</span>
          ) : (
            <span>Waiting for negative Bz...</span>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className={`text-center text-lg font-semibold ${statusStyle.color}`}>
          {statusStyle.emoji} {windData.status}
        </div>
      </div>

      {/* Reference Information */}
      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span className="font-medium">Normal range:</span>
          <span>300-500 km/s</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Aurora friendly:</span>
          <span>&gt; 500 km/s + negative Bz</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Storm conditions:</span>
          <span>&gt; 700 km/s + strong negative Bz</span>
        </div>
      </div>

      {/* Source Attribution */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Data from {windData.source} • Updated: {new Date(windData.lastUpdated).toLocaleTimeString('no-NO')}
      </div>
    </div>
  );
}
