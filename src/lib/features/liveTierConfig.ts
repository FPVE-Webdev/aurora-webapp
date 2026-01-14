/**
 * Live Map Tier Configuration
 * Centralized feature flags and restrictions per subscription tier
 */

import type { SubscriptionTier } from '@/contexts/PremiumContext';

export interface MapRestrictions {
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly initialZoom: number;
  readonly bounds: [[number, number], [number, number]] | null; // null = unrestricted
  readonly maxSpots: number; // Max observation spots shown
  readonly allowCustomPin: boolean;
  readonly maxForecastHours: number; // Max hours in hourly forecast
}

export interface LiveFeatures {
  readonly animation: boolean; // Time slider (0-12h)
  readonly weatherLayers: boolean; // Cloud radar, temp heatmap
  readonly historicalComparison: boolean; // Compare to yesterday
  readonly shareScreenshot: boolean; // Export map as image
  readonly customViewingZones: boolean; // Draw polygon ROI
  readonly multiDayForecast: boolean; // 3-5 day timeline
  readonly dataExport: boolean; // CSV/JSON download
  readonly photoSpotDatabase: boolean; // Professional spots with tips
  readonly priorityRefresh: boolean; // 1min vs 5min refresh
}

export interface TierConfig {
  readonly name: string;
  readonly map: MapRestrictions;
  readonly features: LiveFeatures;
  readonly upgradeMessage: string;
  readonly ctaPrice?: string;
}

const TROMSO_CITY_BOUNDS: [[number, number], [number, number]] = [
  [18.85, 69.6],  // Southwest [lng, lat] - tighter than original
  [19.05, 69.7],  // Northeast [lng, lat]
];

const TROMSO_REGION_BOUNDS: [[number, number], [number, number]] = [
  [18.6, 69.5],   // Southwest - includes Kvaløya
  [19.2, 69.8],   // Northeast - includes Lyngen
];

export const TIER_CONFIGS: Readonly<Record<SubscriptionTier, TierConfig>> = {
  free: {
    name: 'Gratis',
    map: {
      minZoom: 8,
      maxZoom: 10,
      initialZoom: 8.5,
      bounds: TROMSO_CITY_BOUNDS,
      maxSpots: 3, // Only preset city spots
      allowCustomPin: false,
      maxForecastHours: 6, // Limited to 6-hour forecast
    },
    features: {
      animation: false, // LOCKED
      weatherLayers: false, // LOCKED
      historicalComparison: false,
      shareScreenshot: false,
      customViewingZones: false,
      multiDayForecast: false,
      dataExport: false,
      photoSpotDatabase: false,
      priorityRefresh: false,
    },
    upgradeMessage: 'Oppgrader for full tilgang til sanntidskart og prognoser',
    ctaPrice: '49 kr',
  },

  premium_24h: {
    name: '24-timers pass',
    map: {
      minZoom: 7,
      maxZoom: 12,
      initialZoom: 8.5,
      bounds: TROMSO_REGION_BOUNDS,
      maxSpots: 24, // All Tromsø region spots
      allowCustomPin: true,
      maxForecastHours: 48, // Full 48-hour forecast
    },
    features: {
      animation: true, // ✓ UNLOCKED
      weatherLayers: true, // ✓ UNLOCKED
      historicalComparison: true, // ✓ UNLOCKED
      shareScreenshot: true, // ✓ UNLOCKED
      customViewingZones: false, // Enterprise only
      multiDayForecast: false, // Enterprise only
      dataExport: false, // Enterprise only
      photoSpotDatabase: false, // Enterprise only
      priorityRefresh: false,
    },
    upgradeMessage: 'Oppgrader til Enterprise for planleggingsverktøy',
    ctaPrice: 'Kontakt oss',
  },

  premium_7d: {
    name: '7-dagers pass',
    map: {
      minZoom: 7,
      maxZoom: 12,
      initialZoom: 8.5,
      bounds: TROMSO_REGION_BOUNDS,
      maxSpots: 24,
      allowCustomPin: true,
      maxForecastHours: 48, // Full 48-hour forecast
    },
    features: {
      animation: true,
      weatherLayers: true,
      historicalComparison: true,
      shareScreenshot: true,
      customViewingZones: false,
      multiDayForecast: false,
      dataExport: false,
      photoSpotDatabase: false,
      priorityRefresh: false,
    },
    upgradeMessage: 'Oppgrader til Enterprise for profesjonelle verktøy',
    ctaPrice: 'Kontakt oss',
  },

  enterprise: {
    name: 'Enterprise',
    map: {
      minZoom: 5,
      maxZoom: 14,
      initialZoom: 6,
      bounds: null, // Unrestricted - full Nordic access
      maxSpots: 100, // All Norway spots
      allowCustomPin: true,
      maxForecastHours: 72, // Extended 72-hour forecast
    },
    features: {
      animation: true,
      weatherLayers: true,
      historicalComparison: true,
      shareScreenshot: true,
      customViewingZones: true, // ✓ ENTERPRISE ONLY
      multiDayForecast: true, // ✓ ENTERPRISE ONLY
      dataExport: true, // ✓ ENTERPRISE ONLY
      photoSpotDatabase: true, // ✓ ENTERPRISE ONLY
      priorityRefresh: true, // ✓ 1-minute refresh
    },
    upgradeMessage: '', // No upgrade needed
  },
};

/**
 * Get tier configuration for current subscription
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Check if feature is available for tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof LiveFeatures): boolean {
  return TIER_CONFIGS[tier].features[feature];
}

/**
 * Get upgrade message for locked feature
 */
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  feature: keyof LiveFeatures
): { message: string; targetTier: SubscriptionTier; price?: string } {
  // If already unlocked, no message
  if (hasFeature(currentTier, feature)) {
    return { message: '', targetTier: currentTier };
  }

  // Find the lowest tier that has this feature
  const tiers: SubscriptionTier[] = ['premium_24h', 'premium_7d', 'enterprise'];

  for (const tier of tiers) {
    if (hasFeature(tier, feature)) {
      const config = TIER_CONFIGS[tier];
      return {
        message: TIER_CONFIGS[currentTier].upgradeMessage,
        targetTier: tier,
        price: TIER_CONFIGS[currentTier].ctaPrice,
      };
    }
  }

  // Fallback
  return {
    message: 'Denne funksjonen krever oppgradering',
    targetTier: 'premium_24h',
    price: '49 kr',
  };
}

/**
 * Get refresh interval in milliseconds based on tier
 */
export function getRefreshInterval(tier: SubscriptionTier): number {
  return hasFeature(tier, 'priorityRefresh') ? 60000 : 300000; // 1min vs 5min
}

/**
 * Filter observation spots by tier
 * Supports both direct { id: string } and nested { spot: { id: string } }
 */
export function filterSpotsByTier<T extends { id: string } | { spot: { id: string } }>(
  spots: T[],
  tier: SubscriptionTier,
  freeSpotIds: string[] = ['tromso', 'sommaroy', 'grotfjord']
): T[] {
  const config = getTierConfig(tier);

  if (tier === 'free') {
    // Only show preset free spots
    return spots.filter(spot => {
      const id = 'id' in spot ? spot.id : spot.spot.id;
      return freeSpotIds.includes(id);
    });
  }

  // Premium/Enterprise: show all spots up to maxSpots limit
  return spots.slice(0, config.map.maxSpots);
}
