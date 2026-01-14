import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Product configuration
export const STRIPE_PRODUCTS = {
  PREMIUM_24H: {
    name: 'Nordlys Tromsø - 24-timers tilgang',
    price: 4900, // 49 NOK in øre
    duration_hours: 24,
    tier: 'premium_24h' as const,
  },
  PREMIUM_7D: {
    name: 'Nordlys Tromsø - 7-dagers tilgang',
    price: 14900, // 149 NOK in øre
    duration_hours: 168, // 7 days = 7 × 24 = 168 hours
    tier: 'premium_7d' as const,
  },
} as const;

export type StripeProductKey = keyof typeof STRIPE_PRODUCTS;
