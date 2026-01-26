/**
 * Time label utilities for forecast display
 * Handles relative day labels (i dag, i morgen, +2d, etc.)
 */

import { differenceInDays } from 'date-fns';
import { HourlyForecast as HourlyForecastType } from '@/types/aurora';

/**
 * Get relative day label for a timestamp
 * Returns: "i dag", "i morgen", "+2d", "+3d" etc.
 */
export const getRelativeDayLabel = (timestamp: string): string => {
  const forecastDate = new Date(timestamp);
  const today = new Date();

  // Normalize to midnight for date comparison
  forecastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysDiff = differenceInDays(forecastDate, today);

  if (daysDiff === 0) return 'i dag';
  if (daysDiff === 1) return 'i morgen';
  return `+${daysDiff}d`;
};

/**
 * Get hour display label with day indicator when day changes
 * Shows relative day label (e.g., "i dag", "i morgen") only at first hour of each day
 *
 * Examples:
 * - "i dag 22:00" (first hour today)
 * - "23:00" (same day)
 * - "i morgen 00:00" (first hour tomorrow)
 * - "01:00" (same day)
 */
export const getHourLabelWithDay = (
  forecast: HourlyForecastType,
  index: number,
  forecasts: HourlyForecastType[]
): string => {
  const timeStr = forecast.hour; // e.g., "22:00"

  if (index === 0) {
    // First hour: show day label + time
    const dayLabel = getRelativeDayLabel(forecast.time);
    return `${dayLabel} ${timeStr}`;
  }

  const currentDate = new Date(forecast.time);
  const prevDate = new Date(forecasts[index - 1].time);

  // Day changed: show day label + time
  if (currentDate.getDate() !== prevDate.getDate()) {
    const dayLabel = getRelativeDayLabel(forecast.time);
    return `${dayLabel} ${timeStr}`;
  }

  // Same day: show time only
  return timeStr;
};
