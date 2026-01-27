/**
 * Limiting Factor Detection
 *
 * Deterministically identifies the primary constraint preventing better aurora viewing
 * conditions for a given forecast window.
 *
 * This helps users understand why they can't see aurora and what conditions to wait for.
 * Uses a hierarchical decision tree to ensure consistent, auditable results.
 */

import { solarElevationToDarkness } from './darkness';

export type LimitingFactor = 'cloud_cover' | 'low_kp' | 'too_bright' | 'mixed_conditions';

interface LimitingFactorInput {
  /** Cloud cover percentage (0-100) */
  cloudCover: number;
  /** KP index (0-9 scale) */
  kpIndex: number;
  /** Solar elevation angle in degrees */
  solarElevation: number;
}

/**
 * Determine the primary limiting factor for a forecast window.
 *
 * Decision hierarchy (first match wins):
 * 1. If NOT dark enough (solarElevation > -6°) → too_bright (physically impossible to see aurora)
 * 2. Else if cloudCover > 60% → cloud_cover (clouds block the view)
 * 3. Else if KP < 3 → low_kp (geomagnetic activity too weak)
 * 4. Else → mixed_conditions (no single dominant factor)
 *
 * Note: Darkness is checked first because aurora is physically invisible when too bright,
 * making all other factors irrelevant.
 *
 * @param input - Forecast window parameters
 * @returns The primary limiting factor preventing better viewing
 */
export function detectLimitingFactor(input: LimitingFactorInput): LimitingFactor {
  // Rule 1: Insufficient darkness - highest priority (aurora is PHYSICALLY invisible)
  // If solar elevation is above -6° (civil twilight), it's too bright
  if (input.solarElevation > -6) {
    return 'too_bright';
  }

  // Rule 2: Excessive cloud cover (> 60%)
  if (input.cloudCover > 60) {
    return 'cloud_cover';
  }

  // Rule 3: Weak geomagnetic activity (KP < 3)
  if (input.kpIndex < 3) {
    return 'low_kp';
  }

  // Rule 4: No single dominant factor
  return 'mixed_conditions';
}

/**
 * Get a human-readable description of the limiting factor.
 * Useful for generating explanations and error messages.
 */
export function describeLimitingFactor(factor: LimitingFactor): string {
  switch (factor) {
    case 'cloud_cover':
      return 'too many clouds';
    case 'low_kp':
      return 'weak geomagnetic activity';
    case 'too_bright':
      return 'not dark enough';
    case 'mixed_conditions':
      return 'mixed conditions';
  }
}
