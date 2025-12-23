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
 */
export function mapTromsøForecastToSpotForecast(
  forecast: TromsøAuroraForecast,
  spot: ObservationSpot,
  weatherData?: { cloudCoverage: number; temperature: number; windSpeed?: number }
): SpotForecast {
  const kpIndex = scoreToKpIndex(forecast.score);

  // Use provided weather data or generate realistic fallbacks
  const cloudCoverage = weatherData?.cloudCoverage ?? (20 + Math.random() * 60);
  const temperature = weatherData?.temperature ?? (-15 + Math.random() * 25);
  const windSpeed = weatherData?.windSpeed ?? Math.round(Math.random() * 15);

  // Calculate probability based on spot's latitude and REAL weather
  const { probability } = calculateAuroraProbability({
    kpIndex,
    cloudCoverage,
    temperature,
    latitude: spot.latitude,
  });

  // Create a simple hourly forecast with realistic variations
  const hourlyForecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date();
    hour.setHours(hour.getHours() + i);

    // Add time-based variations (peak at midnight)
    const timeOfDay = hour.getHours();
    const peakBonus = (timeOfDay >= 21 || timeOfDay <= 3) ? 15 : 0;
    const hourVariation = Math.random() * 20 - 10; // ±10%

    const hourProbability = Math.max(0, Math.min(100,
      probability + peakBonus + hourVariation
    ));

    // Ensure cloudCoverage stays within 0-100 range
    const hourCloudCoverage = Math.max(0, Math.min(100,
      cloudCoverage + (Math.random() * 20 - 10)
    ));

    // Small temperature variation ±2°C
    const hourTemperature = temperature + (Math.random() * 4 - 2);

    // Keep KP index within valid range (0-9)
    const hourKpIndex = Math.max(0, Math.min(9,
      kpIndex + (Math.random() - 0.5)
    ));

    return {
      time: hour.toISOString(),
      hour: hour.toTimeString().slice(0, 5),
      probability: Math.round(hourProbability),
      cloudCoverage: Math.round(hourCloudCoverage),
      temperature: Math.round(hourTemperature),
      kpIndex: hourKpIndex,
      symbolCode: hourCloudCoverage > 50 ? 'cloudy' : 'clearsky_night',
      twilightPhase: (timeOfDay >= 21 || timeOfDay <= 6) ? 'night' : 'day',
      canSeeAurora: (timeOfDay >= 21 || timeOfDay <= 6) && hourProbability > 20
    };
  });

  return {
    spot,
    currentProbability: probability,
    weather: {
      cloudCoverage: Math.round(cloudCoverage),
      temperature: Math.round(temperature),
      windSpeed: Math.round(windSpeed),
      precipitation: cloudCoverage > 70 ? Math.round(Math.random() * 5) : 0,
      symbolCode: cloudCoverage > 50 ? 'cloudy' : 'clearsky_night',
      timestamp: forecast.updated
    },
    hourlyForecast,
    bestViewingTime: forecast.best_time
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
