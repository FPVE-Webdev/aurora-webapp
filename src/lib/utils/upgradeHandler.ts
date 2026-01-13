/**
 * Upgrade Handler
 * Centralized navigation for premium upgrade flows
 */

import { SubscriptionTier } from '@/contexts/PremiumContext';

export interface UpgradeContext {
  from: SubscriptionTier;
  feature: string;
  source: 'tier-gate' | 'map-restriction' | 'settings';
}

/**
 * Navigate to upgrade page with context
 * For now, redirects to settings page
 * TODO: Create dedicated /upgrade page with pricing plans
 */
export function navigateToUpgrade(context: UpgradeContext): void {
  const params = new URLSearchParams({
    from: context.from,
    feature: context.feature,
    source: context.source,
  });

  // Temporary: redirect to settings
  // Future: redirect to /upgrade?params
  window.location.href = `/settings?${params.toString()}`;
}

/**
 * Get upgrade CTA text based on current tier
 */
export function getUpgradeCTA(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'Oppgrader til Premium';
    case 'premium_24h':
      return 'Forny 24-timers pass';
    case 'premium_7d':
      return 'Oppgrader til Enterprise';
    case 'enterprise':
      return 'Kontakt oss';
    default:
      return 'Oppgrader';
  }
}
