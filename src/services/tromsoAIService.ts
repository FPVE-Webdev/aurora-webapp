/**
 * Tromsø.AI Aurora API Client (Web Version)
 *
 * Single source of truth for aurora data.
 *
 * Important:
 * - Client requests should always hit our own Next.js API routes ("/api/aurora")
 *   to avoid CORS issues and to keep upstream API keys server-side.
 */

import {
  TromsøAuroraForecast,
  TromsøMultidayResponse,
  HourlyForecastResponse,
  AuroraOvalResponse,
  CurrentConditionsResponse
} from '@/types/tromsoAI';

const DEFAULT_BASE = '/api/aurora';

const getBaseURL = (): string => {
  // Even if the user selects “live” mode, our Next.js routes are what provide live data.
  // Calling external APIs directly from the browser is fragile (CORS, ad blockers, etc).
  return DEFAULT_BASE;
};

const joinURL = (base: string, path: string) => {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const isAbortError = (err: unknown): boolean => {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
};

class TromsøAIService {
  private async fetchJSON<T>(url: string): Promise<T> {
    const base = getBaseURL();
    const fullURL = url.startsWith('http') ? url : joinURL(base, url);

    // Our server routes already enforce upstream timeouts and caching. The client timeout
    // is purely a safety net for rare hangs; on AbortError we retry once without a timeout.
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutMs = 25_000;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(fullURL, controller ? { signal: controller.signal } : undefined);

      if (!response.ok) {
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
      // If we aborted due to our own client timeout, retry once without a timeout.
      // This avoids noisy AbortErrors in cases where the server is simply under load.
      if (isAbortError(error)) {
        const retryResponse = await fetch(fullURL);
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
        }

        const retryText = await retryResponse.text();
        if (!retryText || !retryText.trim()) {
          throw new Error('Empty response body');
        }

        return JSON.parse(retryText) as T;
      }

      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /** Get current aurora forecast (right now) */
  async getNow(language: 'no' | 'en' = 'no'): Promise<TromsøAuroraForecast> {
    return this.fetchJSON<TromsøAuroraForecast>(`/now?lang=${language}`);
  }

  /** Get tonight's aurora forecast */
  async getTonight(language: 'no' | 'en' = 'no'): Promise<TromsøAuroraForecast> {
    return this.fetchJSON<TromsøAuroraForecast>(`/tonight?lang=${language}`);
  }

  /** Get multi-day forecast */
  async getForecast(days: number = 1, language: 'no' | 'en' = 'no'): Promise<TromsøMultidayResponse> {
    return this.fetchJSON<TromsøMultidayResponse>(`/forecast?days=${days}&lang=${language}`);
  }

  /**
   * Get hourly forecast for map animation timeline.
   *
   * @param hours - Number of hours to fetch (default: 12, max: 48)
   * @param location - Location ID ('tromso', 'troms', 'finnmark', etc.)
   * @param language - Response language
   */
  async getHourlyForecast(
    hours: number = 12,
    location: string = 'tromso',
    language: 'no' | 'en' = 'no'
  ): Promise<HourlyForecastResponse> {
    return this.fetchJSON<HourlyForecastResponse>(
      `/hourly?hours=${hours}&location=${location}&lang=${language}`
    );
  }

  /** Get aurora oval coordinates for visualization */
  async getAuroraOval(resolution: 'low' | 'medium' | 'high' = 'medium'): Promise<AuroraOvalResponse> {
    return this.fetchJSON<AuroraOvalResponse>(`/oval?resolution=${resolution}`);
  }

  /** Get consolidated "current conditions" */
  async getCurrent(location: string = 'tromso', language: 'no' | 'en' = 'no'): Promise<CurrentConditionsResponse> {
    return this.fetchJSON<CurrentConditionsResponse>(`/current?location=${location}&lang=${language}`);
  }
}

export const tromsøAIService = new TromsøAIService();
