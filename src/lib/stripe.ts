import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
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
  PREMIUM_96H: {
    name: 'Nordlys Tromsø - 96-timers tilgang',
    price: 14900, // 149 NOK in øre
    duration_hours: 96,
    tier: 'premium_7d' as const, // Reusing existing tier name
  },
} as const;

export type StripeProductKey = keyof typeof STRIPE_PRODUCTS;
