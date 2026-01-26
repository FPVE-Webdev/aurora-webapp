/**
 * Forecast Data Validator
 *
 * Validates forecast data consistency and integrity across different data sources.
 * Ensures that all forecast components receive consistent, non-conflicting data.
 */

import type { SpotForecast, HourlyForecast } from '@/types/aurora';
import type { SiteAIDecision, SiteAIWindow } from '@/types/siteAI';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  data?: Record<string, unknown>;
}

export interface ValidationWarning {
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Validate that forecast data and Site-AI decision are consistent
 */
export function validateForecastData(
  forecast: SpotForecast | undefined,
  decision: SiteAIDecision | undefined
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check if forecast exists
  if (!forecast) {
    errors.push({
      type: 'MISSING_FORECAST',
      message: 'Forecast data is missing',
      severity: 'critical'
    });
    return { isValid: false, errors, warnings };
  }

  // Check if hourly forecast exists
  if (!forecast.hourlyForecast || forecast.hourlyForecast.length === 0) {
    errors.push({
      type: 'EMPTY_HOURLY_FORECAST',
      message: 'Hourly forecast array is empty',
      severity: 'high'
    });
  }

  // Validate hour-0 weather data consistency
  if (forecast.hourlyForecast && forecast.hourlyForecast.length > 0) {
    const hour0 = forecast.hourlyForecast[0];

    // Check for null/undefined critical fields
    if (hour0.cloudCoverage === null || hour0.cloudCoverage === undefined) {
      errors.push({
        type: 'MISSING_CLOUD_COVER',
        message: 'Cloud coverage is missing from hour-0 forecast',
        severity: 'high'
      });
    }

    if (hour0.temperature === null || hour0.temperature === undefined) {
      errors.push({
        type: 'MISSING_TEMPERATURE',
        message: 'Temperature is missing from hour-0 forecast',
        severity: 'high'
      });
    }

    // Check for invalid values
    if (hour0.cloudCoverage !== undefined && (hour0.cloudCoverage < 0 || hour0.cloudCoverage > 100)) {
      errors.push({
        type: 'INVALID_CLOUD_COVER',
        message: `Cloud coverage ${hour0.cloudCoverage}% is outside valid range [0-100]`,
        severity: 'high',
        data: { value: hour0.cloudCoverage }
      });
    }

    if (hour0.probability !== undefined && (hour0.probability < 0 || hour0.probability > 100)) {
      errors.push({
        type: 'INVALID_PROBABILITY',
        message: `Aurora probability ${hour0.probability}% is outside valid range [0-100]`,
        severity: 'high',
        data: { value: hour0.probability }
      });
    }

    // Validate timestamp format
    if (!hour0.time || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(hour0.time)) {
      warnings.push({
        type: 'INVALID_TIMESTAMP_FORMAT',
        message: `Hour-0 timestamp format may be invalid: ${hour0.time}`,
        data: { timestamp: hour0.time }
      });
    }
  }

  // Validate Site-AI decision if present
  if (decision) {
    // Check if bestWindow exists
    if (!decision.bestWindow) {
      warnings.push({
        type: 'MISSING_BEST_WINDOW',
        message: 'Site-AI best window is missing'
      });
    } else {
      // Validate window times
      const { start, end } = decision.bestWindow;
      if (!start || !end) {
        errors.push({
          type: 'INVALID_WINDOW_TIMES',
          message: 'Best window start or end time is missing',
          severity: 'medium'
        });
      } else if (new Date(start) >= new Date(end)) {
        errors.push({
          type: 'INVALID_WINDOW_RANGE',
          message: 'Best window start time is after end time',
          severity: 'high',
          data: { start, end }
        });
      }

      // Check ADS score
      if (decision.bestWindow.ads !== undefined) {
        if (decision.bestWindow.ads < 0 || decision.bestWindow.ads > 100) {
          errors.push({
            type: 'INVALID_ADS_SCORE',
            message: `ADS score ${decision.bestWindow.ads}% is outside valid range [0-100]`,
            severity: 'medium',
            data: { value: decision.bestWindow.ads }
          });
        }
      }
    }

    // Validate state enum
    const validStates = ['excellent', 'possible', 'unlikely'];
    if (!validStates.includes(decision.state)) {
      errors.push({
        type: 'INVALID_STATE',
        message: `Decision state '${decision.state}' is not valid. Must be one of: ${validStates.join(', ')}`,
        severity: 'high',
        data: { state: decision.state }
      });
    }

    // Check if explanation exists
    if (!decision.explanation || decision.explanation.trim().length === 0) {
      warnings.push({
        type: 'MISSING_EXPLANATION',
        message: 'Site-AI decision explanation is empty'
      });
    }

    // Validate windows array
    if (!decision.windows || decision.windows.length === 0) {
      warnings.push({
        type: 'EMPTY_WINDOWS_ARRAY',
        message: 'Site-AI windows array is empty'
      });
    } else {
      // Check for duplicate timestamps in windows
      const timestamps = decision.windows.map(w => w.time);
      const uniqueTimestamps = new Set(timestamps);
      if (uniqueTimestamps.size < timestamps.length) {
        warnings.push({
          type: 'DUPLICATE_WINDOWS',
          message: 'Site-AI windows array contains duplicate timestamps'
        });
      }
    }
  }

  // Validate hourly forecast array consistency
  if (forecast.hourlyForecast && forecast.hourlyForecast.length > 1) {
    let prevTime = new Date(forecast.hourlyForecast[0].time);
    for (let i = 1; i < forecast.hourlyForecast.length; i++) {
      const currTime = new Date(forecast.hourlyForecast[i].time);
      const timeDiffHours = (currTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60);

      // Hours should be ~1 hour apart
      if (Math.abs(timeDiffHours - 1) > 0.5) {
        warnings.push({
          type: 'INCONSISTENT_HOURLY_SPACING',
          message: `Hour ${i}: time gap is ${timeDiffHours.toFixed(1)} hours, expected ~1 hour`,
          data: { index: i, timeDiffHours }
        });
      }
      prevTime = currTime;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results for debugging
 */
export function logValidationResults(result: ValidationResult, context: string = ''): void {
  const contextLabel = context ? ` [${context}]` : '';

  if (result.isValid) {
    console.log(`✓ Forecast validation passed${contextLabel}`);
  } else {
    console.error(`✗ Forecast validation failed${contextLabel}`);
    result.errors.forEach(error => {
      console.error(`  [${error.severity.toUpperCase()}] ${error.type}: ${error.message}`, error.data || '');
    });
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠ ${result.warnings.length} warning(s) found${contextLabel}`);
    result.warnings.forEach(warning => {
      console.warn(`  [${warning.type}] ${warning.message}`, warning.data || '');
    });
  }
}
