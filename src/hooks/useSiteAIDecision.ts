/**
 * useSiteAIDecision Hook
 *
 * Fetches and caches Site-AI forecast decisions.
 * Wraps the /api/aurora/forecast-decision endpoint.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { SiteAIDecision, SiteAIInput } from '@/types/siteAI';
import { HourlyForecast } from '@/types/aurora';

interface UseSiteAIDecisionState {
  decision: SiteAIDecision | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and manage Site-AI decision.
 * Converts HourlyForecast data to SiteAIInput and fetches decision.
 *
 * @param hourlyForecasts - Array of hourly forecasts
 * @param globalKp - Current KP index (0-9)
 * @param kpTrend - KP trend direction
 * @param travelTimeMinutes - Travel time from Tromsø in minutes (optional)
 * @returns Site-AI decision, loading state, and error
 */
export function useSiteAIDecision(
  hourlyForecasts: HourlyForecast[] | null | undefined,
  globalKp: number,
  kpTrend: 'increasing' | 'stable' | 'decreasing' = 'stable',
  travelTimeMinutes?: number
): UseSiteAIDecisionState {
  const [state, setState] = useState<UseSiteAIDecisionState>({
    decision: null,
    isLoading: false,
    error: null,
  });

  // Memoize the fetch operation
  const fetchDecision = useCallback(async () => {
    if (!hourlyForecasts || hourlyForecasts.length === 0) {
      setState({ decision: null, isLoading: false, error: 'No hourly forecasts available' });
      return;
    }

    setState({ decision: null, isLoading: true, error: null });

    try {
      // Convert HourlyForecast to SiteAIInput format
      const input: SiteAIInput = {
        hourlyForecasts: hourlyForecasts.map((forecast) => ({
          time: forecast.time,
          cloudCover: forecast.cloudCoverage,
          solarElevation: 0, // TODO: Extract from forecast data if available
          kpIndex: forecast.kpIndex,
        })),
        globalKp,
        kpTrend,
        travelTimeMinutes,
      };

      // Fetch Site-AI decision
      const response = await fetch('/api/aurora/forecast-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const decision: SiteAIDecision = await response.json();
      setState({ decision, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching Site-AI decision:', errorMessage);
      setState({ decision: null, isLoading: false, error: errorMessage });
    }
  }, [hourlyForecasts, globalKp, kpTrend, travelTimeMinutes]);

  // Fetch decision when dependencies change
  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  return state;
}
