/**
 * Chase Region Hook for /kart2
 *
 * FASE 2: Auto-expand map when Tromsø is heavily clouded
 * - Fetches cloud coverage for Tromsø and chase regions
 * - Calculates visibility scores
 * - Determines optimal viewing zones
 *
 * NO AI: Pure visibility calculations only
 *
 * ISOLATION: Independent hook, does not affect /live map
 */

'use client';

import { useState, useEffect } from 'react';
import { CHASE_REGIONS, MAP_CONFIG, type ChaseRegion } from './map.config';

// DEV MODE: Weather test override (set from MapView)
declare global {
  interface Window {
    __WEATHER_TEST_CLOUD_OVERRIDE?: number;
  }
}

interface RegionVisibility {
  region: ChaseRegion;
  cloudCoverage: number;        // 0-100%
  visibilityScore: number;      // 0-100 (100 - cloudCoverage)
  isChaseWorthy: boolean;       // Above minVisibilityScore threshold
}

interface ChaseRegionState {
  tromsoCloudCoverage: number;
  shouldExpandMap: boolean;      // True when Tromsø > cloudThreshold
  regions: RegionVisibility[];
  bestRegion: RegionVisibility | null;
  isLoading: boolean;
}

/**
 * Determines if map should expand to show chase regions
 *
 * FASE 2 Logic:
 * - Fetch cloud coverage for Tromsø
 * - If > cloudThreshold, fetch chase regions
 * - Calculate visibility scores
 * - Return best alternative region
 *
 * TODO (FASE 3): Add AI-based recommendations
 * TODO (FASE 3): Add driving time estimates
 * TODO (FASE 3): Add road condition warnings
 */
export function useChaseRegions(): ChaseRegionState {
  const [state, setState] = useState<ChaseRegionState>({
    tromsoCloudCoverage: 0,
    shouldExpandMap: false,
    regions: [],
    bestRegion: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchRegionData = async () => {
      try {
        // Fetch Tromsø cloud coverage
        const tromsoRes = await fetch('/api/weather/69.65/18.95');
        const tromsoData = await tromsoRes.json();

        // DEV MODE: Allow override from Weather Test button
        const tromsoCloud = typeof window !== 'undefined' && window.__WEATHER_TEST_CLOUD_OVERRIDE !== undefined
          ? window.__WEATHER_TEST_CLOUD_OVERRIDE
          : (tromsoData.cloudCoverage ?? 0);

        // Check if we should expand
        if (tromsoCloud <= MAP_CONFIG.chaseMode.cloudThreshold) {
          setState({
            tromsoCloudCoverage: tromsoCloud,
            shouldExpandMap: false,
            regions: [],
            bestRegion: null,
            isLoading: false,
          });
          return;
        }

        // Tromsø is clouded - fetch chase regions
        const regionPromises = CHASE_REGIONS.map(async (region) => {
          const res = await fetch(`/api/weather/${region.coordinates[0]}/${region.coordinates[1]}`);
          const data = await res.json();
          const cloudCoverage = data.cloudCoverage ?? 50;
          const visibilityScore = 100 - cloudCoverage;

          return {
            region,
            cloudCoverage,
            visibilityScore,
            isChaseWorthy: visibilityScore >= MAP_CONFIG.chaseMode.minVisibilityScore,
          };
        });

        const regions = await Promise.all(regionPromises);

        // Sort by priority, then visibility
        regions.sort((a, b) => {
          if (a.isChaseWorthy !== b.isChaseWorthy) {
            return a.isChaseWorthy ? -1 : 1;
          }
          if (a.region.priority !== b.region.priority) {
            return a.region.priority - b.region.priority;
          }
          return b.visibilityScore - a.visibilityScore;
        });

        const bestRegion = regions.find(r => r.isChaseWorthy) || null;

        setState({
          tromsoCloudCoverage: tromsoCloud,
          shouldExpandMap: true,
          regions,
          bestRegion,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to fetch chase region data:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchRegionData();

    // Refresh every 15 minutes
    const interval = setInterval(fetchRegionData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
