/**
 * Tromsø.AI Data Mapper
 *
 * Converts new API format to existing component format.
 * Allows gradual migration without breaking existing UI.
 */

import { TromsøAuroraForecast } from '@/types/tromsoAI';
import { SpotForecast, ObservationSpot, HourlyForecast } from '@/types/aurora';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';

/**
 * Convert score (0-100) to approximate KP index (0-9)
 * This is a reverse mapping for compatibility
 */
export function scoreToKpIndex(score: number): number {
  if (score >= 95) return 9;
  if (score >= 85) return 7;
  if (score >= 70) return 6;
  if (score >= 55) return 5;
  if (score >= 35) return 4;
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  return 1;
}

/**
 * Map Tromsø.AI forecast to SpotForecast format
 *
 * Note: If weatherData is not provided, will use fallback defaults
 * If hourlyApiData is provided, it will be used instead of generating synthetic hourly forecast
 */
export function mapTromsøForecastToSpotForecast(
  forecast: TromsøAuroraForecast,
  spot: ObservationSpot,
  weatherData?: { cloudCoverage: number; temperature: number; windSpeed?: number },
  hourlyApiData?: any[],
  globalKp?: number
): SpotForecast {
  // Extract current weather from hour 0 if hourly data available (single source of truth)
  const hour0Weather = hourlyApiData?.[0]?.weather;

  // Use global KP from context, fallback to forecast.kp or derive from score
  // KP is a GLOBAL planetary index - all locations have the same KP at any given time
  const kpIndex = globalKp ?? forecast.kp ?? scoreToKpIndex(forecast.score);

  // Use hour 0 weather as priority, then weatherData, then stable defaults (NO hash-based variation)
  const cloudCoverage = hour0Weather?.cloudCoverage ?? weatherData?.cloudCoverage ?? 50;
  const temperature = hour0Weather?.temperature ?? weatherData?.temperature ?? 0;
  const windSpeed = hour0Weather?.windSpeed ?? weatherData?.windSpeed ?? 5;

  // Calculate probability based on spot's latitude and REAL weather (with daylight check)
  const { probability, canView, nextViewableTime, bestTimeTonight } = calculateAuroraProbability({
    kpIndex,
    cloudCoverage,
    temperature,
    latitude: spot.latitude,
    longitude: spot.longitude, // Add longitude for daylight check
  });

  // Use API hourly data if available, otherwise generate synthetic forecast
  let hourlyForecast: HourlyForecast[];

  if (hourlyApiData && hourlyApiData.length > 0) {
    // Map API data to HourlyForecast format
    hourlyForecast = hourlyApiData.map((apiHour) => {
      const hourDate = new Date(apiHour.time);
      const timeOfDay = hourDate.getHours();

      // Extract weather for THIS hour (not hour 0)
      // Use this hour's weather object, falling back to per-hour fields in apiHour
      const hourWeather = apiHour.weather ?? apiHour;

      // Calculate probability using System A for consistency across all pages
      const calculatedProb = calculateAuroraProbability({
        kpIndex: kpIndex, // Always use global KP
        cloudCoverage: hourWeather?.cloudCoverage ?? 50,
        temperature: hourWeather?.temperature ?? 0,
        latitude: spot.latitude,
        longitude: spot.longitude,
        date: hourDate
      });

      return {
        time: apiHour.time,
        hour: typeof apiHour.hour === 'number'
          ? `${apiHour.hour.toString().padStart(2, '0')}:00`
          : apiHour.hour,
        probability: calculatedProb.probability, // Use System A calculation
        cloudCoverage: Math.round(hourWeather?.cloudCoverage ?? 50),
        temperature: Math.round(hourWeather?.temperature ?? 0),
        kpIndex: kpIndex, // Always use global KP
        symbolCode: hourWeather?.symbolCode ??
                   ((hourWeather?.cloudCoverage ?? 50) > 50 ? 'cloudy' : 'clearsky_night'),
        twilightPhase: (timeOfDay >= 21 || timeOfDay <= 6) ? 'night' : 'day',
        canSeeAurora: calculatedProb.canView // Use System A daylight check
      };
    });
  } else {
    // Fallback: Create a simple hourly forecast with realistic variations and daylight awareness
    hourlyForecast = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() + i);

      // Deterministic cloud coverage variation (cosine wave offset from probability)
      const cloudVariation = Math.cos(i * 0.7) * 10;
      const hourCloudCoverage = Math.max(0, Math.min(100,
        cloudCoverage + cloudVariation
      ));

      // Small temperature variation based on time of day (colder at night)
      const tempVariation = Math.sin((i - 12) * 0.26) * 2; // ±2°C variation
      const hourTemperature = temperature + tempVariation;

      // Use consistent global KP for all hours (KP is planetary, not time-varying)
      const hourKpIndex = kpIndex;

      // Calculate probability for this specific hour WITH DAYLIGHT CHECK
      const { probability: hourProbability, canView: hourCanView } = calculateAuroraProbability({
        kpIndex: hourKpIndex,
        cloudCoverage: hourCloudCoverage,
        temperature: hourTemperature,
        latitude: spot.latitude,
        longitude: spot.longitude,
        date: hour
      });

      const timeOfDay = hour.getHours();

      return {
        time: hour.toISOString(),
        hour: hour.toTimeString().slice(0, 5),
        probability: hourProbability, // System A already returns 0 during daylight
        cloudCoverage: Math.round(hourCloudCoverage),
        temperature: Math.round(hourTemperature),
        kpIndex: hourKpIndex,
        symbolCode: hourCloudCoverage > 50 ? 'cloudy' : 'clearsky_night',
        twilightPhase: (timeOfDay >= 21 || timeOfDay <= 6) ? 'night' : 'day',
        canSeeAurora: hourCanView // Use calculated daylight check
      };
    });
  }

  return {
    spot,
    currentProbability: probability,
    weather: {
      cloudCoverage: Math.round(cloudCoverage),
      temperature: Math.round(temperature),
      windSpeed: Math.round(windSpeed),
      precipitation: cloudCoverage > 70 ? 2 : 0, // Simple rule: heavy clouds = light precipitation
      symbolCode: cloudCoverage > 50 ? 'cloudy' : 'clearsky_night',
      timestamp: forecast.updated
    },
    hourlyForecast,
    bestViewingTime: forecast.best_time,
    canView,
    nextViewableTime,
    bestTimeTonight
  };
}

/**
 * Get confidence level text from API confidence
 */
export function getConfidenceText(confidence: 'low' | 'medium' | 'high'): string {
  switch (confidence) {
    case 'high':
      return 'Høy sikkerhet';
    case 'medium':
      return 'Moderat sikkerhet';
    case 'low':
      return 'Lav sikkerhet';
  }
}

/**
 * Get level emoji from API level
 */
export function getLevelEmoji(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return '🟢';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔴';
  }
}

/**
 * Get probability level from score
 */
export function getProbabilityLevelFromScore(score: number): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (score >= 70) return 'excellent';
  if (score >= 50) return 'good';
  if (score >= 30) return 'moderate';
  return 'poor';
}
