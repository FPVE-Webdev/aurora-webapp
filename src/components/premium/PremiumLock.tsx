'use client';

import { ReactNode } from 'react';
import { usePremium } from '@/contexts/PremiumContext';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumLockProps {
  children: ReactNode;
  feature: 'chatbot_routing' | 'map_best_spot' | 'forecast_24h';
  className?: string;
  blurStrength?: 'light' | 'medium' | 'strong';
}

const FEATURE_CONFIG = {
  chatbot_routing: {
    title: 'Presise kjøreinstruksjoner',
    description: 'GPS-koordinater, kjøretider og beste rute til nordlyset',
    badge: 'AI-guide',
  },
  map_best_spot: {
    title: 'Beste spot akkurat nå',
    description: 'Live kart med GPS-navigasjon til klareste himmel',
    badge: 'Live Kart',
  },
  forecast_24h: {
    title: '24-timers prognose',
    description: 'Full oversikt over aktivitet, skyer og beste tidspunkt',
    badge: 'Prognose',
  },
} as const;

export function PremiumLock({
  children,
  feature,
  className,
  blurStrength = 'medium',
}: PremiumLockProps) {
  const { isPremium, isExpired, hoursRemaining } = usePremium();

  // Show content if premium and not expired
  if (isPremium && !isExpired) {
    return <>{children}</>;
  }

  const config = FEATURE_CONFIG[feature];
  const blurClass =
    blurStrength === 'light'
      ? 'blur-[2px]'
      : blurStrength === 'strong'
      ? 'blur-[8px]'
      : 'blur-[4px]';

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
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-left">
                <p className="text-white font-semibold">1-Night Pass</p>
                <p className="text-slate-400 text-xs">Perfekt for i kveld</p>
              </div>
              <p className="text-primary font-bold text-lg">49 kr</p>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30">
              <div className="text-left">
                <p className="text-white font-semibold">7-Day Pass</p>
                <p className="text-slate-400 text-xs">Best value · Populær</p>
              </div>
              <div className="text-right">
                <p className="text-primary font-bold text-lg">149 kr</p>
                <p className="text-xs text-slate-400 line-through">343 kr</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-semibold shadow-lg transition-all"
            onClick={() => {
              // TODO: Open Stripe Checkout
              console.log('Open payment modal for feature:', feature);
            }}
          >
            Lås opp Aurora Guide
          </button>

          {/* Trust signals */}
          <p className="text-slate-500 text-xs mt-4">
            Trygg betaling · Ingen abonnement · Umiddelbar tilgang
          </p>
        </div>
      </div>

      {/* Expired badge (if user had premium before) */}
      {isExpired && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          Utløpt
        </div>
      )}

      {/* Time remaining badge (if premium is active) */}
      {hoursRemaining && hoursRemaining <= 6 && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          {hoursRemaining}t igjen
        </div>
      )}
    </div>
  );
}
