/**
 * Aurora Status Constants
 * Centralized definitions for aurora probability levels, emojis, and labels
 */

export type AuroraProbabilityLevel = 'excellent' | 'good' | 'moderate' | 'poor';

/**
 * Emoji map for aurora probability levels
 */
export const AURORA_EMOJI_MAP: Record<AuroraProbabilityLevel, string> = {
  excellent: '🌟',
  good: '🟢',
  moderate: '🟡',
  poor: '❄️',
};

/**
 * English status labels for aurora probability levels
 * Note: Use LanguageContext for translations in components
 */
export const AURORA_STATUS_LABELS: Record<AuroraProbabilityLevel, string> = {
  excellent: 'Excellent!',
  good: 'Good conditions!',
  moderate: 'Moderate',
  poor: 'Poor conditions',
};

/**
 * Get probability level from numeric probability (0-100)
 */
export function getProbabilityLevel(probability: number): AuroraProbabilityLevel {
  if (probability >= 70) return 'excellent';
  if (probability >= 50) return 'good';
  if (probability >= 30) return 'moderate';
  return 'poor';
}

/**
 * Get emoji for a given probability value
 */
export function getProbabilityEmoji(probability: number): string {
  const level = getProbabilityLevel(probability);
  return AURORA_EMOJI_MAP[level];
}

/**
 * Get label for a given probability value
 */
export function getProbabilityLabel(probability: number): string {
  const level = getProbabilityLevel(probability);
  return AURORA_STATUS_LABELS[level];
}
