'use client';

import { ReactNode, useState } from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StripeProductKey } from '@/lib/stripe';

interface PremiumLockProps {
  children: ReactNode;
  feature: 'chatbot_routing' | 'map_best_spot' | 'forecast_24h';
  className?: string;
  blurStrength?: 'light' | 'medium' | 'strong';
}

// Translation keys for each feature
const FEATURE_KEYS = {
  chatbot_routing: {
    titleKey: 'preciseDrivingInstructions',
    descriptionKey: 'gpsCoordinatesDriveTime',
    badgeKey: 'aiGuide',
  },
  map_best_spot: {
    titleKey: 'bestSpotRightNow',
    descriptionKey: 'liveMapGpsNavigation',
    badgeKey: 'liveMap',
  },
  forecast_24h: {
    titleKey: 'forecast24h',
    descriptionKey: 'fullOverviewActivity',
    badgeKey: 'forecastLabel',
  },
} as const;

export function PremiumLock({
  children,
  feature,
  className,
  blurStrength = 'medium',
}: PremiumLockProps) {
  const { isPremium, isExpired, hoursRemaining } = usePremium();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show content if premium and not expired
  if (isPremium && !isExpired) {
    return <>{children}</>;
  }

  const keys = FEATURE_KEYS[feature];
  const config = {
    title: t(keys.titleKey as any),
    description: t(keys.descriptionKey as any),
    badge: t(keys.badgeKey as any),
  };
  const blurClass =
    blurStrength === 'light'
      ? 'blur-[2px]'
      : blurStrength === 'strong'
      ? 'blur-[8px]'
      : 'blur-[4px]';

  const handlePurchase = async (productKey: StripeProductKey) => {
    setIsLoading(true);
    setError(null);

    try {
      // Collect email (prompt user)
      const email = prompt(t('enterEmailForReceipt2'));
      if (!email) {
        setIsLoading(false);
        return;
      }

      // Validate email
      if (!email.includes('@')) {
        setError(t('invalidEmailAddress'));
        setIsLoading(false);
        return;
      }

      // Store email for verification later
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_email', email);
      }

      // Create Stripe Checkout Session
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : t('paymentError'));
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Blurred content */}
      <div className={cn('pointer-events-none select-none', blurClass)}>{children}</div>

      {/* Premium overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900/80 via-slate-900/90 to-slate-900/95 backdrop-blur-sm">
        <div className="max-w-sm mx-auto px-6 py-8 text-center">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {config.badge}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white mb-2">{config.title}</h3>

          {/* Description */}
          <p className="text-slate-300 text-sm mb-6">{config.description}</p>

          {/* Pricing */}
          <div className="space-y-3 mb-6">
            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
              onClick={() => handlePurchase('PREMIUM_24H')}
              disabled={isLoading}
            >
              <div className="text-left">
                <p className="text-white font-semibold">{t('oneNightPass')}</p>
                <p className="text-slate-400 text-xs">{t('perfectForTonight')}</p>
              </div>
              <p className="text-primary font-bold text-lg">49 kr</p>
            </button>

            <button
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 hover:from-primary/20 hover:to-purple-500/20 transition-colors disabled:opacity-50"
              onClick={() => handlePurchase('PREMIUM_7D')}
              disabled={isLoading}
            >
              <div className="text-left">
                <p className="text-white font-semibold">{t('sevenDayPass')}</p>
                <p className="text-slate-400 text-xs">{t('bestValuePopular')}</p>
              </div>
              <div className="text-right">
                <p className="text-primary font-bold text-lg">149 kr</p>
              </div>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 mb-4 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('openingPaymentWindow')}</span>
            </div>
          )}

          {/* Trust signals */}
          <p className="text-slate-500 text-xs mt-4">
            {t('securePaymentNoSubscription')}
          </p>
        </div>
      </div>

      {/* Expired badge (if user had premium before) */}
      {isExpired && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          {t('expired')}
        </div>
      )}

      {/* Time remaining badge (if premium is active) */}
      {hoursRemaining && hoursRemaining <= 6 && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          {t('hoursRemaining').replace('{hours}', hoursRemaining.toString())}
        </div>
      )}
    </div>
  );
}
