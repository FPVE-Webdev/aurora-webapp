/**
 * NOAA Data Collection Cron Endpoint
 * Called every hour by Vercel Cron or external scheduler
 * Phase 2: Advanced Analytics
 */

import { NextResponse } from 'next/server';
import { collectNOAAData } from '@/lib/noaa/dataCollector';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'development-secret';

export async function GET(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run data collection
    const result = await collectNOAAData();

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      recordsStored: result.recordsStored,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error in NOAA collection cron:', error);
    return NextResponse.json(
      {
        error: 'Collection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
