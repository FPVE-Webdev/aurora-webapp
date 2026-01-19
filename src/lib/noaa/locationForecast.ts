/**
 * Location-Specific Aurora Forecast
 * Combines NOAA space weather data with local weather conditions
 * Provides accurate 12-hour forecast for Tromsø area
 */

import axios from 'axios';
import { fetchHourlyForecast } from '@/lib/fetchers/metno';
import * as Sentry from '@sentry/nextjs';

interface NOAAConditions {
  kp: number;
  solarWindSpeed: number;
  bz: number;
}

interface LocalWeather {
  cloudCoverage: number;
  temperature: number;
  windSpeed: number;
}

interface HourlyForecast {
  hour: string;
  probability: number;
  cloudCoverage: number;
  temperature: number;
  kp: number;
  visibility: string;
}

/**
 * Fetch current NOAA space weather conditions
 */
async function fetchNOAAConditions(): Promise<NOAAConditions> {
  try {
    const [kpRes, solarWindRes, magRes] = await Promise.all([
      axios.get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { timeout: 5000 }),
      axios.get('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json', { timeout: 5000 }),
      axios.get('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json', { timeout: 5000 }),
    ]);

    const kpData = kpRes.data.slice(1);
    const kp = parseFloat(kpData[kpData.length - 1][1]);

    const solarWindData = solarWindRes.data.slice(1).filter((e: any) => e[2] !== null);
    const solarWindSpeed = parseFloat(solarWindData[solarWindData.length - 1][2]);

    const magData = magRes.data.slice(1).filter((e: any) => e[2] !== null);
    const bz = parseFloat(magData[magData.length - 1][2]);

    return { kp, solarWindSpeed, bz };
  } catch (error) {
    console.error('Error fetching NOAA conditions:', error);
    // Fallback to moderate values
    return { kp: 3, solarWindSpeed: 450, bz: 0 };
  }
}

/**
 * Calculate aurora probability based on NOAA data and local conditions
 */
function calculateAuroraProbability(
  noaa: NOAAConditions,
  weather: LocalWeather,
  hourOffset: number
): number {
  // Base probability from Kp index
  let probability = Math.round((noaa.kp / 9) * 100);

  // Solar wind boost
  if (noaa.solarWindSpeed > 500) probability += 10;
  if (noaa.solarWindSpeed > 700) probability += 20;

  // Bz boost (negative Bz is good for aurora)
  if (noaa.bz < -3) probability += 15;
  if (noaa.bz < -7) probability += 25;

  // Reduce probability based on cloud coverage
  const cloudReduction = weather.cloudCoverage * 0.5;
  probability = probability * (1 - cloudReduction / 100);

  // Time-based factors (higher probability at night)
  const currentHour = new Date().getHours();
  const targetHour = (currentHour + hourOffset) % 24;

  // Best viewing: 21:00 - 03:00
  if (targetHour >= 21 || targetHour <= 3) {
    probability *= 1.2;
  } else if (targetHour >= 18 || targetHour <= 6) {
    probability *= 1.1;
  } else {
    // Daylight - very low probability
    probability *= 0.1;
  }

  // Seasonal factor (higher in winter)
  const month = new Date().getMonth() + 1;
  if ([3, 9, 10].includes(month)) {
    // Equinoxes - higher activity
    probability *= 1.1;
  } else if ([11, 12, 1, 2].includes(month)) {
    // Winter - good dark hours
    probability *= 1.05;
  }

  return Math.min(Math.round(probability), 100);
}

/**
 * Generate hourly forecast for Tromsø using NOAA data
 * @param hours - Number of hours to forecast (default: 12, max: 72)
 */
export async function generateTromsoForecast(hours: number = 12): Promise<HourlyForecast[]> {
  // Fetch NOAA conditions
  const noaaConditions = await fetchNOAAConditions();

  const forecasts: HourlyForecast[] = [];
  const baseDate = new Date();
  const maxHours = Math.min(Math.max(1, hours), 72); // Clamp between 1 and 72

  // Tromsø coordinates
  const TROMSO_LAT = 69.6489;
  const TROMSO_LON = 18.9551;

  // Try to fetch REAL weather data from Met.no
  let metnoData: Awaited<ReturnType<typeof fetchHourlyForecast>> | null = null;
  let usedMockData = false;

  try {
    metnoData = await fetchHourlyForecast(TROMSO_LAT, TROMSO_LON, Math.min(maxHours, 48));
    console.log('✅ generateTromsoForecast: Using REAL Met.no weather data');
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log to Sentry in production
    if (isProduction) {
      Sentry.captureException(error, {
        tags: {
          component: 'generateTromsoForecast',
          severity: 'high',
          impact: 'mock_data_used'
        },
        extra: {
          errorMessage,
          fallbackBehavior: 'Using mock weather data',
          location: 'Tromsø',
          coordinates: { lat: TROMSO_LAT, lon: TROMSO_LON }
        }
      });
    }

    console.error('❌ generateTromsoForecast: Met.no fetch failed in production!', errorMessage);
    usedMockData = true;
  }

  for (let i = 0; i < maxHours; i++) {
    const forecastTime = new Date(baseDate);
    forecastTime.setHours(forecastTime.getHours() + i);

    // Use REAL weather data if available, otherwise fallback to mock
    let cloudCoverage: number;
    let temperature: number;
    let windSpeed: number;

    if (metnoData && metnoData[i]) {
      // Use real Met.no data
      cloudCoverage = metnoData[i].cloudCoverage;
      temperature = metnoData[i].temperature;
      windSpeed = 10; // Met.no instant doesn't include windSpeed, use default
    } else {
      // Fallback to mock data (only if Met.no failed)
      if (i === 0) {
        console.warn('⚠️ USING MOCK WEATHER DATA - Met.no unavailable');
      }
      const cloudVariation = Math.sin(i / 3) * 20;
      cloudCoverage = Math.max(0, Math.min(100, 40 + cloudVariation));

      const tempVariation = Math.sin(i / 4) * 5;
      temperature = Math.round(-5 + tempVariation);
      windSpeed = 10 + Math.random() * 10;
    }

    const localWeather: LocalWeather = {
      cloudCoverage,
      temperature,
      windSpeed,
    };

    // Calculate probability with NOAA data
    const probability = calculateAuroraProbability(noaaConditions, localWeather, i);

    // Determine visibility
    let visibility: string;
    if (cloudCoverage < 30 && probability > 50) visibility = 'excellent';
    else if (cloudCoverage < 50 && probability > 30) visibility = 'good';
    else if (cloudCoverage < 70) visibility = 'moderate';
    else visibility = 'poor';

    forecasts.push({
      hour: forecastTime.getHours().toString().padStart(2, '0') + ':00',
      probability,
      cloudCoverage: Math.round(cloudCoverage),
      temperature: Math.round(temperature),
      kp: noaaConditions.kp,
      visibility,
    });
  }

  return forecasts;
}

/**
 * Get simplified forecast (fallback without NOAA)
 * @param hours - Number of hours to forecast (default: 12, max: 72)
 */
export function generateSimpleForecast(hours: number = 12): HourlyForecast[] {
  const forecasts: HourlyForecast[] = [];
  const baseDate = new Date();
  const baseKp = 3 + Math.random() * 2; // 3-5 range
  const maxHours = Math.min(Math.max(1, hours), 72); // Clamp between 1 and 72

  for (let i = 0; i < maxHours; i++) {
    const forecastTime = new Date(baseDate);
    forecastTime.setHours(forecastTime.getHours() + i);

    const kpVariation = Math.sin(i / 4) * 1.5;
    const kp = Math.max(0, Math.min(9, baseKp + kpVariation));

    const cloudVariation = Math.sin(i / 6) * 30;
    const cloudCoverage = Math.max(0, Math.min(100, 30 + cloudVariation));

    const probability = Math.floor(
      Math.max(0, Math.min(100, (kp / 9) * 100 * (1 - cloudCoverage / 150)))
    );

    forecasts.push({
      hour: forecastTime.getHours().toString().padStart(2, '0') + ':00',
      probability,
      cloudCoverage: Math.round(cloudCoverage),
      temperature: Math.floor(Math.random() * 10) - 5,
      kp: parseFloat(kp.toFixed(1)),
      visibility: cloudCoverage < 30 ? 'excellent' : cloudCoverage < 60 ? 'good' : 'poor',
    });
  }

  return forecasts;
}
