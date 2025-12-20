import { ProbabilityLevel, ConfidenceLevel, TwilightPhase } from "@/types/aurora";

// Twilight info for aurora visibility calculations
export interface TwilightInfo {
  sunAltitude: number;
  phase: TwilightPhase;
  canSeeAurora: boolean;
  visibilityFactor: number; // 0-1 multiplier for probability
}

// Calculate sun position and twilight phase for a given location and time
export function calculateTwilightPhase(latitude: number, date: Date = new Date()): TwilightInfo {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const currentHour = date.getHours() + date.getMinutes() / 60;

  // Calculate sun declination (angle of sun relative to equator)
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);
  const latRad = latitude * Math.PI / 180;
  const declRad = declination * Math.PI / 180;

  // Calculate sun altitude at current time
  const hourAngle = (currentHour - 12) * 15; // 15 degrees per hour
  const hourAngleRad = hourAngle * Math.PI / 180;

  const sinAlt = Math.sin(latRad) * Math.sin(declRad) +
                 Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
  const sunAltitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;

  // Determine twilight phase and visibility factor
  let phase: TwilightPhase;
  let canSeeAurora = false;
  let visibilityFactor = 0;

  if (sunAltitude > 0) {
    phase = 'day';
    visibilityFactor = 0; // No aurora visible during day
  } else if (sunAltitude > -6) {
    phase = 'civil';
    visibilityFactor = 0; // Still too light for aurora
  } else if (sunAltitude > -12) {
    phase = 'nautical';
    visibilityFactor = 0.3; // Halvmørkt - very faint aurora might be visible in rare cases
  } else if (sunAltitude > -18) {
    phase = 'astronomical';
    visibilityFactor = 0.85; // Good conditions
    canSeeAurora = true;
  } else {
    phase = 'night';
    visibilityFactor = 1.0; // Optimal conditions
    canSeeAurora = true;
  }

  return { sunAltitude, phase, canSeeAurora, visibilityFactor };
}

// Calculate twilight phase for a specific hour (for forecasts)
export function calculateTwilightPhaseForHour(latitude: number, hour: number, dayOffset: number = 0): TwilightInfo {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return calculateTwilightPhase(latitude, date);
}

export function calculateAuroraProbability(
  kpIndex: number,
  latitude: number,
  bzGsm?: number,
  solarSpeed?: number,
  cloudCoverage: number = 30,
  twilightInfo?: TwilightInfo
): number {
  // Step 1: Base probability from KP index
  let baseProbability = 0;

  if (kpIndex >= 7) baseProbability = 95;
  else if (kpIndex >= 6) baseProbability = 85;
  else if (kpIndex >= 5) baseProbability = 70;
  else if (kpIndex >= 4) baseProbability = 55;
  else if (kpIndex >= 3) baseProbability = 35;
  else if (kpIndex >= 2) baseProbability = 20;
  else if (kpIndex >= 1) baseProbability = 10;
  else baseProbability = 5;

  // Step 2: Latitude bonus (further north = better)
  const latitudeBonus = Math.min(20, Math.max(0, (latitude - 65) * 2));

  // Step 3: Solar wind Bz adjustment
  let bzBonus = 0;
  if (bzGsm !== undefined) {
    if (bzGsm < -5) bzBonus = 15;
    else if (bzGsm < -2) bzBonus = 10;
    else if (bzGsm > 2) bzBonus = -10;
  }

  // Step 4: Combine all positive factors
  let probability = baseProbability + latitudeBonus + bzBonus;

  // Step 5: Apply cloud coverage penalty
  const cloudPenalty = (cloudCoverage / 100) * 50;
  probability = probability - cloudPenalty;

  // Step 6: Apply twilight visibility factor (reduces probability during daylight/twilight)
  if (twilightInfo) {
    probability = probability * twilightInfo.visibilityFactor;
  }

  // Step 7: Clamp result between 0-100
  return Math.max(0, Math.min(100, Math.round(probability)));
}

export function getProbabilityLevel(probability: number): ProbabilityLevel {
  if (probability >= 70) return 'excellent';
  if (probability >= 50) return 'good';
  if (probability >= 30) return 'moderate';
  return 'poor';
}

export function calculateConfidence(
  timeHorizon: number,
  kpIndex: number,
  cloudCoverage: number
): ConfidenceLevel {
  let confidence = 95;

  if (timeHorizon > 48) confidence -= 30;
  else if (timeHorizon > 24) confidence -= 20;
  else if (timeHorizon > 12) confidence -= 10;

  if (kpIndex >= 7 || kpIndex <= 1) confidence -= 10;
  if (cloudCoverage > 70) confidence -= 5;

  confidence = Math.max(50, confidence);

  if (confidence >= 80) {
    return { level: 'Høy sikkerhet', percentage: confidence, color: 'text-aurora-excellent' };
  } else if (confidence >= 70) {
    return { level: 'God sikkerhet', percentage: confidence, color: 'text-aurora-good' };
  } else if (confidence >= 60) {
    return { level: 'Moderat sikkerhet', percentage: confidence, color: 'text-aurora-moderate' };
  }
  return { level: 'Lav sikkerhet', percentage: confidence, color: 'text-muted-foreground' };
}

export function shouldShowGoNow(probability: number, latitude: number): boolean {
  const currentHour = new Date().getHours();
  const darkHours = getDarkHours(latitude);
  const isDarkTime = isWithinDarkHours(currentHour, darkHours);
  return probability >= 60 && isDarkTime;
}

// Calculate dark hours based on latitude and time of year
export function getDarkHours(latitude: number): { start: number; end: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-11

  // Polar night regions (above 78°N like Svalbard)
  if (latitude >= 78) {
    // November to February - 24 hour darkness
    if (month >= 10 || month <= 1) {
      return { start: 0, end: 24 }; // Always dark
    }
    // Extended dark hours rest of year
    return { start: 18, end: 8 };
  }

  // Arctic regions (66-78°N like Tromsø)
  if (latitude >= 66) {
    // Polar night period (Dec-Jan)
    if (month === 11 || month === 0) {
      return { start: 0, end: 24 }; // Mørketid
    }
    // Extended dark hours (Oct-Feb)
    if (month >= 9 || month <= 2) {
      return { start: 15, end: 10 };
    }
    // Normal dark hours
    return { start: 21, end: 4 };
  }

  // Sub-arctic (60-66°N)
  if (latitude >= 60) {
    if (month >= 10 || month <= 1) {
      return { start: 16, end: 8 };
    }
    return { start: 21, end: 4 };
  }

  // Default for lower latitudes
  return { start: 21, end: 3 };
}

export function isWithinDarkHours(hour: number, darkHours: { start: number; end: number }): boolean {
  // 24-hour darkness
  if (darkHours.start === 0 && darkHours.end === 24) {
    return true;
  }

  // Dark hours span midnight
  if (darkHours.start > darkHours.end) {
    return hour >= darkHours.start || hour <= darkHours.end;
  }

  // Dark hours don't span midnight
  return hour >= darkHours.start && hour <= darkHours.end;
}

export function getBestViewingTime(
  hourlyForecasts: Array<{ hour: string; probability: number }>,
  latitude: number = 69
): string {
  const darkHours = getDarkHours(latitude);

  // For 24-hour darkness, return all hours as optimal
  if (darkHours.start === 0 && darkHours.end === 24) {
    if (hourlyForecasts.length === 0) return 'Mørkt hele døgnet';
    const best = hourlyForecasts.reduce((max, curr) =>
      curr.probability > max.probability ? curr : max,
      hourlyForecasts[0]
    );
    return `Beste: ${best.hour}`;
  }

  const optimalWindow = hourlyForecasts.filter(f => {
    const hour = parseInt(f.hour.split(':')[0]);
    return isWithinDarkHours(hour, darkHours);
  });

  if (optimalWindow.length === 0) {
    // Format dark hours for display
    const startStr = darkHours.start.toString().padStart(2, '0');
    const endStr = darkHours.end.toString().padStart(2, '0');
    return `${startStr}:00-${endStr}:00`;
  }

  const best = optimalWindow.reduce((max, curr) =>
    curr.probability > max.probability ? curr : max,
    optimalWindow[0]
  );

  const startHour = parseInt(best.hour.split(':')[0]);
  const endHour = (startHour + 2) % 24;
  return `${best.hour}-${endHour.toString().padStart(2, '0')}:00`;
}

export function getActivityLevel(kp: number): { emoji: string; description: string } {
  if (kp >= 7) return { emoji: '🔴', description: 'Ekstrem aktivitet' };
  if (kp >= 6) return { emoji: '🟠', description: 'Høy aktivitet' };
  if (kp >= 5) return { emoji: '🟡', description: 'Moderat aktivitet' };
  if (kp >= 3) return { emoji: '🟢', description: 'Lav aktivitet' };
  return { emoji: '⚪', description: 'Svært lav aktivitet' };
}
