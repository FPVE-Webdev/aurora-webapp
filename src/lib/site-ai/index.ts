/**
 * Site-AI Decision Layer - Main Orchestrator
 *
 * This is the entry point for the Site-AI decision layer.
 * It orchestrates all sub-modules to compute the complete decision for the forecast page.
 *
 * Input: Raw hourly forecast data
 * Output: SiteAIDecision JSON (single source of truth for UI)
 */

import { SiteAIDecision, SiteAIInput, SiteAIWindow } from '@/types/siteAI';
import { computeADS } from './auroraDecisionScore';
import { computeGlobalState } from './globalState';
import { detectLimitingFactor } from './limitingFactor';
import { generateUIDirectives } from './uiDirectives';
import { generateExplanation } from './deterministicCopy';

/**
 * Compute the complete Site-AI decision for a forecast.
 *
 * This is the main entry point. It:
 * 1. Computes ADS for each forecast window
 * 2. Determines the global forecast state
 * 3. Detects the limiting factor for the best window
 * 4. Generates UI directives for frontend rendering
 * 5. Produces a human-readable explanation
 *
 * All decisions are fully deterministic. Same inputs always produce same outputs.
 *
 * @param input - Site-AI input with hourly forecasts and KP data
 * @returns Complete SiteAIDecision object ready for frontend consumption
 */
export function computeSiteAIDecision(input: SiteAIInput): SiteAIDecision {
  if (input.hourlyForecasts.length === 0) {
    throw new Error('Cannot compute Site-AI decision with no hourly forecasts');
  }

  // Step 1: Compute ADS for each forecast window
  const windows: SiteAIWindow[] = input.hourlyForecasts.map((forecast) => {
    const ads = computeADS({
      kpIndex: forecast.kpIndex,
      cloudCover: forecast.cloudCover,
      solarElevation: forecast.solarElevation,
      kpTrend: input.kpTrend,
    });

    return {
      time: forecast.time,
      ads: ads.score,
      classification: ads.classification,
    };
  });

  // Step 2: Find the best window and determine global state
  const bestWindow = windows.reduce((max, current) =>
    current.ads > max.ads ? current : max
  );

  // Step 3: Detect limiting factor for the best window
  const bestForecast = input.hourlyForecasts.find((f) => f.time === bestWindow.time);
  if (!bestForecast) {
    throw new Error('Could not find forecast data for best window');
  }

  const limitingFactor = detectLimitingFactor({
    cloudCover: bestForecast.cloudCover,
    kpIndex: bestForecast.kpIndex,
    solarElevation: bestForecast.solarElevation,
  });

  // Step 4: Compute global state
  const globalState = computeGlobalState(windows, limitingFactor);

  // Step 5: Generate UI directives
  const uiDirectives = generateUIDirectives(windows);

  // Step 6: Generate explanation text
  const explanation = generateExplanation({
    state: globalState.state,
    bestWindowADS: Math.round(globalState.bestWindow.ads),
    bestWindowStart: globalState.bestWindow.start,
    limitingFactor: globalState.bestWindow.limitingFactor,
    nextWindowStart: globalState.nextWindow?.start,
    travelTimeMinutes: input.travelTimeMinutes,
  });

  // Assemble final decision
  const decision: SiteAIDecision = {
    state: globalState.state,
    bestWindow: globalState.bestWindow,
    nextWindow: globalState.nextWindow,
    windows,
    uiDirectives,
    explanation,
    computedAt: new Date().toISOString(),
  };

  return decision;
}

// Export all sub-modules for testing and advanced use
export { computeADS } from './auroraDecisionScore';
export { computeGlobalState } from './globalState';
export { detectLimitingFactor, describeLimitingFactor } from './limitingFactor';
export { generateUIDirectives } from './uiDirectives';
export { generateExplanation, getLimitingFactorExplanation } from './deterministicCopy';
export { solarElevationToDarkness, getTwilightPhase } from './darkness';
