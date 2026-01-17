'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StripeProductKey } from '@/lib/stripe';

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { subscriptionTier } = usePremium();
  const { t } = useLanguage();

  const from = searchParams.get('from') || 'free';
  const feature = searchParams.get('feature') || '';
  const source = searchParams.get('source') || '';

  const handleSelectPlan = (planId: string) => {
    // Map plan ID to checkout plan parameter
    const checkoutPlan = planId === 'premium_24h' ? '24h' : '7d';
    router.push(`/checkout?plan=${checkoutPlan}`);
  };

  const plans = [
    {
      stripeProductKey: 'PREMIUM_24H' as StripeProductKey,
      id: 'premium_24h',
      name: '24-hour pass',
      price: '19 kr',
      period: '24 hours',
      features: [
        'Live aurora animation',
        'Weather layers (clouds, precipitation)',
        'Street-level zoom',
        '48-hour forecast',
        'Export map screenshots',
        'All Troms region spots',
      ],
      highlighted: from === 'free',
      comingSoon: false,
    },
    {
      stripeProductKey: 'PREMIUM_7D' as StripeProductKey,
      id: 'premium_7d',
      name: '7-day pass',
      price: '49 kr',
      period: '7 days',
      features: [
        'Live aurora animation',
        'Weather layers (clouds, precipitation)',
        'Street-level zoom',
        '48-hour forecast',
        'Export map screenshots',
        'All Troms region spots',
      ],
      highlighted: from === 'premium_24h',
      comingSoon: false,
    },
  ];

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Upgrade to Premium
          </h1>
          {feature && (
            <p className="text-lg text-white/70">
              Unlock <span className="text-primary font-semibold">{feature}</span> and more
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card-aurora rounded-xl p-6 relative ${
                plan.highlighted
                  ? 'bg-primary/10 border-2 border-primary shadow-lg shadow-primary/20'
                  : 'bg-arctic-800/50 border border-white/10'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-primary px-4 py-1 rounded-full flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Recommended</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-primary mb-1">{plan.price}</div>
                {plan.period && (
                  <div className="text-sm text-white/60">for {plan.period}</div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                  plan.highlighted
                    ? 'bg-primary hover:bg-primary/90 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={subscriptionTier === plan.id}
              >
                {subscriptionTier === plan.id ? 'Current plan' : 'Choose plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-white/60">
          <p className="mb-2">Secure payment via Stripe • No hidden fees</p>
          <p>
            Questions?{' '}
            <a href="mailto:support@tromso.ai" className="text-primary hover:text-primary/80">
              Contact us
            </a>
          </p>
        </div>

        {/* Debug info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs text-white/60 space-y-1">
              <p>Debug info:</p>
              <p>Current tier: {subscriptionTier}</p>
              <p>From: {from}</p>
              <p>Feature: {feature}</p>
              <p>Source: {source}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
