/**
 * Tromsø.AI Data Mapper
 *
 * Converts new API format to existing component format.
 * Allows gradual migration without breaking existing UI.
 */

import { TromsøAuroraForecast } from '@/types/tromsoAI';
import { SpotForecast, ObservationSpot, HourlyForecast } from '@/types/aurora';

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
 * Note: Some fields (cloud coverage, temperature) are not available
 * in the simplified API response. These will be set to reasonable defaults.
 */
export function mapTromsøForecastToSpotForecast(
  forecast: TromsøAuroraForecast,
  spot: ObservationSpot
): SpotForecast {
  const kpIndex = scoreToKpIndex(forecast.score);

  // Create a simple hourly forecast (backend doesn't provide this yet)
  // We'll use the current score for all hours as a placeholder
  const hourlyForecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date();
    hour.setHours(hour.getHours() + i);

    return {
      time: hour.toISOString(),
      hour: hour.toTimeString().slice(0, 5),
      probability: forecast.score,
      cloudCoverage: 30, // Default moderate clouds
      temperature: 0,    // Default
      kpIndex: kpIndex,
      symbolCode: 'clearsky_night',
      twilightPhase: i >= 21 || i <= 6 ? 'night' : 'day',
      canSeeAurora: i >= 21 || i <= 6
    };
  });

  return {
    spot,
    currentProbability: forecast.score,
    weather: {
      cloudCoverage: 30,  // Default - backend has this but not exposed yet
      temperature: 0,     // Default
      windSpeed: 0,
      precipitation: 0,
      symbolCode: 'clearsky_night',
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
