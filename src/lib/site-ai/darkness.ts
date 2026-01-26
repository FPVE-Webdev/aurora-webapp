/**
 * Darkness Conversion Utility
 *
 * Converts solar elevation angle (degrees) to a 0-100 darkness factor
 * based on twilight phases relevant to aurora viewing.
 *
 * Arctic-aware: Accounts for polar night (Nov 21 - Jan 21) and midnight sun
 * (May 19 - Jul 23) periods specific to Tromsø, Norway (69.7°N).
 *
 * Twilight phase definitions (from highest to lowest sun position):
 * - Civil twilight: sun between -6° and 0°
 * - Nautical twilight: sun between -12° and -6°
 * - Astronomical twilight: sun between -18° and -12°
 * - Astronomical night: sun below -18°
 */

/**
 * Determines if a given date falls within the polar night period for Tromsø.
 * Polar night: November 21 - January 21 (sun never rises above -18°)
 *
 * @param date - Date to check
 * @returns true if within polar night period
 */
export function isPolarNight(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed (0=Jan, 11=Dec)
  const dayOfMonth = date.getDate();

  // Nov 21 to Dec 31
  if (month === 10 && dayOfMonth >= 21) return true;
  // Jan 1 to Jan 21
  if (month === 0 && dayOfMonth <= 21) return true;

  return false;
}

/**
 * Determines if a given date falls within the midnight sun period for Tromsø.
 * Midnight sun: May 19 - July 23 (sun never sets below -18°)
 *
 * @param date - Date to check
 * @returns true if within midnight sun period
 */
export function isMidnightSun(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed (0=Jan, 11=Dec)
  const dayOfMonth = date.getDate();

  // May 19 to May 31
  if (month === 4 && dayOfMonth >= 19) return true;
  // June 1 to June 30
  if (month === 5) return true;
  // July 1 to July 23
  if (month === 6 && dayOfMonth <= 23) return true;

  return false;
}

/**
 * Converts solar elevation angle to a darkness factor (0-100).
 *
 * Arctic-aware: Automatically detects the current date and applies seasonal
 * adjustments for polar night and midnight sun periods.
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
 *   - Special cases:
 *     - Midnight sun (May 19 - Jul 23): always 0 (perpetual daylight)
 *     - Polar night (Nov 21 - Jan 21): base darkness + 10, clamped to 100
 *
 * Linear interpolation is used within each twilight band for smooth gradation.
 */
export function solarElevationToDarkness(solarElevation: number): number {
  const now = new Date();

  // Special case: Midnight sun period
  // During midnight sun, darkness is always 0 regardless of solar elevation
  if (isMidnightSun(now)) {
    return 0;
  }

  // Calculate base darkness from solar elevation
  let darkness: number;

  // Full daylight - not dark at all
  if (solarElevation > 0) {
    darkness = 0;
  }
  // Civil twilight: sun between -6° and 0° → darkness 0-10
  else if (solarElevation > -6) {
    // Linear interpolation from 0 to 10
    // At 0°: darkness = 0
    // At -6°: darkness = 10
    darkness = (10 / 6) * Math.abs(solarElevation);
  }
  // Nautical twilight: sun between -12° and -6° → darkness 10-40
  else if (solarElevation > -12) {
    // Linear interpolation from 10 to 40
    const durationDegrees = 6; // -12 to -6
    const darknessRange = 30; // 40 - 10
    const degreesFromBoundary = solarElevation - (-6);
    darkness = 10 + (darknessRange * Math.abs(degreesFromBoundary)) / durationDegrees;
  }
  // Astronomical twilight: sun between -18° and -12° → darkness 40-80
  else if (solarElevation > -18) {
    // Linear interpolation from 40 to 80
    const durationDegrees = 6; // -18 to -12
    const darknessRange = 40; // 80 - 40
    const degreesFromBoundary = solarElevation - (-12);
    darkness = 40 + (darknessRange * Math.abs(degreesFromBoundary)) / durationDegrees;
  }
  // Astronomical night: sun below -18° → darkness 100
  else {
    darkness = 100;
  }

  // Apply polar night adjustment (+10 darkness, clamped to 100)
  // During polar night, add 10 to the base darkness to account for
  // the extended darkness period even when sun approaches -18° horizon
  if (isPolarNight(now)) {
    darkness = Math.min(100, darkness + 10);
  }

  return darkness;
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
