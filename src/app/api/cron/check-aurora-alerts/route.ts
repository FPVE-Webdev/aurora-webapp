/**
 * Aurora Alert Cron Endpoint
 * Runs every 15 minutes to check aurora conditions and send push notifications
 * Checks Kp index, aurora probability, and cloud cover for Tromsø
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'development-secret';

interface AuroraConditions {
  kpIndex: number;
  probability: number;
  cloudCover: number;
  timestamp: string;
}

async function getAuroraConditions(): Promise<AuroraConditions | null> {
  try {
    // Fetch current aurora data from Tromsø.AI API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tromso.ai/api';
    const apiKey = process.env.TROMSO_AI_API_KEY;

    const response = await fetch(`${apiUrl}/aurora/now`, {
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
    });

    if (!response.ok) {
      throw new Error('Failed to fetch aurora data');
    }

    const data = await response.json();

    // Extract Kp index and probability
    const kpIndex = data.kpIndex || data.kp || 0;
    const probability = data.probability || data.chance || 0;

    // Fetch weather data for Tromsø (cloud cover)
    const weatherResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/weather/69.6492/18.9553`
    );

    let cloudCover = 100; // Default to full cloud cover if weather fetch fails

    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      cloudCover = weatherData.cloudCover || weatherData.cloud_cover || 100;
    }

    return {
      kpIndex,
      probability,
      cloudCover,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching aurora conditions:', error);
    return null;
  }
}

function shouldAlertStrict(conditions: AuroraConditions): boolean {
  // Strict mode: Only alert when conditions are excellent
  // High Kp (≥5) AND low cloud cover (<30%)
  return conditions.kpIndex >= 5 && conditions.cloudCover < 30;
}

function shouldAlertEager(conditions: AuroraConditions): boolean {
  // Eager mode: Alert when conditions are good
  // Moderate Kp (≥3) AND reasonable cloud cover (<50%)
  // OR High Kp (≥4) regardless of clouds
  return (
    (conditions.kpIndex >= 3 && conditions.cloudCover < 50) ||
    conditions.kpIndex >= 4
  );
}

async function sendAlertsForPreference(
  preference: 'strict' | 'eager',
  conditions: AuroraConditions
) {
  const shouldAlert =
    preference === 'strict'
      ? shouldAlertStrict(conditions)
      : shouldAlertEager(conditions);

  if (!shouldAlert) {
    return { sent: 0, skipped: true, reason: 'Conditions not met' };
  }

  // Prepare alert message
  let title = 'Nordlys nå!';
  let message = `Kp ${conditions.kpIndex} - ${Math.round(conditions.probability)}% sjanse`;

  if (conditions.cloudCover < 30) {
    message += ` • Klar himmel ⭐`;
  } else if (conditions.cloudCover < 60) {
    message += ` • Delvis overskyet ☁️`;
  }

  if (conditions.kpIndex >= 6) {
    title = '🌟 Sterkt nordlys!';
  } else if (conditions.kpIndex >= 5) {
    title = '✨ Godt nordlys!';
  }

  // Send push notification
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/push/send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        title,
        message,
        url: '/',
        alertPreference: preference,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to send push notifications');
  }

  const result = await response.json();
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current aurora conditions
    const conditions = await getAuroraConditions();

    if (!conditions) {
      return NextResponse.json(
        { error: 'Failed to fetch aurora conditions' },
        { status: 500 }
      );
    }

    // Check and send alerts for each preference level
    const strictResult = await sendAlertsForPreference('strict', conditions);
    const eagerResult = await sendAlertsForPreference('eager', conditions);

    return NextResponse.json({
      success: true,
      timestamp: conditions.timestamp,
      conditions: {
        kpIndex: conditions.kpIndex,
        probability: conditions.probability,
        cloudCover: conditions.cloudCover,
      },
      alerts: {
        strict: strictResult,
        eager: eagerResult,
      },
    });
  } catch (error) {
    console.error('Error in aurora alert cron:', error);
    return NextResponse.json(
      {
        error: 'Alert check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
