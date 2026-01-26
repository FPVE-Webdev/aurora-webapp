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
 * 1. If cloudCover > 60% → cloud_cover (clouds are the main problem)
 * 2. Else if KP < 3 → low_kp (geomagnetic activity too weak)
 * 3. Else if darkness < 50 → too_bright (not dark enough)
 * 4. Else → mixed_conditions (no single dominant factor)
 *
 * This hierarchy prioritizes cloud cover as the most easily perceived limiting factor,
 * then KP (cosmic trigger), then darkness (temporal), and finally mixed conditions.
 *
 * @param input - Forecast window parameters
 * @returns The primary limiting factor preventing better viewing
 */
export function detectLimitingFactor(input: LimitingFactorInput): LimitingFactor {
  // Rule 1: Excessive cloud cover (> 60%) is always the primary limiting factor
  if (input.cloudCover > 60) {
    return 'cloud_cover';
  }

  // Rule 2: Weak geomagnetic activity (KP < 3)
  if (input.kpIndex < 3) {
    return 'low_kp';
  }

  // Rule 3: Insufficient darkness (darkness factor < 50)
  const darkness = solarElevationToDarkness(input.solarElevation);
  if (darkness < 50) {
    return 'too_bright';
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
