'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Lock, Loader2, ChevronDown, Shield, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { StripeProductKey } from '@/lib/stripe';
import { useLanguage } from '@/contexts/LanguageContext';
import PaymentRequestButton from '@/components/checkout/PaymentRequestButton';

type PlanId = '24h' | '7d';

interface PlanConfig {
  id: PlanId;
  stripeKey: StripeProductKey;
  name: string;
  price: string;
  priceInOre: number; // Price in øre for Stripe
  duration: string;
  features: string[];
  recommended: boolean;
}

const PLANS: PlanConfig[] = [
  {
    id: '24h',
    stripeKey: 'PREMIUM_24H',
    name: '24-hour pass',
    price: '19 kr',
    priceInOre: 1900,
    duration: '24 hours',
    features: [
      'Live aurora animation',
      'Weather layers (clouds, precipitation)',
      'Street-level zoom',
      '48-hour forecast',
      'Export map screenshots',
      'All Troms region spots',
    ],
    recommended: false,
  },
  {
    id: '7d',
    stripeKey: 'PREMIUM_7D',
    name: '7-day pass',
    price: '49 kr',
    priceInOre: 4900,
    duration: '7 days',
    features: [
      'Live aurora animation',
      'Weather layers (clouds, precipitation)',
      'Street-level zoom',
      '48-hour forecast',
      'Export map screenshots',
      'All Troms region spots',
    ],
    recommended: true,
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can I cancel or get a refund?',
    answer: 'This is a one-time purchase for a fixed duration (24 hours or 7 days). There are no recurring charges or subscriptions. Due to the nature of digital access, we cannot offer refunds once access is granted.',
  },
  {
    question: 'When do I get access?',
    answer: 'You get instant access immediately after payment. Your premium features will be unlocked as soon as the payment is confirmed by Stripe.',
  },
  {
    question: 'What if the weather is bad?',
    answer: 'Your access remains valid regardless of weather conditions. You can use the app to check forecasts, weather layers, and plan for when conditions improve.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Yes! All payments are processed by Stripe, a leading payment processor trusted by millions of businesses worldwide. We never see or store your card details. All transactions are encrypted with SSL.',
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No account needed! We only need your email to send you a receipt. Your premium access is linked to your browser and email.',
  },
  {
    question: 'Can I use this on multiple devices?',
    answer: 'Yes! Your premium access is linked to your email. Simply use the same email on different devices to access your premium features.',
  },
];

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const initialPlan = (searchParams.get('plan') as PlanId) || '7d';
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate email
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
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
        body: JSON.stringify({ productKey: plan.stripeKey, email }),
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
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/upgrade"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </Link>
        </div>

        {/* Secure Checkout Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 text-primary">
            <Lock className="w-5 h-5" />
            <span className="text-sm font-semibold">Secure Checkout</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
            Complete Your Purchase
          </h1>
        </div>

        {/* Main Checkout Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Selection */}
          <div className="card-aurora bg-arctic-800/50 rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Choose your plan</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPlan === p.id
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  {p.recommended && (
                    <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                      Recommended
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-semibold mb-1">{p.name}</h3>
                      <p className="text-2xl font-bold text-primary">{p.price}</p>
                      <p className="text-sm text-white/60">for {p.duration}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === p.id
                          ? 'border-primary bg-primary'
                          : 'border-white/30'
                      }`}
                    >
                      {selectedPlan === p.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="card-aurora bg-arctic-800/50 rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Order summary</h2>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">{plan.name}</p>
                <p className="text-sm text-white/60">Premium access for {plan.duration}</p>
              </div>
              <p className="text-2xl font-bold text-primary">{plan.price}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/80 mb-2">Includes:</p>
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/70">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Email Input */}
          <div className="card-aurora bg-arctic-800/50 rounded-xl border border-white/10 p-6">
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Email address
            </label>
            <p className="text-sm text-white/60 mb-4">We'll send your receipt here</p>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Payment Request Button (Apple Pay / Google Pay) */}
          {email && email.includes('@') && (
            <>
              <PaymentRequestButton
                amount={plan.priceInOre}
                currency="nok"
                email={email}
                planName={plan.name}
                productKey={plan.stripeKey}
                onSuccess={() => router.push('/payment/success')}
                onError={(error) => setError(error)}
              />

              {/* OR Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="text-sm text-white/60">OR</span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>
            </>
          )}

          {/* Fallback CTA Button (Card Payment via Stripe Checkout) */}
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-4 px-6 rounded-lg border-2 border-white/20 hover:border-primary bg-white/5 hover:bg-white/10 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Opening secure payment...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pay with Card
              </>
            )}
          </button>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 py-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Shield className="w-4 h-4" />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>Powered by Stripe</span>
            </div>
          </div>
          <p className="text-center text-xs text-white/50">
            Secure payment • No hidden fees • One-time purchase
          </p>
        </form>

        {/* FAQ Section */}
        <div className="mt-12 card-aurora bg-arctic-800/50 rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="border-b border-white/10 last:border-b-0 pb-3 last:pb-0">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left py-2 text-white/80 hover:text-white transition-colors"
                >
                  <span className="font-medium text-sm">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <p className="text-sm text-white/60 mt-2 pb-2">{item.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-white/50">
          <p>
            Questions?{' '}
            <a href="mailto:support@tromso.ai" className="text-primary hover:text-primary/80">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
