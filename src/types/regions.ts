/**
 * Regional Types
 * Type definitions for regional grouping of observation spots
 */

import { ObservationSpot } from './aurora';

export interface RegionBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Region {
  id: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  bounds: RegionBounds;
  spots: string[]; // Array of spot IDs
  description?: string;
  isPremium: boolean;
}

export interface RegionalForecast {
  region: Region;
  maxProbability: number;
  avgProbability: number;
  bestSpot: ObservationSpot | null;
  spotCount: number;
  avgCloudCoverage: number;
  avgTemperature: number;
  kpIndex: number;
}

export type ViewMode = 'regional' | 'spots';
