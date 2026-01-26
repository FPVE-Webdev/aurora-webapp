/**
 * Darkness Conversion Utility
 *
 * Converts solar elevation angle (degrees) to a 0-100 darkness factor
 * based on twilight phases relevant to aurora viewing.
 *
 * Twilight phase definitions (from highest to lowest sun position):
 * - Civil twilight: sun between -6° and 0°
 * - Nautical twilight: sun between -12° and -6°
 * - Astronomical twilight: sun between -18° and -12°
 * - Astronomical night: sun below -18°
 */

/**
 * Converts solar elevation angle to a darkness factor (0-100).
 *
 * @param solarElevation - Solar elevation angle in degrees
 *   - Positive values: sun above horizon (daytime)
 *   - 0°: sun at horizon (sunrise/sunset)
 *   - -6°: civil twilight boundary (can see brightest stars)
 *   - -12°: nautical twilight boundary (horizon visible)
 *   - -18°: astronomical twilight boundary (full darkness for astronomy)
 *   - Negative values below -18°: astronomical night
 *
 * @returns Darkness factor (0-100)
 *   - 0: Full daylight (elevation > 0°)
 *   - 10: Civil twilight (elevation between -6° and 0°)
 *   - 40: Nautical twilight (elevation between -12° and -6°)
 *   - 80: Astronomical twilight (elevation between -18° and -12°)
 *   - 100: Astronomical night (elevation ≤ -18°)
 *
 * Linear interpolation is used within each twilight band for smooth gradation.
 */
export function solarElevationToDarkness(solarElevation: number): number {
  // Full daylight - not dark at all
  if (solarElevation > 0) {
    return 0;
  }

  // Civil twilight: sun between -6° and 0° → darkness 0-10
  if (solarElevation > -6) {
    // Linear interpolation from 0 to 10
    // At 0°: darkness = 0
    // At -6°: darkness = 10
    return (10 / 6) * Math.abs(solarElevation);
  }

  // Nautical twilight: sun between -12° and -6° → darkness 10-40
  if (solarElevation > -12) {
    // Linear interpolation from 10 to 40
    const durationDegrees = 6; // -12 to -6
    const darknessRange = 30; // 40 - 10
    const degreesFromBoundary = solarElevation - (-6);
    return 10 + (darknessRange * Math.abs(degreesFromBoundary)) / durationDegrees;
  }

  // Astronomical twilight: sun between -18° and -12° → darkness 40-80
  if (solarElevation > -18) {
    // Linear interpolation from 40 to 80
    const durationDegrees = 6; // -18 to -12
    const darknessRange = 40; // 80 - 40
    const degreesFromBoundary = solarElevation - (-12);
    return 40 + (darknessRange * Math.abs(degreesFromBoundary)) / durationDegrees;
  }

  // Astronomical night: sun below -18° → darkness 100
  return 100;
}

/**
 * Determines the twilight phase name for a given solar elevation.
 * Useful for debugging and documentation.
 */
export function getTwilightPhase(
  solarElevation: number
): 'day' | 'civil_twilight' | 'nautical_twilight' | 'astronomical_twilight' | 'night' {
  if (solarElevation > 0) return 'day';
  if (solarElevation > -6) return 'civil_twilight';
  if (solarElevation > -12) return 'nautical_twilight';
  if (solarElevation > -18) return 'astronomical_twilight';
  return 'night';
}
