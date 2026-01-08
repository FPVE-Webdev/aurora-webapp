export interface ObservationSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: 'troms' | 'finnmark' | 'nordland' | 'nordic' | 'custom';
}

export interface AuroraData {
  kpIndex: number;
  bzGsm?: number;
  solarSpeed?: number;
  timestamp: string;
}

export interface WeatherData {
  cloudCoverage: number;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  symbolCode: string;
  timestamp: string;
}

export type TwilightPhase = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

export interface HourlyForecast {
  time: string;
  hour: string;
  probability: number;
  cloudCoverage: number;
  temperature: number;
  kpIndex: number;
  symbolCode?: string;
  twilightPhase?: TwilightPhase;
  canSeeAurora?: boolean;
}

export interface SpotForecast {
  spot: ObservationSpot;
  currentProbability: number;
  weather: WeatherData;
  hourlyForecast: HourlyForecast[];
  bestViewingTime: string;
  canView?: boolean;
  nextViewableTime?: Date;
  bestTimeTonight?: Date;
}

export type ProbabilityLevel = 'excellent' | 'good' | 'moderate' | 'poor';

export interface ConfidenceLevel {
  level: string;
  percentage: number;
  color: string;
}
