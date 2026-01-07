/**
 * Master Aurora Status - Decision Engine
 * 
 * Aggregates solar, weather, and darkness data into one simple decision:
 * GO, WAIT, or NO.
 */

export type MasterStatus = 'GO' | 'WAIT' | 'NO';

export interface MasterStatusResult {
  status: MasterStatus;
  message: string;
  subtext: string;
  confidence: number; // 0-100
  factors: {
    isDark: boolean;
    cloudCoverage: number;
    probability: number;
    kpIndex: number;
  };
}

export interface MasterStatusInput {
  probability: number;      // 0-100 from calculateAuroraProbability
  cloudCoverage: number;    // 0-100%
  kpIndex: number;          // 0-9
  sunElevation?: number;    // degrees (negative = dark)
  latitude?: number;        // for sun calculation
  longitude?: number;       // for sun calculation
}

/**
 * Calculate sun elevation angle for a given location and time.
 * Returns negative values when sun is below horizon.
 * For aurora viewing, we want < -6 degrees (civil twilight).
 */
export function calculateSunElevation(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): number {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  
  // Solar declination angle
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));
  
  // Hour angle
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const solarTime = hours + longitude / 15;
  const hourAngle = 15 * (solarTime - 12);
  
  // Convert to radians
  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const haRad = hourAngle * (Math.PI / 180);
  
  // Solar elevation
  const sinElevation = 
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  
  return Math.asin(sinElevation) * (180 / Math.PI);
}

/**
 * Check if it's dark enough for aurora viewing.
 * Civil twilight ends at sun elevation -6 degrees.
 * Nautical twilight ends at -12 degrees (ideal for aurora).
 */
export function isDarkEnough(sunElevation: number): boolean {
  return sunElevation < -6;
}

/**
 * Main decision engine: Calculate Master Aurora Status
 */
export function calculateMasterStatus(input: MasterStatusInput): MasterStatusResult {
  const { probability, cloudCoverage, kpIndex } = input;
  
  // Calculate darkness if coordinates provided
  let sunElevation = input.sunElevation;
  if (sunElevation === undefined && input.latitude && input.longitude) {
    sunElevation = calculateSunElevation(input.latitude, input.longitude);
  }
  
  // Default to dark for Northern Norway in winter if no sun data
  const isDark = sunElevation !== undefined ? isDarkEnough(sunElevation) : true;
  
  // Base factors
  const factors = {
    isDark,
    cloudCoverage,
    probability,
    kpIndex,
  };

  // === DECISION LOGIC ===
  
  // NOT DARK: Always NO
  if (!isDark) {
    return {
      status: 'NO',
      message: 'Ikke mørkt nok',
      subtext: 'Nordlys er kun synlig når det er mørkt. Vent til det blir natt.',
      confidence: 100,
      factors,
    };
  }

  // HEAVY OVERCAST (>80% clouds): NO
  if (cloudCoverage > 80) {
    return {
      status: 'NO',
      message: 'For mye skyer',
      subtext: 'Tykk skydekke blokkerer sikten. Sjekk igjen senere.',
      confidence: Math.min(90, cloudCoverage),
      factors,
    };
  }

  // GO CONDITIONS: Good solar activity AND clear skies
  if (probability >= 30 && cloudCoverage < 30) {
    return {
      status: 'GO',
      message: 'Ut og se!',
      subtext: 'Gode forhold for nordlys akkurat nå.',
      confidence: Math.min(95, probability),
      factors,
    };
  }

  // WAIT: High activity but cloudy
  if (probability >= 20 && cloudCoverage >= 30) {
    return {
      status: 'WAIT',
      message: 'Aktivitet, men skyer',
      subtext: 'Solaktiviteten er høy. Sjekk kartet for klarvær.',
      confidence: Math.round((probability + (100 - cloudCoverage)) / 2),
      factors,
    };
  }

  // WAIT: Clear skies but low activity
  if (cloudCoverage < 50 && probability >= 10) {
    return {
      status: 'WAIT',
      message: 'Klart, men lav aktivitet',
      subtext: 'Klar himmel. Venter på at aktiviteten tar seg opp.',
      confidence: Math.round(probability * 0.8),
      factors,
    };
  }

  // DEFAULT: NO - Low probability overall
  return {
    status: 'NO',
    message: 'Lite sannsynlig',
    subtext: 'Lav solaktivitet akkurat nå. Slapp av og prøv igjen senere.',
    confidence: Math.max(10, 100 - probability),
    factors,
  };
}

/**
 * Get semantic color for status
 */
export function getStatusColor(status: MasterStatus): {
  bg: string;
  text: string;
  gradient: string;
} {
  switch (status) {
    case 'GO':
      return {
        bg: 'bg-green-500',
        text: 'text-green-500',
        gradient: 'from-green-500 to-emerald-600',
      };
    case 'WAIT':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-500',
        gradient: 'from-amber-400 to-orange-500',
      };
    case 'NO':
    default:
      return {
        bg: 'bg-slate-600',
        text: 'text-slate-400',
        gradient: 'from-slate-600 to-slate-700',
      };
  }
}
