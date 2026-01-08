import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRODUCTS, StripeProductKey } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productKey, email } = body as {
      productKey: StripeProductKey;
      email?: string;
    };

    // Validate product key
    if (!productKey || !STRIPE_PRODUCTS[productKey]) {
      return NextResponse.json(
        { error: 'Invalid product key' },
        { status: 400 }
      );
    }

    const product = STRIPE_PRODUCTS[productKey];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'nok',
            product_data: {
              name: product.name,
              description: `Premium tilgang i ${product.duration_hours} timer`,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/payment/cancelled`,
      metadata: {
        productKey,
        tier: product.tier,
        duration_hours: product.duration_hours.toString(),
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
