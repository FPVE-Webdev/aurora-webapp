/**
 * Regional Forecast Calculator
 * Aggregates spot forecasts into regional summaries
 */

import { SpotForecast } from '@/types/aurora';
import { Region, RegionalForecast } from '@/types/regions';

/**
 * Calculate regional forecast from individual spot forecasts
 * Returns the best (highest probability) values for the region
 */
export function getRegionalForecast(
  region: Region,
  spotForecasts: SpotForecast[]
): RegionalForecast {
  // Filter spots that belong to this region
  const regionSpots = spotForecasts.filter(sf =>
    region.spots.includes(sf.spot.id)
  );

  // Handle empty region
  if (regionSpots.length === 0) {
    return {
      region,
      maxProbability: 0,
      avgProbability: 0,
      bestSpot: null,
      spotCount: 0,
      avgCloudCoverage: 50,
      avgTemperature: -5,
      kpIndex: 3
    };
  }

  // Find maximum probability (best chance in region)
  const maxProb = Math.max(...regionSpots.map(sf => sf.currentProbability));

  // Calculate average probability
  const avgProb = regionSpots.reduce((sum, sf) => sum + sf.currentProbability, 0) / regionSpots.length;

  // Find best spot (highest probability)
  const bestSpotForecast = regionSpots.find(sf => sf.currentProbability === maxProb);
  const bestSpot = bestSpotForecast?.spot || null;

  // Use weather data from the best spot (not regional average)
  // This ensures the weather data shown matches the location being recommended
  const avgCloud = bestSpotForecast?.weather.cloudCoverage ?? 50;
  const avgTemp = bestSpotForecast?.weather.temperature ?? -5;

  // KP index is global, so just take from first spot
  const kpIndex = regionSpots[0]?.hourlyForecast?.[0]?.kpIndex || 3;

  return {
    region,
    maxProbability: Math.round(maxProb),
    avgProbability: Math.round(avgProb),
    bestSpot,
    spotCount: regionSpots.length,
    avgCloudCoverage: Math.round(avgCloud),
    avgTemperature: Math.round(avgTemp),
    kpIndex
  };
}

/**
 * Get all regional forecasts for Norway
 */
export function getAllRegionalForecasts(
  regions: Region[],
  spotForecasts: SpotForecast[]
): RegionalForecast[] {
  return regions.map(region =>
    getRegionalForecast(region, spotForecasts)
  );
}

/**
 * Get probability level for color coding
 */
export function getProbabilityLevel(probability: number): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (probability >= 70) return 'excellent';
  if (probability >= 50) return 'good';
  if (probability >= 30) return 'moderate';
  return 'poor';
}
