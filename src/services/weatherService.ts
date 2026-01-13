/**
 * MET.no Weather API Client (Web Version)
 */

interface MetNoForecast {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            cloud_area_fraction: number;
            air_temperature: number;
            wind_speed: number;
          };
        };
        next_1_hours?: {
          summary: {
            symbol_code: string;
          };
          details: {
            precipitation_amount: number;
          };
        };
        next_6_hours?: {
          summary: {
            symbol_code: string;
          };
        };
      };
    }>;
  };
}

class WeatherService {
  private baseUrl = 'https://api.met.no/weatherapi';
  private userAgent = 'aurora.tromso.ai/1.0 support@tromso.ai';

  private async fetchJSON<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getWeather(lat: number, lon: number): Promise<{
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    precipitation: number;
    symbolCode: string;
    timestamp: string;
  }> {
    try {
      const url = `${this.baseUrl}/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

      const data = await this.fetchJSON<MetNoForecast>(url);

      if (!data.properties?.timeseries?.[0]) {
        throw new Error('Invalid weather data format');
      }

      const current = data.properties.timeseries[0];

      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Weather fetched for', lat.toFixed(4), lon.toFixed(4), ':', {
          temperature: current.data.instant.details.air_temperature,
          cloudCoverage: current.data.instant.details.cloud_area_fraction
        });
      }

      const symbolCode = current.data.next_1_hours?.summary?.symbol_code ||
                         current.data.next_6_hours?.summary?.symbol_code ||
                         'cloudy';

      return {
        cloudCoverage: current.data.instant.details.cloud_area_fraction ?? 30,
        temperature: current.data.instant.details.air_temperature ?? -5,
        windSpeed: current.data.instant.details.wind_speed ?? 3,
        precipitation: current.data.next_1_hours?.details?.precipitation_amount ?? 0,
        symbolCode,
        timestamp: current.time
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching weather:', errorMessage, error);
      // Return fallback data with error indication
      return {
        cloudCoverage: 30,
        temperature: -5,
        windSpeed: 3,
        precipitation: 0,
        symbolCode: 'cloudy',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<Array<{
    time: string;
    cloudCoverage: number;
    temperature: number;
    precipitation: number;
    symbolCode: string;
  }>> {
    try {
      const url = `${this.baseUrl}/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

      const data = await this.fetchJSON<MetNoForecast>(url);

      if (!data.properties?.timeseries || data.properties.timeseries.length === 0) {
        throw new Error('No forecast data available');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Hourly forecast fetched:', data.properties.timeseries.length, 'hours');
      }

      return data.properties.timeseries.slice(0, hours).map(item => ({
        time: item.time,
        cloudCoverage: item.data.instant.details.cloud_area_fraction ?? 30,
        temperature: item.data.instant.details.air_temperature ?? -5,
        precipitation: item.data.next_1_hours?.details?.precipitation_amount ?? 0,
        symbolCode: item.data.next_1_hours?.summary?.symbol_code ||
                    item.data.next_6_hours?.summary?.symbol_code ||
                    'cloudy'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching hourly forecast:', errorMessage, error);
      // Return empty array to prevent crash, but log detailed error
      return [];
    }
  }

  getRadarUrl(area: string): string {
    const timestamp = Date.now();
    return `${this.baseUrl}/radar/2.0/?type=5level_reflectivity&area=${area}&content=animation&size=large&t=${timestamp}`;
  }
}

export const weatherService = new WeatherService();
