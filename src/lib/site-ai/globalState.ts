/**
 * Global Forecast State Logic
 *
 * Determines the overall aurora forecast state (EXCELLENT / POSSIBLE / UNLIKELY)
 * based on the best (maximum) Aurora Decision Score in the 48-hour window.
 *
 * This drives the highest-level UI decision about whether it's worth going out.
 */

import { SiteAIWindow, SiteAIBestWindow, SiteAINextWindow, SiteAIForecastWindow } from '@/types/siteAI';
import { classifyADS } from './auroraDecisionScore';

export type GlobalForecastState = 'excellent' | 'possible' | 'unlikely';

interface GlobalStateOutput {
  /** Overall forecast state */
  state: GlobalForecastState;
  /** The single best window in the forecast period */
  bestWindow: SiteAIBestWindow;
  /** The next viable window (if state is UNLIKELY), otherwise undefined */
  nextWindow?: SiteAINextWindow;
}

/**
 * Determine the global forecast state from a list of forecast windows.
 *
 * Decision logic:
 * - EXCELLENT: At least one window has ADS ≥ 70
 * - POSSIBLE: Best window ADS is between 30-69
 * - UNLIKELY: All windows have ADS < 30
 *
 * @param windows - Array of forecast windows with ADS scores
 * @param limitingFactorForBest - The limiting factor for the best window
 * @param hourlyForecasts - Optional hourly forecasts with probability data
 * @returns Global state, best window, and optionally next window
 */
export function computeGlobalState(
  windows: SiteAIWindow[],
  limitingFactorForBest: 'cloud_cover' | 'low_kp' | 'too_bright' | 'mixed_conditions',
  hourlyForecasts?: SiteAIForecastWindow[]
): GlobalStateOutput {
  if (windows.length === 0) {
    throw new Error('Cannot compute global state with no forecast windows');
  }

  // Find the best (maximum ADS) window
  let bestWindow = windows[0];
  for (const window of windows) {
    if (window.ads > bestWindow.ads) {
      bestWindow = window;
    }
  }

  // Determine global state based on best window's ADS
  let state: GlobalForecastState;
  if (bestWindow.ads >= 70) {
    state = 'excellent';
  } else if (bestWindow.ads >= 30) {
    state = 'possible';
  } else {
    state = 'unlikely';
  }

  // Build the best window output with limiting factor
  // Include probability from forecast if available
  const bestForecastForWindow = hourlyForecasts?.find(f => f.time === bestWindow.time);
  const bestWindowOutput: SiteAIBestWindow = {
    start: bestWindow.time,
    // End time is 1 hour after start (standard forecast window duration)
    end: new Date(new Date(bestWindow.time).getTime() + 60 * 60 * 1000).toISOString(),
    ads: bestWindow.ads,
    probabilityFromForecast: bestForecastForWindow?.probability,
    classification: bestWindow.classification,
    limitingFactor: limitingFactorForBest,
  };

  // For UNLIKELY state, find the next window with ADS ≥ 30
  let nextWindow: SiteAINextWindow | undefined;
  if (state === 'unlikely') {
    const viableWindow = windows.find((w) => w.ads >= 30);
    if (viableWindow) {
      nextWindow = {
        start: viableWindow.time,
        ads: viableWindow.ads,
      };
    }
  }

  return {
    state,
    bestWindow: bestWindowOutput,
    nextWindow,
  };
}

/**
 * Determine the global state from ADS values alone (lightweight operation).
 * Useful for filtering or quick decisions without building full output.
 */
export function determineState(maxADS: number): GlobalForecastState {
  if (maxADS >= 70) return 'excellent';
  if (maxADS >= 30) return 'possible';
  return 'unlikely';
}
