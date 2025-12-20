/**
 * Aurora Live Hook (Web Version)
 *
 * Polls aurora oval data from Tromsø.AI API
 * Provides live aurora visualization data with fallback to procedural mock data
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tromsøAIService } from '@/services/tromsoAIService';

// Types matching AuroraMapFullscreen overlay
export interface AuroraDataPoint {
  lat: number;
  lon: number;
  probability: number;
}

export interface AuroraLiveState {
  kpIndex: number;
  /**
   * Intensity multiplier for oval probability before rendering
   */
  intensity: number;
  auroraData: AuroraDataPoint[];
  loading: boolean;
  error: string | null;
  /**
   * True when showing procedural-generated demo/fallback data
   */
  isMock: boolean;
}

export interface UseAuroraLiveOptions {
  /**
   * Disable polling/fetching (e.g. when overlay is off)
   */
  enabled?: boolean;
  /**
   * If set, use this as KP source (no extra KP request)
   * Practical when component already has KP via useAuroraData
   */
  kpIndexOverride?: number;
  /**
   * Polling interval for oval data
   */
  pollIntervalMs?: number;
  /**
   * Fallback to procedural data if oval fetch fails/offline
   */
  mockOnFail?: boolean;
  /**
   * KP below this gives lower intensity and calmer look
   */
  minKpVisible?: number;
}

const DEFAULTS: Required<Pick<
  UseAuroraLiveOptions,
  'enabled' | 'pollIntervalMs' | 'mockOnFail' | 'minKpVisible'
>> = {
  enabled: true,
  pollIntervalMs: 5 * 60 * 1000, // 5 min
  mockOnFail: true,
  minKpVisible: 2,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Deterministic "pseudo-random" (without Math.random) so fallback doesn't jump each poll
 */
function hash01(x: number) {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function calculateIntensityMultiplier(kp: number) {
  // Keep consistent with map's existing mapping:
  // intensity={1 + (kpIndex - 3) * 0.15}
  const raw = 1 + (kp - 3) * 0.15;
  return clamp(raw, 0.6, 1.9);
}

/**
 * Procedural-generated oval-ish band for wow/demo
 * Generates points globally (-180..180), but canvas overlay culls outside view
 */
function generateMockAuroraData(kp: number): AuroraDataPoint[] {
  const points: AuroraDataPoint[] = [];

  // Higher KP = aurora extends further south (lower lat)
  const baseLat = 70 - kp * 1.5;

  // 2 bands: main + weaker north
  for (let lon = -180; lon <= 180; lon += 2) {
    const lonRad = lon * 0.05;

    // Small deterministic variations (seed based on kp+lon)
    const jitter = (hash01(lon * 1.7 + kp * 31.1) - 0.5) * 0.6;

    // Band 1 (main)
    points.push({
      lat: baseLat + Math.sin(lonRad) * 2 + jitter,
      lon,
      probability: 100,
    });

    // Band 2 (weaker, further north)
    if (kp > 3) {
      points.push({
        lat: baseLat + 5 + Math.cos(lonRad) * 2,
        lon,
        probability: 60,
      });
    }
  }

  return points;
}

export function useAuroraLive(options: UseAuroraLiveOptions = {}) {
  const {
    enabled = DEFAULTS.enabled,
    kpIndexOverride,
    pollIntervalMs = DEFAULTS.pollIntervalMs,
    mockOnFail = DEFAULTS.mockOnFail,
    minKpVisible = DEFAULTS.minKpVisible,
  } = options;

  const [state, setState] = useState<AuroraLiveState>({
    kpIndex: kpIndexOverride ?? 3,
    intensity: calculateIntensityMultiplier(kpIndexOverride ?? 3),
    auroraData: [],
    loading: true,
    error: null,
    isMock: false,
  });

  const mountedRef = useRef(true);
  const demoOverrideRef = useRef<number | null>(null);

  const resolvedKp = useMemo(() => {
    const demo = demoOverrideRef.current;
    if (typeof demo === 'number') return demo;
    if (typeof kpIndexOverride === 'number') return kpIndexOverride;
    return state.kpIndex;
  }, [kpIndexOverride, state.kpIndex]);

  const applyState = useCallback((next: Partial<AuroraLiveState>) => {
    if (!mountedRef.current) return;
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const fetchLive = useCallback(async () => {
    if (!enabled) return;

    applyState({ loading: true, error: null });

    try {
      // Use Tromsø.AI aurora oval endpoint - single source of truth
      const ovalResponse = await tromsøAIService.getAuroraOval('medium');
      const kp = typeof kpIndexOverride === 'number' ? kpIndexOverride : ovalResponse.kpIndex;
      const coordinates = ovalResponse.coordinates;

      // If we have data, use real. If not: fallback
      if (coordinates.length > 0) {
        applyState({
          kpIndex: kp,
          intensity: calculateIntensityMultiplier(kp),
          auroraData: coordinates,
          loading: false,
          error: null,
          isMock: false,
        });
        return;
      }

      if (!mockOnFail) {
        applyState({
          kpIndex: kp,
          intensity: calculateIntensityMultiplier(kp),
          auroraData: [],
          loading: false,
          error: 'Ingen aurora-oval-data tilgjengelig',
          isMock: false,
        });
        return;
      }

      const fallbackKp = Math.max(kp, minKpVisible);
      applyState({
        kpIndex: kp,
        intensity: calculateIntensityMultiplier(fallbackKp),
        auroraData: generateMockAuroraData(fallbackKp),
        loading: false,
        error: 'Offline/fallback-data',
        isMock: true,
      });
    } catch (err) {
      const kp = typeof kpIndexOverride === 'number' ? kpIndexOverride : 3;

      if (mockOnFail) {
        const fallbackKp = Math.max(resolvedKp, minKpVisible);
        applyState({
          kpIndex: kp,
          intensity: calculateIntensityMultiplier(fallbackKp),
          auroraData: generateMockAuroraData(fallbackKp),
          loading: false,
          error: 'Offline/fallback-data',
          isMock: true,
        });
        return;
      }

      // Hard fail
      applyState({
        kpIndex: kp,
        intensity: calculateIntensityMultiplier(kp),
        auroraData: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Ukjent feil ved henting av aurora',
        isMock: false,
      });
    }
  }, [applyState, enabled, kpIndexOverride, minKpVisible, mockOnFail, resolvedKp]);

  // Polling and startup
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      applyState({ loading: false });
      return () => {
        mountedRef.current = false;
      };
    }

    fetchLive();
    const interval = window.setInterval(fetchLive, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [applyState, enabled, fetchLive, pollIntervalMs]);

  // Update intensity when kpIndexOverride changes (without waiting for poll)
  useEffect(() => {
    if (typeof kpIndexOverride !== 'number') return;
    applyState({
      kpIndex: kpIndexOverride,
      intensity: calculateIntensityMultiplier(kpIndexOverride),
    });
  }, [applyState, kpIndexOverride]);

  const triggerDemo = useCallback((fakeKp: number) => {
    const kp = clamp(fakeKp, 0, 9);
    demoOverrideRef.current = kp;
    applyState({
      kpIndex: kp,
      intensity: calculateIntensityMultiplier(Math.max(kp, minKpVisible)),
      auroraData: generateMockAuroraData(Math.max(kp, minKpVisible)),
      loading: false,
      error: null,
      isMock: true,
    });
  }, [applyState, minKpVisible]);

  const clearDemo = useCallback(() => {
    demoOverrideRef.current = null;
    fetchLive();
  }, [fetchLive]);

  return {
    ...state,
    refetch: fetchLive,
    triggerDemo,
    clearDemo,
  };
}
