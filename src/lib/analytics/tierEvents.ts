/**
 * Tier-based Analytics Events
 * Track user interactions with premium features and upgrade prompts
 */

import type { SubscriptionTier } from '@/contexts/PremiumContext';

export type TierEventName =
  | 'tier_gate_viewed'
  | 'tier_gate_dismissed'
  | 'tier_gate_upgrade_clicked'
  | 'zoom_limit_reached'
  | 'feature_locked_clicked'
  | 'upgrade_navigation_started';

export interface TierEventData {
  tier: SubscriptionTier;
  feature?: string;
  source?: 'tier-gate' | 'map-restriction' | 'settings' | 'toolbar';
  zoomLevel?: number;
  timestamp?: number;
}

/**
 * Track tier-related analytics event
 * Sends to console in dev, can be extended to send to analytics service
 */
export function trackTierEvent(
  eventName: TierEventName,
  data: TierEventData
): void {
  const eventPayload = {
    event: eventName,
    ...data,
    timestamp: data.timestamp || Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };

  // Development: Log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Tier Analytics]', eventPayload);
  }

  // Production: Send to analytics service
  // TODO: Integrate with Plausible/PostHog/etc
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    try {
      // Example: window.plausible?.(eventName, { props: eventPayload });
      // Example: window.posthog?.capture(eventName, eventPayload);
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }
}

/**
 * Track TierGate component views
 */
export function trackTierGateView(tier: SubscriptionTier, feature: string): void {
  trackTierEvent('tier_gate_viewed', { tier, feature, source: 'tier-gate' });
}

/**
 * Track TierGate dismissals (user closes overlay)
 */
export function trackTierGateDismiss(tier: SubscriptionTier, feature: string): void {
  trackTierEvent('tier_gate_dismissed', { tier, feature, source: 'tier-gate' });
}

/**
 * Track upgrade button clicks from TierGate
 */
export function trackTierGateUpgrade(tier: SubscriptionTier, feature: string): void {
  trackTierEvent('tier_gate_upgrade_clicked', { tier, feature, source: 'tier-gate' });
}

/**
 * Track zoom limit reached events
 */
export function trackZoomLimit(tier: SubscriptionTier, zoomLevel: number): void {
  trackTierEvent('zoom_limit_reached', {
    tier,
    source: 'map-restriction',
    zoomLevel,
  });
}

/**
 * Track locked feature clicks
 */
export function trackLockedFeatureClick(
  tier: SubscriptionTier,
  feature: string,
  source: 'toolbar' | 'map-restriction'
): void {
  trackTierEvent('feature_locked_clicked', { tier, feature, source });
}

/**
 * Track upgrade navigation (from upgradeHandler)
 */
export function trackUpgradeNavigation(
  tier: SubscriptionTier,
  feature: string,
  source: 'tier-gate' | 'map-restriction' | 'settings'
): void {
  trackTierEvent('upgrade_navigation_started', { tier, feature, source });
}
