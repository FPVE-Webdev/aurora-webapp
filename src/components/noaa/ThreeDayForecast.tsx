'use client';

import React, { useState, useEffect } from 'react';

interface DayForecast {
  date: string;
  quiet: number;
  unsettled: number;
  active: number;
  minorStorm: number;
  majorStorm: number;
}

interface ForecastData {
  days: DayForecast[];
  source: string;
  lastUpdated: string;
}

export default function ThreeDayForecast() {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForecast();

    // Refresh every 6 hours
    const interval = setInterval(fetchForecast, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchForecast = async () => {
    try {
      const response = await fetch('/api/noaa/forecast-3day');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setForecast(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">3-Day Geomagnetic Forecast</h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Failed to load forecast: {error}</p>
          <button
            onClick={fetchForecast}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!forecast) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('no-NO', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">3-Day Geomagnetic Forecast</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forecast.days.map((day, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              {formatDate(day.date)}
            </h3>

            {/* Probability Bars */}
            <div className="space-y-3 mb-4">
              {/* Quiet */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Quiet (0-1)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{day.quiet}%</span>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-900 flex items-center justify-center text-xs text-white font-semibold transition-all duration-500"
                    style={{ width: `${day.quiet}%` }}
                  >
                    {day.quiet > 15 && `${day.quiet}%`}
                  </div>
                </div>
              </div>

              {/* Unsettled */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Unsettled (2)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{day.unsettled}%</span>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-600 flex items-center justify-center text-xs text-white font-semibold transition-all duration-500"
                    style={{ width: `${day.unsettled}%` }}
                  >
                    {day.unsettled > 15 && `${day.unsettled}%`}
                  </div>
                </div>
              </div>

              {/* Active */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Active (3)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{day.active}%</span>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-500 flex items-center justify-center text-xs text-gray-900 font-semibold transition-all duration-500"
                    style={{ width: `${day.active}%` }}
                  >
                    {day.active > 15 && `${day.active}%`}
                  </div>
                </div>
              </div>

              {/* Minor Storm */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Minor Storm (4-5)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{day.minorStorm}%</span>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 flex items-center justify-center text-xs text-gray-900 font-semibold transition-all duration-500"
                    style={{ width: `${day.minorStorm}%` }}
                  >
                    {day.minorStorm > 15 && `${day.minorStorm}%`}
                  </div>
                </div>
              </div>

              {/* Major Storm */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Major+ Storm (6-9)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{day.majorStorm}%</span>
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-orange-600 flex items-center justify-center text-xs text-white font-semibold transition-all duration-500"
                    style={{ width: `${day.majorStorm}%` }}
                  >
                    {day.majorStorm > 15 && `${day.majorStorm}%`}
                  </div>
                </div>
              </div>
            </div>

            {/* Alert for high storm probability */}
            {day.majorStorm > 20 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-semibold">
                  ⚠️ {day.majorStorm}% chance of STRONG aurora activity
                </p>
              </div>
            )}

            {day.active > 40 && day.majorStorm <= 20 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200 font-semibold">
                  ✓ Good aurora viewing conditions expected
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Source Attribution */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
        Data from {forecast.source} • Updated: {new Date(forecast.lastUpdated).toLocaleTimeString('no-NO')}
      </div>
    </div>
  );
}
