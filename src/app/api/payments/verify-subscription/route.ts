import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Query Supabase for active subscription
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('user_email', email)
      .eq('subscription_status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json({
        isPremium: false,
        tier: null,
        expiresAt: null,
      });
    }

    // Check if subscription is still valid
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      // Expired - update status
      await supabase
        .from('stripe_customers')
        .update({ subscription_status: 'expired' })
        .eq('id', data.id);

      return NextResponse.json({
        isPremium: false,
        tier: null,
        expiresAt: null,
      });
    }

    // Active subscription
    return NextResponse.json({
      isPremium: true,
      tier: data.current_tier,
      expiresAt: data.expires_at,
    });

  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { error: 'Failed to verify subscription' },
      { status: 500 }
    );
  }
}
