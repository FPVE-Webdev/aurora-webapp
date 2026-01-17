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

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Extract metadata
        const { productKey, tier, duration_hours, email } = paymentIntent.metadata || {};

        if (!productKey || !tier || !duration_hours || !email) {
          console.error('Missing required metadata in payment intent:', paymentIntent.id);
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
              user_email: email,
              stripe_customer_id: paymentIntent.customer as string | null,
              subscription_status: 'active',
              current_tier: tier,
              expires_at: expiresAt.toISOString(),
              payment_intent_id: paymentIntent.id,
              payment_method_type: paymentIntent.payment_method_types?.[0] || 'unknown',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_email',
            });

          if (error) {
            console.error('Error storing payment intent in Supabase:', error);
          } else {
            console.log(`✅ Payment Intent succeeded for ${email} - ${tier} until ${expiresAt}`);
          }
        } else {
          console.warn('Supabase not configured - payment received but not stored');
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const email = paymentIntent.metadata?.email || 'unknown';
        console.error(`❌ Payment Intent failed for ${email}:`, paymentIntent.id);
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
