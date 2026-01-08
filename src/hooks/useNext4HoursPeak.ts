/**
 * Hook: useNext4HoursPeak
 *
 * Fetches hourly aurora data and finds the peak probability within the next 4 hours.
 * Used for displaying "highest expected value" in the next 4-hour window.
 */

'use client';

import { useState, useEffect } from 'react';

export interface Next4HoursPeak {
  peakProbability: number;
  peakHour: string;
  currentProbability: number;
  isLoading: boolean;
  error: string | null;
}

export function useNext4HoursPeak(locationId: string = 'tromso'): Next4HoursPeak {
  const [data, setData] = useState<Next4HoursPeak>({
    peakProbability: 0,
    peakHour: '',
    currentProbability: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchPeak = async () => {
      try {
        const res = await fetch(`/api/aurora/hourly?hours=4&location=${locationId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch hourly data: ${res.status}`);
        }

        const json = await res.json();
        const hourlyForecast = json.hourly_forecast || [];

        if (cancelled) return;

        if (hourlyForecast.length === 0) {
          setData({
            peakProbability: 0,
            peakHour: '',
            currentProbability: 0,
            isLoading: false,
            error: 'No hourly data available',
          });
          return;
        }

        // Find peak in next 4 hours
        const peak = hourlyForecast.reduce(
          (max: any, current: any) =>
            current.probability > max.probability ? current : max,
          hourlyForecast[0]
        );

        const currentHour = hourlyForecast[0];

        setData({
          peakProbability: Math.round(peak.probability),
          peakHour:
            typeof peak.hour === 'number'
              ? `${peak.hour.toString().padStart(2, '0')}:00`
              : peak.hour,
          currentProbability: Math.round(currentHour.probability),
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setData({
          peakProbability: 0,
          peakHour: '',
          currentProbability: 0,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    fetchPeak();

    // Refresh every 30 minutes
    const interval = setInterval(fetchPeak, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [locationId]);

  return data;
}
