/**
 * Type definitions for Tromsø.AI Aurora API
 */

export type AuroraLevel = 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ExtendedMetrics {
  solar_wind: {
    speed: number;
    unit: string;
    status: string;
    favorable: boolean;
  };
  bz_factor: {
    value: number;
    unit: string;
    status: string;
    favorable: boolean;
  };
  particle_density: {
    value: number;
    unit: string;
    status: string;
  };
  updated: string;
}

export interface ViewingWindow {
  start: string;
  end: string;
  peakTime: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface TromsøAuroraForecast {
  score: number;           // 0-100
  level: AuroraLevel;
  confidence: ConfidenceLevel;
  headline: string;
  summary: string | null;
  best_time: string;
  tips: string[];
  updated: string;         // ISO timestamp
  location?: string;
  kp?: number;             // KP index 0-9 (optional, derived from score if not provided)
  extended_metrics?: ExtendedMetrics | null;  // Phase 2: Advanced solar wind metrics
  viewing_window?: ViewingWindow;  // Phase 2: Best viewing window
}

export interface TromsøMultidayResponse {
  location: string;
  forecasts: TromsøAuroraForecast[];
  metadata: {
    days_requested: number;
    days_available: number;
    note?: string;
  };
}

/**
 * Mapped format for use in existing components
 * Bridges the gap between new API and existing UI
 */
export interface MappedAuroraData {
  currentProbability: number;  // score 0-100
  kpIndex: number;             // Derived from score
  level: AuroraLevel;
  confidence: ConfidenceLevel;
  headline: string;
  summary: string | null;
  bestViewingTime: string;
  tips: string[];
  lastUpdate: Date;
  weather: {
    cloudCoverage: number;     // Will be 0 initially (backend has this data)
    temperature: number;       // Will be 0 initially
    timestamp: string;
  };
}

// ============================================
// NEW v2.0: Hourly Forecast API
// ============================================

export interface HourlyForecastResponse {
  location: string;
  generatedAt: string;
  forecasts: HourlyForecast[];
}

export interface HourlyForecast {
  time: string; // ISO timestamp
  kpIndex: number; // 0-9
  probability: number; // 0-100
  weather: {
    cloudCoverage: number; // 0-100%
    temperature: number; // Celsius
    windSpeed: number; // m/s
    symbolCode: string; // MET.no symbol
    precipitationAmount: number;
  };
  visibility: {
    canSeeAurora: boolean;
    twilightPhase: 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';
    darkHours: {
      start: number;
      end: number;
    };
  };
}

// ============================================
// NEW v2.0: Aurora Oval API
// ============================================

export interface AuroraOvalResponse {
  timestamp: string;
  kpIndex: number;
  coordinates: AuroraOvalCoordinate[];
  metadata: {
    source: 'noaa-ovation' | 'swpc' | 'tromso-ai-model';
    resolution: number;
    coverage: {
      minLatitude: number;
      maxLatitude: number;
    };
  };
}

export interface AuroraOvalCoordinate {
  lat: number;
  lon: number;
  probability: number; // 0-100
}

// ============================================
// FUTURE v2.1: Current Conditions API
// ============================================

export interface CurrentConditionsResponse {
  location: string;
  timestamp: string;
  aurora: {
    kpIndex: number;
    probability: number;
    score: number;
    recommendation: string;
  };
  weather: {
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    symbolCode: string;
  };
  solar: {
    bzGsm: number | null;
    solarWind: number | null;
    density: number | null;
  };
  visibility: {
    canSeeAurora: boolean;
    twilightPhase: string;
    bestViewingTime: string | null;
  };
}
