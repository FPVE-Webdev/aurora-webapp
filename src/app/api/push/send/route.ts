import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:post@tromso.ai',
  vapidPublicKey,
  vapidPrivateKey
);

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  alert_preference: 'strict' | 'eager' | 'off';
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request (add your own auth here)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, message, url, alertPreference } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Missing title or message' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscriptions matching the alert preference
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('active', true);

    // Filter by preference if specified
    if (alertPreference) {
      query = query.in('alert_preference', [alertPreference, 'eager']);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Failed to fetch subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions',
        sent: 0,
      });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/Aurahalo.png',
      badge: '/favicon.ico',
      tag: 'aurora-alert',
      requireInteraction: true,
      data: {
        url: url || '/',
        timestamp: new Date().toISOString(),
      },
    });

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);

          // Update last_alert_sent_at
          await supabase
            .from('push_subscriptions')
            .update({ last_alert_sent_at: new Date().toISOString() })
            .eq('id', sub.id);

          return { success: true, id: sub.id };
        } catch (error: any) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);

          // If subscription is no longer valid (410 Gone), mark as inactive
          if (error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .update({ active: false })
              .eq('id', sub.id);
          }

          return { success: false, id: sub.id, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Send push error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
