import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRODUCTS, StripeProductKey } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productKey, email } = body as {
      productKey: StripeProductKey;
      email: string;
    };

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate product key
    if (!productKey || !STRIPE_PRODUCTS[productKey]) {
      return NextResponse.json(
        { error: 'Invalid product key' },
        { status: 400 }
      );
    }

    const product = STRIPE_PRODUCTS[productKey];

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: product.price,
      currency: 'nok',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        productKey,
        tier: product.tier,
        duration_hours: product.duration_hours.toString(),
        email,
      },
      receipt_email: email,
      description: `${product.name} - ${email}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
