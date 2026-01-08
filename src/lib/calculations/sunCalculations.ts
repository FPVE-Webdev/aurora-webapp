/**
 * Sun Calculations for Aurora Visibility
 * Uses suncalc library for accurate astronomical calculations
 */

import * as SunCalc from 'suncalc';

/**
 * Nautical twilight threshold (-6°)
 * Aurora becomes visible when sun is below this altitude
 */
const AURORA_VISIBILITY_THRESHOLD = -6;

/**
 * Better visibility threshold (-12°)
 * Optimal aurora viewing when sun is below this altitude
 */
const OPTIMAL_AURORA_THRESHOLD = -12;

/**
 * Check if it's dark enough to see aurora
 * Returns true if sun is below nautical twilight (-6°)
 */
export function canSeeAurora(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): boolean {
  const sunPosition = SunCalc.getPosition(date, latitude, longitude);
  const sunAltitude = sunPosition.altitude * (180 / Math.PI); // Convert to degrees

  return sunAltitude < AURORA_VISIBILITY_THRESHOLD;
}

/**
 * Check if conditions are optimal for aurora viewing
 * Returns true if sun is below astronomical twilight (-12°)
 */
export function isOptimalAuroraTime(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): boolean {
  const sunPosition = SunCalc.getPosition(date, latitude, longitude);
  const sunAltitude = sunPosition.altitude * (180 / Math.PI);

  return sunAltitude < OPTIMAL_AURORA_THRESHOLD;
}

/**
 * Get next time when aurora is visible
 * Returns the next nautical dusk time, or null if in polar night
 */
export function getNextAuroraTime(
  latitude: number,
  longitude: number,
  startDate: Date = new Date()
): Date | null {
  // If currently dark, return current time
  if (canSeeAurora(latitude, longitude, startDate)) {
    return startDate;
  }

  // Get times for today
  const times = SunCalc.getTimes(startDate, latitude, longitude);

  // If nautical dusk is in the future today, return it
  if (times.nauticalDusk && times.nauticalDusk > startDate) {
    return times.nauticalDusk;
  }

  // Otherwise check tomorrow
  const tomorrow = new Date(startDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = SunCalc.getTimes(tomorrow, latitude, longitude);

  return tomorrowTimes.nauticalDusk || null;
}

/**
 * Get best aurora viewing time for tonight (darkest point)
 * Returns solar midnight (when sun is lowest)
 */
export function getBestAuroraTimeTonight(
  latitude: number,
  longitude: number,
  referenceDate: Date = new Date()
): Date | null {
  // Solar midnight is when sun is at nadir (lowest point)
  const times = SunCalc.getTimes(referenceDate, latitude, longitude);

  // If nadir is in the future today, return it
  if (times.nadir && times.nadir > referenceDate) {
    return times.nadir;
  }

  // Otherwise get nadir for next day (tonight/tomorrow night)
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = SunCalc.getTimes(tomorrow, latitude, longitude);

  if (tomorrowTimes.nadir) {
    return tomorrowTimes.nadir;
  }

  // Fallback: use next midnight local time
  const midnight = new Date(referenceDate);
  midnight.setHours(0, 0, 0, 0);

  // Always get NEXT midnight (not past)
  if (midnight <= referenceDate) {
    midnight.setDate(midnight.getDate() + 1);
  }

  return midnight;
}

/**
 * Get twilight phase for display purposes
 */
export function getTwilightPhase(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): 'day' | 'civil' | 'nautical' | 'astronomical' | 'night' {
  const sunPosition = SunCalc.getPosition(date, latitude, longitude);
  const altitude = sunPosition.altitude * (180 / Math.PI);

  if (altitude > -0.833) return 'day'; // Sun above horizon
  if (altitude > -6) return 'civil'; // Civil twilight
  if (altitude > -12) return 'nautical'; // Nautical twilight
  if (altitude > -18) return 'astronomical'; // Astronomical twilight
  return 'night'; // True night
}

/**
 * Get time until next aurora visibility
 * Returns minutes until next viewable time, or 0 if currently visible
 */
export function getMinutesUntilAurora(
  latitude: number,
  longitude: number,
  currentDate: Date = new Date()
): number {
  if (canSeeAurora(latitude, longitude, currentDate)) {
    return 0;
  }

  const nextTime = getNextAuroraTime(latitude, longitude, currentDate);
  if (!nextTime) {
    return -1; // Polar day (no darkness)
  }

  const diffMs = nextTime.getTime() - currentDate.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Format time until aurora for display
 */
export function formatTimeUntilAurora(minutes: number): string {
  if (minutes === 0) return 'Nå';
  if (minutes < 0) return 'Ingen mørke i dag';
  if (minutes < 60) return `om ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `om ${hours}t`;
  return `om ${hours}t ${remainingMinutes}min`;
}

/**
 * Check if location experiences midnight sun (polar day)
 */
export function isMidnightSun(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): boolean {
  const times = SunCalc.getTimes(date, latitude, longitude);

  // If no sunset or sunrise, check sun position at midnight
  if (!times.sunset || !times.sunrise) {
    const midnight = new Date(date);
    midnight.setHours(0, 0, 0, 0);
    const sunPos = SunCalc.getPosition(midnight, latitude, longitude);
    const altitude = sunPos.altitude * (180 / Math.PI);

    // If sun is above horizon at midnight, it's midnight sun
    return altitude > -0.833;
  }

  return false;
}

/**
 * Check if location experiences polar night (no daylight)
 */
export function isPolarNight(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): boolean {
  const times = SunCalc.getTimes(date, latitude, longitude);

  // If no sunset or sunrise, check sun position at noon
  if (!times.sunset || !times.sunrise) {
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    const sunPos = SunCalc.getPosition(noon, latitude, longitude);
    const altitude = sunPos.altitude * (180 / Math.PI);

    // If sun is below horizon at noon, it's polar night
    return altitude < -0.833;
  }

  return false;
}
