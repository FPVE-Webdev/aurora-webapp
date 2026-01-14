import { ObservationSpot, SpotTier } from '@/types/aurora';
import { SubscriptionTier } from '@/contexts/PremiumContext';

/**
 * Convert SubscriptionTier to SpotTier
 * - free -> free (only Tromsø)
 * - premium_24h/premium_7d -> pro (all Norway spots)
 * - enterprise -> enterprise (all spots including Arctic)
 */
export function getSpotTierFromSubscription(subscriptionTier: SubscriptionTier): SpotTier {
  if (subscriptionTier === 'free') return 'free';
  if (subscriptionTier === 'premium_24h' || subscriptionTier === 'premium_7d') return 'pro';
  return 'enterprise';
}

/**
 * Check if user can access a spot based on their subscription tier
 */
export function canAccessSpot(spot: ObservationSpot, subscriptionTier: SubscriptionTier): boolean {
  const userTier = getSpotTierFromSubscription(subscriptionTier);

  // Free users can only access free spots (Tromsø)
  if (userTier === 'free') {
    return spot.tier === 'free';
  }

  // Pro users can access free and pro spots (all Norway)
  if (userTier === 'pro') {
    return spot.tier === 'free' || spot.tier === 'pro';
  }

  // Enterprise users can access all spots
  return true;
}

/**
 * Filter spots based on user's subscription tier
 */
export function filterSpotsByTier(
  spots: ObservationSpot[],
  subscriptionTier: SubscriptionTier
): ObservationSpot[] {
  return spots.filter(spot => canAccessSpot(spot, subscriptionTier));
}
