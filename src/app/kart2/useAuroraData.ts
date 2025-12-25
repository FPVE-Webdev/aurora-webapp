/**
 * Aurora Data Hook for /kart2
 *
 * ISOLATED DATA LAYER
 * - Fetches aurora forecast data for public map
 * - Does NOT interfere with professional map data hooks (/components/aurora/*)
 * - Can be modified/removed without affecting existing systems
 *
 * STATUS: FASE 0 - MOCK DATA ONLY
 *
 * ISOLATION: No imports from /live or professional map hooks.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

// TODO (FASE 1): Replace with proper types from API response
// Shape should match /api/aurora/now and /api/aurora/hourly
interface AuroraData {
  kp: number;                    // Kp index (0-9)
  probability: number;           // Aurora probability % (0-100)
  timestamp: string;             // ISO 8601 timestamp
}

// TODO (FASE 2): Extend with hourly forecast data
// interface HourlyForecast {
//   time: string;
//   probability: number;
//   kp: number;
//   weather: {
//     cloudCoverage: number;
//     temperature: number;
//   };
// }

// TODO (FASE 2): Extend with multi-location data
// interface LocationData {
//   spotId: string;
//   probability: number;
//   coordinates: [number, number];
// }

interface UseAuroraDataReturn {
  data: AuroraData | null;
  isLoading: boolean;
  error: string | null;
  // TODO (FASE 2): Add refresh function
  // refresh: () => Promise<void>;
}

/**
 * Fetches aurora forecast data for the public experimental map
 *
 * FASE 1 TODO:
 * - Connect to /api/aurora/now for current conditions
 * - Add error handling with retry logic
 * - Add caching to prevent excessive API calls
 * - Set up auto-refresh every 30 minutes
 *
 * FASE 2 TODO:
 * - Connect to /api/aurora/hourly for 12h forecast
 * - Add support for multiple observation spots
 * - Add manual refresh function
 * - Add stale data indicators
 *
 * FASE 3 TODO:
 * - Add cloud coverage data integration
 * - Add weather forecast integration
 * - Add optimistic updates
 */
export function useAuroraData(): UseAuroraDataReturn {
  const [data, setData] = useState<AuroraData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();

    // PLACEHOLDER: Mock data for FASE 0 scaffolding
    // TODO (FASE 1): Replace with real API call
    const mockData: AuroraData = {
      kp: 3.5,
      probability: 45,
      timestamp: new Date().toISOString(),
    };

    // Simulate loading delay
    const timer = setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 500);

    // TODO (FASE 1): Replace placeholder with real fetch:
    //
    // const fetchData = async () => {
    //   try {
    //     const response = await fetch('/api/aurora/now?lang=no', {
    //       signal: abortControllerRef.current?.signal,
    //     });
    //
    //     if (!response.ok) {
    //       throw new Error(`HTTP ${response.status}`);
    //     }
    //
    //     const result = await response.json();
    //     setData({
    //       kp: scoreToKpIndex(result.score),
    //       probability: result.probability,
    //       timestamp: new Date().toISOString(),
    //     });
    //     setError(null);
    //   } catch (err) {
    //     if (err.name !== 'AbortError') {
    //       setError(err instanceof Error ? err.message : 'Failed to fetch data');
    //     }
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    //
    // fetchData();
    //
    // // Set up auto-refresh every 30 minutes
    // const refreshInterval = setInterval(fetchData, 30 * 60 * 1000);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
      // TODO (FASE 1): Clear refresh interval
      // clearInterval(refreshInterval);
    };
  }, []);

  return { data, isLoading, error };
}
