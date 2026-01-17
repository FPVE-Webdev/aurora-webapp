import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, alertPreference, latitude, longitude } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Missing subscription data' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract subscription keys
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh || '';
    const auth = subscription.keys?.auth || '';

    // Get user agent for debugging
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh,
          auth,
          alert_preference: alertPreference || 'strict',
          latitude: latitude || null,
          longitude: longitude || null,
          active: true,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', endpoint);

      if (error) {
        console.error('Failed to update subscription:', error);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription updated',
      });
    }

    // Create new subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        endpoint,
        p256dh,
        auth,
        alert_preference: alertPreference || 'strict',
        latitude: latitude || null,
        longitude: longitude || null,
        active: true,
        user_agent: userAgent,
      });

    if (error) {
      console.error('Failed to create subscription:', error);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription created',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
