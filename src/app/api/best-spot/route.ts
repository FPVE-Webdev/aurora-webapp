import { NextResponse } from 'next/server';
import { CHASE_REGIONS, MAP_CONFIG } from '@/lib/constants/chaseRegions';

type RegionVisibility = {
  id: string;
  name: string;
  coordinates: [number, number];
  cloudCoverage: number;
  visibilityScore: number;
  driveKm: number;
  driveMinutes: number;
  googleMapsUrl: string;
};

type BestSpotResponse = {
  tromsoCloudCoverage: number;
  shouldChase: boolean;
  bestRegion: RegionVisibility | null;
  regions: RegionVisibility[];
};

const DEFAULT_LAT = 69.6492;
const DEFAULT_LON = 18.9553;

function buildInternalUrl(path: string, req: Request) {
  const url = new URL(path, req.url);
  return url.toString();
}

async function fetchWeather(lat: number, lon: number, req: Request) {
  const url = buildInternalUrl(`/api/weather/${lat}/${lon}`, req);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Weather fetch failed ${res.status}`);
  return res.json() as Promise<{ cloudCoverage?: number; windSpeed?: number }>;
}

function toKmDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildGoogleMapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || `${DEFAULT_LAT}`);
    const lon = parseFloat(searchParams.get('lon') || `${DEFAULT_LON}`);

    const tromsoWeather = await fetchWeather(lat, lon, request);
    const tromsoCloud = typeof tromsoWeather.cloudCoverage === 'number' ? tromsoWeather.cloudCoverage : 50;
    const shouldChase = tromsoCloud > MAP_CONFIG.chaseMode.cloudThreshold;

    if (!shouldChase) {
      const payload: BestSpotResponse = {
        tromsoCloudCoverage: tromsoCloud,
        shouldChase: false,
        bestRegion: null,
        regions: [],
      };
      return NextResponse.json(payload, { status: 200 });
    }

    const regions = await Promise.all(
      CHASE_REGIONS.map(async (region) => {
        const regionWeather = await fetchWeather(region.coordinates[0], region.coordinates[1], request);
        const cloudCoverage = typeof regionWeather.cloudCoverage === 'number' ? regionWeather.cloudCoverage : 50;
        const visibilityScore = Math.max(0, 100 - cloudCoverage);
        const driveKm = toKmDistance(lat, lon, region.coordinates[0], region.coordinates[1]);
        const driveMinutes = Math.round((driveKm / 70) * 60); // ~70 km/h avg including winter roads

        return {
          id: region.id,
          name: region.name,
          coordinates: region.coordinates,
          cloudCoverage,
          visibilityScore,
          driveKm: Math.round(driveKm * 10) / 10,
          driveMinutes,
          googleMapsUrl: buildGoogleMapsUrl(region.coordinates[0], region.coordinates[1]),
        } as RegionVisibility;
      })
    );

    regions.sort((a, b) => {
      const aChase = a.visibilityScore >= MAP_CONFIG.chaseMode.minVisibilityScore;
      const bChase = b.visibilityScore >= MAP_CONFIG.chaseMode.minVisibilityScore;
      if (aChase !== bChase) return aChase ? -1 : 1;
      const regionMeta = CHASE_REGIONS.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.id]: r.priority }), {});
      if (regionMeta[a.id] !== regionMeta[b.id]) return regionMeta[a.id] - regionMeta[b.id];
      return b.visibilityScore - a.visibilityScore;
    });

    const bestRegion = regions.find((r) => r.visibilityScore >= MAP_CONFIG.chaseMode.minVisibilityScore) || null;

    const payload: BestSpotResponse = {
      tromsoCloudCoverage: tromsoCloud,
      shouldChase: true,
      bestRegion,
      regions,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('[best-spot] failed', error);
    return NextResponse.json({ error: 'Failed to resolve best spot' }, { status: 500 });
  }
}

