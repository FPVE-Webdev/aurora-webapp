/**
 * Met.no Weather Data Fetcher
 *
 * Fetches real-time cloud coverage and weather data from Norwegian Meteorological Institute.
 * Used for production weather conditions - NO MOCK DATA.
 */

const METNO_FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const TIMEOUT_MS = 8000;
const USER_AGENT = 'Aurora.Tromso.ai/1.0 support@tromso.ai';

export interface CloudData {
  low: number; // 0-100%
  medium: number; // 0-100%
  high: number; // 0-100%
  total: number; // 0-100%
}

export interface WeatherData {
  cloudCoverage: number; // 0-100%
  temperature: number; // °C
  windSpeed: number; // m/s
  conditions: 'clear' | 'partly_cloudy' | 'cloudy' | 'overcast';
}

interface MetnoResponse {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            cloud_area_fraction?: number;
            cloud_area_fraction_low?: number;
            cloud_area_fraction_medium?: number;
            cloud_area_fraction_high?: number;
            air_temperature?: number;
            wind_speed?: number;
          };
        };
      };
    }>;
  };
}

/**
 * Fetch cloud coverage data for a specific location
 *
 * @param lat - Latitude (decimal degrees)
 * @param lon - Longitude (decimal degrees)
 * @returns Cloud coverage data at different altitudes
 */
export async function fetchCloudCover(lat: number, lon: number): Promise<CloudData> {
  try {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = `${METNO_FORECAST_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 900 }, // Cache 15 minutes
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Met.no API returned ${response.status}`);
    }

    const data: MetnoResponse = await response.json();

    // Extract current cloud data from first timeseries entry
    const timeseries = data?.properties?.timeseries?.[0];
    const details = timeseries?.data?.instant?.details;

    if (!details) {
      throw new Error('No cloud data in Met.no response');
    }

    // Extract cloud coverage at different altitudes (0-100%)
    const low = details.cloud_area_fraction_low ?? 0;
    const medium = details.cloud_area_fraction_medium ?? 0;
    const high = details.cloud_area_fraction_high ?? 0;

    // Calculate total cloud coverage
    // Use direct value if available, otherwise weighted average
    let total = details.cloud_area_fraction;
    if (total === undefined || total === null) {
      // Weighted average: low clouds matter most for aurora visibility
      total = low * 0.5 + medium * 0.35 + high * 0.15;
    }

    return {
      low: Math.round(low),
      medium: Math.round(medium),
      high: Math.round(high),
      total: Math.round(Math.max(0, Math.min(100, total))),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ Met.no cloud fetch timeout after', TIMEOUT_MS, 'ms');
      } else {
        console.error('❌ Failed to fetch cloud cover from Met.no:', error.message);
      }
    }
    throw error;
  }
}

/**
 * Fetch complete weather data for a specific location
 *
 * @param lat - Latitude (decimal degrees)
 * @param lon - Longitude (decimal degrees)
 * @returns Complete weather data including clouds, temperature, wind
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = `${METNO_FORECAST_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 900 }, // Cache 15 minutes
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Met.no API returned ${response.status}`);
    }

    const data: MetnoResponse = await response.json();

    // Extract current weather from first timeseries entry
    const timeseries = data?.properties?.timeseries?.[0];
    const details = timeseries?.data?.instant?.details;

    if (!details) {
      throw new Error('No weather data in Met.no response');
    }

    // Extract weather parameters
    const cloudCoverage = details.cloud_area_fraction ?? 50;
    const temperature = details.air_temperature ?? 0;
    const windSpeed = details.wind_speed ?? 0;

    // Determine weather conditions based on cloud coverage
    let conditions: WeatherData['conditions'];
    if (cloudCoverage < 20) {
      conditions = 'clear';
    } else if (cloudCoverage < 50) {
      conditions = 'partly_cloudy';
    } else if (cloudCoverage < 80) {
      conditions = 'cloudy';
    } else {
      conditions = 'overcast';
    }

    return {
      cloudCoverage: Math.round(Math.max(0, Math.min(100, cloudCoverage))),
      temperature: Math.round(temperature * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      conditions,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ Met.no weather fetch timeout after', TIMEOUT_MS, 'ms');
      } else {
        console.error('❌ Failed to fetch weather from Met.no:', error.message);
      }
    }
    throw error;
  }
}

/**
 * Fetch hourly weather forecast for next N hours
 *
 * @param lat - Latitude (decimal degrees)
 * @param lon - Longitude (decimal degrees)
 * @param hours - Number of hours to fetch (max 48)
 * @returns Array of hourly weather data
 */
export async function fetchHourlyForecast(
  lat: number,
  lon: number,
  hours: number = 24
): Promise<WeatherData[]> {
  try {
    // Validate inputs
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
    }
    if (hours < 1 || hours > 48) {
      throw new Error(`Invalid hours parameter: ${hours}. Must be 1-48.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = `${METNO_FORECAST_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 900 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Met.no API returned ${response.status}`);
    }

    const data: MetnoResponse = await response.json();
    const timeseries = data?.properties?.timeseries;

    if (!timeseries || !Array.isArray(timeseries)) {
      throw new Error('No timeseries data in Met.no response');
    }

    // Extract hourly data (Met.no provides hourly intervals)
    const hourlyData: WeatherData[] = [];

    for (let i = 0; i < Math.min(hours, timeseries.length); i++) {
      const details = timeseries[i]?.data?.instant?.details;

      if (details) {
        const cloudCoverage = details.cloud_area_fraction ?? 50;
        const temperature = details.air_temperature ?? 0;
        const windSpeed = details.wind_speed ?? 0;

        let conditions: WeatherData['conditions'];
        if (cloudCoverage < 20) {
          conditions = 'clear';
        } else if (cloudCoverage < 50) {
          conditions = 'partly_cloudy';
        } else if (cloudCoverage < 80) {
          conditions = 'cloudy';
        } else {
          conditions = 'overcast';
        }

        hourlyData.push({
          cloudCoverage: Math.round(Math.max(0, Math.min(100, cloudCoverage))),
          temperature: Math.round(temperature * 10) / 10,
          windSpeed: Math.round(windSpeed * 10) / 10,
          conditions,
        });
      }
    }

    if (hourlyData.length === 0) {
      throw new Error('No valid hourly data extracted from Met.no response');
    }

    return hourlyData;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ Met.no hourly fetch timeout after', TIMEOUT_MS, 'ms');
      } else {
        console.error('❌ Failed to fetch hourly forecast from Met.no:', error.message);
      }
    }
    throw error;
  }
}
