/**
 * TierGate Component
 * Reusable blur overlay with upgrade prompt for locked features
 */

'use client';

import { Lock, Sparkles } from 'lucide-react';
import type { SubscriptionTier } from '@/contexts/PremiumContext';
import type { LiveFeatures } from '@/lib/features/liveTierConfig';
import { getUpgradeMessage } from '@/lib/features/liveTierConfig';
import { trackTierGateView, trackTierGateDismiss, trackTierGateUpgrade } from '@/lib/analytics/tierEvents';
import { useEffect } from 'react';
import { isFreePeriodActive } from '@/lib/utils/featureFlags';

export interface TierGateProps {
  readonly currentTier: SubscriptionTier;
  readonly feature: keyof LiveFeatures;
  readonly featureTitle: string;
  readonly featureDescription: string;
  readonly children: React.ReactNode;
  readonly onUpgrade?: () => void;
  readonly className?: string;
}

/**
 * Wraps feature with blur overlay if locked for current tier
 */
export function TierGate({
  currentTier,
  feature,
  featureTitle,
  featureDescription,
  children,
  onUpgrade,
  className = '',
}: TierGateProps) {
  // During free period, unlock all features
  if (isFreePeriodActive()) {
    return <>{children}</>;
  }

  const upgradeInfo = getUpgradeMessage(currentTier, feature);
  const isLocked = upgradeInfo.message !== '';

  // Track when tier gate is displayed
  useEffect(() => {
    if (isLocked) {
      trackTierGateView(currentTier, feature);
    }
  }, [isLocked, currentTier, feature]);

  const handleUpgradeClick = () => {
    trackTierGateUpgrade(currentTier, feature);
    onUpgrade?.();
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-50 blur-sm">
        {children}
      </div>

      {/* Overlay prompt */}
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-6 max-w-sm border border-white/20 shadow-2xl">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>

          {/* Title */}
          <h3 className="text-white font-bold text-lg mb-2 text-center">
            {featureTitle}
          </h3>

          {/* Description */}
          <p className="text-white/80 text-sm mb-6 text-center leading-relaxed">
            {featureDescription}
          </p>

          {/* CTA Button */}
          {onUpgrade && upgradeInfo.price && (
            <button
              onClick={handleUpgradeClick}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg py-3 px-4 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Lås opp for {upgradeInfo.price}</span>
            </button>
          )}

          {/* Enterprise CTA */}
          {onUpgrade && !upgradeInfo.price && (
            <button
              onClick={handleUpgradeClick}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-lg py-3 px-4 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Kontakt oss for Enterprise
            </button>
          )}

          {/* Dismiss hint */}
          <p className="text-white/50 text-xs text-center mt-4">
            Klikk utenfor for å lukke
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline locked indicator for toolbar buttons with subtle pulse animation
 */
export function LockedBadge() {
  return (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center animate-pulse">
      <Lock className="w-2.5 h-2.5 text-white" />
    </span>
  );
}
