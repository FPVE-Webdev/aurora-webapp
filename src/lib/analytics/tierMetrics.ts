/**
 * Tier Metrics Utility
 * Aggregates tier-related analytics for dashboards and monitoring
 */

import type { SubscriptionTier } from '@/contexts/PremiumContext';

export interface TierMetricsSummary {
  tier: SubscriptionTier;
  totalViews: number;
  gateViews: number;
  upgradeclicks: number;
  zoomLimitHits: number;
  lockedFeatureClicks: number;
  conversionRate: number; // upgradeclicks / gateViews
}

export interface TierFunnelData {
  step: 'view' | 'gate_view' | 'upgrade_click' | 'conversion';
  count: number;
  dropoff?: number; // Percentage dropoff from previous step
}

/**
 * Calculate conversion funnel for tier upgrades
 * @param gateViews Number of times tier gate was shown
 * @param upgradeClicks Number of times upgrade button was clicked
 * @param conversions Number of actual tier upgrades
 */
export function calculateConversionFunnel(
  gateViews: number,
  upgradeClicks: number,
  conversions: number
): TierFunnelData[] {
  const clickThroughRate = gateViews > 0 ? (upgradeClicks / gateViews) * 100 : 0;
  const conversionRate = upgradeClicks > 0 ? (conversions / upgradeClicks) * 100 : 0;

  return [
    { step: 'gate_view', count: gateViews },
    {
      step: 'upgrade_click',
      count: upgradeClicks,
      dropoff: gateViews > 0 ? 100 - clickThroughRate : 0,
    },
    {
      step: 'conversion',
      count: conversions,
      dropoff: upgradeClicks > 0 ? 100 - conversionRate : 0,
    },
  ];
}

/**
 * Get tier metrics summary
 * Placeholder - would fetch from analytics backend in production
 *
 * Integration steps when analytics backend is ready:
 * 1. Set up Plausible/PostHog/Google Analytics
 * 2. Query events: 'tier_gate_viewed', 'tier_gate_upgrade_clicked', etc.
 * 3. Aggregate counts by tier and timeRange
 * 4. Calculate conversion rate: (upgradeclicks / gateViews) * 100
 */
export async function getTierMetrics(
  tier: SubscriptionTier,
  timeRange: '24h' | '7d' | '30d' = '7d'
): Promise<TierMetricsSummary> {
  // Returns zero values until analytics backend is integrated
  // Events are already being tracked via trackTierEvent() in tierEvents.ts
  return {
    tier,
    totalViews: 0,
    gateViews: 0,
    upgradeclicks: 0,
    zoomLimitHits: 0,
    lockedFeatureClicks: 0,
    conversionRate: 0,
  };
}

/**
 * Get most locked features (by click count)
 * Useful for prioritizing feature unlocks
 *
 * Integration steps when analytics backend is ready:
 * 1. Query 'feature_locked_clicked' events from analytics
 * 2. Group by feature name and count occurrences
 * 3. Sort by clicks descending, return top N
 */
export interface FeatureLockStats {
  feature: string;
  clicks: number;
  tier: SubscriptionTier;
}

export async function getMostLockedFeatures(
  limit: number = 10
): Promise<FeatureLockStats[]> {
  // Returns empty until analytics backend is integrated
  // Events are being tracked via trackLockedFeatureClick() in tierEvents.ts
  return [];
}

/**
 * Get upgrade conversion rate by feature
 * Shows which features drive most upgrades
 *
 * Integration steps when analytics backend is ready:
 * 1. Query 'tier_gate_viewed' events, group by feature
 * 2. Query 'tier_gate_upgrade_clicked' events, group by feature
 * 3. Calculate conversion rate per feature: (upgradeClicks / gateViews) * 100
 * 4. Sort by conversion rate descending
 */
export interface FeatureConversionStats {
  feature: string;
  gateViews: number;
  upgradeClicks: number;
  conversionRate: number;
}

export async function getFeatureConversionRates(): Promise<FeatureConversionStats[]> {
  // Returns empty until analytics backend is integrated
  // Events are being tracked via trackTierGateView/trackTierGateUpgrade in tierEvents.ts
  return [];
}
