import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRODUCTS } from '@/lib/stripe';
import { getSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract metadata
        const { productKey, tier, duration_hours } = session.metadata || {};
        const customerEmail = session.customer_email || session.customer_details?.email;

        if (!productKey || !tier || !duration_hours || !customerEmail) {
          console.error('Missing required metadata in checkout session:', session.id);
          break;
        }

        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(duration_hours));

        // Store in Supabase
        const supabase = getSupabaseClient();

        if (supabase) {
          const { error } = await supabase
            .from('stripe_customers')
            .upsert({
              user_email: customerEmail,
              stripe_customer_id: session.customer as string,
              subscription_status: 'active',
              current_tier: tier,
              expires_at: expiresAt.toISOString(),
              payment_session_id: session.id,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_email',
            });

          if (error) {
            console.error('Error storing payment in Supabase:', error);
          } else {
            console.log(`✅ Payment successful for ${customerEmail} - ${tier} until ${expiresAt}`);
          }
        } else {
          console.warn('Supabase not configured - payment received but not stored');
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
