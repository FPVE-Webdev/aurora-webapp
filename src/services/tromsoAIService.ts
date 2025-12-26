/**
 * Tromsø.AI Aurora API Client (Web Version)
 *
 * Single source of truth for aurora data.
 * Simplified for Next.js (no Capacitor dependencies).
 */

import {
  TromsøAuroraForecast,
  TromsøMultidayResponse,
  HourlyForecastResponse,
  AuroraOvalResponse,
  CurrentConditionsResponse
} from '@/types/tromsoAI';

// Use local API endpoints (which connect to Supabase or use fallback)
// Always use our own API endpoints, never call external APIs directly from client
const getBaseURL = (): string => {
  // Check data mode from localStorage
  if (typeof window !== 'undefined') {
    const dataMode = localStorage.getItem('aurora_data_mode');
    if (dataMode === 'live') {
      return process.env.NEXT_PUBLIC_API_URL || '/api/aurora';
    }
  }
  // Default to demo mode (local API)
  return '/api/aurora';
};

class TromsøAIService {
  private async fetchJSON<T>(url: string): Promise<T> {
    const demoBase = process.env.NEXT_PUBLIC_DEMO_API_URL || '/api/aurora';
    const preferredBase = getBaseURL();

    const candidates = preferredBase.startsWith('http')
      ? [preferredBase, demoBase]
      : [preferredBase];

    const join = (base: string, path: string) => {
      const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${normalizedBase}${normalizedPath}`;
    };

    let lastError: unknown;

    for (const base of candidates) {
      const fullURL = url.startsWith('http') ? url : join(base, url);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(fullURL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          // If we tried the "live" base and it failed, fall back to demoBase.
          if (base !== demoBase && candidates.length > 1) {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Some environments can occasionally return an empty body with 200.
        // Parse defensively to avoid JSON.parse errors.
        const text = await response.text();
        if (!text || !text.trim()) {
          throw new Error('Empty response body');
        }

        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error;
        // Try next candidate if available
        continue;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to fetch');
  }

  /**
   * Get current aurora forecast (right now)
   */
  async getNow(language: 'no' | 'en' = 'no'): Promise<TromsøAuroraForecast> {
    try {
      return await this.fetchJSON<TromsøAuroraForecast>(
        `/now?lang=${language}`
      );
    } catch (error) {
      console.error('Error fetching aurora now:', error);
      throw error;
    }
  }

  /**
   * Get tonight's aurora forecast
   */
  async getTonight(language: 'no' | 'en' = 'no'): Promise<TromsøAuroraForecast> {
    try {
      return await this.fetchJSON<TromsøAuroraForecast>(
        `/tonight?lang=${language}`
      );
    } catch (error) {
      console.error('Error fetching aurora tonight:', error);
      throw error;
    }
  }

  /**
   * Get multi-day forecast
   */
  async getForecast(days: number = 1, language: 'no' | 'en' = 'no'): Promise<TromsøMultidayResponse> {
    try {
      return await this.fetchJSON<TromsøMultidayResponse>(
        `/forecast?days=${days}&lang=${language}`
      );
    } catch (error) {
      console.error('Error fetching aurora forecast:', error);
      throw error;
    }
  }

  /**
   * Get hourly forecast for map animation (Premium feature)
   *
   * @param hours - Number of hours to fetch (default: 12, max: 48)
   * @param location - Location ID ('tromso', 'troms', 'finnmark', etc.)
   * @param language - Response language
   *
   * Used by: Map animation timeline
   */
  async getHourlyForecast(
    hours: number = 12,
    location: string = 'tromso',
    language: 'no' | 'en' = 'no'
  ): Promise<HourlyForecastResponse> {
    try {
      return await this.fetchJSON<HourlyForecastResponse>(
        `/hourly?hours=${hours}&location=${location}&lang=${language}`
      );
    } catch (error) {
      console.error('Error fetching hourly forecast:', error);
      throw error;
    }
  }

  /**
   * Get aurora oval coordinates for visualization
   *
   * @param resolution - Data resolution ('low'|'medium'|'high')
   *
   * Used by: useAuroraLive (map overlay)
   */
  async getAuroraOval(
    resolution: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AuroraOvalResponse> {
    try {
      return await this.fetchJSON<AuroraOvalResponse>(
        `/oval?resolution=${resolution}`
      );
    } catch (error) {
      console.error('Error fetching aurora oval:', error);
      throw error;
    }
  }

  /**
   * Get current conditions (consolidated endpoint)
   * FUTURE: v2.1 - consolidates multiple calls into one
   *
   * @param location - Location ID
   * @param language - Response language
   *
   * Used by: useAuroraData (replaces multiple requests)
   */
  async getCurrent(
    location: string = 'tromso',
    language: 'no' | 'en' = 'no'
  ): Promise<CurrentConditionsResponse> {
    try {
      return await this.fetchJSON<CurrentConditionsResponse>(
        `/current?location=${location}&lang=${language}`
      );
    } catch (error) {
      console.error('Error fetching current conditions:', error);
      throw error;
    }
  }
}

export const tromsøAIService = new TromsøAIService();
