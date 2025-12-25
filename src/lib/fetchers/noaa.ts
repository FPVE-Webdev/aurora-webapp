/**
 * NOAA SWPC Data Fetcher
 *
 * Fetches real-time aurora and geomagnetic data from NOAA Space Weather Prediction Center.
 * Used for production aurora forecasting - NO MOCK DATA.
 */

const NOAA_OVATION_URL = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const NOAA_ACE_MAG_URL = 'https://services.swpc.noaa.gov/json/ace/mag/ace_mag_1m.json';
const NOAA_ACE_SWEPAM_URL = 'https://services.swpc.noaa.gov/json/ace/swepam/ace_swepam_1m.json';
const TIMEOUT_MS = 8000;
const USER_AGENT = 'Aurora.Tromso.ai/1.0 (support@tromso.ai)';

export interface NOAAOvationData {
  'Forecast Time': string;
  'Observation Time': string;
  'Data Format': string;
  coordinates: Array<[number, number, number]>; // [lon, lat, aurora]
}

export interface NOAAKpData {
  time_tag: string;
  kp: number; // 0-9 scale
}

export interface NOAASolarWindData {
  time_tag: string;
  bz_gsm: number; // Magnetic field Z component (nT)
  bt: number; // Total magnetic field (nT)
  speed: number; // Solar wind speed (km/s)
  density: number; // Particle density (p/cm³)
  temperature: number; // Temperature (K)
}

/**
 * Fetch current KP index from NOAA Ovation model
 * Converts aurora intensity (0-100) to KP scale (0-9)
 */
export async function fetchCurrentKp(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(NOAA_OVATION_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`NOAA SWPC returned ${response.status}`);
    }

    const data: NOAAOvationData = await response.json();

    // Extract maximum aurora value from coordinates
    // Format: [lon, lat, aurora] where aurora is 0-100
    if (data.coordinates && Array.isArray(data.coordinates)) {
      const values = data.coordinates
        .map((c) => c[2] || 0) // aurora is 3rd element
        .filter((v) => !isNaN(v) && v >= 0);

      if (values.length > 0) {
        const maxAurora = Math.max(...values);
        // Convert aurora intensity (0-100) to KP scale (0-9)
        const kp = (maxAurora / 100) * 9;
        return Math.min(9, Math.max(0, Math.round(kp * 10) / 10));
      }
    }

    throw new Error('No valid aurora data in NOAA response');
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ NOAA KP fetch timeout after', TIMEOUT_MS, 'ms');
      } else {
        console.error('❌ Failed to fetch KP from NOAA:', error.message);
      }
    }
    throw error;
  }
}

/**
 * Fetch complete aurora oval data from NOAA Ovation model
 * Returns GeoJSON-compatible coordinate data
 */
export async function fetchAuroraOval(): Promise<NOAAOvationData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(NOAA_OVATION_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`NOAA SWPC returned ${response.status}`);
    }

    const data: NOAAOvationData = await response.json();

    if (!data.coordinates || !Array.isArray(data.coordinates)) {
      throw new Error('Invalid NOAA Ovation response format');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ NOAA Oval fetch timeout after', TIMEOUT_MS, 'ms');
      } else {
        console.error('❌ Failed to fetch aurora oval from NOAA:', error.message);
      }
    }
    throw error;
  }
}

/**
 * Fetch planetary KP index from NOAA
 * Alternative source for KP data
 */
export async function fetchPlanetaryKp(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(NOAA_KP_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 300 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`NOAA KP API returned ${response.status}`);
    }

    const data: NOAAKpData[] = await response.json();

    // Get most recent KP value (last entry, skip header row)
    if (data.length > 1) {
      const latest = data[data.length - 1];
      const kp = parseFloat(latest.kp.toString());

      if (!isNaN(kp) && kp >= 0 && kp <= 9) {
        return kp;
      }
    }

    throw new Error('No valid KP data in NOAA response');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to fetch planetary KP:', error.message);
    }
    throw error;
  }
}

/**
 * Fetch solar wind data from NOAA ACE satellite
 * Includes Bz factor (critical for aurora prediction)
 */
export async function fetchSolarWind(): Promise<NOAASolarWindData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Fetch both magnetometer (Bz) and SWEPAM (speed, density) data
    const [magResponse, swepamResponse] = await Promise.all([
      fetch(NOAA_ACE_MAG_URL, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 180 }, // 3 minutes
      }),
      fetch(NOAA_ACE_SWEPAM_URL, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 180 },
      }),
    ]);

    clearTimeout(timeoutId);

    if (!magResponse.ok || !swepamResponse.ok) {
      throw new Error('NOAA ACE API returned error');
    }

    const magData = await magResponse.json();
    const swepamData = await swepamResponse.json();

    // Get latest reading (last element in array)
    const latestMag = magData[magData.length - 1];
    const latestSwepam = swepamData[swepamData.length - 1];

    if (!latestMag || !latestSwepam) {
      throw new Error('No ACE data available');
    }

    return {
      time_tag: latestMag.time_tag,
      bz_gsm: parseFloat(latestMag.bz_gsm) || 0,
      bt: parseFloat(latestMag.bt) || 0,
      speed: parseFloat(latestSwepam.speed) || 400,
      density: parseFloat(latestSwepam.density) || 1,
      temperature: parseFloat(latestSwepam.temperature) || 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ NOAA ACE fetch timeout');
      } else {
        console.error('❌ Failed to fetch solar wind:', error.message);
      }
    }
    return null;
  }
}

/**
 * Enhanced aurora probability calculation
 * Includes Bz factor, solar wind speed, and particle density
 * Algorithm based on aurora_update.md strategy
 */
export function calculateAuroraProbability(
  kp: number,
  cloudCoverage: number,
  bzFactor?: number,
  solarWindSpeed?: number,
  density?: number
): number {
  // 1. KP INDEX SCORE (Base probability: 0-60%)
  const kpScore = (kp / 9) * 60;

  // 2. BZ FACTOR SCORE (Magnetic field direction: 0-25%)
  // Negative Bz strongly favors aurora formation
  let bzScore = 0;
  if (bzFactor !== undefined) {
    if (bzFactor < -3) {
      bzScore = 25; // Excellent conditions
    } else if (bzFactor < -1.5) {
      bzScore = 18; // Very good
    } else if (bzFactor < 0) {
      bzScore = 12; // Good
    } else if (bzFactor < 1.5) {
      bzScore = 5; // Neutral-poor
    } else {
      bzScore = 0; // Unfavorable
    }
  }

  // 3. SOLAR WIND SCORE (Particle velocity: 0-15%)
  // Higher speed = more energy = better aurora
  let windScore = 0;
  if (solarWindSpeed !== undefined) {
    if (solarWindSpeed > 600) {
      windScore = 15; // Excellent
    } else if (solarWindSpeed > 450) {
      windScore = 10; // Good
    } else if (solarWindSpeed > 350) {
      windScore = 5; // Moderate
    } else if (solarWindSpeed > 300) {
      windScore = 2; // Low
    }
  }

  // 4. DENSITY SCORE (Particle concentration: 0-10%)
  let densityScore = 0;
  if (density !== undefined) {
    if (density > 10) {
      densityScore = 10; // High density = good
    } else if (density > 5) {
      densityScore = 6;
    } else if (density > 2) {
      densityScore = 3;
    }
  }

  // 5. CLOUD COVER PENALTY (Critical limiting factor: 0-50%)
  // Clear skies = 0 penalty, full clouds = 50% penalty
  const cloudPenalty = (cloudCoverage / 100) * 50;

  // FINAL CALCULATION
  const rawProbability = kpScore + bzScore + windScore + densityScore - cloudPenalty;
  const probability = Math.max(0, Math.min(100, rawProbability));

  return Math.round(probability);
}

/**
 * Map KP index to aurora activity level
 */
export function kpToLevel(kp: number): 'low' | 'moderate' | 'good' | 'excellent' {
  if (kp >= 7) return 'excellent';
  if (kp >= 5) return 'good';
  if (kp >= 3) return 'moderate';
  return 'low';
}

/**
 * Calculate best viewing window for aurora tonight
 * Returns time range when aurora probability is highest
 */
export function calculateBestViewingWindow(
  kp: number,
  lat: number,
  cloudForecast?: number[]
): { start: string; end: string; peakTime: string; confidence: 'low' | 'medium' | 'high' } {
  const now = new Date();

  // Determine darkness period based on latitude
  // Tromsø (69°N): Dark from ~16:00 to ~08:00 in winter
  // Adjust based on latitude and season
  const isDarkHours = (hour: number): boolean => {
    // Simple model: higher latitude = longer darkness
    if (lat > 66) {
      // Arctic: extended darkness in winter
      return hour >= 15 || hour <= 9;
    } else if (lat > 60) {
      // Sub-arctic
      return hour >= 17 || hour <= 7;
    } else {
      // Lower latitudes
      return hour >= 19 || hour <= 5;
    }
  };

  // Peak aurora activity is typically 22:00-02:00 (magnetic midnight)
  // This is when Earth's magnetic field is most exposed to solar wind
  const magneticMidnight = 0; // Simplified for Tromsø longitude

  // Calculate optimal window based on KP
  let windowStart: number;
  let windowEnd: number;
  let peakHour: number;

  if (kp >= 6) {
    // High KP: aurora visible for longer period
    windowStart = 20;
    windowEnd = 3;
    peakHour = 23;
  } else if (kp >= 4) {
    // Moderate KP: standard window
    windowStart = 21;
    windowEnd = 2;
    peakHour = 0;
  } else if (kp >= 2) {
    // Low KP: narrower window around magnetic midnight
    windowStart = 22;
    windowEnd = 1;
    peakHour = 23;
  } else {
    // Very low KP: very narrow window
    windowStart = 23;
    windowEnd = 0;
    peakHour = 23;
  }

  // Format times
  const formatHour = (hour: number): string => {
    const h = hour % 24;
    return `${h.toString().padStart(2, '0')}:00`;
  };

  // Determine confidence based on KP and cloud forecast
  let confidence: 'low' | 'medium' | 'high';
  if (kp >= 5 && (!cloudForecast || cloudForecast.some(c => c < 30))) {
    confidence = 'high';
  } else if (kp >= 3 && (!cloudForecast || cloudForecast.some(c => c < 50))) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    start: formatHour(windowStart),
    end: formatHour(windowEnd),
    peakTime: formatHour(peakHour),
    confidence,
  };
}
