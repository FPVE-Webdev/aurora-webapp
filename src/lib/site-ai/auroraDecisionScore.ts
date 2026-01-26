/**
 * Aurora Decision Score (ADS) Calculation
 *
 * Computes a deterministic 0-100 score for each forecast window based on:
 * - KP index (geomagnetic activity): 35% weight
 * - Cloud cover (visibility): 35% weight
 * - Darkness (twilight phase): 25% weight
 * - KP trend (stability): ±5 point bonus/penalty
 *
 * The ADS is the core metric driving all UI decisions.
 * Identical inputs always produce identical ADS values.
 */

import { solarElevationToDarkness } from './darkness';

interface ADSInput {
  /** KP index (0-9 scale) */
  kpIndex: number;
  /** Cloud cover percentage (0-100) */
  cloudCover: number;
  /** Solar elevation angle in degrees */
  solarElevation: number;
  /** KP trend: increasing, stable, or decreasing */
  kpTrend: 'increasing' | 'stable' | 'decreasing';
}

interface ADSOutput {
  /** Aurora Decision Score (0-100) */
  score: number;
  /** Classification of the score */
  classification: 'excellent' | 'good' | 'moderate' | 'poor';
  /** Breakdown of score components (for debugging/documentation) */
  breakdown: {
    kpComponent: number;
    cloudComponent: number;
    darknessComponent: number;
    trendBonus: number;
    rawScore: number;
  };
}

/**
 * Compute the Aurora Decision Score for a single forecast window.
 *
 * @param input - Forecast window data (KP, cloud cover, solar elevation, trend)
 * @returns ADS output with score, classification, and component breakdown
 */
export function computeADS(input: ADSInput): ADSOutput {
  // Validate inputs
  const kpIndex = Math.max(0, Math.min(9, input.kpIndex));
  const cloudCover = Math.max(0, Math.min(100, input.cloudCover));
  const solarElevation = input.solarElevation;

  // Component 1: KP Index (normalized to 0-100, weighted 35%)
  // KP 0 = 0%, KP 9 = 100%
  const kpNormalized = (kpIndex / 9) * 100;
  const kpComponent = kpNormalized * 0.35;

  // Component 2: Cloud Cover (inverted, weighted 35%)
  // 0% clouds = 100 points, 100% clouds = 0 points
  const cloudComponent = (100 - cloudCover) * 0.35;

  // Component 3: Darkness (converted from solar elevation, weighted 25%)
  const darkness = solarElevationToDarkness(solarElevation);
  const darknessComponent = darkness * 0.25;

  // Component 4: Trend bonus/penalty (±5 points)
  const trendBonus =
    input.kpTrend === 'increasing' || input.kpTrend === 'stable' ? 5 : -5;

  // Combine all components
  const rawScore = kpComponent + cloudComponent + darknessComponent + trendBonus;

  // Normalize to 0-100 range
  // After normalization: max = 100 + 5 = 105, min = 0 - 5 = -5
  // Clamp to 0-100
  const score = Math.max(0, Math.min(100, rawScore));

  // Classify the score
  const classification =
    score >= 70
      ? ('excellent' as const)
      : score >= 50
        ? ('good' as const)
        : score >= 30
          ? ('moderate' as const)
          : ('poor' as const);

  return {
    score,
    classification,
    breakdown: {
      kpComponent,
      cloudComponent,
      darknessComponent,
      trendBonus,
      rawScore,
    },
  };
}

/**
 * Classify an ADS score without full breakdown (lightweight operation).
 */
export function classifyADS(score: number): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (score >= 70) return 'excellent';
  if (score >= 50) return 'good';
  if (score >= 30) return 'moderate';
  return 'poor';
}
