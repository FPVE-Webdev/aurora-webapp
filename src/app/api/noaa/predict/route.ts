/**
 * NOAA Aurora Prediction API Endpoint
 * ML-based aurora probability prediction
 * Phase 2: Advanced Analytics
 */

import { NextResponse } from 'next/server';
import { predictAuroraProbability } from '@/lib/noaa/auroraPredictor';
import axios from 'axios';

const CACHE_TTL = 600000; // 10 minutes

let cache: {
  data: any | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

export async function GET(request: Request) {
  try {
    const now = Date.now();

    // Return cached prediction if fresh
    if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        ...cache.data,
        cached: true,
        cacheAge: Math.floor((now - cache.timestamp) / 1000),
      });
    }

    // Fetch current conditions from NOAA
    const [kpRes, solarWindRes, magRes] = await Promise.all([
      axios.get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        timeout: 10000,
      }),
      axios.get('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json', {
        timeout: 10000,
      }),
      axios.get('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json', {
        timeout: 10000,
      }),
    ]);

    // Parse current values
    const kpData = kpRes.data.slice(1); // Skip header
    const currentKp = parseFloat(kpData[kpData.length - 1][1]);

    const solarWindData = solarWindRes.data.slice(1);
    const validSolarWind = solarWindData.filter((e: any) => e[2] !== null);
    const currentSolarWind = parseFloat(validSolarWind[validSolarWind.length - 1][2]);

    const magData = magRes.data.slice(1);
    const validMag = magData.filter((e: any) => e[2] !== null);
    const currentBz = parseFloat(validMag[validMag.length - 1][2]);

    // Get ML prediction
    const prediction = await predictAuroraProbability(currentKp, currentSolarWind, currentBz);

    const result = {
      prediction: {
        probability: prediction.probability,
        confidence: prediction.confidence,
        recommendation: prediction.recommendation,
      },
      factors: prediction.factors,
      currentConditions: {
        kp: currentKp,
        solarWindSpeed: currentSolarWind,
        bz: currentBz,
      },
      timestamp: new Date().toISOString(),
      model: 'Aurora Predictor v1.0',
    };

    // Cache result
    cache.data = result;
    cache.timestamp = now;

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating prediction:', error);

    // Return cached data if available
    if (cache.data) {
      return NextResponse.json({
        ...cache.data,
        cached: true,
        stale: true,
        error: 'Using cached prediction due to fetch error',
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to generate prediction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
