/**
 * NOAA SWPC Data Fetcher
 *
 * Fetches real-time aurora and geomagnetic data from NOAA Space Weather Prediction Center.
 * Used for production aurora forecasting - NO MOCK DATA.
 */

const NOAA_OVATION_URL = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
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
 * Calculate aurora probability based on KP and cloud coverage
 * Used across all forecast endpoints for consistency
 */
export function calculateAuroraProbability(kp: number, cloudCoverage: number): number {
  // KP contribution: 0-9 scale → 0-100%
  const kpFactor = (kp / 9) * 100;

  // Cloud penalty: reduces probability based on coverage
  // 0% clouds = no penalty, 100% clouds = 70% penalty
  const cloudPenalty = (cloudCoverage / 100) * 0.7;

  const probability = kpFactor * (1 - cloudPenalty);

  return Math.round(Math.max(0, Math.min(100, probability)));
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
