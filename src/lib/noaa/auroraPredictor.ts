/**
 * Aurora Prediction Model
 * Simple ML-based aurora probability predictor using historical patterns
 * Phase 2: Advanced Analytics
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Only create client if credentials are available
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface Features {
  kp: number;
  kp3hAvg: number;
  kpTrend: number;
  solarWindSpeed: number;
  bz: number;
  bzNegativeDuration: number; // Hours with negative Bz
  hourOfDay: number; // 0-23
  month: number; // 1-12
}

interface Prediction {
  probability: number;
  confidence: number;
  factors: {
    kpContribution: number;
    solarWindContribution: number;
    bzContribution: number;
    temporalContribution: number;
  };
  recommendation: string;
}

/**
 * Predict aurora probability based on current conditions
 */
export async function predictAuroraProbability(
  currentKp: number,
  currentSolarWind: number,
  currentBz: number
): Promise<Prediction> {
  try {
    // Get historical context
    const context = await getHistoricalContext();

    // Extract features
    const features: Features = {
      kp: currentKp,
      kp3hAvg: context.kp3hAvg || currentKp,
      kpTrend: context.kpTrend || 0,
      solarWindSpeed: currentSolarWind,
      bz: currentBz,
      bzNegativeDuration: context.bzNegativeDuration || 0,
      hourOfDay: new Date().getHours(),
      month: new Date().getMonth() + 1,
    };

    // Calculate probability using weighted factors
    const { probability, factors } = calculateProbability(features);

    // Calculate confidence based on data availability
    const confidence = calculateConfidence(context);

    // Generate recommendation
    const recommendation = getRecommendation(probability, features);

    return {
      probability,
      confidence,
      factors,
      recommendation,
    };
  } catch (error) {
    console.error('Error predicting aurora probability:', error);

    // Fallback to simple calculation
    return {
      probability: simpleProbability(currentKp, currentSolarWind, currentBz),
      confidence: 50,
      factors: {
        kpContribution: 0,
        solarWindContribution: 0,
        bzContribution: 0,
        temporalContribution: 0,
      },
      recommendation: 'Limited data available - basic prediction only',
    };
  }
}

/**
 * Get historical context for better predictions
 */
async function getHistoricalContext(): Promise<{
  kp3hAvg?: number;
  kpTrend?: number;
  bzNegativeDuration?: number;
}> {
  if (!supabase) {
    console.warn('Supabase client not configured, using minimal context');
    return {};
  }

  const threeHoursAgo = new Date();
  threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

  const { data, error } = await supabase
    .from('noaa_historical_data')
    .select('kp_index, bz_component')
    .gte('timestamp', threeHoursAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(12); // Last 3 hours at 15-min intervals

  if (error || !data || data.length === 0) {
    return {};
  }

  // Calculate 3-hour average Kp
  const kpValues = data.map((d) => d.kp_index).filter((v): v is number => v !== null);
  const kp3hAvg = kpValues.length > 0
    ? kpValues.reduce((a, b) => a + b, 0) / kpValues.length
    : undefined;

  // Calculate Kp trend (current - 3h ago)
  const kpTrend = kpValues.length >= 2
    ? kpValues[0] - kpValues[kpValues.length - 1]
    : undefined;

  // Count hours with negative Bz
  const bzValues = data.map((d) => d.bz_component).filter((v): v is number => v !== null);
  const bzNegativeDuration = bzValues.filter((v) => v < 0).length * 0.25; // Convert to hours

  return {
    kp3hAvg,
    kpTrend,
    bzNegativeDuration,
  };
}

/**
 * Calculate probability using weighted feature importance
 */
function calculateProbability(features: Features): {
  probability: number;
  factors: Prediction['factors'];
} {
  let probability = 0;

  // Kp contribution (40% weight)
  let kpScore = 0;
  if (features.kp < 2) kpScore = 10;
  else if (features.kp < 4) kpScore = 30;
  else if (features.kp < 6) kpScore = 60;
  else if (features.kp < 8) kpScore = 85;
  else kpScore = 95;

  // Boost for rising Kp
  if (features.kpTrend > 0.5) kpScore += 5;
  if (features.kpTrend > 1.5) kpScore += 10;

  const kpContribution = kpScore * 0.4;
  probability += kpContribution;

  // Solar wind contribution (30% weight)
  let windScore = 0;
  if (features.solarWindSpeed < 400) windScore = 20;
  else if (features.solarWindSpeed < 500) windScore = 40;
  else if (features.solarWindSpeed < 600) windScore = 60;
  else if (features.solarWindSpeed < 700) windScore = 80;
  else windScore = 100;

  const solarWindContribution = windScore * 0.3;
  probability += solarWindContribution;

  // Bz contribution (25% weight)
  let bzScore = 0;
  if (features.bz > 0) bzScore = 10; // Positive Bz is bad for aurora
  else if (features.bz > -3) bzScore = 40;
  else if (features.bz > -7) bzScore = 70;
  else bzScore = 100;

  // Boost for sustained negative Bz
  if (features.bzNegativeDuration > 1) bzScore += 10;
  if (features.bzNegativeDuration > 2) bzScore += 10;

  const bzContribution = Math.min(bzScore, 100) * 0.25;
  probability += bzContribution;

  // Temporal contribution (5% weight)
  let temporalScore = 50; // Base

  // Higher probability around midnight (21:00 - 03:00)
  if (features.hourOfDay >= 21 || features.hourOfDay <= 3) {
    temporalScore = 80;
  } else if (features.hourOfDay >= 18 || features.hourOfDay <= 6) {
    temporalScore = 60;
  }

  // Higher probability during equinoxes (March, September, October)
  if ([3, 9, 10].includes(features.month)) {
    temporalScore += 10;
  }

  const temporalContribution = temporalScore * 0.05;
  probability += temporalContribution;

  // Cap at 100%
  probability = Math.min(Math.round(probability), 100);

  return {
    probability,
    factors: {
      kpContribution: Math.round(kpContribution),
      solarWindContribution: Math.round(solarWindContribution),
      bzContribution: Math.round(bzContribution),
      temporalContribution: Math.round(temporalContribution),
    },
  };
}

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(context: {
  kp3hAvg?: number;
  kpTrend?: number;
  bzNegativeDuration?: number;
}): number {
  let confidence = 100;

  // Reduce confidence if missing context
  if (!context.kp3hAvg) confidence -= 20;
  if (!context.kpTrend) confidence -= 15;
  if (!context.bzNegativeDuration) confidence -= 15;

  return Math.max(confidence, 30);
}

/**
 * Generate human-readable recommendation
 */
function getRecommendation(probability: number, features: Features): string {
  if (probability > 85) {
    return 'Excellent! Go outside now! Very high chance of aurora activity.';
  } else if (probability > 70) {
    return 'Very good chance - worth checking outside frequently.';
  } else if (probability > 50) {
    return 'Moderate chance - keep monitoring conditions.';
  } else if (probability > 30) {
    return 'Low chance - maybe later tonight. Keep checking.';
  } else {
    return 'Very low chance - unlikely to see aurora under current conditions.';
  }
}

/**
 * Simple fallback probability calculation
 */
function simpleProbability(kp: number, solarWind: number, bz: number): number {
  let prob = (kp / 9) * 100;

  if (solarWind > 500) prob += 10;
  if (solarWind > 700) prob += 20;

  if (bz < -3) prob += 15;
  if (bz < -7) prob += 25;

  return Math.min(Math.round(prob), 100);
}
