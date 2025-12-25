/**
 * NOAA Data Collector Service
 * Collects space weather data hourly and stores in Supabase
 * Phase 2: Advanced Analytics
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface CollectionResult {
  success: boolean;
  timestamp: Date;
  recordsStored: number;
  errors: string[];
}

interface NOAAData {
  timestamp: Date;
  kpIndex?: number;
  solarWindSpeed?: number;
  solarWindDensity?: number;
  solarWindTemperature?: number;
  bzComponent?: number;
  btTotal?: number;
  byComponent?: number;
}

/**
 * Fetch latest Kp index from NOAA
 */
async function fetchKpIndex(): Promise<{ value: number; timestamp: Date } | null> {
  try {
    const response = await axios.get(
      'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
      {
        timeout: 10000,
        headers: { 'User-Agent': 'aurora.tromso.ai/1.0' },
      }
    );

    if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
      throw new Error('Invalid Kp data format');
    }

    const latest = response.data[response.data.length - 1];
    return {
      value: parseFloat(latest[1]),
      timestamp: new Date(latest[0]),
    };
  } catch (error) {
    console.error('Error fetching Kp index:', error);
    return null;
  }
}

/**
 * Fetch latest solar wind data from NOAA
 */
async function fetchSolarWind(): Promise<{
  speed: number;
  density: number;
  temperature: number;
  timestamp: Date;
} | null> {
  try {
    const response = await axios.get(
      'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
      {
        timeout: 10000,
        headers: { 'User-Agent': 'aurora.tromso.ai/1.0' },
      }
    );

    if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
      throw new Error('Invalid plasma data format');
    }

    // Find latest valid entry
    const data = response.data.slice(1); // Skip header
    const validEntries = data.filter(
      (entry: any) => entry[2] !== null && entry[2] !== undefined
    );

    if (validEntries.length === 0) {
      throw new Error('No valid plasma data');
    }

    const latest = validEntries[validEntries.length - 1];
    return {
      speed: parseFloat(latest[2]),
      density: parseFloat(latest[1]),
      temperature: parseInt(latest[3]),
      timestamp: new Date(latest[0]),
    };
  } catch (error) {
    console.error('Error fetching solar wind:', error);
    return null;
  }
}

/**
 * Fetch latest magnetic field data from NOAA
 */
async function fetchMagneticField(): Promise<{
  bz: number;
  bt: number;
  by: number;
  timestamp: Date;
} | null> {
  try {
    const response = await axios.get(
      'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json',
      {
        timeout: 10000,
        headers: { 'User-Agent': 'aurora.tromso.ai/1.0' },
      }
    );

    if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
      throw new Error('Invalid magnetic field data format');
    }

    const data = response.data.slice(1); // Skip header
    const validEntries = data.filter(
      (entry: any) => entry[2] !== null && entry[2] !== undefined
    );

    if (validEntries.length === 0) {
      throw new Error('No valid magnetic field data');
    }

    const latest = validEntries[validEntries.length - 1];
    return {
      bz: parseFloat(latest[2]), // Bz component
      bt: parseFloat(latest[3]), // Bt total
      by: parseFloat(latest[1]), // By component
      timestamp: new Date(latest[0]),
    };
  } catch (error) {
    console.error('Error fetching magnetic field:', error);
    return null;
  }
}

/**
 * Calculate aurora probability based on conditions
 */
function calculateAuroraProbability(
  kp: number,
  solarWindSpeed: number,
  bz: number
): number {
  // Base probability from Kp (0-100%)
  let probability = Math.round((kp / 9) * 100);

  // Boost for high solar wind
  if (solarWindSpeed > 500) probability += 10;
  if (solarWindSpeed > 700) probability += 20;

  // Boost for negative Bz (southward IMF)
  if (bz < -3) probability += 15;
  if (bz < -7) probability += 25;

  // Cap at 100%
  return Math.min(probability, 100);
}

/**
 * Store collected data in Supabase
 */
async function storeData(data: NOAAData): Promise<boolean> {
  try {
    const auroraProbability = data.kpIndex && data.solarWindSpeed && data.bzComponent
      ? calculateAuroraProbability(data.kpIndex, data.solarWindSpeed, data.bzComponent)
      : null;

    const { error } = await supabase.from('noaa_historical_data').insert({
      timestamp: data.timestamp.toISOString(),
      kp_index: data.kpIndex,
      solar_wind_speed: data.solarWindSpeed,
      solar_wind_density: data.solarWindDensity,
      solar_wind_temperature: data.solarWindTemperature,
      bz_component: data.bzComponent,
      bt_total: data.btTotal,
      by_component: data.byComponent,
      aurora_probability: auroraProbability,
      observation_quality: 'good',
      data_source: 'NOAA SWPC',
    });

    if (error) {
      // If duplicate timestamp, that's ok (unique constraint)
      if (error.code === '23505') {
        console.log('Data already exists for this timestamp, skipping');
        return true;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error storing data:', error);
    return false;
  }
}

/**
 * Log data quality metrics
 */
async function logDataQuality(
  kpAvailable: boolean,
  solarWindAvailable: boolean,
  magFieldAvailable: boolean,
  errors: string[],
  durations: { kp?: number; solarWind?: number },
  recordsStored: number
): Promise<void> {
  try {
    await supabase.from('noaa_data_quality').insert({
      kp_data_available: kpAvailable,
      solar_wind_data_available: solarWindAvailable,
      mag_field_data_available: magFieldAvailable,
      last_kp_fetch_error: errors.find((e) => e.includes('Kp')) || null,
      last_solar_wind_fetch_error: errors.find((e) => e.includes('wind')) || null,
      last_mag_field_fetch_error: errors.find((e) => e.includes('mag')) || null,
      kp_fetch_duration_ms: durations.kp,
      solar_wind_fetch_duration_ms: durations.solarWind,
      total_records_stored: recordsStored,
    });
  } catch (error) {
    console.error('Error logging data quality:', error);
  }
}

/**
 * Main collection function - called every hour by cron
 */
export async function collectNOAAData(): Promise<CollectionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const durations: { kp?: number; solarWind?: number } = {};

  console.log('🌌 Starting NOAA data collection...');

  // Fetch all data in parallel
  const kpStart = Date.now();
  const kpData = await fetchKpIndex();
  durations.kp = Date.now() - kpStart;

  const solarWindStart = Date.now();
  const solarWindData = await fetchSolarWind();
  durations.solarWind = Date.now() - solarWindStart;

  const magFieldData = await fetchMagneticField();

  // Track what data is available
  const kpAvailable = kpData !== null;
  const solarWindAvailable = solarWindData !== null;
  const magFieldAvailable = magFieldData !== null;

  if (!kpAvailable) errors.push('Kp index fetch failed');
  if (!solarWindAvailable) errors.push('Solar wind fetch failed');
  if (!magFieldAvailable) errors.push('Magnetic field fetch failed');

  // Combine data (use latest timestamp)
  const timestamps = [
    kpData?.timestamp,
    solarWindData?.timestamp,
    magFieldData?.timestamp,
  ].filter((t): t is Date => t !== undefined);

  const latestTimestamp = timestamps.length > 0
    ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
    : new Date();

  const combinedData: NOAAData = {
    timestamp: latestTimestamp,
    kpIndex: kpData?.value,
    solarWindSpeed: solarWindData?.speed,
    solarWindDensity: solarWindData?.density,
    solarWindTemperature: solarWindData?.temperature,
    bzComponent: magFieldData?.bz,
    btTotal: magFieldData?.bt,
    byComponent: magFieldData?.by,
  };

  // Store in database
  let recordsStored = 0;
  if (Object.values(combinedData).some((v) => v !== undefined)) {
    const stored = await storeData(combinedData);
    if (stored) recordsStored = 1;
  } else {
    errors.push('No valid data collected');
  }

  // Log data quality
  await logDataQuality(
    kpAvailable,
    solarWindAvailable,
    magFieldAvailable,
    errors,
    durations,
    recordsStored
  );

  const duration = Date.now() - startTime;
  console.log(`✅ Collection complete in ${duration}ms. Records stored: ${recordsStored}`);

  return {
    success: recordsStored > 0,
    timestamp: new Date(),
    recordsStored,
    errors,
  };
}

/**
 * Cleanup old data (called daily)
 */
export async function cleanupOldData(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_old_noaa_data');

    if (error) throw error;

    console.log(`🧹 Cleaned up ${data} old records`);
    return data || 0;
  } catch (error) {
    console.error('Error cleaning up old data:', error);
    return 0;
  }
}
