/**
 * UI Directives Generator
 *
 * Translates Site-AI decision logic into concrete UI rendering instructions.
 * The frontend reads these directives and renders accordingly, with NO decision logic.
 *
 * This ensures a clear separation of concerns:
 * - Site-AI: Computes decisions
 * - UI Directives: Translates to rendering instructions
 * - Frontend: Renders only based on directives
 */

import { SiteAIUIDirectives, SiteAIWindow } from '@/types/siteAI';

/**
 * Generate UI directives based on forecast windows and their ADS scores.
 *
 * Decision rules:
 * 1. If all ADS < 20: hide entire 48h grid, show minimal message
 * 2. If any ADS ≥ 50: show full 48h grid, highlight top 3 windows
 * 3. If 1-3 windows ADS ≥ 30: show only those windows, highlight best (top 1)
 * 4. Show "Best Viewing Time" banner only if max ADS ≥ 30
 *
 * @param windows - Array of forecast windows with ADS scores
 * @returns UI directives controlling frontend rendering
 */
export function generateUIDirectives(windows: SiteAIWindow[]): SiteAIUIDirectives {
  if (windows.length === 0) {
    // Edge case: no windows to display
    return {
      show48Grid: false,
      highlightTop: 0,
      showBestBanner: false,
    };
  }

  // Find max ADS to determine overall strategy
  const maxADS = Math.max(...windows.map((w) => w.ads));

  // Count windows with ADS >= 30 (viable windows)
  const viableWindowsCount = windows.filter((w) => w.ads >= 30).length;

  // Count windows with ADS >= 50 (good windows)
  const goodWindowsCount = windows.filter((w) => w.ads >= 50).length;

  // Rule 1: If all ADS < 20, hide grid completely
  if (maxADS < 20) {
    return {
      show48Grid: false,
      highlightTop: 0,
      showBestBanner: false,
    };
  }

  // Rule 4: Show banner only if max ADS >= 30
  const showBestBanner = maxADS >= 30;

  // Rule 2: If any ADS >= 50, show full grid and highlight top 3
  if (goodWindowsCount > 0) {
    return {
      show48Grid: true,
      highlightTop: Math.min(3, goodWindowsCount) as 1 | 2 | 3,
      showBestBanner,
    };
  }

  // Rule 3: If 1-3 windows ADS >= 30, show only those and highlight best
  if (viableWindowsCount > 0 && viableWindowsCount <= 3) {
    return {
      show48Grid: true, // Show grid but it will filter to viable windows
      highlightTop: 1, // Highlight the single best window
      showBestBanner,
    };
  }

  // Fallback: Show grid with best highlighted (shouldn't reach here if logic is correct)
  return {
    show48Grid: true,
    highlightTop: 1,
    showBestBanner,
  };
}

/**
 * Determine if the UI should filter to only viable windows (ADS >= 30).
 * Used by components to decide whether to show all windows or just good ones.
 *
 * @param maxADS - Maximum ADS in the forecast
 * @returns true if grid should show all windows, false if should filter
 */
export function shouldShowFullGrid(maxADS: number): boolean {
  // Show full grid only if we have good conditions (any ADS >= 50)
  return maxADS >= 50;
}

/**
 * Get the set of window indices to highlight.
 * Used to style specific windows in the UI.
 *
 * @param windows - Array of forecast windows
 * @param highlightCount - Number of top windows to highlight (0-3)
 * @returns Array of indices to highlight
 */
export function getWindowsToHighlight(
  windows: SiteAIWindow[],
  highlightCount: 0 | 1 | 2 | 3
): number[] {
  if (highlightCount === 0) {
    return [];
  }

  // Sort windows by ADS (descending) and get top N
  const sorted = windows
    .map((w, i) => ({ window: w, originalIndex: i }))
    .sort((a, b) => b.window.ads - a.window.ads)
    .slice(0, highlightCount)
    .map((item) => item.originalIndex)
    .sort((a, b) => a - b); // Re-sort by original position for consistent rendering

  return sorted;
}
