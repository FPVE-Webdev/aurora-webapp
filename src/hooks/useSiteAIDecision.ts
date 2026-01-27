/**
 * useSiteAIDecision Hook
 *
 * Fetches and caches Site-AI forecast decisions.
 * Wraps the /api/aurora/forecast-decision endpoint.
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { SiteAIDecision, SiteAIInput } from '@/types/siteAI';
import { HourlyForecast, TwilightPhase } from '@/types/aurora';
import { detectKpTrend } from '@/lib/kpTrendDetector';

/**
 * Estimate solar elevation from twilight phase.
 * Used as fallback when solarElevation is not directly available.
 */
function estimateSolarElevationFromTwilightPhase(twilightPhase?: TwilightPhase): number {
  switch (twilightPhase) {
    case 'day':
      return 10; // Sun is up and bright
    case 'civil':
      return -3; // Civil twilight: sun is -6 to 0 degrees (use midpoint)
    case 'nautical':
      return -9; // Nautical twilight: sun is -12 to -6 degrees (use midpoint)
    case 'astronomical':
      return -15; // Astronomical twilight: sun is -18 to -12 degrees (use midpoint)
    case 'night':
      return -20; // Well below horizon
    default:
      return 0; // Unknown/fallback: assume twilight
  }
}

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
 * @param kpTrend - KP trend direction (optional; auto-detected if not provided)
 * @param travelTimeMinutes - Travel time from Tromsø in minutes (optional)
 * @returns Site-AI decision, loading state, and error
 */
export function useSiteAIDecision(
  hourlyForecasts: HourlyForecast[] | null | undefined,
  globalKp: number,
  kpTrend?: 'increasing' | 'stable' | 'decreasing',
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
      // Auto-detect KP trend if not explicitly provided
      const detectedTrend = kpTrend || detectKpTrend(hourlyForecasts);

      // Convert HourlyForecast to SiteAIInput format
      const input: SiteAIInput = {
        hourlyForecasts: hourlyForecasts.map((forecast) => ({
          time: forecast.time,
          cloudCover: forecast.cloudCoverage,
          // Use actual solarElevation if available, otherwise estimate from twilightPhase
          solarElevation:
            forecast.solarElevation !== undefined
              ? forecast.solarElevation
              : estimateSolarElevationFromTwilightPhase(forecast.twilightPhase),
          kpIndex: forecast.kpIndex,
          // Include probability from hourly forecast for UI display
          probability: forecast.probability,
        })),
        globalKp,
        kpTrend: detectedTrend,
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
