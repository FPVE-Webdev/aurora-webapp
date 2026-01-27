/**
 * Site-AI Decision Layer Types
 *
 * Defines the complete data structures for the deterministic Aurora Decision Score system.
 * All decisions are rule-based, auditable, and produce the same output for identical inputs.
 */

/**
 * Represents a single forecast window (1-hour interval) with its ADS score and classification.
 */
export interface SiteAIWindow {
  /** Start time of the window (ISO 8601 timestamp) */
  time: string;
  /** Aurora Decision Score (0-100) */
  ads: number;
  /** Classification based on ADS value */
  classification: 'excellent' | 'good' | 'moderate' | 'poor';
  /** Whether it's dark enough to observe aurora (solarElevation ≤ -6°) */
  isDarkEnough: boolean;
}

/**
 * Represents the best window in the forecast period with detailed analysis.
 */
export interface SiteAIBestWindow {
  /** Start time of the window (ISO 8601 timestamp) */
  start: string;
  /** End time of the window (ISO 8601 timestamp) */
  end: string;
  /** Aurora Decision Score (0-100) */
  ads: number;
  /** Aurora viewing probability from hourly forecast data (0-100) */
  probabilityFromForecast?: number;
  /** Classification of this window */
  classification: 'excellent' | 'good' | 'moderate' | 'poor';
  /** Primary limiting factor preventing better viewing conditions */
  limitingFactor: 'cloud_cover' | 'low_kp' | 'too_bright' | 'mixed_conditions';
}

/**
 * Represents the next viable window if aurora conditions become possible.
 */
export interface SiteAINextWindow {
  /** Start time of the next window (ISO 8601 timestamp) */
  start: string;
  /** Aurora Decision Score of the next window (0-100) */
  ads: number;
}

/**
 * UI directives that control how the frontend renders the forecast.
 * All logic for visibility, highlighting, and display is encapsulated here.
 */
export interface SiteAIUIDirectives {
  /** Whether to show the full 48-hour grid (true) or hide it (false) */
  show48Grid: boolean;
  /** Number of top windows to highlight (0=none, 1=best only, 2=top 2, 3=top 3) */
  highlightTop: 0 | 1 | 2 | 3;
  /** Whether to show the "Best Viewing Time" banner */
  showBestBanner: boolean;
}

/**
 * Complete Site-AI decision output.
 *
 * This is the single source of truth for all forecast decisions.
 * The frontend must render ONLY from this object and must not re-implement decision logic.
 */
export interface SiteAIDecision {
  /** Global forecast state (excellent/possible/unlikely) */
  state: 'excellent' | 'possible' | 'unlikely';

  /** The single best window in the 48-hour forecast */
  bestWindow: SiteAIBestWindow;

  /** The next viable window after the best window (if one exists) */
  nextWindow?: SiteAINextWindow;

  /** All forecast windows in the 48-hour period with ADS scores */
  windows: SiteAIWindow[];

  /** UI directives controlling frontend rendering */
  uiDirectives: SiteAIUIDirectives;

  /** Human-readable explanation generated from deterministic templates */
  explanation: string;

  /** ISO 8601 timestamp when this decision was computed */
  computedAt: string;
}

/**
 * Input structure for the Site-AI decision computation.
 * Contains the minimal data needed to compute all decisions deterministically.
 */
export interface SiteAIInput {
  /** Array of hourly forecast windows with raw data */
  hourlyForecasts: SiteAIForecastWindow[];
  /** Current global KP index (0-9 NOAA scale) */
  globalKp: number;
  /** KP trend: 'increasing', 'stable', or 'decreasing' */
  kpTrend: 'increasing' | 'stable' | 'decreasing';
  /** Travel time from Tromsø in minutes (optional, for explanation context) */
  travelTimeMinutes?: number;
}

/**
 * A single hour of forecast data used for ADS calculation.
 */
export interface SiteAIForecastWindow {
  /** ISO 8601 timestamp */
  time: string;
  /** Cloud cover percentage (0-100) */
  cloudCover: number;
  /** Solar elevation angle in degrees (can be negative for night) */
  solarElevation: number;
  /** KP index for this specific window (0-9) */
  kpIndex: number;
  /** Aurora viewing probability from hourly forecast (0-100) */
  probability?: number;
}
