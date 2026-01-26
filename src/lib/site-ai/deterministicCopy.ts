/**
 * Deterministic Copy Templates
 *
 * Generates human-readable explanations for aurora forecast states using
 * pre-defined templates. NO free-form text generation. Every explanation
 * is fully deterministic and auditable.
 *
 * This ensures users always get consistent, trust-building messaging
 * that explains the forecast decision.
 */

import { LimitingFactor, describeLimitingFactor } from './limitingFactor';

interface CopyInput {
  /** Global forecast state */
  state: 'excellent' | 'possible' | 'unlikely';
  /** Aurora Decision Score of the best window (0-100) */
  bestWindowADS: number;
  /** Best viewing window start time (ISO timestamp) */
  bestWindowStart: string;
  /** Primary limiting factor for the best window */
  limitingFactor: LimitingFactor;
  /** Next viable window (if state is UNLIKELY) */
  nextWindowStart?: string;
  /** Travel time from Tromsø in minutes (optional) */
  travelTimeMinutes?: number;
}

/**
 * Format a time string for human readability.
 * Converts ISO timestamp to a short local time format (e.g., "22:30").
 */
function formatTimeForDisplay(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    // Fallback if parsing fails
    return isoTimestamp;
  }
}

/**
 * Format travel time in minutes to readable string.
 */
function formatTravelTimeForDisplay(minutes: number): string {
  if (minutes === 0) return '(from Tromsø)';
  if (minutes < 60) return `(${minutes} min away)`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `(${hours}h ${mins}m away)` : `(${hours}h away)`;
}

/**
 * Generate deterministic copy based on forecast state and conditions.
 *
 * Templates:
 * - EXCELLENT: "Strong aurora conditions expected. Best viewing time: {{time}}. Confidence: {{ADS}}/100."
 * - POSSIBLE: "Limited aurora potential detected. Best window: {{time}}. Confidence: {{ADS}}/100. Main limitation: {{factor}}."
 * - UNLIKELY: "Aurora unlikely in the next 48 hours. Limiting factor: {{factor}}. Next possible window: {{time}} (low confidence)."
 *
 * @param input - Copy generation input with state, ADS, timing, and limiting factors
 * @returns Human-readable explanation
 */
export function generateExplanation(input: CopyInput): string {
  const bestTime = formatTimeForDisplay(input.bestWindowStart);
  const factorDescription = describeLimitingFactor(input.limitingFactor);
  const travelInfo = input.travelTimeMinutes !== undefined
    ? ` ${formatTravelTimeForDisplay(input.travelTimeMinutes)}`
    : '';

  switch (input.state) {
    case 'excellent':
      // Template for excellent conditions
      return (
        `Strong aurora conditions expected. ` +
        `Best viewing time: ${bestTime}${travelInfo}. ` +
        `Confidence: ${input.bestWindowADS}/100.`
      );

    case 'possible':
      // Template for possible conditions
      return (
        `Limited aurora potential detected. ` +
        `Best window: ${bestTime}${travelInfo}. ` +
        `Confidence: ${input.bestWindowADS}/100. ` +
        `Main limitation: ${factorDescription}.`
      );

    case 'unlikely':
      // Template for unlikely conditions
      const nextTimeStr = input.nextWindowStart
        ? ` (${formatTimeForDisplay(input.nextWindowStart)})`
        : '';
      return (
        `Aurora unlikely in the next 48 hours. ` +
        `Limiting factor: ${factorDescription}. ` +
        `Next possible window${nextTimeStr ? `: ${nextTimeStr}` : ''} (low confidence).`
      );

    default:
      return 'Unable to determine aurora forecast.';
  }
}

/**
 * Get a short explanation of the limiting factor.
 * Useful for supplementary messaging.
 */
export function getLimitingFactorExplanation(factor: LimitingFactor): string {
  switch (factor) {
    case 'cloud_cover':
      return 'Too many clouds are blocking the view. Clear skies are needed.';
    case 'low_kp':
      return 'Geomagnetic activity is too weak. Stronger solar wind is needed.';
    case 'too_bright':
      return 'The sky is not dark enough. Wait for it to get darker.';
    case 'mixed_conditions':
      return 'Multiple factors are preventing ideal conditions.';
  }
}
