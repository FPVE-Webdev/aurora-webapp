/**
 * KP Trend Detector
 *
 * Analyzes hourly KP values from forecast to determine KP trend direction.
 * This is critical for ADS calculation as trend provides ±5 point bonus/penalty.
 */

/**
 * Detect KP trend from hourly forecast data
 *
 * Logic:
 * - Compare KP values across forecast period (first 1/3 vs last 1/3)
 * - If average KP in first 1/3 > last 1/3 = 'decreasing'
 * - If average KP in first 1/3 < last 1/3 = 'increasing'
 * - Otherwise = 'stable' (within 0.3 tolerance)
 *
 * @param hourlyForecasts - Array of hourly forecast objects with kpIndex
 * @returns 'increasing' | 'stable' | 'decreasing'
 */
export function detectKpTrend(
  hourlyForecasts: Array<{ kpIndex: number; time: string }> | null | undefined
): 'increasing' | 'stable' | 'decreasing' {
  // Default to stable if no data
  if (!hourlyForecasts || hourlyForecasts.length < 6) {
    return 'stable';
  }

  // Split forecast into thirds
  const thirdLength = Math.ceil(hourlyForecasts.length / 3);
  const firstThird = hourlyForecasts.slice(0, thirdLength);
  const lastThird = hourlyForecasts.slice(-thirdLength);

  // Calculate average KP for each third
  const firstAvg =
    firstThird.reduce((sum, f) => sum + f.kpIndex, 0) / firstThird.length;
  const lastAvg =
    lastThird.reduce((sum, f) => sum + f.kpIndex, 0) / lastThird.length;

  // Determine trend with 0.3 tolerance for stability
  const difference = lastAvg - firstAvg;
  const tolerance = 0.3;

  if (difference > tolerance) {
    return 'increasing';
  } else if (difference < -tolerance) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}

/**
 * Get KP trend description for UI display
 */
export function getKpTrendLabel(
  trend: 'increasing' | 'stable' | 'decreasing'
): string {
  switch (trend) {
    case 'increasing':
      return 'Increasing (favorable)';
    case 'decreasing':
      return 'Decreasing (less favorable)';
    case 'stable':
      return 'Stable';
    default:
      return 'Unknown';
  }
}
