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
 * Get the effective subscription tier for a user
 * During free period, all users get premium_7d tier
 * Otherwise, returns the actual tier
 */
export const getEffectiveTier = (actualTier: string): string => {
  if (isFreePeriodActive()) {
    return 'premium_7d' // Give all users premium_7d tier during free period
  }
  return actualTier
}
