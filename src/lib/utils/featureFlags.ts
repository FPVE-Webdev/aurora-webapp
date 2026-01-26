/**
 * Feature flags for controlling app-wide functionality
 */

/**
 * Check if the free period is currently active
 * During free period, all premium features are available to all users
 */
export const isFreePeriodActive = (): boolean => {
  return process.env.NEXT_PUBLIC_FREE_PERIOD_ENABLED === 'true'
}

/**
 * Check if the promotional period is currently active
 * Promotional period: launch to 2026-03-01
 * All users get premium_7d tier during this period
 */
export const isPromotionalPeriodActive = (): boolean => {
  const promotionalEndDate = new Date('2026-03-01T00:00:00Z');
  return Date.now() < promotionalEndDate.getTime();
}

/**
 * Get the effective subscription tier for a user
 * During free period or promotional period, all users get premium_7d tier
 * Otherwise, returns the actual tier
 */
export const getEffectiveTier = (actualTier: string): string => {
  const isFreePeriod = isFreePeriodActive();
  const isPromo = isPromotionalPeriodActive();

  if (isFreePeriod || isPromo) {
    return 'premium_7d' // Give all users premium_7d tier during free period or promotional period
  }
  return actualTier
}
