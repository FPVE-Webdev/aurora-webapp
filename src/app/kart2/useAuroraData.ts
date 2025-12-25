/**
 * Aurora Data Hook for /kart2
 *
 * ISOLATED DATA LAYER
 * - Fetches aurora forecast data for public map
 * - Does NOT interfere with professional map data hooks
 * - Can be modified/removed without affecting existing systems
 *
 * STATUS: PLACEHOLDER ONLY
 */

'use client';

import { useState, useEffect } from 'react';

// TODO (FASE 1): Define proper types based on /api/aurora/hourly response
interface AuroraData {
  kp: number;
  probability: number;
  timestamp: string;
}

interface UseAuroraDataReturn {
  data: AuroraData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches aurora forecast data for the public experimental map
 *
 * TODO (FASE 1): Implement actual data fetching
 * TODO (FASE 1): Add caching strategy
 * TODO (FASE 1): Add auto-refresh interval
 * TODO (FASE 1): Add location-based data (multiple spots)
 */
export function useAuroraData(): UseAuroraDataReturn {
  const [data, setData] = useState<AuroraData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // PLACEHOLDER: Mock data for scaffolding
    // TODO (FASE 1): Replace with real API call to /api/aurora/now or /api/aurora/hourly
    const mockData: AuroraData = {
      kp: 3.5,
      probability: 45,
      timestamp: new Date().toISOString(),
    };

    // Simulate loading
    setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 500);

    // TODO (FASE 1): Implement actual fetch logic:
    // const fetchData = async () => {
    //   try {
    //     const response = await fetch('/api/aurora/now?lang=no');
    //     const data = await response.json();
    //     setData(data);
    //   } catch (err) {
    //     setError(err.message);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchData();

    // TODO (FASE 1): Add cleanup and refresh interval
  }, []);

  return { data, isLoading, error };
}
