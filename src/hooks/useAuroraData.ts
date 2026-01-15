/**
 * Aurora Data Hook (Web Version)
 *
 * Uses Tromsø.AI API (tromso.ai/api/aurora/tonight)
 * Main data hook for all aurora forecast components.
 * Adapted for Next.js with React Query for caching.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { tromsøAIService } from '@/services/tromsoAIService';
import { mapTromsøForecastToSpotForecast, scoreToKpIndex } from '@/lib/tromsoAIMapper';
import { OBSERVATION_SPOTS, FREE_OBSERVATION_SPOTS } from '@/lib/constants';
import { SpotForecast, ObservationSpot } from '@/types/aurora';
import { TromsøAuroraForecast, ExtendedMetrics } from '@/types/tromsoAI';

interface AuroraState {
  currentKp: number;
  globalProbability: number;
  bzGsm: number | undefined;
  solarSpeed: number | undefined;
  spotForecasts: SpotForecast[];
  selectedSpot: ObservationSpot;
  isLoading: boolean;
  lastUpdate: Date;
  dataTimestamp: Date;
  error: string | null;
  predictiveHint: string | null;
  extendedMetrics: ExtendedMetrics | null;
}

const SELECTED_SPOT_ID_KEY = 'selected-spot-id';
const CACHE_KEY = 'aurora-tromso-ai-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  forecast: TromsøAuroraForecast;
  timestamp: number;
}

const safeGetLocalStorage = (key: string): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

// Get cached forecast
function getCachedForecast(): TromsøAuroraForecast | null {
  try {
    const cached = safeGetLocalStorage(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    const now = Date.now();

    if ((now - data.timestamp) < CACHE_DURATION) {
      return data.forecast;
    }

    return null;
  } catch {
    return null;
  }
}

// Cache forecast
function cacheForecast(forecast: TromsøAuroraForecast): void {
  try {
    const data: CachedData = {
      forecast,
      timestamp: Date.now()
    };
    safeSetLocalStorage(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Get default spot (Tromsø for all tiers)
const getDefaultSpot = (): ObservationSpot => {
  return FREE_OBSERVATION_SPOTS.find(s => s.id === 'tromso') || FREE_OBSERVATION_SPOTS[0];
};

const getInitialSpot = (): ObservationSpot => {
  const persistedId = safeGetLocalStorage(SELECTED_SPOT_ID_KEY);
  if (persistedId) {
    const match = OBSERVATION_SPOTS.find(s => s.id === persistedId);
    if (match) return match;
  }
  return getDefaultSpot();
};

/**
 * Get language from localStorage
 */
function getLanguage(): 'no' | 'en' {
  try {
    if (typeof window === 'undefined') return 'no';
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'no') ? saved : 'no';
  } catch {
    return 'no';
  }
}

/**
 * Aurora Data Hook
 *
 * Fetches and manages aurora forecast data from Tromsø.AI API
 */
export function useAuroraData() {
  const [state, setState] = useState<AuroraState>({
    currentKp: 3,
    globalProbability: 0,
    bzGsm: undefined,
    solarSpeed: undefined,
    spotForecasts: [],
    selectedSpot: getInitialSpot(),
    isLoading: true,
    lastUpdate: new Date(),
    dataTimestamp: new Date(),
    error: null,
    predictiveHint: null,
    extendedMetrics: null
  });

  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try cache first
      let forecast = getCachedForecast();

      // If no cache, fetch from API
      if (!forecast) {
        const language = getLanguage();
        forecast = await tromsøAIService.getTonight(language);
        cacheForecast(forecast);
      }

      // Convert to KP index for compatibility
      const kpIndex = scoreToKpIndex(forecast.score);
      const dataTimestamp = new Date(forecast.updated);

      // Fetch weather data and hourly forecasts for all spots in parallel
      const spotForecastsPromises = OBSERVATION_SPOTS.map(async (spot) => {
        try {
          // Fetch hourly forecast for this spot (includes weather for all hours)
          const hourlyRes = await fetch(`/api/aurora/hourly?hours=48&location=${spot.id}`);
          let hourlyData = null;
          let currentWeather = undefined;

          if (hourlyRes.ok) {
            const hourlyJson = await hourlyRes.json();
            hourlyData = hourlyJson.hourly_forecast;
            // Extract current weather from hour 0 as single source of truth
            currentWeather = hourlyData?.[0]?.weather;
          }

          // Map forecast using hour 0 weather for current probability
          return mapTromsøForecastToSpotForecast(forecast!, spot, currentWeather, hourlyData);
        } catch (error) {
          console.warn(`Failed to fetch hourly forecast for ${spot.name}, using fallback`);
          return mapTromsøForecastToSpotForecast(forecast!, spot);
        }
      });

      const spotForecasts: SpotForecast[] = await Promise.all(spotForecastsPromises);

      // Generate predictive hint based on score
      let predictiveHint: string | null = null;
      if (forecast.score >= 70) {
        predictiveHint = '🟢 Utmerkede forhold! Gå ut nå hvis det er mørkt.';
      } else if (forecast.score >= 50) {
        predictiveHint = '🟡 Gode sjanser i kveld. Hold øye med himmelen.';
      } else if (forecast.score >= 30) {
        predictiveHint = '🟠 Moderate forhold. Kanskje verdt et forsøk.';
      }

      setState(prev => ({
        ...prev,
        currentKp: kpIndex,
        globalProbability: forecast.score,
        bzGsm: undefined, // Not provided by new API
        solarSpeed: undefined, // Not provided by new API
        spotForecasts,
        isLoading: false,
        lastUpdate: new Date(),
        dataTimestamp,
        error: null,
        predictiveHint,
        extendedMetrics: forecast.extended_metrics || null
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Request timed out'
            : error.message
          : 'Unknown error';

      // Avoid noisy stack traces in the browser console for transient network failures.
      console.warn(`Error fetching aurora data: ${message}`);

      // Try to use cached data on error
      const cached = getCachedForecast();
      if (cached) {
        const kpIndex = scoreToKpIndex(cached.score);
        const spotForecasts = OBSERVATION_SPOTS.map(spot =>
          mapTromsøForecastToSpotForecast(cached, spot, undefined, undefined)
        );

        setState(prev => ({
          ...prev,
          currentKp: kpIndex,
          globalProbability: cached.score,
          spotForecasts,
          isLoading: false,
          error: null,
          dataTimestamp: new Date(cached.updated),
          lastUpdate: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Kunne ikke hente data. Prøv igjen.'
        }));
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const selectSpot = useCallback((spot: ObservationSpot) => {
    setState(prev => ({ ...prev, selectedSpot: spot }));

    if (spot.id !== 'user-location' && spot.region !== 'custom') {
      safeSetLocalStorage(SELECTED_SPOT_ID_KEY, spot.id);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 minutes (synced with MasterStatusContext)
    const interval = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const selectedSpotForecast = state.spotForecasts.find(
    sf => sf.spot.id === state.selectedSpot.id
  );

  return {
    ...state,
    selectedSpotForecast,
    selectSpot,
    refresh
  };
}
