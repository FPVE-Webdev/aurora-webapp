import { NextResponse } from 'next/server';

type WeatherPayload = {
  latitude: number;
  longitude: number;
  temperature: number;
  cloudCoverage: number;
  windSpeed: number;
  humidity: number;
  source: 'met.no' | 'fallback' | 'cache';
  timestamp: string;
};

const METNO_FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 15 * 60 * 1000;

const cache = new Map<string, { data: WeatherPayload; timestamp: number }>();
const inflight = new Map<string, Promise<WeatherPayload>>();

function buildCacheKey(lat: number, lon: number) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function buildFallbackWeather(lat: number, lon: number): WeatherPayload {
  // Deterministic, stable fallback data. Avoid randomness so the UI doesn't flicker.
  const baseTemp = lat > 70 ? -12 : lat > 68 ? -8 : lat > 66 ? -5 : 0;

  return {
    latitude: lat,
    longitude: lon,
    temperature: Math.round(baseTemp * 10) / 10,
    cloudCoverage: 60,
    windSpeed: 6,
    humidity: 70,
    source: 'fallback',
    timestamp: new Date().toISOString(),
  };
}

async function fetchMetnoWeather(lat: number, lon: number): Promise<WeatherPayload> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${METNO_FORECAST_URL}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Met.no requires a descriptive User-Agent
        'User-Agent': 'AuroraTromso/1.0 (https://nordlystromso.app)',
      },
      next: { revalidate: 900 }, // 15 minutes
    });

    if (!response.ok) {
      throw new Error(`Met.no API returned ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      throw new Error('Met.no response was empty');
    }

    let data: any;
    try {
      data = JSON.parse(text) as any;
    } catch (parseError) {
      throw new Error(`Met.no response was not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    const current = data?.properties?.timeseries?.[0]?.data?.instant?.details;

    if (!current) {
      throw new Error('Met.no response missing expected fields');
    }

    return {
      latitude: lat,
      longitude: lon,
      temperature: typeof current.air_temperature === 'number' ? current.air_temperature : 0,
      cloudCoverage: typeof current.cloud_area_fraction === 'number' ? current.cloud_area_fraction : 50,
      windSpeed: typeof current.wind_speed === 'number' ? current.wind_speed : 0,
      humidity: typeof current.relative_humidity === 'number' ? current.relative_humidity : 70,
      source: 'met.no',
      timestamp: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lat: string; lon: string }> }
) {
  try {
    const { lat: latStr, lon: lonStr } = await params;
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const key = buildCacheKey(lat, lon);
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json(
        { ...cached.data, source: 'cache', timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    const existingInflight = inflight.get(key);
    if (existingInflight) {
      const data = await existingInflight;
      return NextResponse.json(data, { status: 200 });
    }

    const promise = (async () => {
      try {
        const metno = await fetchMetnoWeather(lat, lon);
        cache.set(key, { data: metno, timestamp: Date.now() });
        return metno;
      } catch (err) {
        const fallback = buildFallbackWeather(lat, lon);
        cache.set(key, { data: fallback, timestamp: Date.now() });
        return fallback;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, promise);

    const data = await promise;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
