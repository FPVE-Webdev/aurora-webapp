/**
 * Darkness Gate for Aurora Visibility
 *
 * Enforces darkness as a hard requirement for aurora visibility.
 * Aurora cannot be seen during daylight or civil twilight, regardless of
 * magnetic activity or weather conditions.
 *
 * This module provides a gating function to filter forecast windows based
 * on darkness, ensuring the UI never recommends aurora viewing when it's
 * physically impossible to see.
 */

/**
 * Determines if it's dark enough to observe aurora.
 *
 * Aurora visibility requires the sun to be below the civil twilight boundary
 * (-6° solar elevation). This threshold marks when the brightest stars become
 * visible and the sky is sufficiently dark for aurora observation.
 *
 * @param solarElevation - Solar elevation angle in degrees
 *   - Positive values: sun above horizon (daylight - aurora NOT visible)
 *   - 0° to -6°: civil twilight (sky still too bright - aurora NOT visible)
 *   - ≤ -6°: aurora potentially visible (darkness sufficient)
 *
 * @returns true if dark enough for aurora viewing (solarElevation ≤ -6°)
 *         false if too bright (solarElevation > -6°)
 *
 * @example
 * isDarkEnoughForAurora(10)  // false (full daylight at 15:30)
 * isDarkEnoughForAurora(-3)  // false (civil twilight at 17:30)
 * isDarkEnoughForAurora(-6)  // true (boundary - aurora begins to be visible)
 * isDarkEnoughForAurora(-20) // true (astronomical night - optimal viewing)
 */
export function isDarkEnoughForAurora(solarElevation: number): boolean {
  return solarElevation <= -6;
}

/**
 * Get human-readable description of darkness status.
 * Useful for UI messages and explanations.
 *
 * @param solarElevation - Solar elevation angle in degrees
 * @returns Description of current darkness state
 */
export function getDarknessStatus(
  solarElevation: number
): 'daylight' | 'civil_twilight' | 'aurora_visible' {
  if (solarElevation > 0) {
    return 'daylight';
  } else if (solarElevation > -6) {
    return 'civil_twilight';
  }
  return 'aurora_visible';
}

/**
 * Get message explaining why aurora is not visible.
 * Useful for UI recommendations when darkness is insufficient.
 *
 * @param solarElevation - Solar elevation angle in degrees
 * @returns User-friendly explanation
 */
export function getDarknessExplanation(solarElevation: number): string | null {
  const status = getDarknessStatus(solarElevation);

  switch (status) {
    case 'daylight':
      return 'The sun is still above the horizon. Aurora is invisible during daylight.';
    case 'civil_twilight':
      return 'The sky is still too bright (civil twilight). Wait until full darkness for aurora visibility.';
    case 'aurora_visible':
      return null; // Aurora is potentially visible
  }
}
